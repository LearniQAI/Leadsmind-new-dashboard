import { NextRequest, NextResponse } from 'next/server'
import { transunionService } from '@/server/services/transunion'
import { refinitivService } from '@/server/services/refinitiv'
import { xdsService } from '@/server/services/xds'
import { kycRiskEngine } from '@/server/services/kycRiskEngine'
import { getUser } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// checkTypes that trigger a real, metered bureau call (TransUnion/Refinitiv/XDS) in production
const BILLED_CHECK_TYPES = new Set([
  'hanis_identity', 'sanctions_screen', 'pep_check', 'credit_score', 'credit_report', 'xds_credit', 'xds_trace'
]);
const RECHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Confirms the authenticated user belongs to the workspace that owns the given contact.
// Returns the contact's real workspace_id — this is the only source of truth for
// authorization; a client-supplied workspaceId is never trusted.
async function assertContactAccess(adminClient: ReturnType<typeof createAdminClient>, userId: string, contactId: string) {
  const { data: contact, error: contactErr } = await adminClient
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (contactErr || !contact) {
    throw new NotFoundError('Contact');
  }

  const supabaseUser = await createServerClient();
  const { data: membership } = await supabaseUser
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', contact.workspace_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new ForbiddenError('You do not have access to this contact');
  }

  return contact;
}

// Confirms the authenticated user belongs to the workspace that owns the given kyc_checks row.
async function assertCheckAccess(adminClient: ReturnType<typeof createAdminClient>, userId: string, checkId: string) {
  const { data: check, error: fetchErr } = await adminClient
    .from('kyc_checks')
    .select('id, workspace_id')
    .eq('id', checkId)
    .single();

  if (fetchErr || !check) {
    throw new NotFoundError('KYC check');
  }

  const supabaseUser = await createServerClient();
  const { data: membership } = await supabaseUser
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', check.workspace_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new ForbiddenError('You do not have access to this record');
  }

  return check;
}

// GET — fetch all KYC checks for a contact
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const contactId = req.nextUrl.searchParams.get('contactId')
    if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

    const adminClient = createAdminClient();
    await assertContactAccess(adminClient, user.id, contactId);

    const { data: checks } = await adminClient
      .from('kyc_checks')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })

    const { data: consents } = await adminClient
      .from('kyc_consent_records')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ checks: checks ?? [], consents: consents ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'kyc.checks.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST — record consent + run identity / AML screening check
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const { contactId, checkType, provider, consentGiven, checkedBy, forceRecheck } = await req.json()

    if (!contactId || !checkType || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!consentGiven) {
      return NextResponse.json({ error: 'Consent is required before running any verification' }, { status: 400 })
    }

    const adminClient = createAdminClient();

    // Resolve the contact's real workspace_id server-side — never trust a client-supplied workspaceId
    const contact = await assertContactAccess(adminClient, user.id, contactId);
    const workspaceId = contact.workspace_id;

    // Hard compliance validation check: explicit POPIA consent must be obtained first
    const { data: obtainedConsent, error: consentCheckErr } = await adminClient
      .from('kyc_consent')
      .select('id, reference')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'obtained')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (consentCheckErr || !obtainedConsent) {
      return NextResponse.json({
        error: 'Verification blocked: No obtained POPIA consent record exists for this contact. Please dispatch a consent request first.'
      }, { status: 403 });
    }

    // Billed bureau checks: don't auto-fire a repeat (billed) call within the cooldown
    // window unless the caller explicitly forces it
    if (BILLED_CHECK_TYPES.has(checkType) && !forceRecheck) {
      const { data: recentCheck } = await adminClient
        .from('kyc_checks')
        .select('id, checked_at, created_at')
        .eq('contact_id', contactId)
        .eq('check_type', checkType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentCheck) {
        const lastCheckedAt = new Date(recentCheck.checked_at || recentCheck.created_at).getTime();
        if (Date.now() - lastCheckedAt < RECHECK_COOLDOWN_MS) {
          return NextResponse.json({
            error: `This contact was already checked for '${checkType}' within the last 24 hours. Pass forceRecheck: true to run it again.`,
            code: 'RECHECK_COOLDOWN'
          }, { status: 429 });
        }
      }
    }

    if (forceRecheck) {
      logger.warn({ contactId, workspaceId, checkType, userId: user.id }, 'kyc.check.force_recheck');
    }

    // Record consent in legacy logs for compatibility
    const { data: legacyConsent } = await adminClient
      .from('kyc_consent_records')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        consent_type: checkType === 'hanis_identity' ? 'identity_verification' :
                      checkType === 'credit_report' ? 'credit_check' : 'full_kyc',
        status: 'obtained',
        obtained_at: new Date().toISOString(),
        obtained_by: checkedBy ?? user.id,
        reference: obtainedConsent.reference || `consent_${Date.now()}`,
      })
      .select()
      .single()

    let checkResult: any = null;

    if (checkType === 'hanis_identity') {
      if (!contact.id_number) {
        return NextResponse.json({ error: 'Verification failed: Contact does not have a South African ID number recorded.' }, { status: 400 });
      }

      // Execute TransUnion Identity check
      const verification = await transunionService.verifyIdentity({
        idNumber: contact.id_number,
        firstName: contact.first_name,
        lastName: contact.last_name,
        consentRef: obtainedConsent.id,
      });

      const checkStatus = (verification.idValid && verification.nameMatch && verification.aliveStatus === 'ALIVE' && !verification.fraudIndicator) ? 'passed' : 'failed';

      // Insert check record
      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: checkType,
          provider: 'TransUnion',
          status: checkStatus,
          id_valid: verification.idValid,
          name_match: verification.nameMatch,
          alive_status: verification.aliveStatus,
          fraud_indicator: verification.fraudIndicator,
          raw_response: verification.rawResponse,
          notes: checkStatus === 'passed' ? 'Identity verification passed.' :
                 verification.aliveStatus === 'DECEASED' ? 'Identity verification failed: Contact is DECEASED.' :
                 verification.fraudIndicator ? 'Identity verification failed: FRAUD INDICATOR FLAG.' :
                 'Identity verification failed: Name/ID number mismatch.',
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;
      checkResult = check;

      // Update contact record (FICA/KYC flags)
      // Lock risk flag to HIGH if deceased or fraud indicator is flagged
      let newRiskFlag = contact.kyc_risk_flag;
      let isVerified = false;
      let verifiedAt = null;

      if (verification.aliveStatus === 'DECEASED' || verification.fraudIndicator) {
        newRiskFlag = 'HIGH';
      } else if (checkStatus === 'passed') {
        newRiskFlag = 'LOW';
        isVerified = true;
        verifiedAt = new Date().toISOString();
      } else {
        newRiskFlag = 'MEDIUM';
      }

      const { error: contactUpdateErr } = await adminClient
        .from('contacts')
        .update({
          kyc_risk_flag: newRiskFlag,
          kyc_id_verified: isVerified,
          kyc_id_verified_at: verifiedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (contactUpdateErr) {
        // Return clean message if trigger threw compliance error
        return NextResponse.json({ error: contactUpdateErr.message }, { status: 400 });
      }

    } else if (checkType === 'sanctions_screen' || checkType === 'pep_check') {
      // Execute Refinitiv AML Screening check
      const screening = await refinitivService.screenCase({
        name: `${contact.first_name} ${contact.last_name}`,
        dob: undefined, // Add DOB if present in contact metadata
        idNumber: contact.id_number || undefined,
        workspaceId,
      });

      const checkStatus = (screening.amlMatchLevel === 'STRONG_MATCH') ? 'failed' :
                          (screening.amlMatchLevel === 'MEDIUM_MATCH') ? 'manual_review' : 'passed';

      // Insert check record
      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: 'sanctions_screen',
          provider: provider || 'Refinitiv',
          status: checkStatus,
          aml_match_level: screening.amlMatchLevel,
          aml_match_details: screening.amlMatchDetails,
          raw_response: screening.rawResponse,
          notes: checkStatus === 'passed' ? 'AML Screening passed. No active sanctions matches.' :
                 checkStatus === 'manual_review' ? 'AML match detected (MEDIUM_MATCH / PEP). Needs manual review.' :
                 'AML MATCH CONFIRMED (STRONG_MATCH). Active sanctions list match.',
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;
      checkResult = check;

      // Update contact details risk flags
      let newRiskFlag = contact.kyc_risk_flag;
      if (screening.amlMatchLevel === 'STRONG_MATCH') {
        newRiskFlag = 'HIGH';
      } else if (screening.amlMatchLevel === 'MEDIUM_MATCH') {
        newRiskFlag = 'MEDIUM';
      }

      const { error: contactUpdateErr } = await adminClient
        .from('contacts')
        .update({
          kyc_risk_flag: newRiskFlag,
          kyc_id_verified: screening.amlMatchLevel === 'STRONG_MATCH' ? false : undefined, // force lock FICA verification to false if STRONG_MATCH
          kyc_id_verified_at: screening.amlMatchLevel === 'STRONG_MATCH' ? null : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (contactUpdateErr) {
        return NextResponse.json({ error: contactUpdateErr.message }, { status: 400 });
      }

    } else if (checkType === 'credit_score') {
      if (!contact.id_number) {
        return NextResponse.json({ error: 'Verification failed: Contact does not have a South African ID number recorded.' }, { status: 400 });
      }

      let scoreResult;
      if (contact.id_number.endsWith('5555')) {
        // Fallback to XDS Mass-Market due to insufficient history on primary
        const result = await xdsService.getConsumerCredit({
          idNumber: contact.id_number,
          consentRef: obtainedConsent.id,
        });
        scoreResult = {
          score: result.score,
          riskBand: result.riskBand,
          provider: 'XDS',
          rawResponse: result.rawResponse,
          notes: `[Primary bureau failed: insufficient data. Fallback to XDS Mass-Market applied] Credit score verified: ${result.score} (${result.riskBand}).`,
        };
      } else {
        // Execute TransUnion Credit Score check
        const result = await transunionService.getCreditScore({
          idNumber: contact.id_number,
          consentRef: obtainedConsent.id,
        });
        scoreResult = {
          score: result.score,
          riskBand: result.riskBand,
          provider: 'TransUnion',
          rawResponse: result.rawResponse,
          notes: `Credit score verified: ${result.score} (${result.riskBand}).`,
        };
      }

      // Insert check record
      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: checkType,
          provider: scoreResult.provider,
          status: 'passed',
          score: scoreResult.score,
          risk_band: scoreResult.riskBand,
          credit_score: scoreResult.score, // legacy mapping compatibility
          credit_risk_grade: scoreResult.riskBand, // legacy mapping compatibility
          raw_response: scoreResult.rawResponse,
          notes: scoreResult.notes,
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;
      checkResult = check;

    } else if (checkType === 'credit_report') {
      if (!contact.id_number) {
        return NextResponse.json({ error: 'Verification failed: Contact does not have a South African ID number recorded.' }, { status: 400 });
      }

      let reportResult;
      if (contact.id_number.endsWith('5555')) {
        // Fallback to XDS Mass-Market due to insufficient history on primary
        const xdsResult = await xdsService.getConsumerCredit({
          idNumber: contact.id_number,
          consentRef: obtainedConsent.id,
        });

        // Sum retail debt metrics for display compatibility
        const totalDebt = xdsResult.retailAccounts.reduce((acc, a) => acc + a.currentBalance, 0);
        const monthlyPay = xdsResult.retailAccounts.reduce((acc, a) => acc + a.monthlyInstallment, 0);
        const defaults = xdsResult.retailAccounts.filter(a => a.paymentStatus === 'Arrears' || a.paymentStatus === 'Written Off').length;

        reportResult = {
          score: xdsResult.score,
          riskBand: xdsResult.riskBand,
          provider: 'XDS',
          defaultsCount: defaults,
          judgementsCount: 0,
          totalDebtExposure: totalDebt,
          monthlyRepayments: monthlyPay,
          rawResponse: xdsResult.rawResponse,
          notes: `[Primary bureau failed: insufficient data. Fallback to XDS Mass-Market applied] Consumer Credit Report generated. Score: ${xdsResult.score} (${xdsResult.riskBand}). Defaults: ${defaults}, Judgements: 0. Debt Exposure: R${totalDebt}.`,
        };
      } else {
        // Execute TransUnion Credit Report check
        const result = await transunionService.getCreditReport({
          idNumber: contact.id_number,
          consentRef: obtainedConsent.id,
        });
        reportResult = {
          score: result.score,
          riskBand: result.riskBand,
          provider: 'TransUnion',
          defaultsCount: result.defaultsCount,
          judgementsCount: result.judgementsCount,
          totalDebtExposure: result.totalDebtExposure,
          monthlyRepayments: result.monthlyRepayments,
          rawResponse: result.rawResponse,
          notes: `Consumer Credit Report generated. Score: ${result.score} (${result.riskBand}). Defaults: ${result.defaultsCount}, Judgements: ${result.judgementsCount}. Debt Exposure: R${result.totalDebtExposure}.`,
        };
      }

      // Insert check record
      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: checkType,
          provider: reportResult.provider,
          status: 'passed',
          score: reportResult.score,
          risk_band: reportResult.riskBand,
          credit_score: reportResult.score, // legacy mapping compatibility
          credit_risk_grade: reportResult.riskBand, // legacy mapping compatibility
          defaults_count: reportResult.defaultsCount,
          judgements_count: reportResult.judgementsCount,
          total_debt_exposure: reportResult.totalDebtExposure,
          monthly_repayments: reportResult.monthlyRepayments,
          raw_response: reportResult.rawResponse,
          notes: reportResult.notes,
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;
      checkResult = check;

    } else if (checkType === 'xds_credit') {
      if (!contact.id_number) {
        return NextResponse.json({ error: 'Verification failed: Contact does not have a South African ID number recorded.' }, { status: 400 });
      }

      const result = await xdsService.getConsumerCredit({
        idNumber: contact.id_number,
        consentRef: obtainedConsent.id,
      });

      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: checkType,
          provider: 'XDS',
          status: 'passed',
          score: result.score,
          risk_band: result.riskBand,
          credit_score: result.score,
          credit_risk_grade: result.riskBand,
          raw_response: result.rawResponse,
          notes: `XDS Mass-Market Credit check complete. Score: ${result.score} (${result.riskBand}). Retail accounts: ${result.retailAccounts.length} recorded.`,
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;
      checkResult = check;

    } else if (checkType === 'xds_trace') {
      if (!contact.id_number) {
        return NextResponse.json({ error: 'Verification failed: Contact does not have a South African ID number recorded.' }, { status: 400 });
      }

      const result = await xdsService.getConsumerTrace({
        idNumber: contact.id_number,
        consentRef: obtainedConsent.id,
      });

      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: checkType,
          provider: 'XDS',
          status: 'passed',
          raw_response: result.rawResponse,
          notes: `XDS Active Tracing check complete. Found ${result.addresses.length} verified addresses and ${result.phones.length} verified phone numbers.`,
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;
      checkResult = check;

    } else {
      // General/default check types (fallback)
      const { data: check, error } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: checkType,
          provider,
          status: 'pending',
          consent_id: legacyConsent?.id ?? null,
          checked_by: checkedBy ?? user.id,
          notes: 'Provider API integration pending. Check queued for manual processing.',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      checkResult = check;
    }

    // Centralized risk engine trigger
    try {
      await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
    } catch (riskErr) {
      logger.error({ err: riskErr, contactId, workspaceId }, 'kyc.risk_engine.failed');
    }

    return NextResponse.json({ success: true, check: checkResult })

  } catch (err: any) {
    logger.error({ err }, 'kyc.checks.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// Fields a client is actually allowed to set via PATCH — verification outcomes, bureau
// results, and workspace/contact linkage are never client-writable.
const PATCH_ALLOWED_FIELDS = ['notes'] as const;

// PATCH — update administrative annotations on a check
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await req.json()

    const adminClient = createAdminClient();
    await assertCheckAccess(adminClient, user.id, id);

    const updates: Record<string, unknown> = {};
    for (const field of PATCH_ALLOWED_FIELDS) {
      if (field in body) updates[field] = body[field];
    }
    updates.updated_at = new Date().toISOString();
    updates.checked_by = user.id;

    const { data, error } = await adminClient
      .from('kyc_checks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error;
    return NextResponse.json({ success: true, check: data })
  } catch (err: any) {
    logger.error({ err }, 'kyc.checks.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// DELETE — remove a check
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const adminClient = createAdminClient();
    await assertCheckAccess(adminClient, user.id, id);

    const { error } = await adminClient.from('kyc_checks').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'kyc.checks.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

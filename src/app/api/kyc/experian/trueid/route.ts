import { NextRequest, NextResponse } from 'next/server';
import { experianService } from '@/server/services/experian';
import { kycRiskEngine } from '@/server/services/kycRiskEngine';
import { createAdminClient } from '@/lib/supabase/server';
import { assertContactAccessOrPortalSelf, assertBureauCheckCooldown } from '@/lib/kyc/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, contactId, selfie, idNumber, documentType, documentId, fileBase64, address, checkedBy, forceRecheck } = body;
    // workspaceId is intentionally destructured-and-ignored below — the contact's real
    // workspace_id (resolved server-side inside assertContactAccessOrPortalSelf) is the only
    // source of truth. A client-supplied workspaceId is never trusted for authorization.

    if (!contactId || !mode) {
      return NextResponse.json({ error: 'Missing contactId or mode parameter' }, { status: 400 });
    }

    // Auth: caller must be an internal team member of the contact's real workspace, OR the
    // portal-authenticated contact themself (scoped to exactly this contact, not their whole
    // workspace). Throws Unauthorized/Forbidden/NotFound as appropriate.
    const { contact, userId } = await assertContactAccessOrPortalSelf(contactId);
    const workspaceId = contact.workspace_id;

    const adminClient = createAdminClient();

    // Modes: liveness, ocr, address
    if (mode === 'liveness') {
      if (!selfie || !idNumber) {
        return NextResponse.json({ error: 'selfie and idNumber required for biometric liveness mode' }, { status: 400 });
      }

      // 1. Hard POPIA consent check
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

      // 2. Billed bureau call — don't auto-fire a repeat within the cooldown window unless
      // the caller explicitly forces it (same 24h pattern as crm/contacts/kyc).
      await assertBureauCheckCooldown(adminClient, contactId, 'biometric', !!forceRecheck);

      // 3. Call Experian liveness service
      const verification = await experianService.verifyBiometricLiveness({
        idNumber,
        selfieBase64: selfie,
        consentRef: obtainedConsent.id,
      });

      const checkStatus = verification.livenessPassed ? 'passed' : 'failed';

      // 4. Write check outcome to kyc_checks
      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: 'biometric',
          provider: 'experian',
          status: checkStatus,
          raw_response: verification.rawResponse,
          result: verification.result,
          notes: `Experian TrueID Biometric Check: ${verification.result}`,
          checked_by: checkedBy ?? userId,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;

      // 5. Update contact flags
      let riskFlag = 'LOW';
      if (!verification.livenessPassed) {
        riskFlag = 'HIGH';
      }

      await adminClient
        .from('contacts')
        .update({
          kyc_risk_flag: riskFlag,
          kyc_id_verified: verification.livenessPassed,
          kyc_id_verified_at: verification.livenessPassed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      // Log contact activity
      await adminClient.from('contact_activities').insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        type: 'system',
        description: `Executed Experian TrueID Biometric Liveness Check: ${verification.result}`
      });

      // Calculate risk rating
      try {
        await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
      } catch (riskErr) {
        logger.error({ err: riskErr, contactId, workspaceId }, 'kyc.experian.liveness.risk_engine.failed');
      }

      return NextResponse.json({ success: true, check });
    }

    if (mode === 'ocr') {
      if (!documentType) {
        return NextResponse.json({ error: 'documentType required for OCR mode' }, { status: 400 });
      }

      let fileBuffer: Buffer;

      if (fileBase64) {
        fileBuffer = Buffer.from(fileBase64, 'base64');
      } else if (documentId) {
        // Fetch document from database — scoped to the already-authorized contact, not just
        // any documentId.
        const { data: doc, error: docErr } = await adminClient
          .from('kyc_documents')
          .select('*')
          .eq('id', documentId)
          .eq('contact_id', contactId)
          .single();

        if (docErr || !doc) {
          return NextResponse.json({ error: 'Vaulted KYC document not found for OCR processing' }, { status: 404 });
        }

        // Simulating buffer since sandbox handles string/mock files
        fileBuffer = Buffer.from('mock-document-file-buffer');
      } else {
        return NextResponse.json({ error: 'Either fileBase64 or documentId is required for OCR mode' }, { status: 400 });
      }

      // Billed bureau call — same 24h cooldown as the other modes, tracked per contact via a
      // dedicated 'document_ocr' check_type (previously OCR wrote no kyc_checks row at all,
      // so there was nothing for a cooldown to check against).
      await assertBureauCheckCooldown(adminClient, contactId, 'document_ocr', !!forceRecheck);

      // Call Experian OCR service
      const ocrResult = await experianService.processDocumentOCR(fileBuffer, documentType);

      // If documentId is provided, write to public.kyc_documents (ocr_extracted_data column)
      if (documentId) {
        const { error: updateErr } = await adminClient
          .from('kyc_documents')
          .update({
            ocr_extracted_data: ocrResult.extractedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId)
          .eq('contact_id', contactId);

        if (updateErr) throw updateErr;
      }

      // Record the OCR check in kyc_checks — same audit trail liveness/address already use.
      const { data: ocrCheck, error: ocrCheckErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: 'document_ocr',
          provider: 'experian',
          status: 'passed',
          raw_response: ocrResult.rawResponse,
          notes: `Experian TrueID Document OCR: ${documentType}`,
          checked_by: checkedBy ?? userId,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (ocrCheckErr) throw ocrCheckErr;

      // Calculate risk rating
      try {
        await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
      } catch (riskErr) {
        logger.error({ err: riskErr, contactId, workspaceId }, 'kyc.experian.ocr.risk_engine.failed');
      }

      return NextResponse.json({ success: true, extractedData: ocrResult.extractedData, rawResponse: ocrResult.rawResponse, check: ocrCheck });
    }

    if (mode === 'address') {
      if (!address) {
        return NextResponse.json({ error: 'address parameter required for geocoding address mode' }, { status: 400 });
      }

      // 1. Hard POPIA consent check
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

      // 2. Billed bureau call — same 24h cooldown pattern.
      await assertBureauCheckCooldown(adminClient, contactId, 'address_verification', !!forceRecheck);

      // 3. Call Experian address geocoding service
      const geocoding = await experianService.verifyAndGeocodeAddress(address);

      const checkStatus = geocoding.result === 'Verified & Geocoded' ? 'passed' : 'failed';

      // 4. Write check outcome to kyc_checks
      const { data: check, error: checkErr } = await adminClient
        .from('kyc_checks')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          check_type: 'address_verification',
          provider: 'experian',
          status: checkStatus,
          raw_response: geocoding.rawResponse,
          result: geocoding.result,
          notes: `Experian Address Geocoder: ${geocoding.result}. GPS: [${geocoding.latitude}, ${geocoding.longitude}]`,
          checked_by: checkedBy ?? userId,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;

      // Log contact activity
      await adminClient.from('contact_activities').insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        type: 'system',
        description: `Executed Experian Address Geocoding: ${geocoding.result} for [${address}]`
      });

      // Calculate risk rating
      try {
        await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
      } catch (riskErr) {
        logger.error({ err: riskErr, contactId, workspaceId }, 'kyc.experian.address.risk_engine.failed');
      }

      return NextResponse.json({
        success: true,
        check,
        geocodeResult: {
          verifiedAddress: geocoding.verifiedAddress,
          latitude: geocoding.latitude,
          longitude: geocoding.longitude,
        }
      });
    }

    return NextResponse.json({ error: `Invalid mode: ${mode}` }, { status: 400 });
  } catch (err: any) {
    logger.error({ err }, 'kyc.experian.trueid.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

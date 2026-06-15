import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { experianService } from '@/server/services/experian';
import { kycRiskEngine } from '@/server/services/kycRiskEngine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, contactId, workspaceId, selfie, idNumber, documentType, documentId, fileBase64, address, checkedBy } = body;

    if (!contactId || !workspaceId || !mode) {
      return NextResponse.json({ error: 'Missing contactId, workspaceId, or mode parameter' }, { status: 400 });
    }

    // Modes: liveness, ocr, address
    if (mode === 'liveness') {
      if (!selfie || !idNumber) {
        return NextResponse.json({ error: 'selfie and idNumber required for biometric liveness mode' }, { status: 400 });
      }

      // 1. Hard POPIA consent check
      const { data: obtainedConsent, error: consentCheckErr } = await supabase
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

      // 2. Call Experian liveness service
      const verification = await experianService.verifyBiometricLiveness({
        idNumber,
        selfieBase64: selfie,
        consentRef: obtainedConsent.id,
      });

      const checkStatus = verification.livenessPassed ? 'passed' : 'failed';

      // 3. Write check outcome to kyc_checks
      const { data: check, error: checkErr } = await supabase
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
          checked_by: checkedBy ?? null,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;

      // 4. Update contact flags
      let riskFlag = 'LOW';
      if (!verification.livenessPassed) {
        riskFlag = 'HIGH';
      }

      await supabase
        .from('contacts')
        .update({
          kyc_risk_flag: riskFlag,
          kyc_id_verified: verification.livenessPassed,
          kyc_id_verified_at: verification.livenessPassed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      // Log contact activity
      await supabase.from('contact_activities').insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        type: 'system',
        description: `Executed Experian TrueID Biometric Liveness Check: ${verification.result}`
      });

      // Calculate risk rating
      try {
        await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
      } catch (riskErr) {
        console.error('[Experian Biometric Hook] Risk calculation failed:', riskErr);
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
        // Fetch document from database
        const { data: doc, error: docErr } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docErr || !doc) {
          return NextResponse.json({ error: 'Vaulted KYC document not found for OCR processing' }, { status: 404 });
        }

        // Simulating buffer since sandbox handles string/mock files
        fileBuffer = Buffer.from('mock-document-file-buffer');
      } else {
        return NextResponse.json({ error: 'Either fileBase64 or documentId is required for OCR mode' }, { status: 400 });
      }

      // Call Experian OCR service
      const ocrResult = await experianService.processDocumentOCR(fileBuffer, documentType);

      // If documentId is provided, write to public.kyc_documents (ocr_extracted_data column)
      if (documentId) {
        const { error: updateErr } = await supabase
          .from('kyc_documents')
          .update({
            ocr_extracted_data: ocrResult.extractedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateErr) throw updateErr;
      }

      // Calculate risk rating
      try {
        await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
      } catch (riskErr) {
        console.error('[Experian OCR Hook] Risk calculation failed:', riskErr);
      }

      return NextResponse.json({ success: true, extractedData: ocrResult.extractedData, rawResponse: ocrResult.rawResponse });
    }

    if (mode === 'address') {
      if (!address) {
        return NextResponse.json({ error: 'address parameter required for geocoding address mode' }, { status: 400 });
      }

      // 1. Hard POPIA consent check
      const { data: obtainedConsent, error: consentCheckErr } = await supabase
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

      // 2. Call Experian address geocoding service
      const geocoding = await experianService.verifyAndGeocodeAddress(address);

      const checkStatus = geocoding.result === 'Verified & Geocoded' ? 'passed' : 'failed';

      // 3. Write check outcome to kyc_checks
      const { data: check, error: checkErr } = await supabase
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
          checked_by: checkedBy ?? null,
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkErr) throw checkErr;

      // Log contact activity
      await supabase.from('contact_activities').insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        type: 'system',
        description: `Executed Experian Address Geocoding: ${geocoding.result} for [${address}]`
      });

      // Calculate risk rating
      try {
        await kycRiskEngine.calculateRiskRating(contactId, workspaceId);
      } catch (riskErr) {
        console.error('[Experian Address Hook] Risk calculation failed:', riskErr);
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
    console.error('[Experian TrueID API error]:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred during Experian processing' }, { status: 500 });
  }
}

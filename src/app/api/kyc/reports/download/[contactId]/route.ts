import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const contactId = params.contactId;
    if (!contactId) {
      return NextResponse.json({ error: 'contactId parameter is required' }, { status: 400 });
    }

    // 1. Fetch Contact Details
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact profile record not found' }, { status: 404 });
    }

    // 2. Fetch latest POPIA Consent record
    const { data: consent, error: consentErr } = await supabase
      .from('kyc_consent')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Fetch all Verification Checks
    const { data: checks } = await supabase
      .from('kyc_checks')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    // 4. Fetch Vaulted KYC Documents
    const { data: documents } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    // Resolve specific checks
    const idCheck = (checks || []).find(c => c.check_type === 'hanis_identity');
    const amlCheck = (checks || []).find(c => c.check_type === 'sanctions_screen');

    // Build the audit HTML template
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>FICA Audit Report — ${contact.first_name} ${contact.last_name || ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@600;700&display=swap');
          
          body {
            font-family: 'DM Sans', sans-serif;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            font-size: 11px;
          }
          
          .report-container {
            padding: 30px;
          }
          
          .header-table {
            width: 100%;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          
          .header-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            margin: 0;
          }
          
          .header-subtitle {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-top: 5px;
            font-weight: 700;
          }
          
          .header-meta {
            text-align: right;
            font-size: 9.5px;
            color: #475569;
            font-family: monospace;
          }

          .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 25px;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }

          .grid-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          .grid-table td {
            padding: 7px 10px;
            border: 1px solid #f1f5f9;
            vertical-align: top;
          }

          .grid-table .label {
            width: 25%;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            font-size: 9.5px;
          }

          .grid-table .value {
            color: #0f172a;
          }

          .badge {
            display: inline-block;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid transparent;
          }

          .badge-green {
            background-color: #ecfdf5;
            color: #065f46;
            border-color: #a7f3d0;
          }

          .badge-red {
            background-color: #fef2f2;
            color: #991b1b;
            border-color: #fca5a5;
          }

          .badge-orange {
            background-color: #fffbeb;
            color: #92400e;
            border-color: #fde68a;
          }

          .badge-grey {
            background-color: #f8fafc;
            color: #475569;
            border-color: #cbd5e1;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          .data-table th {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
            font-weight: 700;
            color: #475569;
            font-size: 9.5px;
            text-transform: uppercase;
          }

          .data-table td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            font-size: 10px;
          }

          .footer-disclaimer {
            margin-top: 45px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 8.5px;
            color: #64748b;
            text-align: justify;
            line-height: 1.4;
          }

          .footer-signature-table {
            width: 100%;
            margin-top: 35px;
          }

          .signature-box {
            border-top: 1px dashed #94a3b8;
            width: 40%;
            padding-top: 5px;
            font-size: 9px;
            color: #475569;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Header block -->
          <table class="header-table">
            <tr>
              <td>
                <h1 class="header-title">FICA Audit Verification Report</h1>
                <div class="header-subtitle">Official Compliance Output Outline</div>
              </td>
              <td class="header-meta">
                <div><strong>Report ID:</strong> RPT-${contact.id.slice(0, 8).toUpperCase()}</div>
                <div><strong>Generated:</strong> ${new Date().toLocaleString('en-ZA')}</div>
                <div><strong>Regulatory Standard:</strong> FICA / POPIA</div>
              </td>
            </tr>
          </table>

          <!-- SECTION 1: Subject Profile -->
          <div class="section-title">1. Customer Identification Profile</div>
          <table class="grid-table">
            <tr>
              <td class="label">Full Name</td>
              <td class="value">${contact.first_name} ${contact.last_name || ''}</td>
              <td class="label">FICA Verified</td>
              <td class="value">
                <span class="badge ${contact.kyc_id_verified ? 'badge-green' : 'badge-grey'}">
                  ${contact.kyc_id_verified ? 'VERIFIED / PASSED' : 'UNVERIFIED'}
                </span>
              </td>
            </tr>
            <tr>
              <td class="label">ID Number</td>
              <td class="value font-mono"><strong>${contact.id_number || 'N/A'}</strong></td>
              <td class="label">Risk Category</td>
              <td class="value">
                <span class="badge ${
                  contact.kyc_risk_flag === 'HIGH' ? 'badge-red' : 
                  contact.kyc_risk_flag === 'MEDIUM' ? 'badge-orange' : 'badge-green'
                }">
                  ${contact.kyc_risk_flag || 'LOW'}
                </span>
              </td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="value">${contact.email || 'N/A'}</td>
              <td class="label">Phone Number</td>
              <td class="value">${contact.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Source Node</td>
              <td class="value">${contact.source || 'Direct Entry'}</td>
              <td class="label">Member Since</td>
              <td class="value">${new Date(contact.created_at).toLocaleDateString('en-ZA')}</td>
            </tr>
          </table>

          <!-- SECTION 2: POPIA Consent Log -->
          <div class="section-title">2. Statutory POPIA Consent Audit Trail</div>
          {POPIA_CONSENT_CONTENT}

          <!-- SECTION 3: Identity & AML Outcomes -->
          <div class="section-title">3. Compliance Gateways & Verification Outcomes</div>
          
          <h4 style="margin: 10px 0 5px; font-size: 10.5px; color: #334155;">3.1 Home Affairs (HANIS) Identity Check Outcome</h4>
          {HANIS_OUTCOME_CONTENT}

          <h4 style="margin: 15px 0 5px; font-size: 10.5px; color: #334155;">3.2 Refinitiv World-Check AML & Sanctions screening</h4>
          {AML_OUTCOME_CONTENT}

          <!-- SECTION 4: Secure Document Locker Retention Ledger -->
          <div class="section-title">4. Private Document Vault Retention Ledger</div>
          {DOCUMENT_VAULT_CONTENT}

          <!-- Signatures block -->
          <table class="footer-signature-table">
            <tr>
              <td class="signature-box">Compliance Officer / Auditor Signature</td>
              <td>&nbsp;</td>
              <td class="signature-box" style="width: 40%;">System Verification Seal (Cryptographic)</td>
            </tr>
          </table>

          <!-- Disclaimer regulatory notice -->
          <div class="footer-disclaimer">
            <strong>Disclaimer regulatory notice:</strong> This report is generated dynamically by the LeadsMind compliance module. It aggregates results from third-party credit bureaus, international databases, and the South African Department of Home Affairs (HANIS). The data contained herein contains personal information protected under the Protection of Personal Information Act (POPIA) of South Africa. Unauthorized access, copying, or sharing of this document is strictly prohibited and constitutes a statutory breach under South African privacy frameworks.
          </div>
        </div>
      </body>
      </html>
    `;

    // Compile dynamic POPIA block
    let popiaHtml = '';
    if (!consent) {
      popiaHtml = `
        <table class="grid-table">
          <tr>
            <td colSpan="4" style="text-align: center; color: #991b1b; padding: 12px; background-color: #fef2f2; font-weight: bold; border-color: #fca5a5;">
              FICA WARNING: No POPIA consent record exists for this contact. Verifications run without explicit consent violate South African statutory requirements.
            </td>
          </tr>
        </table>
      `;
    } else {
      popiaHtml = `
        <table class="grid-table">
          <tr>
            <td class="label">Reference Key</td>
            <td class="value font-mono">${consent.reference}</td>
            <td class="label">Status</td>
            <td class="value">
              <span class="badge ${consent.status === 'obtained' ? 'badge-green' : 'badge-orange'}">
                ${consent.status}
              </span>
            </td>
          </tr>
          <tr>
            <td class="label">Granted Date</td>
            <td class="value">${consent.consent_given_at ? new Date(consent.consent_given_at).toLocaleString('en-ZA') : 'Pending'}</td>
            <td class="label">Verification IP</td>
            <td class="value font-mono">${consent.ip_address || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Dispatch Channel</td>
            <td class="value font-mono" style="text-transform: uppercase;">${consent.channel || 'email'}</td>
            <td class="label">Approved Scopes</td>
            <td class="value font-mono" style="font-size: 8.5px;">${(consent.check_types || []).join(', ')}</td>
          </tr>
        </table>
      `;
    }

    // Compile dynamic HANIS block
    let hanisHtml = '';
    if (!idCheck) {
      hanisHtml = `<p style="color: #64748b; font-style: italic; margin-bottom: 15px;">No Home Affairs (HANIS) verification check has been recorded for this contact.</p>`;
    } else {
      hanisHtml = `
        <table class="grid-table">
          <tr>
            <td class="label">Provider / System</td>
            <td class="value">${idCheck.provider} (HANIS Gateway)</td>
            <td class="label">Status</td>
            <td class="value">
              <span class="badge ${idCheck.status === 'passed' ? 'badge-green' : 'badge-red'}">
                ${idCheck.status}
              </span>
            </td>
          </tr>
          <tr>
            <td class="label">ID Valid Check</td>
            <td class="value" style="font-weight: bold; color: ${idCheck.id_valid ? '#065f46' : '#991b1b'};">${idCheck.id_valid ? 'YES / VALID' : 'NO / INVALID'}</td>
            <td class="label">Name Match Check</td>
            <td class="value" style="font-weight: bold; color: ${idCheck.name_match ? '#065f46' : '#991b1b'};">${idCheck.name_match ? 'YES / MATCH' : 'NO / MISMATCH'}</td>
          </tr>
          <tr>
            <td class="label">Alive Status</td>
            <td class="value" style="font-weight: bold; color: ${idCheck.alive_status === 'ALIVE' ? '#065f46' : '#991b1b'};">${idCheck.alive_status || 'UNKNOWN'}</td>
            <td class="label">Fraud Indicators</td>
            <td class="value" style="font-weight: bold; color: ${idCheck.fraud_indicator ? '#991b1b' : '#065f46'};">${idCheck.fraud_indicator ? 'FLAGGED (FRAUD WARNING)' : 'CLEAN'}</td>
          </tr>
          <tr>
            <td class="label">Checked By</td>
            <td class="value">${idCheck.checked_by || 'System'}</td>
            <td class="label">Checked Date</td>
            <td class="value">${new Date(idCheck.checked_at || idCheck.created_at).toLocaleString('en-ZA')}</td>
          </tr>
        </table>
      `;
    }

    // Compile dynamic AML block
    let amlHtml = '';
    if (!amlCheck) {
      amlHtml = `<p style="color: #64748b; font-style: italic; margin-bottom: 15px;">No AML & Sanctions screening check has been recorded for this contact.</p>`;
    } else {
      let amlDetailsHtml = '';
      if (amlCheck.aml_match_details && amlCheck.aml_match_details.matchedProfiles && amlCheck.aml_match_details.matchedProfiles.length > 0) {
        amlDetailsHtml = `
          <div style="margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            <strong style="font-size: 8.5px; color: #475569; text-transform: uppercase;">Sanction Matches:</strong>
            ${amlCheck.aml_match_details.matchedProfiles.map((p: any, i: number) => `
              <div style="background-color: #f8fafc; padding: 6px; border-radius: 4px; margin-top: 4px; border: 1px solid #e2e8f0; font-size: 9px;">
                <strong>${p.name || 'Sanction Name'}</strong> - ${p.category || 'List match'} (Confidence: ${p.confidence}%)
              </div>
            `).join('')}
          </div>
        `;
      }

      amlHtml = `
        <table class="grid-table">
          <tr>
            <td class="label">Provider / System</td>
            <td class="value">${amlCheck.provider} Screening</td>
            <td class="label">Match Rating</td>
            <td class="value">
              <span class="badge ${
                amlCheck.aml_match_level === 'STRONG_MATCH' ? 'badge-red' : 
                amlCheck.aml_match_level === 'MEDIUM_MATCH' ? 'badge-orange' : 'badge-green'
              }">
                ${amlCheck.aml_match_level || 'NO_MATCH'}
              </span>
            </td>
          </tr>
          <tr>
            <td class="label">Checked By</td>
            <td class="value">${amlCheck.checked_by || 'System'}</td>
            <td class="label">Checked Date</td>
            <td class="value">${new Date(amlCheck.checked_at || amlCheck.created_at).toLocaleString('en-ZA')}</td>
          </tr>
          <tr>
            <td class="label">Verification Notes</td>
            <td class="value" colSpan="3">
              <div>${amlCheck.notes || 'No notes logged.'}</div>
              ${amlDetailsHtml}
            </td>
          </tr>
        </table>
      `;
    }

    // Compile dynamic Documents block
    let docHtml = '';
    if (!documents || documents.length === 0) {
      docHtml = `<p style="color: #64748b; font-style: italic; margin-bottom: 15px;">No compliance documents have been uploaded to the FICA vault locker.</p>`;
    } else {
      docHtml = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Document Type</th>
              <th>Vault Filename</th>
              <th>Upload Date</th>
              <th>FICA 5y Retention Blocker Expiry</th>
              <th>Document Expiry Status</th>
            </tr>
          </thead>
          <tbody>
            ${documents.map(d => {
              const docTypeLabel = 
                d.document_type === 'green_id' ? 'Green ID Book' :
                d.document_type === 'smart_id' ? 'Smart ID Card' :
                d.document_type === 'passport' ? 'Passport' : 'Proof of Address (Utility Bill)';

              const isDocExpired = d.expiry_date ? new Date(d.expiry_date).getTime() < Date.now() : false;

              return `
                <tr>
                  <td><strong>${docTypeLabel}</strong></td>
                  <td class="font-mono" style="font-size: 8.5px;">${d.file_url.split('/').pop() || 'file.bin'}</td>
                  <td>${new Date(d.created_at).toLocaleDateString('en-ZA')}</td>
                  <td class="font-mono" style="font-weight: bold; color: #991b1b;">${new Date(d.retention_delete_after).toLocaleDateString('en-ZA')} (Locked)</td>
                  <td>
                    ${d.document_type === 'utility_bill' ? `
                      <span class="badge ${isDocExpired ? 'badge-red' : 'badge-green'}">
                        ${isDocExpired ? 'EXPIRED' : 'VALID'}
                      </span>
                    ` : '<span style="color: #64748b; font-style: italic;">N/A</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    const finalHtml = reportHtml
      .replace('{POPIA_CONSENT_CONTENT}', popiaHtml)
      .replace('{HANIS_OUTCOME_CONTENT}', hanisHtml)
      .replace('{AML_OUTCOME_CONTENT}', amlHtml)
      .replace('{DOCUMENT_VAULT_CONTENT}', docHtml);

    // 5. Compile HTML to PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    await browser.close();

    // 6. Return response stream
    const fileName = `FICA_Audit_Report_${contact.first_name}_${contact.last_name || ''}.pdf`.replace(/\s+/g, '_');
    
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (err: any) {
    console.error('[GET /api/kyc/reports/download/[contactId] Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error during report compiling' }, { status: 500 });
  }
}

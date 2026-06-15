/**
 * FIC Schema Transformation Engine
 * File: server/services/ficTransformer.ts
 *
 * Provides serialization services to convert internal KYC compliance and STR metadata
 * into the official XML and JSON transport layouts required by the Financial Intelligence Centre (FIC).
 */

export interface STRContactDetails {
  id: string;
  first_name: string;
  last_name?: string;
  id_number?: string;
  email?: string;
  phone?: string;
  kyc_risk_flag?: string;
}

export interface STRTransactionDetails {
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
}

export interface STRReportInput {
  report_id: string;
  workspace_id: string;
  contact: STRContactDetails;
  transaction: STRTransactionDetails;
  anomalies: string[];
  created_at?: string;
}

export class FICTransformer {
  /**
   * Helper to escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Serialize internal metadata to the official Financial Intelligence Centre XML layout.
   * Maps to standard goAML suspicious transaction report fields.
   */
  public serializeToXml(data: STRReportInput): string {
    const reportId = this.escapeXml(data.report_id);
    const dateStr = this.escapeXml(data.created_at || new Date().toISOString());
    const firstName = this.escapeXml(data.contact.first_name);
    const lastName = this.escapeXml(data.contact.last_name || '');
    const idNumber = this.escapeXml(data.contact.id_number || 'N/A');
    const email = this.escapeXml(data.contact.email || 'N/A');
    const phone = this.escapeXml(data.contact.phone || 'N/A');
    const riskFlag = this.escapeXml(data.contact.kyc_risk_flag || 'LOW');

    const amount = data.transaction.amount.toFixed(2);
    const currency = this.escapeXml(data.transaction.currency);
    const txDate = this.escapeXml(data.transaction.transaction_date);
    const txDesc = this.escapeXml(data.transaction.description);

    const xmlAnomalies = data.anomalies.map(anomaly => 
      `    <anomaly_indicator>${this.escapeXml(anomaly)}</anomaly_indicator>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<fic_goaml_report>
  <header>
    <report_id>${reportId}</report_id>
    <report_type>STR</report_type>
    <date_generated>${dateStr}</date_generated>
    <regulatory_authority>Financial Intelligence Centre (FIC) South Africa</regulatory_authority>
  </header>
  <report_subject>
    <subject_id>${this.escapeXml(data.contact.id)}</subject_id>
    <first_name>${firstName}</first_name>
    <last_name>${lastName}</last_name>
    <identity_number>${idNumber}</identity_number>
    <contact_methods>
      <email>${email}</email>
      <phone>${phone}</phone>
    </contact_methods>
    <compliance_metrics>
      <internal_risk_rating>${riskFlag}</internal_risk_rating>
    </compliance_metrics>
  </report_subject>
  <transaction_details>
    <amount>${amount}</amount>
    <currency>${currency}</currency>
    <execution_date>${txDate}</execution_date>
    <narrative>${txDesc}</narrative>
  </transaction_details>
  <operational_flags>
${xmlAnomalies || '    <anomaly_indicator>None Logged</anomaly_indicator>'}
  </operational_flags>
</fic_goaml_report>`;
  }

  /**
   * Serialize internal metadata to the official transport JSON layout.
   */
  public serializeToJson(data: STRReportInput): any {
    return {
      fic_transport_meta: {
        schema_version: '1.0.0',
        report_id: data.report_id,
        report_type: 'STR',
        authority: 'Financial Intelligence Centre (South Africa)',
        timestamp: data.created_at || new Date().toISOString()
      },
      subject: {
        id: data.contact.id,
        first_name: data.contact.first_name,
        last_name: data.contact.last_name || null,
        national_id: data.contact.id_number || null,
        email: data.contact.email || null,
        phone: data.contact.phone || null,
        risk_grade: data.contact.kyc_risk_flag || 'LOW'
      },
      transaction: {
        amount: data.transaction.amount,
        currency: data.transaction.currency,
        value_date: data.transaction.transaction_date,
        reason: data.transaction.description
      },
      anomalies: data.anomalies
    };
  }
}

export const ficTransformer = new FICTransformer();

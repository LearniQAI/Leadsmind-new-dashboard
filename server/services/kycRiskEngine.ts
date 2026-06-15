import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

class KYCRiskEngine {
  /**
   * Centralized risk rating calculator
   * Evaluates identity, alive status, credit history, and aml checks logs.
   */
  public async calculateRiskRating(contactId: string, workspaceId: string): Promise<any> {
    // 1. Fetch consent status
    const { data: consent } = await supabase
      .from('kyc_consent')
      .select('status')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consent || consent.status !== 'obtained') {
      return this.saveRating(contactId, workspaceId, 'grey', false);
    }

    // 2. Fetch kyc_checks
    const { data: checks } = await supabase
      .from('kyc_checks')
      .select('*')
      .eq('contact_id', contactId);

    const checkList = checks || [];

    if (checkList.length === 0) {
      return this.saveRating(contactId, workspaceId, 'grey', false);
    }

    // 3. Fetch kyc_documents
    const { data: docs } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('contact_id', contactId);

    const docList = docs || [];

    // Evaluate FICA completeness: ID document (green_id/smart_id/passport) + active utility bill
    const hasIdDoc = docList.some(d => ['green_id', 'smart_id', 'passport'].includes(d.document_type));
    const hasActiveUtilityBill = docList.some(
      d => d.document_type === 'utility_bill' && (!d.expiry_date || new Date(d.expiry_date).getTime() > Date.now())
    );
    const ficaComplete = hasIdDoc && hasActiveUtilityBill;

    // 4. Fetch contact tags
    const { data: contact } = await supabase
      .from('contacts')
      .select('tags, kyc_risk_flag')
      .eq('id', contactId)
      .single();

    const tags = contact?.tags || [];
    const isHighRiskCountry = tags.includes('high-risk-country');

    // 5. Evaluate Matrix Rules:
    
    // RED (High Risk):
    // Active fraud flags OR confirmed sanctions hits OR high-risk country source OR deceased ID flag.
    const hasFraud = checkList.some(c => c.fraud_indicator === true);
    const hasSanctions = checkList.some(c => c.on_sanctions_list === true);
    const isDeceased = checkList.some(c => c.alive_status === 'DECEASED');
    const hasStrongAmlMatch = checkList.some(c => c.aml_match_level === 'STRONG_MATCH');

    if (hasFraud || hasSanctions || isDeceased || isHighRiskCountry || hasStrongAmlMatch || contact?.kyc_risk_flag === 'HIGH') {
      return this.saveRating(contactId, workspaceId, 'red', ficaComplete);
    }

    // AMBER (Medium Risk):
    // Valid ID + (Partial Address Sync OR Fair/Poor Credit Profile OR Unconfirmed PEP Matches)
    const hasIdValidCheck = checkList.some(c => c.check_type === 'hanis_identity' && c.id_valid === true);
    const hasBiometricPass = checkList.some(c => c.check_type === 'biometric' && c.status === 'passed');
    const hasAnyValidId = hasIdValidCheck || hasBiometricPass;

    // Partial address sync: Address check failed or missing
    const addressCheck = checkList.find(c => c.check_type === 'address_verification');
    const isPartialAddressSync = !addressCheck || addressCheck.status === 'failed';

    // Fair/Poor credit profile (Credit score between 300 and 669)
    const creditChecks = checkList.filter(c => ['credit_report', 'credit_score', 'xds_credit'].includes(c.check_type));
    const hasFairOrPoorCredit = creditChecks.some(c => {
      const score = c.credit_score !== undefined ? c.credit_score : (c.score !== undefined ? c.score : null);
      return score !== null && score >= 300 && score <= 669;
    });

    // Unconfirmed PEP matches (is_pep === true but marked as manual_review or pending review)
    const hasUnconfirmedPep = checkList.some(
      c => c.check_type === 'pep_check' && c.is_pep === true && c.status === 'manual_review'
    );

    if (hasAnyValidId && (isPartialAddressSync || hasFairOrPoorCredit || hasUnconfirmedPep)) {
      return this.saveRating(contactId, workspaceId, 'amber', ficaComplete);
    }

    // GREEN (Low Risk):
    // ID Validated + Name Matches HANIS + Alive Verified + Clear AML Logs + No Extreme Credit Alerts (score >= 670).
    const hanisCheck = checkList.find(c => c.check_type === 'hanis_identity');
    const amlChecks = checkList.filter(c => ['sanctions_screen', 'pep_check'].includes(c.check_type));
    const clearAml = amlChecks.every(c => c.status === 'passed' && c.on_sanctions_list !== true && c.is_pep !== true);

    const hasGoodCredit = creditChecks.every(c => {
      const score = c.credit_score !== undefined ? c.credit_score : (c.score !== undefined ? c.score : null);
      return score === null || score >= 670;
    });

    const isHanisGreen = hanisCheck && hanisCheck.id_valid === true && hanisCheck.name_match === true && hanisCheck.alive_status === 'ALIVE';
    const isBioGreen = hasBiometricPass;

    if ((isHanisGreen || isBioGreen) && clearAml && hasGoodCredit && !isPartialAddressSync) {
      return this.saveRating(contactId, workspaceId, 'green', ficaComplete);
    }

    // Fallback: If ID is valid but doesn't meet all Green conditions, mark Amber, else Grey
    if (hasAnyValidId) {
      return this.saveRating(contactId, workspaceId, 'amber', ficaComplete);
    } else {
      return this.saveRating(contactId, workspaceId, 'grey', ficaComplete);
    }
  }

  /**
   * Save risk rating into the kyc_risk_ratings table
   */
  private async saveRating(
    contactId: string,
    workspaceId: string,
    rating: 'green' | 'amber' | 'red' | 'grey',
    ficaComplete: boolean
  ): Promise<any> {
    const calculatedAt = new Date().toISOString();

    // Query existing record to calculate FICA completed date correctly
    const { data: existing } = await supabase
      .from('kyc_risk_ratings')
      .select('*')
      .eq('contact_id', contactId)
      .maybeSingle();

    let ficaCompletedAt = existing?.fica_completed_at || null;
    if (ficaComplete && !existing?.fica_complete) {
      ficaCompletedAt = calculatedAt;
    } else if (!ficaComplete) {
      ficaCompletedAt = null;
    }

    const { data, error } = await supabase
      .from('kyc_risk_ratings')
      .upsert(
        {
          workspace_id: workspaceId,
          contact_id: contactId,
          overall_rating: rating,
          rating_calculated_at: calculatedAt,
          fica_complete: ficaComplete,
          fica_completed_at: ficaCompletedAt,
          updated_at: calculatedAt,
        },
        { onConflict: 'contact_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[KYCRiskEngine] Error upserting risk rating:', error);
      throw error;
    }

    // Sync back to contacts risk flag
    let newRiskFlag = 'LOW';
    if (rating === 'red') {
      newRiskFlag = 'HIGH';
    } else if (rating === 'amber') {
      newRiskFlag = 'MEDIUM';
    }

    await supabase
      .from('contacts')
      .update({
        kyc_risk_flag: newRiskFlag,
        updated_at: calculatedAt,
      })
      .eq('id', contactId);

    return data;
  }
}

export const kycRiskEngine = new KYCRiskEngine();

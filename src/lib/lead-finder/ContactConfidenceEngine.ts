export interface ContactData {
  first_name: string;
  last_name: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
}

export class ContactConfidenceEngine {
  /**
   * Deterministic confidence scoring for contact validity.
   * Based on data richness and cross-verified presence.
   */
  public static calculateConfidence(contact: ContactData): { score: number, level: 'High' | 'Medium' | 'Low' } {
    let score = 0;

    // 1. Social Proof
    if (contact.linkedin_url) score += 35;

    // 2. Direct Outreach Feasibility
    if (contact.email) score += 35;
    if (contact.phone) score += 15;

    // 3. Profile Completeness
    if (contact.title && contact.department) score += 15;

    score = Math.min(Math.max(score, 1), 100);

    let level: 'High' | 'Medium' | 'Low' = 'Low';
    if (score >= 70) level = 'High';
    else if (score >= 40) level = 'Medium';

    return { score, level };
  }
}

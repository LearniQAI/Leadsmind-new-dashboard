export interface LeadData {
  business_name: string;
  category?: string;
  rating?: number;
  review_count?: number;
  website?: string;
  phone?: string;
  linkedin_url?: string;
  facebook_url?: string;
  employee_size?: string;
}

export class LeadScoringEngine {
  /**
   * Deterministic AI-like Lead Score (1-100)
   * Evaluates the completeness and authority of the lead's digital presence.
   */
  public static calculateScore(lead: LeadData): number {
    let score = 0;

    // 1. Google Authority (Max 35)
    if (lead.rating && lead.rating >= 4.5) score += 20;
    else if (lead.rating && lead.rating >= 4.0) score += 15;
    else if (lead.rating && lead.rating >= 3.0) score += 5;

    if (lead.review_count) {
      if (lead.review_count > 100) score += 15;
      else if (lead.review_count > 50) score += 10;
      else if (lead.review_count > 10) score += 5;
    }

    // 2. Direct Contact (Max 25)
    if (lead.website) score += 15;
    if (lead.phone) score += 10;

    // 3. Social & Corporate Presence (Max 30)
    if (lead.linkedin_url) score += 20;
    if (lead.facebook_url) score += 10;

    // 4. Data Richness (Max 10)
    if (lead.employee_size && lead.employee_size !== 'Unknown') score += 10;

    // Cap at 100
    return Math.min(Math.max(score, 1), 100);
  }

  public static getScoreTier(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }
}

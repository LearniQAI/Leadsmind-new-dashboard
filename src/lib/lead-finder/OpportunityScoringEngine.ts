export class OpportunityScoringEngine {
  /**
   * Deterministic scoring for revenue opportunity likelihood.
   * Based on lead completeness, review gaps, and digital footprint.
   */
  public static calculateOpportunity(lead: any, websiteData?: any): { score: number, tier: 'High' | 'Medium' | 'Low' } {
    let score = 0;

    // 1. Digital Deficits = Opportunity for Agency
    if (!lead.website) score += 25; // High need for web services
    else if (websiteData && websiteData.health_score < 50) score += 20;

    if (!lead.linkedin_url && !lead.facebook_url) score += 20; // Need for social management

    // 2. Reputation Deficits = Opportunity for Reputation Management
    if (lead.rating > 0 && lead.rating < 4.0) score += 25; 
    if (lead.review_count < 10) score += 15;

    // 3. Size / Budget Indicators
    if (lead.employee_size && ['51-200', '201-500', '500+'].includes(lead.employee_size)) {
      score += 20; // Larger budget
    }

    // 4. Activity
    if (lead.lead_score >= 80) score += 15; // Generally high quality lead

    score = Math.min(Math.max(score, 1), 100);

    let tier: 'High' | 'Medium' | 'Low' = 'Low';
    if (score >= 70) tier = 'High';
    else if (score >= 40) tier = 'Medium';

    return { score, tier };
  }
}

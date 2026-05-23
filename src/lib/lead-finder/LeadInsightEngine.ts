export class LeadInsightEngine {
  /**
   * Deterministic heuristics to generate actionable insights for a lead.
   * Analyzes data presence and quality to output string-based insights.
   */
  public static generateInsights(lead: any): { type: 'positive' | 'negative' | 'neutral', message: string }[] {
    const insights: { type: 'positive' | 'negative' | 'neutral', message: string }[] = [];

    // 1. Reputation Insights
    if (lead.rating >= 4.5 && lead.review_count > 50) {
      insights.push({ type: 'positive', message: 'Strong local reputation and highly reviewed.' });
    } else if (lead.rating > 0 && lead.rating < 3.5) {
      insights.push({ type: 'negative', message: 'Below average Google rating. Needs reputation management.' });
    }

    if (lead.review_count > 200) {
      insights.push({ type: 'positive', message: 'High review activity implies significant customer volume.' });
    }

    // 2. Social Insights
    if (lead.linkedin_url) {
      insights.push({ type: 'positive', message: 'Active corporate presence on LinkedIn.' });
    }
    
    if (lead.facebook_url) {
      insights.push({ type: 'positive', message: 'Active consumer presence on Facebook.' });
    }

    if (!lead.linkedin_url && !lead.facebook_url && lead.website) {
      insights.push({ type: 'neutral', message: 'Has website but lacks major social channels.' });
    }

    // 3. Size Insights
    if (lead.employee_size && ['51-200', '201-500', '500+'].includes(lead.employee_size)) {
      insights.push({ type: 'positive', message: 'Mid-market to Enterprise scale employee size.' });
    }

    // 4. Missing Data Opportunities
    if (!lead.website) {
      insights.push({ type: 'negative', message: 'Missing website. Potential web design or digital presence prospect.' });
    }

    // Default insight if empty
    if (insights.length === 0) {
      insights.push({ type: 'neutral', message: 'Standard operational business profile.' });
    }

    return insights;
  }
}

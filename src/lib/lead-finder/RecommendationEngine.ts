export class RecommendationEngine {
  /**
   * Generates deterministic recommendations for the sales rep.
   */
  public static generateRecommendations(lead: any, websiteData?: any): { type: string, message: string }[] {
    const recommendations: { type: string, message: string }[] = [];

    // Angle
    if (!lead.website) {
      recommendations.push({ type: 'angle', message: 'Pitch full digital presence overhaul (Website + Setup)' });
    } else if (websiteData && websiteData.health_score < 50) {
      recommendations.push({ type: 'angle', message: 'Pitch modern website rebuild and performance optimization' });
    } else {
      recommendations.push({ type: 'angle', message: 'Pitch growth marketing and lead generation' });
    }

    // Pain Point
    if (lead.rating > 0 && lead.rating < 4.0) {
      recommendations.push({ type: 'pain_point', message: 'Low review rating is likely costing them local foot traffic.' });
    } else if (lead.review_count < 20) {
      recommendations.push({ type: 'pain_point', message: 'Low review volume makes them invisible compared to competitors.' });
    } else if (!lead.linkedin_url && !lead.facebook_url) {
      recommendations.push({ type: 'pain_point', message: 'Zero social presence limits top-of-funnel awareness.' });
    }

    // Service Opportunity
    if (websiteData && !websiteData.has_booking) {
      recommendations.push({ type: 'service_opportunity', message: 'Implement automated booking system/chatbot' });
    } else if (!websiteData?.has_social_links) {
      recommendations.push({ type: 'service_opportunity', message: 'Social Media Management & Setup' });
    }

    if (recommendations.length === 0) {
      recommendations.push({ type: 'angle', message: 'Standard CRM onboarding and retention strategy' });
    }

    return recommendations;
  }
}

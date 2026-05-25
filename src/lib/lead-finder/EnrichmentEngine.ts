import { LinkedInEnrichmentService } from './LinkedInEnrichmentService';
import { FacebookEnrichmentService } from './FacebookEnrichmentService';
import { LeadScoringEngine, LeadData } from './LeadScoringEngine';

export class EnrichmentEngine {
  /**
   * Pipeline that merges Google data with social enrichment providers
   * safely preserving the base Google Maps integrity.
   */
  public static async enrichLead(baseLead: LeadData) {
    try {
      // Run enrichment in parallel
      const [linkedinData, facebookData] = await Promise.all([
        LinkedInEnrichmentService.enrich(baseLead.business_name, baseLead.website),
        FacebookEnrichmentService.enrich(baseLead.business_name, baseLead.category)
      ]);

      // Safely merge, ensuring Google data takes precedence for core fields
      const enrichedLead = {
        ...baseLead,
        linkedin_url: linkedinData?.linkedin_url || null,
        facebook_url: facebookData?.facebook_url || null,
        employee_size: linkedinData?.employee_size || 'Unknown',
        industry: linkedinData?.industry || baseLead.category,
        description: linkedinData?.description || facebookData?.description || null,
        enrichment_status: 'completed'
      };

      // Calculate AI score on the merged object
      const lead_score = LeadScoringEngine.calculateScore(enrichedLead);

      return {
        ...enrichedLead,
        lead_score
      };
    } catch (error) {
      console.error('[EnrichmentEngine] Failed to enrich lead:', error);
      // Fallback gracefully without throwing
      return {
        ...baseLead,
        lead_score: LeadScoringEngine.calculateScore(baseLead),
        enrichment_status: 'failed'
      };
    }
  }
}

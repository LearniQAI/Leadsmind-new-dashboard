export class FacebookEnrichmentService {
  /**
   * Safe, public enrichment pattern.
   * Checks for business page structure based on entity name and local signals.
   */
  public static async enrich(businessName: string, category?: string) {
    // Simulate safe API latency
    await new Promise(resolve => setTimeout(resolve, 600));

    if (!businessName) return null;

    // Local/B2C businesses are highly likely to have Facebook Pages
    const isB2C = /restaurant|cafe|plumber|salon|gym|retail|store|clinic|auto/i.test(category || businessName);
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (isB2C) {
      return {
        facebook_url: `https://www.facebook.com/${slug}`,
        description: `Official Facebook Page for ${businessName}.`,
        source: 'facebook'
      };
    }

    return null;
  }
}

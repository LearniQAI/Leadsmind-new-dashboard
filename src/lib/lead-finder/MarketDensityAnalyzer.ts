export class MarketDensityAnalyzer {
  /**
   * Evaluates the saturation and density of a market based on the volume of leads and average ratings.
   */
  public static analyzeDensity(leads: any[]): { saturation: 'High' | 'Medium' | 'Low', averageRating: number } {
    if (!leads || leads.length === 0) return { saturation: 'Low', averageRating: 0 };

    const totalRating = leads.reduce((acc, l) => acc + (l.rating || 0), 0);
    const averageRating = totalRating / leads.length;

    let saturation: 'High' | 'Medium' | 'Low' = 'Low';
    if (leads.length > 50) saturation = 'High';
    else if (leads.length > 15) saturation = 'Medium';

    return { saturation, averageRating };
  }
}

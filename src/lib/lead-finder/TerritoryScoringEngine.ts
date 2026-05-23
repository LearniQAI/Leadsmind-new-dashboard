export class TerritoryScoringEngine {
  /**
   * Generates deterministic opportunity scores for a given geographic territory.
   * High score = High opportunity for agency services (low ratings, missing websites, etc.)
   */
  public static calculateTerritoryScore(leads: any[]): { score: number, level: 'High' | 'Medium' | 'Low', insights: any[] } {
    if (!leads || leads.length === 0) return { score: 0, level: 'Low', insights: [] };

    let totalScore = 0;
    const insights: any[] = [];

    // Aggregates
    const missingWebsites = leads.filter(l => !l.website).length;
    const lowRating = leads.filter(l => l.rating > 0 && l.rating < 4.0).length;
    
    const websiteDeficitPercent = missingWebsites / leads.length;
    const reputationDeficitPercent = lowRating / leads.length;

    if (websiteDeficitPercent > 0.4) {
      totalScore += 40;
      insights.push({ type: 'gap', message: 'High concentration of businesses without websites.' });
    } else if (websiteDeficitPercent > 0.2) {
      totalScore += 20;
    }

    if (reputationDeficitPercent > 0.3) {
      totalScore += 40;
      insights.push({ type: 'opportunity', message: 'Strong local reputation management opportunity.' });
    }

    if (leads.length > 20) {
      totalScore += 20; // High density implies budget/activity
    }

    const score = Math.min(Math.max(totalScore, 1), 100);
    
    let level: 'High' | 'Medium' | 'Low' = 'Low';
    if (score >= 70) level = 'High';
    else if (score >= 40) level = 'Medium';

    if (leads.length < 5) {
      insights.push({ type: 'saturation', message: 'Low competition territory. Early mover advantage.' });
    }

    return { score, level, insights };
  }
}

interface ScoringSignals {
  headcount: number;
  industryMatch: boolean;
  hasLegacyTech: boolean;
  recentTriggerEvent: boolean;
  painPointMatch: boolean;
  engagementScore: number; 
}

export class ScoringEngine {
  public static evaluate(signals: ScoringSignals): { finalScore: number; breakdown: any } {
    let score = 0;
    const breakdown = { size: 0, industry: 0, techGap: 0, trigger: 0, pain: 0, engagement: 0 };

    if (signals.headcount >= 20 && signals.headcount <= 150) {
      score += 20; breakdown.size = 20;
    }
    if (signals.industryMatch) {
      score += 15; breakdown.industry = 15;
    }
    if (signals.hasLegacyTech) {
      score += 20; breakdown.techGap = 20;
    }
    if (signals.recentTriggerEvent) {
      score += 25; breakdown.trigger = 25;
    }
    if (signals.painPointMatch) {
      score += 10; breakdown.pain = 10;
    }
    
    const engagementContribution = Math.min(signals.engagementScore * 2, 10);
    score += engagementContribution;
    breakdown.engagement = engagementContribution;

    return { finalScore: Math.min(score, 100), breakdown };
  }
}

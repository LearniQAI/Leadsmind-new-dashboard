/**
 * AIAnalyticsInterpreter — parses conversion trends, unique views,
 * completion times, and generates plain-language CRO breakdowns.
 */

import { AIService } from './AIService';
import { PromptManager } from './PromptManager';

export interface AnalyticsInsight {
  type: 'abandonment' | 'friction' | 'timing' | 'mobile';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  recommendation: string;
  priority: number;
}

export const AIAnalyticsInterpreter = {
  /**
   * Translates raw numeric stats into simple conversion advice cards.
   */
  async interpretStats(stats: Record<string, any>): Promise<AnalyticsInsight[]> {
    const cacheKey = `analytics-interpret:${JSON.stringify(stats)}`;
    const prompt = PromptManager.getAnalyticsInsightPrompt(stats);

    const res = await AIService.invokeAI(cacheKey, prompt, () => 
      this.interpretStatsLocalFallback(stats)
    );

    return res.data?.insights || [];
  },

  /**
   * Local CRO interpretation heuristics rules engine.
   */
  interpretStatsLocalFallback(stats: Record<string, any>): { insights: AnalyticsInsight[] } {
    const insights: AnalyticsInsight[] = [];
    const views = stats.views || 0;
    const submissions = stats.submissions || 0;
    const convRate = views > 0 ? (submissions / views) * 100 : 0;

    // 1. Weak conversion rate analysis
    if (convRate < 10) {
      insights.push({
        type: 'abandonment',
        severity: 'high',
        explanation: `Form conversion rate is only ${Math.round(convRate)}%. This is significantly below the industry average of 15-20%.`,
        recommendation: 'Evaluate field counts. Removing non-essential inputs or switching to a multi-step wizard typically boosts conversions by 30%.',
        priority: 1
      });
    } else {
      insights.push({
        type: 'abandonment',
        severity: 'low',
        explanation: `Conversion rate is looking healthy at ${Math.round(convRate)}%. Excellent job!`,
        recommendation: 'Incorporate social proof or customer logos near the form CTA to lock in higher brand trust.',
        priority: 3
      });
    }

    // 2. Average completion time analysis
    const avgTimeSec = stats.averageTimeSeconds || 0;
    if (avgTimeSec > 120) {
      insights.push({
        type: 'timing',
        severity: 'medium',
        explanation: `Visitors take an average of ${Math.round(avgTimeSec / 60)} minutes to complete the form, indicating mental fatigue.`,
        recommendation: 'Enable pre-fill tokens for returning contacts and implement smart auto-save to allow progress recovery.',
        priority: 2
      });
    }

    // 3. Device/mobile variant comparison analysis
    const mobileConv = stats.mobileConversionRate || 0;
    const desktopConv = stats.desktopConversionRate || 0;

    if (desktopConv - mobileConv > 8) {
      insights.push({
        type: 'mobile',
        severity: 'high',
        explanation: `Mobile conversion rate (${Math.round(mobileConv)}%) is heavily lagging desktop performance (${Math.round(desktopConv)}%).`,
        recommendation: 'Verify mobile layout alignment. Ensure buttons are full-width, inputs have responsive font sizes (16px to prevent zoom), and minimize touch-drag fields.',
        priority: 1
      });
    }

    return { insights };
  }
};

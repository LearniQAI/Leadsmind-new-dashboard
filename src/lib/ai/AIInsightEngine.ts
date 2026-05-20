/**
 * AIInsightEngine — powers copy optimization suggestions, tone rewrites,
 * and recovery optimization timings.
 */

import { AIService } from './AIService';
import { PromptManager } from './PromptManager';

export interface CopySuggestion {
  headline: string;
  cta: string;
  helperText: string;
  description: string;
}

export const AIInsightEngine = {
  /**
   * Generates alternative copy versions tailored by conversion-best practices and tones.
   */
  async optimizeCopy(text: string, tone = 'professional'): Promise<CopySuggestion[]> {
    const cacheKey = `copy-opt:${tone}:${text.trim().toLowerCase()}`;
    const prompt = PromptManager.getCopyOptimizationPrompt(text, tone);

    const res = await AIService.invokeAI(cacheKey, prompt, () => 
      this.optimizeCopyLocalFallback(text, tone)
    );

    return res.data?.suggestions || [];
  },

  /**
   * Local CRO copy optimizer rules engine.
   */
  optimizeCopyLocalFallback(text: string, tone: string): { suggestions: CopySuggestion[] } {
    const lower = text.toLowerCase();

    // Default suggestions based on tone
    if (tone === 'playful') {
      return {
        suggestions: [
          {
            headline: 'Let\'s get this show on the road! 🚀',
            cta: 'Count me in! 🎉',
            helperText: 'No spam, just good vibes, promise.',
            description: 'Tell us a bit about yourself and we will get you set up in a jiffy.'
          },
          {
            headline: 'Ready to level up your forms? 🎮',
            cta: 'Unlock access! 🔓',
            helperText: 'Takes less than 60 seconds.',
            description: 'Join the cool kids club and start collecting high-intent responses.'
          }
        ]
      };
    }

    if (tone === 'urgent' || tone === 'conversion') {
      return {
        suggestions: [
          {
            headline: 'Claim your exclusive access today',
            cta: 'Get instant access now',
            helperText: 'Limited seats available for this cohort.',
            description: 'Fill out this quick form and lock in your priority boarding spot.'
          },
          {
            headline: 'Don\'t miss out on premium lead tools',
            cta: 'Start converting free',
            helperText: 'Offer expires end of this week.',
            description: 'Upgrade your intake game now and start converting up to 40% more traffic.'
          }
        ]
      };
    }

    // Professional/default
    return {
      suggestions: [
        {
          headline: 'Transform your lead capturing experience',
          cta: 'Request your free demo',
          helperText: 'Dedicated account representative response within 2 hours.',
          description: 'Introduce your project requirements and receive a customized platform roadmap.'
        },
        {
          headline: 'Elevate your conversion metrics',
          cta: 'Schedule strategy call',
          helperText: 'No credit card required to start onboarding.',
          description: 'A tailored, conversion-focused solution designed for your workspace.'
        }
      ]
    };
  },

  /**
   * Generates recovery optimization strategies based on step dropout logs.
   */
  async getRecoveryOptimization(stats: Record<string, any>): Promise<string[]> {
    const cacheKey = `recovery-opt:${JSON.stringify(stats)}`;
    // Lightweight local recommendations rules engine
    const completionRate = stats.completedCount / (stats.startedCount || 1);
    
    const recommendations: string[] = [];

    if (completionRate < 0.4) {
      recommendations.push('High dropout rate detected on step 2. Suggest splitting step 2 inputs into two separate, bite-sized form steps to reduce user friction.');
      recommendations.push('Reduce number of required textareas. Fields with large description boxes trigger up to 35% higher dropouts.');
    }

    if (stats.mobileFrictionCount > 5) {
      recommendations.push('Detected mobile layout friction. Keep fields vertical on mobile and simplify your file upload/signature requirements.');
    }

    if (stats.abandonmentTimingSeconds && stats.abandonmentTimingSeconds < 15) {
      recommendations.push('Quick abandonment detected. Consider triggering the auto-save recovery emails after 5 minutes instead of 30 minutes.');
    } else {
      recommendations.push('Schedule recovery reminder emails at a 20-minute delay interval for the highest industry reactivation rates.');
    }

    return recommendations;
  }
};

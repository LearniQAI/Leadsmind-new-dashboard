/**
 * OnboardingManager — tracks user onboarding states, checklist steps
 * (workspace, form, embed, automation), and saves skip selections.
 */

import { createClient } from '@/lib/supabase/client';

export interface OnboardingState {
  user_email: string;
  checklist_completed: string[];
  skipped: boolean;
}

export const OnboardingManager = {
  /**
   * Load onboarding tracking details for a user.
   */
  async loadState(email: string): Promise<OnboardingState> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_email', email)
        .single();

      if (data) {
        return {
          user_email: data.user_email,
          checklist_completed: Array.isArray(data.checklist_completed) ? data.checklist_completed : [],
          skipped: !!data.skipped
        };
      }
    } catch (err) {
      console.warn('[OnboardingManager] State missing for user:', email);
    }

    return { user_email: email, checklist_completed: [], skipped: false };
  },

  /**
   * Set onboarding item step as completed.
   */
  async completeStep(email: string, stepKey: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const state = await this.loadState(email);
      if (state.checklist_completed.includes(stepKey)) return true;

      const updated = [...state.checklist_completed, stepKey];
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_email: email,
          checklist_completed: updated,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[OnboardingManager] Save step failed:', err);
      return false;
    }
  },

  /**
   * Set onboarding tour skip state.
   */
  async skipTour(email: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_email: email,
          skipped: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[OnboardingManager] Skip tour failed:', err);
      return false;
    }
  }
};

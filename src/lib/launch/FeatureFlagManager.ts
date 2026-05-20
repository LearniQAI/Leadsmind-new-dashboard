/**
 * FeatureFlagManager — handles beta feature flags, maintenance blocks,
 * and sandbox diagnostics checks.
 */

import { createClient } from '@/lib/supabase/client';

export const FeatureFlagManager = {
  privateCachedFlags: new Map<string, boolean>(),

  /**
   * Evaluates if a feature flag is enabled.
   */
  async isEnabled(flagKey: string): Promise<boolean> {
    // 1. Check local memory cache
    if (this.privateCachedFlags.has(flagKey)) {
      return !!this.privateCachedFlags.get(flagKey);
    }

    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('form_feature_flags')
        .select('is_enabled')
        .eq('flag_key', flagKey)
        .single();

      if (data) {
        const val = !!data.is_enabled;
        this.privateCachedFlags.set(flagKey, val);
        return val;
      }
    } catch {
      // Fallbacks in case table is not migrated yet
      if (flagKey === 'maintenance_mode') return false;
      return true;
    }

    return false;
  },

  /**
   * Set feature flag status dynamically (admin only).
   */
  async setFlag(flagKey: string, isEnabled: boolean): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('form_feature_flags')
        .upsert({
          flag_key: flagKey,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      this.privateCachedFlags.set(flagKey, isEnabled);
      return true;
    } catch {
      return false;
    }
  }
};

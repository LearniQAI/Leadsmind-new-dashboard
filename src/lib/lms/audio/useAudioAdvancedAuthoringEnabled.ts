"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AUDIO_ADVANCED_AUTHORING_FLAG_KEY } from './advancedAuthoring';

// UI half of the advanced-authoring lock (see advancedAuthoring.ts). Reads the same
// form_feature_flags row as the RLS policies and the API guard (authenticated users may SELECT it).
// false while loading and on any error, so the editors never flash open when the feature is locked.
export function useAudioAdvancedAuthoringEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from('form_feature_flags')
      .select('is_enabled')
      .eq('flag_key', AUDIO_ADVANCED_AUTHORING_FLAG_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled) setEnabled(!error && data?.is_enabled === true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}

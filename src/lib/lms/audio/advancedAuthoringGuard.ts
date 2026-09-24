import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { AUDIO_ADVANCED_AUTHORING_FLAG_KEY, AUDIO_ADVANCED_AUTHORING_LOCKED_MESSAGE } from './advancedAuthoring';

// Server half of the advanced-authoring lock (see advancedAuthoring.ts). Call first in every write
// handler of the speakers / audio-lesson-speakers / audio-speaker-segments / audio-chapters /
// transcript-segments routes: returns the rejection to send while locked, or null to proceed.
// GET handlers never call it — reading existing data stays available.
//
// These routes write through the service-role client, which bypasses RLS, so this check (not the
// RLS policy) is what stops them. It reads the SAME form_feature_flags row the RLS policies read.
// Fails closed: a missing row or a read error counts as locked.
export async function advancedAuthoringLockedResponse(): Promise<NextResponse | null> {
  const { data, error } = await createAdminClient()
    .from('form_feature_flags')
    .select('is_enabled')
    .eq('flag_key', AUDIO_ADVANCED_AUTHORING_FLAG_KEY)
    .maybeSingle();
  if (error) logger.error({ err: error }, 'lms.audio.advanced_authoring_flag.read_failed');
  if (!error && data?.is_enabled === true) return null;
  return NextResponse.json(
    { error: AUDIO_ADVANCED_AUTHORING_LOCKED_MESSAGE, code: 'FEATURE_NOT_YET_AVAILABLE' },
    { status: 403 }
  );
}

  'use server';

import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export async function getReleaseNotesForRoute(pathname: string) {
  try {
    const supabase = await createServerClient();
    
    // Normalize path (e.g. remove trailing slash, handle sub-routes if needed)
    let normalizedPath = pathname || '/';
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    // Match exact screen_route or if screen_route is a prefix of pathname
    const { data, error } = await supabase
      .from('platform_release_notes')
      .select('id, title, description, screen_route, created_at')
      .eq('is_active', true)
      .eq('screen_route', normalizedPath)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ err: error, pathname }, 'release_notes.fetch.failed');
      return { data: [], error: 'Failed to fetch release notes.' };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    logger.error({ err, pathname }, 'release_notes.fetch_action.failed');
    return { data: [], error: 'Failed to fetch release notes.' };
  }
}

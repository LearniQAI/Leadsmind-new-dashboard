'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

// getCalendars/createCalendar/updateCalendar/deleteCalendar previously lived
// here as one of three drifted copies of booking_calendars CRUD (alongside
// calendar/calendars.ts and calendar.ts) — confirmed to have zero live
// callers (Priority 2 consolidation) and removed. The live path is
// calendar/calendars.ts (wired to CalendarPagesView.tsx), which now also
// carries the requireWorkspaceAccess() + field-allow-list fixes calendar.ts
// alone previously had (partially) and this file never had at all.
// getPublicCalendarBySlug below is unrelated (a different, genuinely public
// lookup) and stays.

/**
 * Public lookup for booking pages
 */
export async function getPublicCalendarBySlug(slug: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('booking_calendars')
        .select(`
          *,
          workspace:workspaces(name, slug, logo_url)
        `)
        .eq('slug', slug)
        .single();

    if (error) {
        logger.error({ err: error, slug }, 'calendar.public_calendar.fetch.failed');
        return null;
    }
    return data;
}

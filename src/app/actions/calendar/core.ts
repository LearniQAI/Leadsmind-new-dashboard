'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { resolveHost } from '@/lib/domains/resolve';

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

    // booking_calendars is unique on (workspace_id, slug), NOT on slug alone. Served through a
    // tenant's connected custom domain, scope the lookup to that domain's workspace so two
    // workspaces sharing a slug (e.g. "discovery-call") never collide.
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
    const tenant = host ? await resolveHost(host) : null;

    let query = supabase
        .from('booking_calendars')
        .select(`
          *,
          workspace:workspaces(name, slug, logo_url)
        `)
        .eq('slug', slug);
    if (tenant) query = query.eq('workspace_id', tenant.workspaceId);

    const { data: rows, error } = await query.limit(2);

    if (error) {
        logger.error({ err: error, slug }, 'calendar.public_calendar.fetch.failed');
        return null;
    }
    if (!rows || rows.length === 0) return null;
    if (rows.length > 1) {
        // Only reachable on the platform's own domain, where a bare slug can't say which
        // workspace is meant. Refuse rather than guess (never show one tenant's calendar for
        // another's link).
        logger.warn({ slug }, 'calendar.public_calendar.ambiguous_slug');
        return null;
    }
    return rows[0];
}

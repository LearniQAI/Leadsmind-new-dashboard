import { NextRequest, NextResponse } from 'next/server';
import { getStaffBookableSlots } from '@/app/actions/calendar/appointments';

export const dynamic = 'force-dynamic';

// Availability for the staff booking dialog. A plain GET (not a server action) on purpose: Next runs a
// page's server actions one at a time, so a hung availability call would queue every later action —
// including the user's Retry — behind it. A fetch() can be cancelled with AbortSignal.timeout.
// Auth + workspace scoping happen inside getStaffBookableSlots (requireWorkspaceAccess), the same
// guard the action always had; this route adds no new access.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await getStaffBookableSlots(params.get('calendarId') ?? '', params.get('date') ?? '');
  // Real HTTP statuses (the action only returns a message): no session -> 401, not a member / no workspace
  // -> 403, another workspace's or unknown calendar -> 404 (same answer for both, so ids can't be probed).
  let status = 200;
  if (!result.success) {
    const msg = String((result as { error?: string }).error ?? '');
    status = /unauthor/i.test(msg) ? 401 : /not a member|no active workspace|forbidden/i.test(msg) ? 403 : /not found/i.test(msg) ? 404 : 422;
  }
  return NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store' } });
}

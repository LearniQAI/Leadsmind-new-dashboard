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
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

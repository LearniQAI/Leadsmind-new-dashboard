import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MetaData from '@/hooks/useMetaData';
import BookingsClient from '@/components/portal/BookingsClient';
import { generateWaitlistToken } from '@/lib/calendar/waitlistToken';

export const dynamic = 'force-dynamic';

export default async function PortalBookingsPage() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const supabase = createAdminClient();

  // 1. Fetch appointments for this contact in this workspace
  const { data: dbAppts } = await supabase
    .from('appointments')
    .select('*, calendar:booking_calendars(*)')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id)
    .order('start_time', { ascending: true });

  const ownAppointments = dbAppts || [];

  // 1b. Group-session spots this contact holds as a per-attendee record
  //     (booking_waitlists, confirmed + not cancelled). This is how every
  //     booked class attendee — not just the session's original contact_id —
  //     sees and manages their own spot. Each carries a token scoped to their
  //     own attendee record so cancel routes through cancelMyClassSpot.
  const { data: attendeeRows } = await supabase
    .from('booking_waitlists')
    .select('id, appointment_id, appointment:appointments(*, calendar:booking_calendars(*))')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id)
    .eq('confirmed', true)
    .is('cancelled_at', null);

  const attendeeAppointments = (attendeeRows || [])
    .filter((r: any) => r.appointment && r.appointment.status !== 'cancelled')
    .map((r: any) => ({
      ...r.appointment,
      _isGroupAttendee: true,
      _attendeeRecordId: r.id,
      _attendeeToken: generateWaitlistToken(r.id),
    }));

  // The first booker appears in BOTH lists — prefer the attendee-scoped copy
  // so their cancel also only frees their own spot, not the whole session.
  const attendeeAptIds = new Set(attendeeAppointments.map((a: any) => a.id));
  const appointments = [
    ...ownAppointments.filter((a: any) => !attendeeAptIds.has(a.id)),
    ...attendeeAppointments,
  ].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // 2. Fetch available scheduling configurations (calendars) in this workspace
  const { data: dbCalendars } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('name', { ascending: true });

  const calendars = dbCalendars || [];

  return (
    <MetaData pageTitle="My Bookings">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Meeting <span className="text-dash-accent">Bookings</span>
          </h1>
          <p className="text-[11.5px] text-dash-textMuted uppercase tracking-[0.2em] mt-2 font-medium">
            Manage your scheduled consulting sessions and book new appointments
          </p>
        </div>

        {/* Dynamic Scheduler & Meeting List Dashboard */}
        <BookingsClient initialAppointments={appointments} calendars={calendars} />
      </div>
    </MetaData>
  );
}


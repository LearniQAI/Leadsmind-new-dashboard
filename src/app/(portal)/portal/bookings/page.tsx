import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MetaData from '@/hooks/useMetaData';
import BookingsClient from '@/components/portal/BookingsClient';

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

  const appointments = dbAppts || [];

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
            Meeting <span className="text-[var(--accent2)]">Bookings</span>
          </h1>
          <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
            Manage your scheduled consulting sessions and book new appointments
          </p>
        </div>

        {/* Dynamic Scheduler & Meeting List Dashboard */}
        <BookingsClient initialAppointments={appointments} calendars={calendars} />
      </div>
    </MetaData>
  );
}


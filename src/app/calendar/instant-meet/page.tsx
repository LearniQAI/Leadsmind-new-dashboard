import React from 'react';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from '@/components/layouts/DefaultWrapper';
import InstantMeetClient from '@/components/calendar/InstantMeetClient';
import { Video } from 'lucide-react';

export default async function InstantMeetPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createServerClient();

  // 1. Fetch active calendars for testing link previews
  const { data: calendars } = await supabase
    .from('booking_calendars')
    .select('id, name, slug')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 2. Fetch recent appointments to display in the diagnostics cockpit
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, title, start_time, end_time, status, meeting_link')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <Wrapper>
      <main className="min-h-screen bg-dash-surface !text-dash-text py-12 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-10 text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight !text-dash-text mb-2 flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Video className="w-5 h-5 text-white" />
              </div>
              Instant meet hub
            </h1>
            <p className="!text-dash-textMuted text-sm font-medium">
              Start ad-hoc meetings instantly, test WebRTC video lobbies, inspect calendar bookings, and view diagnostics.
            </p>
          </div>

          {/* Interactive Client Panel */}
          <InstantMeetClient 
            workspaceId={workspaceId}
            initialCalendars={calendars || []}
            initialAppointments={appointments || []}
          />

        </div>
      </main>
    </Wrapper>
  );
}

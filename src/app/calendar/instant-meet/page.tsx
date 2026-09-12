import React from 'react';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from '@/components/layouts/DefaultWrapper';
import InstantMeetClient from '@/components/calendar/InstantMeetClient';
import { Video } from 'lucide-react';
import MetaData from '@/hooks/useMetaData';

export default async function InstantMeetPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createServerClient();

  // Recent instant-meeting rooms for the active rooms lobby
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, title, start_time, end_time, status, meeting_link')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <MetaData pageTitle="Instant Meet">
      <Wrapper>
        <div className="bg-dash-surface min-h-screen p-6">
          <div className="grid grid-cols-12 gap-x-5">

            {/* Hero header */}
            <div className="col-span-12 mb-[20px]">
              <div className="bg-white rounded-2xl p-6 border border-dash-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Video className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-primary">Live meeting infrastructure</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight !text-dash-text leading-tight mb-4">
                    Instant <span className="text-primary">meet</span> hub
                  </h1>
                  <p className="!text-dash-textMuted text-sm font-medium mt-4 max-w-2xl leading-relaxed">
                    Spin up a private video room in seconds and share the link instantly — no scheduling required.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Client Panel */}
            <div className="col-span-12">
              <InstantMeetClient
                workspaceId={workspaceId}
                initialAppointments={appointments || []}
              />
            </div>

          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

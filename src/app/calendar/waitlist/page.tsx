import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getWaitlistEntries } from '@/app/actions/calendar';
import { WaitlistManager } from '@/components/calendar/WaitlistManager';
import { Users, LayoutTemplate, Rocket, Badge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Wrapper from "@/components/layouts/DefaultWrapper";
import { PremiumSection } from '@/components/calendar/BookingPrimitives';
import MetaData from "@/hooks/useMetaData";

export default async function WaitlistPage() {
 await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return null;

 const supabase = await createServerClient();

 // Fetch group appointments that have waitlist enabled
 const { data: sessions } = await supabase
  .from('appointments')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('waitlist_enabled', true)
  .order('start_time', { ascending: false });

 if (!sessions || sessions.length === 0) {
  return (
   <MetaData pageTitle="Waitlist Management">
    <Wrapper>
     <div className="bg-dash-surface min-h-screen">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
       <div className="bg-white py-24 text-center max-w-xl border border-dashed border-dash-border rounded-2xl">
        <div className="h-20 w-20 rounded-2xl bg-dash-accent/10 flex items-center justify-center border border-dashed border-dash-accent/20 text-dash-accent mx-auto mb-8">
         <Users className="h-10 w-10" />
        </div>
        <h4 className="text-xl font-bold !text-dash-text mb-4">No waitlist protocols active</h4>
        <p className="!text-dash-textMuted font-medium text-sm leading-relaxed mb-10 px-10">
         You haven't configured any group sessions with waitlisting enabled. Dynamic attendee promotion is disabled.
        </p>
        <Button asChild className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold h-14 px-10 shadow-lg shadow-dash-accent/20">
         <Link href="/calendar">Configure nodes</Link>
        </Button>
       </div>
      </div>
     </div>
    </Wrapper>
   </MetaData>
  );
 }

 // Use the most recent session as default
 const activeSession = sessions[0];
 const waitlistRes = await getWaitlistEntries(activeSession.id);
 const waitlist = waitlistRes.success ? waitlistRes.data : [];

 return (
  <MetaData pageTitle="Waitlist Management">
   <Wrapper>
    <div className="bg-dash-surface min-h-screen p-6">
     <div className="grid grid-cols-12 gap-x-5">
      <div className="col-span-12 mb-[20px]">
       <div className="bg-white rounded-2xl p-6 border border-dash-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-dash-accent/5 blur-[120px] -mr-32 -mt-32 rounded-full pointer-events-none" />
        <div className="relative z-10">
         <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-lg bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
           <Users className="h-3.5 w-3.5 text-dash-accent" />
          </div>
          <span className="text-[10px] font-bold text-dash-accent">Attendee propagation matrix</span>
         </div>
         <h2 className="text-4xl font-bold tracking-tight !text-dash-text leading-tight mb-4">
          Queue <span className="text-dash-accent">&</span> capacity
         </h2>
         <p className="!text-dash-textMuted text-sm font-medium mt-4 max-w-2xl leading-relaxed">
          Real-time sequential promotion engine for group sessions. Manage attendee overflow and offer manual spot overrides.
         </p>
        </div>
       </div>
      </div>

      <div className="col-span-12">
       <PremiumSection
        label="Active queue management"
        title="Real-time promotion"
        description="Sequential attendee advancement for live event streams."
        accentColor="#1359FF"
        badge={
         <div className="flex items-center gap-4">
          <Badge className="bg-dash-accent/10 text-dash-accent border-none text-[9px] font-bold px-4 py-1.5 rounded-full">
           {sessions.length} streams monitored
          </Badge>
          <Link href="/calendar" className="text-[10px] font-bold text-dash-accent hover:underline">Exit to nodes</Link>
         </div>
        }
       >
        <div className="mt-8">
         <WaitlistManager
          initialSession={activeSession}
          initialWaitlist={waitlist}
          allSessions={sessions}
         />
        </div>
       </PremiumSection>
      </div>
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}

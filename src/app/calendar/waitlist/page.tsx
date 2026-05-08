import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getWaitlistEntries } from '@/app/actions/calendar';
import { WaitlistManager } from '@/components/calendar/WaitlistManager';
import { Users, LayoutTemplate, Rocket } from 'lucide-react';
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
          <div className="app__slide-wrapper">
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="card__wrapper py-24 text-center max-w-xl border border-dashed border-border dark:border-border-dark">
                   <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-dashed border-primary/20 text-primary mx-auto mb-8">
                     <Users className="h-10 w-10" />
                   </div>
                   <h4 className="card__heading-title uppercase italic mb-4">No Waitlist Protocols Active</h4>
                   <p className="text-body dark:text-body-dark opacity-60 italic font-medium text-sm leading-relaxed mb-10 px-10">
                     You haven't configured any group sessions with waitlisting enabled. Dynamic attendee promotion is disabled.
                   </p>
                   <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl font-bold italic uppercase h-14 px-10 shadow-lg shadow-primary/20">
                     <Link href="/calendar">Configure Nodes</Link>
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
        <div className="app__slide-wrapper">
          <div className="grid grid-cols-12 gap-x-5">
            <div className="col-span-12 mb-[20px]">
              <div className="card__wrapper bg-primary/5 border border-primary/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                         <Users className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Attendee Propagation Matrix</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-heading dark:text-heading-dark italic uppercase leading-none mb-4">
                       Queue <span className="text-primary">&</span> Capacity
                    </h2>
                    <p className="text-body dark:text-body-dark opacity-70 text-sm font-medium mt-4 max-w-2xl italic leading-relaxed">
                       Real-time sequential promotion engine for group sessions. Manage attendee overflow and offer manual spot overrides.
                    </p>
                 </div>
              </div>
            </div>

            <div className="col-span-12">
               <PremiumSection 
                  label="Active Queue Management" 
                  title="Real-time Promotion"
                  description="Sequential attendee advancement for live event streams."
                  accentColor="var(--primary)"
                  badge={
                     <div className="flex items-center gap-4">
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                          {sessions.length} Streams Monitored
                        </Badge>
                        <Link href="/calendar" className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Exit to Nodes</Link>
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

import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getBookingAnalytics, getCalendarOutcomes, getIntakeForm } from '@/app/actions/calendar';
import { BookingIntelligenceDashboard } from '@/components/dashboard/BookingIntelligenceDashboard';
import { AppointmentsList } from '@/components/calendar/AppointmentsList';
import { CalendarList } from '@/components/calendar/CalendarList';
import { OutcomeManager } from '@/components/calendar/OutcomeManager';
import { IntakeFormBuilder } from '@/components/calendar/IntakeFormBuilder';
import { CreditPackageEditor } from '@/components/calendar/CreditPackageEditor';
import { CalendarDays, Info, LayoutTemplate, Users, BarChart3, Rocket, CreditCard, ArrowRight, Zap, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Wrapper from "@/components/layouts/DefaultWrapper";
import { PremiumSection } from '@/components/calendar/BookingPrimitives';
import MetaData from "@/hooks/useMetaData";

export default async function CalendarPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createServerClient();
  
  // 1. Fetch Main Calendars
  const { data: calendars } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // 2. Fetch Recent Appointments
  const { data: recentApts } = await supabase
    .from('appointments')
    .select('*, contact:contacts(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .order('start_time', { ascending: false })
    .limit(10);

  // 3. Analytics & Intelligence (AI Engine)
  const analyticsRes = await getBookingAnalytics(workspaceId);
  const analytics = analyticsRes.success ? analyticsRes.data : [];

  // Default to first calendar for settings preview
  const activeCalendar = calendars?.[0];
  
  const outcomesRes = activeCalendar ? await getCalendarOutcomes(activeCalendar.id) : { success: true, data: [] };
  const intakeRes = activeCalendar ? await getIntakeForm(activeCalendar.id) : { success: true, data: null };

  return (
    <MetaData pageTitle="Calendar Intelligence">
      <Wrapper>
        <div className="app__slide-wrapper">
          <div className="grid grid-cols-12 gap-x-5">
            {/* Header / Intro Section */}
            <div className="col-span-12 mb-[20px]">
              <div className="card__wrapper relative overflow-hidden bg-primary/5 border-primary/10">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Rocket className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Quantum Scheduling Engine</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-heading dark:text-heading-dark italic uppercase leading-none mb-4">
                      Calendar <span className="text-primary">Intelligence</span>
                    </h2>
                    <p className="text-body dark:text-body-dark opacity-70 text-sm font-medium italic max-w-2xl leading-relaxed">
                      Autonomous booking nodes with neural outcome routing. Optimize your workspace availability through AI-driven traffic redirection.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild variant="outline" className="bg-card dark:bg-card-dark border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-xl font-bold uppercase italic text-[10px] h-12 px-6 hover:bg-primary/5 transition-all">
                      <Link href="/calendar/waitlist">
                        <Users className="h-3.5 w-3.5 mr-2" />
                        Waitlist Control
                      </Link>
                    </Button>
                    <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase italic text-[10px] h-12 px-8 shadow-lg shadow-primary/20">
                      <Link href="/calendar/analytics">
                        <BarChart3 className="h-3.5 w-3.5 mr-2" />
                        Analytics Deep-Dive
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Analytics & Intelligence Overview */}
            <div className="col-span-12 mb-[20px]">
              <PremiumSection 
                label="Predictive Intelligence" 
                title="Conversion Optimization"
                description="Real-time monitoring of booking behavior and show-up rates."
                accentColor="var(--primary)"
              >
                <BookingIntelligenceDashboard analytics={analytics} />
              </PremiumSection>
            </div>

            {/* 2. Calendar Management */}
            <div className="col-span-12 lg:col-span-8 mb-[20px]">
              <PremiumSection 
                label="Active Routing" 
                title="Booking Nodes"
                description="Manage your automated scheduling entry points."
                accentColor="#fdab3d"
                badge={
                  <Badge className="bg-[#fdab3d] text-white border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                    {calendars?.length || 0} Nodes Live
                  </Badge>
                }
              >
                <CalendarList calendars={calendars || []} />
              </PremiumSection>
            </div>

            {/* Recent History Sidebar Style */}
            <div className="col-span-12 lg:col-span-4 mb-[20px]">
              <div className="card__wrapper h-full">
                 <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                    <h5 className="card__heading-title flex items-center gap-2">
                       <Activity size={18} className="text-primary" /> Session Log
                    </h5>
                    <Button variant="ghost" className="text-[10px] font-bold text-primary hover:underline p-0 uppercase">View All</Button>
                 </div>
                 <div className="common-scrollbar max-h-[600px] overflow-y-auto pr-2">
                    <AppointmentsList initialAppointments={recentApts || []} />
                 </div>
              </div>
            </div>

            {/* 3. Deep Configuration */}
            {activeCalendar ? (
              <div className="col-span-12 mb-[20px]">
                <PremiumSection 
                  label="Node Configuration" 
                  title={activeCalendar.name}
                  description="Deep logic settings for your primary booking node."
                  accentColor="var(--primary)"
                >
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-4">
                    <div className="space-y-[20px]">
                      <OutcomeManager calendarId={activeCalendar.id} initialOutcomes={outcomesRes.data || []} />
                      <IntakeFormBuilder calendarId={activeCalendar.id} initialFields={intakeRes.data?.fields || []} />
                    </div>
                    
                    <div className="space-y-[20px]">
                      <CreditPackageEditor calendarId={activeCalendar.id} />
                      <div className="card__wrapper bg-primary/5 border border-primary/20 relative overflow-hidden group shadow-none">
                        <div className="relative z-10">
                           <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/20">
                              <Zap className="h-7 w-7 animate-pulse" />
                           </div>
                           <h4 className="text-3xl font-black text-heading dark:text-heading-dark uppercase italic tracking-tighter mb-4 leading-none">Autonomous <br/> Optimization</h4>
                           <p className="text-body dark:text-body-dark opacity-70 text-sm leading-relaxed mb-8 italic font-medium">
                              AI has detected a conversion bottleneck. <br />
                              Applying <span className="text-primary font-black underline underline-offset-4 decoration-primary/40">Neural Slot Expansion</span> on Tuesdays will increase projected revenue by 14.2%.
                           </p>
                           <Button className="w-full bg-primary text-white hover:bg-primary-dark rounded-xl font-bold italic uppercase h-14 text-[10px] shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]">
                              Apply Auto-Schedule
                           </Button>
                        </div>
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 blur-[100px] rounded-full" />
                      </div>
                    </div>
                  </div>
                </PremiumSection>
              </div>
            ) : (
              <div className="col-span-12">
                <div className="card__wrapper py-24 text-center border border-dashed border-border dark:border-border-dark">
                  <CalendarDays className="h-16 w-16 text-placeholder dark:text-placeholder-dark mx-auto mb-6" />
                  <h5 className="card__heading-title uppercase italic mb-2">No Active Nodes</h5>
                  <p className="text-placeholder dark:text-placeholder-dark text-xs italic max-w-sm mx-auto">Deploy your first scheduling engine to unlock advanced intelligence routing and revenue logic.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

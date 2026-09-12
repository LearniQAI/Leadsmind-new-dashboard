'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, MapPin, ChevronRight, Sparkles, Inbox } from 'lucide-react';
import { format } from 'date-fns';

/**
 * --- LEAMSMIND PUBLIC EVENT PORTAL ---
 * Orchestrates external-facing event discovery and registration.
 */

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  location?: string;
  current_attendees: number;
  max_attendees: number;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-8 rounded-[32px] border border-dashed border-dash-border bg-dash-surface text-center animate-in fade-in zoom-in-95 duration-700">
    <div className="h-16 w-16 rounded-3xl bg-dash-bg border border-dash-border flex items-center justify-center mb-6">
      <Inbox className="h-8 w-8 text-dash-textMuted" />
    </div>
    <h3 className="text-[20px] font-bold text-dash-text uppercase tracking-tight font-space mb-2">No upcoming events <span className="text-dash-accent">scheduled</span></h3>
    <p className="text-[13px] text-dash-textMuted max-w-sm mb-8 leading-relaxed">Our event orchestration engine is currently quiet. Please check back later or initialize a custom discovery session.</p>
    <Button className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold text-[13px] px-8 h-11 shadow-lg shadow-dash-accent/20">
      Contact Orchestrator
    </Button>
  </div>
);

export default function PublicEventsPage({ params }: { params: { workspaceSlug: string } }) {
  const [events, setEvents] = React.useState<Event[]>([]); // TODO: Fetch from Supabase
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate data fetch
    setTimeout(() => {
      setEvents([]); // Start with empty to show mandated state
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dash-bg flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dash-bg py-20 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Portal Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dash-accent/10 border border-dash-accent/20 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-dash-accent" />
            <span className="text-[11px] font-bold text-dash-accent uppercase tracking-[0.2em]">Live Events Portal</span>
          </div>
          <h1 className="text-[42px] font-bold text-dash-text uppercase tracking-tight font-space leading-tight">
            Upcoming <span className="text-dash-textMuted/50">Sessions</span>
          </h1>
          <p className="text-[15px] text-dash-textMuted max-w-xl mx-auto leading-relaxed">
            Discover and register for strategic group sessions orchestrated by the {params.workspaceSlug} team.
          </p>
        </div>

        {/* Content Orchestration */}
        <div className="relative">
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="bg-dash-surface border-dash-border rounded-3xl overflow-hidden group hover:border-dash-accent/30 transition-all duration-500">
                  <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 space-y-4 text-left">
                      <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-2xl bg-dash-bg border border-dash-border text-center min-w-[80px]">
                          <p className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest">{format(new Date(event.start_time), 'MMM')}</p>
                          <p className="text-[20px] font-bold text-dash-text font-space">{format(new Date(event.start_time), 'dd')}</p>
                        </div>
                        <div>
                          <h3 className="text-[20px] font-bold text-dash-text group-hover:text-dash-accent transition-colors">{event.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-dash-textMuted">
                             <div className="flex items-center gap-1.5">
                               <Users className="h-3.5 w-3.5" />
                               <span className="text-[11px] font-bold uppercase tracking-widest">{event.current_attendees}/{event.max_attendees} Enrolled</span>
                             </div>
                             {event.location && (
                               <div className="flex items-center gap-1.5">
                                 <MapPin className="h-3.5 w-3.5" />
                                 <span className="text-[11px] font-bold uppercase tracking-widest">{event.location}</span>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                      <p className="text-[13px] text-dash-textMuted leading-relaxed max-w-2xl">{event.description}</p>
                    </div>
                    <Button className="w-full md:w-auto bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold text-[13px] px-8 h-12 shadow-lg shadow-dash-accent/20 group/btn">
                      Secure Seat
                      <ChevronRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-all" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer Brand */}
        <div className="pt-20 text-center">
          <div className="flex items-center justify-center gap-2 opacity-30 grayscale">
             <div className="h-6 w-6 rounded-lg bg-dash-text"></div>
             <span className="text-[14px] font-bold text-dash-text tracking-[0.3em] uppercase">LeadsMind</span>
          </div>
        </div>
      </div>
    </div>
  );
}

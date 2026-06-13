import React from 'react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import BookingClientWrapper from '@/components/calendar/public/BookingClientWrapper';
import { ShieldCheck, Clock, Globe } from 'lucide-react';

export default async function CustomDomainBookingPage({
  params
}: {
  params: { domainName: string; slug: string }
}) {
  const { domainName, slug } = await params;
  const supabase = createAdminClient();

  // 1. Resolve workspace by custom domain name
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('custom_domain', domainName)
    .maybeSingle();

  if (!workspace) {
    return notFound();
  }

  // 2. Fetch calendar associated with that workspace and slug
  const { data: calendar } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('slug', slug)
    .maybeSingle();

  if (!calendar) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent2)] opacity-[0.03] blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 py-12 lg:py-24">
        <div className="grid lg:grid-cols-[400px_1fr] gap-12 lg:gap-24 items-start">
          {/* Left Sidebar: Engine Details */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] border-opacity-20">
                <ShieldCheck size={14} className="text-[var(--accent2)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent2)]">Secure Booking</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-black font-['Space_Grotesk'] leading-none">
                {calendar.name}
              </h1>

              <p className="text-[var(--t3)] text-lg max-w-sm">
                {calendar.description || 'Professional scheduling orchestrated by LeadsMind.'}
              </p>
            </div>

            <div className="space-y-6 pt-8 border-t border-[var(--bdr)]">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-[var(--n800)] border border-[var(--bdr)] flex items-center justify-center text-[var(--t4)] group-hover:text-[var(--accent2)] group-hover:border-[var(--accent)] transition-all">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t4)]">Duration</p>
                  <p className="text-[15px] font-bold text-[var(--t1)]">{calendar.slot_duration} Minutes</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-[var(--n800)] border border-[var(--bdr)] flex items-center justify-center text-[var(--t4)] group-hover:text-[var(--accent2)] group-hover:border-[var(--accent)] transition-all">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t4)]">Timezone</p>
                  <p className="text-[15px] font-bold text-[var(--t1)]">{calendar.timezone || 'UTC'}</p>
                </div>
              </div>
            </div>

            <div className="pt-12">
              <div className="p-4 bg-[var(--n800)] bg-opacity-50 rounded-2xl border border-[var(--bdr)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--green)] bg-opacity-10 flex items-center justify-center text-[var(--green)]">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-[var(--t2)]">Encrypted & Secure</span>
                </div>
                <p className="text-[11px] text-[var(--t4)] leading-relaxed">
                  Your personal information and meeting data are protected by LeadsMind's end-to-end encryption protocols.
                </p>
              </div>
            </div>
          </div>

          {/* Right Area: Booking Flow */}
          <div className="bg-[var(--n800)] rounded-[var(--r32)] border border-[var(--bdr)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right duration-700">
            <BookingClientWrapper calendar={calendar} />
          </div>
        </div>
      </div>
    </main>
  );
}

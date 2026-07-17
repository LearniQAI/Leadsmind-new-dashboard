import React from 'react';
import { getAppointmentByToken } from '@/app/actions/calendar/manage';
import ManageBookingClient from '@/components/calendar/public/ManageBookingClient';
import { ShieldCheck, XCircle } from 'lucide-react';

export default async function ManageBookingPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = await params;
  // Server-side verification on the very first render — the token is
  // re-verified again inside every cancel/reschedule server action too (see
  // manage.ts's resolveVerifiedAppointment), so this page render is not the
  // only gate, just the first one.
  const result = await getAppointmentByToken(token);

  if (!result.success || !result.data) {
    return (
      <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] p-10 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
            <XCircle size={28} />
          </div>
          <h1 className="text-xl font-bold mb-2">Link unavailable</h1>
          <p className="text-[var(--t3)] text-sm leading-relaxed">{result.error || 'This management link is invalid.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.03] blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-[560px] mx-auto px-6 py-12 lg:py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] border-opacity-20 mb-6">
          <ShieldCheck size={14} className="text-[var(--accent2)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent2)]">Manage Your Booking</span>
        </div>

        <div className="bg-[var(--n800)] rounded-[var(--r32)] border border-[var(--bdr)] shadow-2xl overflow-hidden">
          <ManageBookingClient token={token} appointment={result.data} />
        </div>
      </div>
    </main>
  );
}

import React from 'react';
import { 
  Download, FileText, CreditCard, Wallet, 
  History, Settings, LogOut, ChevronRight, Calendar, Video
} from 'lucide-react';
import MetaData from '@/hooks/useMetaData';
import { getUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/auth/signin-basic');
  }

  const supabase = createAdminClient();

  // 1. Fetch contacts for this client email across workspaces
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', user.email);

  const contactIds = (contacts || []).map(c => c.id);

  // 2. Fetch invoices dynamically
  let outstandingDue = 0;
  let totalPaid = 0;
  let invoices: any[] = [];

  if (contactIds.length > 0) {
    const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*')
      .in('contact_id', contactIds)
      .order('created_at', { ascending: false });

    invoices = dbInvoices || [];
    for (const inv of invoices) {
      const due = Number(inv.amount_due || 0) - Number(inv.amount_paid || 0);
      outstandingDue += due > 0 ? due : 0;
      totalPaid += Number(inv.amount_paid || 0);
    }
  }

  // 3. Fetch upcoming bookings dynamically
  let upcomingBookings: any[] = [];
  if (contactIds.length > 0) {
    const { data: dbAppts } = await supabase
      .from('appointments')
      .select('*, calendar:booking_calendars(name)')
      .in('contact_id', contactIds)
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5);

    upcomingBookings = dbAppts || [];
  }

  // Helper to format date
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <MetaData pageTitle="Client Dashboard">
      <div className="min-h-screen bg-[#04091a] text-[var(--t1)] flex font-sans">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[var(--bdr)] bg-[rgba(11,17,33,0.5)] backdrop-blur-xl flex flex-col p-6">
          <div className="text-lg font-black tracking-tighter text-[var(--accent2)] mb-12">LEADSMIND</div>
          
          <nav className="flex-1 space-y-2">
            {[
              { label: 'Overview', icon: History, active: true },
              { label: 'Documents', icon: FileText },
              { label: 'Retainers', icon: Wallet },
              { label: 'Account', icon: Settings },
            ].map((item, i) => (
              <button 
                key={i}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  item.active ? 'bg-[var(--accentg)] text-[var(--accent2)]' : 'text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </nav>

          <Link href="/auth/signin-basic" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-all">
            <LogOut size={16} /> Sign Out
          </Link>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-12">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold uppercase tracking-tight font-space">
                  Portal <span className="text-[var(--accent2)]">Overview</span>
                </h1>
                <p className="text-[11px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
                  Welcome back, {user.email}
                </p>
              </div>
              <button className="btn-primary !h-12 !px-8 text-xs gap-2">
                Pay All Balances <CreditCard size={16} />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Outstanding Due', value: `R ${outstandingDue.toFixed(2)}`, sub: `${invoices.filter(i => i.status !== 'paid').length} unpaid invoices`, color: 'text-rose-500' },
                { label: 'Total Paid', value: `R ${totalPaid.toFixed(2)}`, sub: 'Lifetime billing', color: 'text-emerald-500' },
                { label: 'Retainer Credit', value: 'R 0.00', sub: 'Ready to apply', color: 'text-blue-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-[var(--r24)] shadow-xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
                  <p className="text-[10px] font-black text-[var(--t4)] uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                  <p className={`text-3xl font-bold font-space ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-[var(--t4)] font-medium mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Main Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Recent Documents Table */}
              <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] overflow-hidden flex flex-col shadow-xl">
                <div className="p-6 border-b border-[var(--bdr)] flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)]">Recent Invoices</h3>
                  <span className="text-[10px] font-black uppercase text-blue-500">Auto Synced</span>
                </div>
                <div className="overflow-x-auto flex-1">
                  {invoices.length === 0 ? (
                    <div className="p-12 text-center text-[var(--t4)] text-xs uppercase tracking-wider">
                      No invoices found
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[var(--bdr)] bg-[rgba(255,255,255,0.01)] text-[10px] font-black uppercase tracking-widest text-[var(--t4)]">
                          <th className="px-6 py-4">Number</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--bdr)]">
                        {invoices.slice(0, 5).map((inv, i) => (
                          <tr key={i} className="hover:bg-[rgba(255,255,255,0.015)] transition-all group">
                            <td className="px-6 py-5 text-xs font-bold text-blue-400 font-space">
                              <Link href={`/portal/invoices/${inv.id}`} className="hover:underline">
                                {inv.invoice_number || `INV-${inv.id.substring(0, 8)}`}
                              </Link>
                            </td>
                            <td className="px-6 py-5 text-xs text-[var(--t3)] font-medium">
                              {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-ZA') : 'N/A'}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                inv.status === 'paid' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right text-xs font-bold text-[var(--t1)] font-space">
                              R {Number(inv.total_amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] overflow-hidden shadow-xl flex flex-col">
                <div className="p-6 border-b border-[var(--bdr)] flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)] flex items-center gap-2">
                    <Calendar size={16} className="text-[var(--accent2)]" /> Upcoming Bookings
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Live Status
                  </span>
                </div>

                <div className="p-6 flex-1 space-y-4">
                  {upcomingBookings.length === 0 ? (
                    <div className="py-12 text-center text-[var(--t4)] text-xs uppercase tracking-wider">
                      No upcoming sessions scheduled
                    </div>
                  ) : (
                    upcomingBookings.map((appt, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[var(--bdr)] hover:border-[rgba(255,255,255,0.08)] transition-all flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-[var(--t1)]">{appt.title}</h4>
                          <p className="text-[11px] text-[var(--t3)] font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent2)]" />
                            {appt.calendar?.name || 'Standard Consultation'}
                          </p>
                          <p className="text-[10px] text-[var(--t4)] font-medium mt-1">
                            {formatDate(appt.start_time)}
                          </p>
                        </div>

                        {appt.meeting_link && (
                          <a 
                            href={appt.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/25 border border-blue-500/40 hover:bg-blue-600/40 text-blue-300 hover:text-white text-xs font-bold transition-all shrink-0 uppercase tracking-wider"
                          >
                            Join <Video size={14} />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </MetaData>
  );
}

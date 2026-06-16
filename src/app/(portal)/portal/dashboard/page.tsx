import React from 'react';
import { 
  Download, FileText, CreditCard, Wallet, 
  History, Settings, LogOut, ChevronRight, Calendar, Video, BookOpen, GraduationCap,
  AlertTriangle
} from 'lucide-react';
import MetaData from '@/hooks/useMetaData';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';


export const dynamic = 'force-dynamic';

export default async function PortalDashboard() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const supabase = createAdminClient();

  // Fetch FICA completeness status
  const { data: rating } = await supabase
    .from('kyc_risk_ratings')
    .select('fica_complete')
    .eq('contact_id', contact.id)
    .maybeSingle();

  const ficaComplete = rating?.fica_complete ?? false;

  // 1. Fetch Invoices for this contact in this workspace
  const { data: dbInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  const invoices = dbInvoices || [];
  let outstandingDue = 0;
  let totalPaid = 0;
  let hasOverdueInvoice = false;
  for (const inv of invoices) {
    const due = Number(inv.amount_due || 0) - Number(inv.amount_paid || 0);
    outstandingDue += due > 0 ? due : 0;
    totalPaid += Number(inv.amount_paid || 0);

    const isOverdue = inv.status !== 'paid' && inv.status !== 'draft' && inv.due_date && new Date(inv.due_date) < new Date();
    if (isOverdue) {
      hasOverdueInvoice = true;
    }
  }

  // Fetch workspace configurations
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('invoice_settings')
    .eq('id', workspace.id)
    .single();

  const invoiceSettings = wsData?.invoice_settings || {};
  const overdueAlertEnabled = invoiceSettings.enable_overdue_alert_banner ?? false;


  // 2. Fetch Course Enrollments & Progress for this contact
  const { data: dbEnrollments } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id);

  const enrollments = dbEnrollments || [];
  
  // Calculate average progress
  let averageProgress = 0;
  if (enrollments.length > 0) {
    const { data: progressRecords } = await supabase
      .from('course_progress')
      .select('*')
      .eq('contact_id', contact.id);

    const progressMap = new Map((progressRecords || []).map(p => [p.course_id, p.progress_percent || 0]));
    let totalProgress = 0;
    for (const e of enrollments) {
      totalProgress += progressMap.get(e.course_id) || 0;
    }
    averageProgress = Math.round(totalProgress / enrollments.length);
  }

  // 3. Fetch Upcoming Bookings for this contact in this workspace
  const { data: dbAppts } = await supabase
    .from('appointments')
    .select('*, calendar:booking_calendars(name)')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id)
    .eq('status', 'scheduled')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5);

  const upcomingBookings = dbAppts || [];
  const nextMeeting = upcomingBookings[0] || null;

  // Helper to format date
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-ZA', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <MetaData pageTitle="Client Dashboard">
      <div className="max-w-6xl mx-auto space-y-12 p-8 md:p-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight font-space">
              Portal <span className="text-[var(--accent2)]">Overview</span>
            </h1>
            <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
              Welcome back, {contact.first_name} {contact.last_name || ''}
            </p>
          </div>
          <Link href="/portal/invoices" className="btn-primary !h-12 !px-8 text-xs gap-2 flex items-center">
            View Invoices <CreditCard size={16} />
          </Link>
        </div>

        {/* FICA Hold Alert Banner */}
        {!ficaComplete && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200 font-space">FICA Onboarding Incomplete</h3>
                <p className="text-xs text-amber-400/80 mt-1 max-w-lg leading-relaxed font-sans font-medium">
                  Your identity verification is currently unverified or pending completion. Please upload required documentation and complete a biometric selfie to unlock bookings, courses, and support services.
                </p>
              </div>
            </div>
            <Link 
              href="/portal/documents" 
              className="bg-amber-600 hover:bg-amber-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 shrink-0 shadow-lg shadow-amber-950/40 flex items-center gap-1.5"
            >
              Verify Identity <FileText size={14} />
            </Link>
          </div>
        )}

        {/* Overdue Alert Banner */}
        {overdueAlertEnabled && hasOverdueInvoice && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-200 font-space">Outstanding Balance Overdue</h3>
                <p className="text-xs text-rose-400/80 mt-1 max-w-lg leading-relaxed font-sans font-medium">
                  Your account currently has one or more outstanding invoices that are past their due date. Please settle your balances to ensure uninterrupted access.
                </p>
              </div>
            </div>
            <Link 
              href="/portal/invoices?status=unpaid" 
              className="bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 shrink-0 shadow-lg shadow-rose-950/40 flex items-center gap-1.5"
            >
              Settle Balances <CreditCard size={14} />
            </Link>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Balance */}
          <div className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-all">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500" />
            <p className="text-[10px] font-black text-[var(--t4)] uppercase tracking-[0.2em] mb-2">Outstanding Due</p>
            <p className="text-3xl font-bold font-space text-rose-500">
              R {outstandingDue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-[var(--t4)] font-medium mt-1">
              {invoices.filter(i => i.status !== 'paid').length} unpaid invoices due
            </p>
          </div>

          {/* Card 2: Course Progress */}
          <div className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-all">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500" />
            <p className="text-[10px] font-black text-[var(--t4)] uppercase tracking-[0.2em] mb-2">Average Progress</p>
            <p className="text-3xl font-bold font-space text-purple-400">
              {enrollments.length > 0 ? `${averageProgress}%` : '0%'}
            </p>
            <p className="text-[10px] text-[var(--t4)] font-medium mt-1">
              {enrollments.length > 0 ? `Enrolled in ${enrollments.length} courses` : 'Not enrolled in courses yet'}
            </p>
          </div>

          {/* Card 3: Next Session */}
          <div className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-all">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent2)]" />
            <p className="text-[10px] font-black text-[var(--t4)] uppercase tracking-[0.2em] mb-2">Next Scheduled Meeting</p>
            <p className="text-lg font-bold font-space text-[var(--accent2)] truncate mt-1">
              {nextMeeting ? nextMeeting.title : 'No upcoming sessions'}
            </p>
            <p className="text-[10px] text-[var(--t4)] font-medium mt-1">
              {nextMeeting ? formatDate(nextMeeting.start_time) : 'Book a consultation anytime'}
            </p>
          </div>
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Invoices Table */}
          <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-3xl overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-[var(--bdr)] flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)]">Recent Invoices</h3>
              <span className="text-[10px] font-black uppercase text-blue-500">Auto Synced</span>
            </div>
            <div className="overflow-x-auto flex-grow">
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
                        <td className="px-6 py-5 text-xs text-[var(--t3)] font-medium font-mono">
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
                          R {Number(inv.total_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-3xl overflow-hidden shadow-xl flex flex-col">
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
                      <p className="text-[10px] text-[var(--t4)] font-medium mt-1 font-mono">
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
    </MetaData>
  );
}

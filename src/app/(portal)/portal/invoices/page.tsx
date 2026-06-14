import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MetaData from '@/hooks/useMetaData';
import { FileText, Eye, CreditCard } from 'lucide-react';
import StatementGeneratorModal from '@/components/portal/StatementGeneratorModal';

export const dynamic = 'force-dynamic';

interface InvoicesPageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function PortalInvoicesPage({ searchParams }: InvoicesPageProps) {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const searchQuery = params.search || '';

  const supabase = createAdminClient();

  // Fetch workspace configurations
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('invoice_settings')
    .eq('id', workspace.id)
    .single();

  const invoiceSettings = wsData?.invoice_settings || {};
  const showDraft = invoiceSettings.show_draft_invoices ?? false;

  // 1. Fetch filtered invoices for table view
  let query = supabase
    .from('invoices')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id);

  if (!showDraft) {
    query = query.neq('status', 'draft');
  }

  if (statusFilter === 'paid') {
    query = query.eq('status', 'paid');
  } else if (statusFilter === 'unpaid') {
    query = query.neq('status', 'paid');
  }

  const { data: dbInvoices } = await query.order('created_at', { ascending: false });
  let invoices = dbInvoices || [];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    invoices = invoices.filter(inv => 
      (inv.invoice_number || '').toLowerCase().includes(q)
    );
  }

  // 2. Fetch all non-draft invoices for Account Statement Generator
  let statementQuery = supabase
    .from('invoices')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id);

  if (!showDraft) {
    statementQuery = statementQuery.neq('status', 'draft');
  }
  const { data: statementInvoices } = await statementQuery;

  // Helper to determine invoice status badges
  const getInvoiceStatusInfo = (inv: any) => {
    if (inv.status === 'paid') {
      return { label: 'Paid', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (inv.status === 'draft') {
      return { label: 'Draft', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
    if (inv.status === 'partially_paid' || inv.status === 'partial') {
      return { label: 'Partially Paid', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
    if (inv.due_date && new Date(inv.due_date) < new Date()) {
      return { label: 'Overdue', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    }
    return { label: 'Due', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  };

  // Helper to generate a text description
  const getInvoiceDescription = (inv: any) => {
    if (inv.notes) return inv.notes;
    if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
      return inv.items.map((it: any) => it.description || 'Service/Product').join(', ');
    }
    return 'Billing invoice';
  };

  // Calculate overall outstanding due balance
  let outstandingDue = 0;
  for (const inv of (statementInvoices || [])) {
    const due = Number(inv.amount_due || 0) - Number(inv.amount_paid || 0);
    outstandingDue += due > 0 ? due : 0;
  }

  // Format payment history entries
  const settledPayments = (statementInvoices || [])
    .filter(inv => Number(inv.amount_paid || 0) > 0)
    .map(inv => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number || `INV-${inv.id.substring(0, 8)}`,
      date: inv.paid_at || inv.updated_at || inv.created_at,
      reference: inv.payment_method || 'Online Checkout',
      amount: Number(inv.amount_paid || 0)
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <MetaData pageTitle="My Invoices">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
              Billing <span className="text-[var(--accent2)]">Invoices</span>
            </h1>
            <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
              Manage your billing invoices and outstanding balances
            </p>
          </div>

          <StatementGeneratorModal
            contact={contact}
            workspace={workspace}
            invoices={statementInvoices || []}
          />
        </div>

        {/* Total Outstanding Balance Panel */}
        <div className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500" />
          <p className="text-[10px] font-black text-[var(--t4)] uppercase tracking-[0.2em] mb-2 font-mono">Total Outstanding Due</p>
          <p className="text-4xl font-bold font-space text-rose-500">
            R {outstandingDue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-[var(--t4)] font-medium mt-2">
            Accounts statement ledger includes {(statementInvoices || []).filter(i => i.status !== 'paid').length} unpaid invoices
          </p>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--n800)] border border-[var(--bdr)] p-4 rounded-2xl shadow-lg">
          {/* Status filter pills & Statement Generator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Invoices' },
                { id: 'paid', label: '● Paid' },
                { id: 'unpaid', label: '● Unpaid' },
                { id: 'history', label: '★ Payment History' }
              ].map(tab => (
                <Link
                  key={tab.id}
                  href={`/portal/invoices?status=${tab.id}&search=${searchQuery}`}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                    statusFilter === tab.id
                      ? 'bg-[var(--accentg)] text-[var(--accent2)] border-blue-500/20'
                      : 'border-transparent text-[#4a5a82] hover:text-[#94a3c8]'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Search */}
          <form className="relative w-full md:max-w-xs" method="GET" action="/portal/invoices">
            <input type="hidden" name="status" value={statusFilter} />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by invoice number..."
              className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white font-mono placeholder-[#4a5a82] transition-colors"
            />
          </form>
        </div>

        {/* Invoices List / Payment History view */}
        <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-3xl overflow-hidden shadow-2xl">
          {statusFilter === 'history' ? (
            settledPayments.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-[#4a5a82] opacity-55">
                  <CreditCard size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t2)]">No Payments Settled</h3>
                  <p className="text-xs text-[var(--t3)] mt-1.5 max-w-xs leading-relaxed">
                    There are no recorded payments for your client account yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--bdr)] bg-[rgba(255,255,255,0.01)] text-[10px] font-black uppercase tracking-widest text-[var(--t4)]">
                      <th className="px-6 py-4">Payment Date</th>
                      <th className="px-6 py-4">Invoice Reference</th>
                      <th className="px-6 py-4">Method / Channel</th>
                      <th className="px-6 py-4 text-right">Amount Settled</th>
                      <th className="px-6 py-4 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bdr)]">
                    {settledPayments.map((pay, i) => (
                      <tr key={i} className="hover:bg-[rgba(255,255,255,0.015)] transition-all group">
                        <td className="px-6 py-5 text-xs text-[var(--t3)] font-mono">
                          {new Date(pay.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5 text-xs font-bold text-blue-400 font-space">
                          <Link href={`/portal/invoices/${pay.invoiceId}`} className="hover:underline">
                            {pay.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-5 text-xs text-[var(--t3)] uppercase font-mono tracking-wider">
                          {pay.reference}
                        </td>
                        <td className="px-6 py-5 text-right text-xs font-bold text-emerald-400 font-space">
                          R {pay.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <Link 
                            href={`/portal/invoices/${pay.invoiceId}`}
                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 hover:text-white hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/10 hover:border-emerald-500/30 transition-all font-sans"
                          >
                            View Receipt <FileText size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            invoices.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-[#4a5a82] opacity-55">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t2)]">No Invoices Found</h3>
                  <p className="text-xs text-[var(--t3)] mt-1.5 max-w-xs leading-relaxed">
                    There are no invoices matching your filters or linked to your account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--bdr)] bg-[rgba(255,255,255,0.01)] text-[10px] font-black uppercase tracking-widest text-[var(--t4)]">
                      <th className="px-6 py-4">Number</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Issue Date</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bdr)]">
                    {invoices.map((inv, i) => {
                      const status = getInvoiceStatusInfo(inv);
                      const desc = getInvoiceDescription(inv);
                      return (
                        <tr key={i} className="hover:bg-[rgba(255,255,255,0.015)] transition-all group">
                          <td className="px-6 py-5 text-xs font-bold text-blue-400 font-space">
                            <Link href={`/portal/invoices/${inv.id}`} className="hover:underline">
                              {inv.invoice_number || `INV-${inv.id.substring(0, 8)}`}
                            </Link>
                          </td>
                          <td className="px-6 py-5 text-xs text-[var(--t3)] max-w-[150px] truncate" title={desc}>
                            {desc}
                          </td>
                          <td className="px-6 py-5 text-xs text-[var(--t3)] font-mono">
                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-ZA') : 'N/A'}
                          </td>
                          <td className="px-6 py-5 text-xs text-[var(--t3)] font-mono">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-ZA') : 'N/A'}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right text-xs font-bold text-[var(--t1)] font-space">
                            R {Number(inv.total_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <Link 
                              href={`/portal/invoices/${inv.id}`}
                              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-400 hover:text-white hover:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/10 hover:border-blue-500/30 transition-all font-sans"
                            >
                              View Details <Eye size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </MetaData>
  );
}

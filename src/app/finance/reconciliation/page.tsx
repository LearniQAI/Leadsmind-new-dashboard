'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { createClient } from '@/lib/supabase/client';
import { Landmark, FileText, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DashCard } from '@/components/dashboard-ui/Card';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  total_amount: number;
}

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_due: number;
  created_at: string;
}

export default function ReconciliationPage() {
  const { workspace } = useDashboardContext() as any;
  const workspaceId = workspace?.id || null;

  const [loading, setLoading] = useState(true);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      // 1. Fetch unmatched bank feed transactions
      const { data: txData, error: txError } = await supabase
        .from('accounting_transactions')
        .select('id, date, description, total_amount')
        .eq('workspace_id', workspaceId)
        .eq('source_type', 'bank_feed')
        .is('source_id', null)
        .order('date', { ascending: false });

      if (txError) throw txError;
      setBankTxs(txData || []);

      // 2. Fetch unpaid invoices
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, amount_due, created_at')
        .eq('workspace_id', workspaceId)
        .in('status', ['unpaid', 'open'])
        .order('created_at', { ascending: false });

      if (invError) throw invError;
      setInvoices(invData || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const handleMatch = async (invoice: UnpaidInvoice) => {
    if (!selectedTx) return;
    setReconciling(true);
    try {
      // 1. Update the bank transaction to link with the invoice
      const { error: txError } = await supabase
        .from('accounting_transactions')
        .update({
          source_type: 'invoice',
          source_id: invoice.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTx.id);

      if (txError) throw txError;

      // 2. Update the invoice status to paid
      const { error: invError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (invError) throw invError;

      toast.success(`Successfully reconciled transaction with Invoice ${invoice.invoice_number || 'draft'}`);

      // Remove reconciled items from state
      setBankTxs(prev => prev.filter(t => t.id !== selectedTx.id));
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      setSelectedTx(null);
    } catch (err: any) {
      toast.error(err.message || 'Error matching transaction to invoice');
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-white px-6 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold !text-dash-text">
              Reconciliation
            </h1>
            <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
              Match your bank transactions to invoices with one click
            </p>
          </div>
          <button
            onClick={fetchData}
            className="w-9 h-9 rounded-xl border border-dash-border bg-dash-surface flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60 transition-colors motion-reduce:transition-none"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
          </button>
        </div>

        {/* Selected Transaction Action Banner */}
        {selectedTx && (
          <div className="mb-6 p-4 rounded-xl bg-dash-accent/10 border border-dash-accent/20 !text-dash-text text-[12px] flex items-center justify-between animate-in fade-in duration-200 motion-reduce:animate-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-dash-accent/20 flex items-center justify-center text-dash-accent">
                <Landmark size={14} />
              </div>
              <div>
                <span className="font-semibold block">Active Matching Mode</span>
                <span className="!text-dash-textMuted">
                  Matching "{selectedTx.description}" ({formatCurrency(selectedTx.total_amount)}) to an invoice. Select an invoice on the right to match them.
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTx(null)}
              className="px-3 py-1.5 bg-dash-surface hover:bg-dash-border/60 rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Content Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left Panel: Bank Transactions */}
          <DashCard padding="default" interactive={false} className="flex flex-col min-h-[500px]">
            <h2 className="text-[14px] font-bold !text-dash-text mb-4 flex items-center gap-2">
              <Landmark size={16} className="text-dash-accent" /> Bank Transactions
            </h2>

            {loading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
                ))}
              </div>
            ) : bankTxs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertCircle size={24} className="!text-dash-textMuted mb-2" />
                <p className="text-[12px] !text-dash-textMuted max-w-[280px]">
                  No unmatched bank transactions. Connect your bank account to start reconciling.
                </p>
                <a
                  href="/finance/connected-accounts"
                  className="mt-4 px-4 py-2 bg-dash-accent hover:bg-dash-accent/90 text-[11px] font-bold text-white rounded-lg transition-colors"
                >
                  Connect Bank Account
                </a>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[600px]">
                {bankTxs.map(tx => {
                  const isSelected = selectedTx?.id === tx.id;
                  return (
                    <div
                      key={tx.id}
                      className={`p-4 rounded-xl border transition-colors duration-200 motion-reduce:transition-none ${
                        isSelected
                          ? 'bg-dash-accent/5 border-dash-accent/50 shadow-md shadow-dash-accent/5'
                          : 'bg-dash-surface border-dash-border hover:border-dash-text/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[10px] !text-dash-textMuted font-semibold block">{tx.date}</span>
                          <span className="text-[12px] font-medium !text-dash-text block mt-0.5">{tx.description}</span>
                          <span className="text-[13px] font-bold !text-dash-text block mt-1">
                            {formatCurrency(tx.total_amount)}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors motion-reduce:transition-none ${
                            isSelected
                              ? 'bg-dash-accent text-white'
                              : 'bg-dash-border/60 hover:bg-dash-border !text-dash-text'
                          }`}
                        >
                          {isSelected ? 'Matching' : 'Match'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Right Panel: Unpaid Invoices */}
          <DashCard padding="default" interactive={false} className="flex flex-col min-h-[500px]">
            <h2 className="text-[14px] font-bold !text-dash-text mb-4 flex items-center gap-2">
              <FileText size={16} className="text-amber-600" /> Unpaid Invoices
            </h2>

            {loading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <CheckCircle size={24} className="text-green mb-2" />
                <p className="text-[12px] !text-dash-textMuted max-w-[280px]">
                  All invoices are matched. Great work!
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[600px]">
                {invoices.map(inv => {
                  const amount = Number(inv.total_amount || inv.amount_due || 0);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => selectedTx && !reconciling && handleMatch(inv)}
                      className={`p-4 rounded-xl border bg-dash-surface border-dash-border transition-colors duration-200 motion-reduce:transition-none ${
                        selectedTx
                          ? 'hover:border-dash-accent/50 cursor-pointer hover:bg-dash-accent/[0.03]'
                          : 'opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold !text-dash-text">
                              Invoice #{inv.invoice_number || 'Draft'}
                            </span>
                          </div>
                          <span className="text-[10px] !text-dash-textMuted font-semibold block mt-0.5">
                            Created {new Date(inv.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold !text-dash-text block">
                            {formatCurrency(amount)}
                          </span>
                          {selectedTx && (
                            <span className="text-[9px] text-dash-accent font-semibold flex items-center justify-end gap-1 mt-1">
                              Match with this <ArrowRight size={10} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

        </div>
      </div>
    </Wrapper>
  );
}

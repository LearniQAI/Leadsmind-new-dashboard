'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { createClient } from '@/lib/supabase/client';
import { Landmark, FileText, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-5xl mx-auto font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Reconciliation
            </h1>
            <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]">
              Match your bank transactions to invoices with one click
            </p>
          </div>
          <button
            onClick={fetchData}
            className="w-9 h-9 rounded-xl border border-white/5 bg-white/[0.03] flex items-center justify-center text-t3 hover:text-t1 hover:bg-white/[0.08] transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Selected Transaction Action Banner */}
        {selectedTx && (
          <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#eef2ff] text-[12px] flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-[#3b82f6]">
                <Landmark size={14} />
              </div>
              <div>
                <span className="font-semibold block">Active Matching Mode</span>
                <span className="text-t3">
                  Matching "{selectedTx.description}" ({formatCurrency(selectedTx.total_amount)}) to an invoice. Select an invoice on the right to match them.
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTx(null)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Content Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Panel: Bank Transactions */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex flex-col min-h-[500px]">
            <h2 className="text-[14px] font-bold text-[#eef2ff] mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Landmark size={16} className="text-[#3b82f6]" /> Bank Transactions
            </h2>
            
            {loading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : bankTxs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertCircle size={24} className="text-[#4a5a82] mb-2" />
                <p className="text-[12px] text-[#94a3c8] max-w-[280px]">
                  No unmatched bank transactions. Connect your bank account to start reconciling.
                </p>
                <a
                  href="/finance/connected-accounts"
                  className="mt-4 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-[11px] font-bold text-white rounded-lg transition-colors"
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
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-500/5 border-blue-500/50 shadow-md shadow-blue-500/5'
                          : 'bg-[#070d24]/50 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[10px] text-[#4a5a82] font-semibold block">{tx.date}</span>
                          <span className="text-[12px] font-medium text-[#eef2ff] block mt-0.5">{tx.description}</span>
                          <span className="text-[13px] font-bold text-[#eef2ff] block mt-1 font-space">
                            {formatCurrency(tx.total_amount)}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                            isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/5 hover:bg-white/10 text-t1'
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
          </div>

          {/* Right Panel: Unpaid Invoices */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex flex-col min-h-[500px]">
            <h2 className="text-[14px] font-bold text-[#eef2ff] mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <FileText size={16} className="text-[#f59e0b]" /> Unpaid Invoices
            </h2>

            {loading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <CheckCircle size={24} className="text-[#10b981] mb-2" />
                <p className="text-[12px] text-[#94a3c8] max-w-[280px]">
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
                      className={`p-4 rounded-xl border bg-[#070d24]/50 border-white/5 transition-all duration-200 ${
                        selectedTx
                          ? 'hover:border-blue-500/50 cursor-pointer hover:bg-blue-500/[0.02]'
                          : 'opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#eef2ff]">
                              Invoice #{inv.invoice_number || 'Draft'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#4a5a82] font-semibold block mt-0.5">
                            Created {new Date(inv.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-[#eef2ff] block font-space">
                            {formatCurrency(amount)}
                          </span>
                          {selectedTx && (
                            <span className="text-[9px] text-[#3b82f6] font-semibold flex items-center justify-end gap-1 mt-1">
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
          </div>

        </div>
      </div>
    </Wrapper>
  );
}

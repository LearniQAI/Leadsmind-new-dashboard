'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { TrendingUp, TrendingDown, FileText, Landmark, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface OverviewData {
  totalIncome: number;
  totalExpenses: number;
  outstandingInvoicesCount: number;
  cashBalance: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  source_type: string;
  total_amount: number;
}

export default function FinanceOverviewPage() {
  const { workspace } = useDashboardContext() as any;
  const workspaceId = workspace?.id || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverviewData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const fetchData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch overview stats
      const statsRes = await fetch(`/api/finance/overview?workspaceId=${workspaceId}`);
      if (!statsRes.ok) throw new Error('Failed to fetch overview metrics');
      const statsJson = await statsRes.json();

      // Fetch recent 5 transactions
      const txRes = await fetch(`/api/finance/transactions?workspaceId=${workspaceId}&limit=5`);
      if (!txRes.ok) throw new Error('Failed to fetch transactions');
      const txJson = await txRes.json();

      setStats(statsJson);
      setRecentTransactions(txJson.transactions || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'invoice':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'expense':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'bank_feed':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      default:
        return 'bg-white/5 text-t3 border border-white/10';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'invoice': return 'Invoice';
      case 'expense': return 'Expense';
      case 'bank_feed': return 'Bank';
      default: return 'Manual';
    }
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
              Financial <span className="text-[#2563eb]">Overview</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Your business finances at a glance
            </p>
          </div>
          <button 
            onClick={fetchData}
            className="w-9 h-9 rounded-xl border border-white/5 bg-white/[0.03] flex items-center justify-center text-t3 hover:text-t1 hover:bg-white/[0.08] transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-sans">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[108px] rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 font-sans">
              {/* Card 1: Total Income */}
              <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#94a3c8] font-medium">Income this month</span>
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-[#10b981]">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold font-space text-[#10b981]">
                  {formatCurrency(stats.totalIncome)}
                </span>
              </div>

              {/* Card 2: Total Expenses */}
              <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#94a3c8] font-medium">Expenses this month</span>
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-[#ef4444]">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold font-space text-[#ef4444]">
                  {formatCurrency(stats.totalExpenses)}
                </span>
              </div>

              {/* Card 3: Outstanding Invoices */}
              <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#94a3c8] font-medium">Invoices unpaid</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-[#f59e0b]">
                    <FileText size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold font-space text-[#f59e0b]">
                  {stats.outstandingInvoicesCount}
                </span>
              </div>

              {/* Card 4: Cash Balance */}
              <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#94a3c8] font-medium">Available balance</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#3b82f6]">
                    <Landmark size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold font-space text-[#3b82f6]">
                  {formatCurrency(stats.cashBalance)}
                </span>
              </div>
            </div>
          )
        )}

        {/* Recent Transactions Section */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 font-sans">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-semibold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Recent Transactions
            </h3>
            <Link 
              href="/finance/transactions" 
              className="text-[#3b82f6] hover:text-[#2563eb] text-[12px] font-medium flex items-center gap-1 transition-colors"
            >
              View all transactions <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[48px] rounded-lg bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px] text-[#94a3c8]">
                No transactions yet. Connect your bank or add transactions manually.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link href="/finance/connected-accounts" className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-[12px] font-medium text-white transition-colors">
                  Connect Bank
                </Link>
                <Link href="/finance/transactions" className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-[12px] font-medium text-[#eef2ff] transition-colors">
                  Add Transaction
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-semibold text-[#4a5a82] uppercase tracking-[0.5px]">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Source</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {recentTransactions.map(tx => (
                    <tr key={tx.id} className="text-[12px] text-[#eef2ff]">
                      <td className="py-3.5 text-[#94a3c8]">{tx.date}</td>
                      <td className="py-3.5 font-medium">{tx.description}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceBadgeClass(tx.source_type)}`}>
                          {getSourceLabel(tx.source_type)}
                        </span>
                      </td>
                      <td className={`py-3.5 text-right font-semibold font-space ${tx.total_amount >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {tx.total_amount >= 0 ? '+' : ''}{formatCurrency(tx.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

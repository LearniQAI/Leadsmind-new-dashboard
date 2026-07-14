'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { TrendingUp, TrendingDown, FileText, Landmark, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

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
        return 'bg-dash-accent/10 text-dash-accent border border-dash-accent/20';
      case 'expense':
        return 'bg-red/10 text-red border border-red/20';
      case 'bank_feed':
        return 'bg-green/10 text-green border border-green/20';
      default:
        return 'bg-dash-surface !text-dash-textMuted border border-dash-border';
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
      <div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold !text-dash-text">
              Financial <span className="text-dash-accent">Overview</span>
            </h1>
            <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
              Your business finances at a glance
            </p>
          </div>
          <button
            onClick={fetchData}
            className="w-9 h-9 rounded-xl border border-dash-border bg-dash-surface flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60 transition-colors motion-reduce:transition-none"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red/10 border border-red/20 text-red text-[12px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[108px] rounded-xl bg-dash-surface border border-dash-border animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Card 1: Total Income */}
              <DashCard padding="default" className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] !text-dash-textMuted font-medium">Income this month</span>
                  <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold text-green">
                  {formatCurrency(stats.totalIncome)}
                </span>
              </DashCard>

              {/* Card 2: Total Expenses */}
              <DashCard padding="default" className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] !text-dash-textMuted font-medium">Expenses this month</span>
                  <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center text-red">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold text-red">
                  {formatCurrency(stats.totalExpenses)}
                </span>
              </DashCard>

              {/* Card 3: Outstanding Invoices */}
              <DashCard padding="default" className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] !text-dash-textMuted font-medium">Invoices unpaid</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <FileText size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold text-amber-600">
                  {stats.outstandingInvoicesCount}
                </span>
              </DashCard>

              {/* Card 4: Cash Balance */}
              <DashCard padding="default" className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] !text-dash-textMuted font-medium">Available balance</span>
                  <div className="w-8 h-8 rounded-lg bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                    <Landmark size={16} />
                  </div>
                </div>
                <span className="text-[28px] font-bold text-dash-accent">
                  {formatCurrency(stats.cashBalance)}
                </span>
              </DashCard>
            </div>
          )
        )}

        {/* Recent Transactions Section */}
        <DashCard padding="default" interactive={false}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-semibold !text-dash-text">
              Recent Transactions
            </h3>
            <Link
              href="/finance/transactions"
              className="text-dash-accent hover:text-dash-accent/80 text-[12px] font-medium flex items-center gap-1 transition-colors"
            >
              View all transactions <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[48px] rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px] !text-dash-textMuted">
                No transactions yet. Connect your bank or add transactions manually.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <DashButton asChild variant="primary" size="sm">
                  <Link href="/finance/connected-accounts">Connect Bank</Link>
                </DashButton>
                <DashButton asChild variant="secondary" size="sm">
                  <Link href="/finance/transactions">Add Transaction</Link>
                </DashButton>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dash-border text-[11px] font-semibold !text-dash-textMuted uppercase tracking-wide">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Source</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {recentTransactions.map(tx => (
                    <tr key={tx.id} className="text-[12px] !text-dash-text">
                      <td className="py-3.5 !text-dash-textMuted">{tx.date}</td>
                      <td className="py-3.5 font-medium">{tx.description}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceBadgeClass(tx.source_type)}`}>
                          {getSourceLabel(tx.source_type)}
                        </span>
                      </td>
                      <td className={`py-3.5 text-right font-semibold ${tx.total_amount >= 0 ? 'text-green' : 'text-red'}`}>
                        {tx.total_amount >= 0 ? '+' : ''}{formatCurrency(tx.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashCard>
      </div>
    </Wrapper>
  );
}

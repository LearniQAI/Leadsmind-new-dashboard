'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Receipt, ArrowUpDown, Download, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type ReportType = 'pl' | 'vat' | 'cashflow';

interface ReportRow {
  label: string;
  amount: number;
}

export default function ReportsPage() {
  const { workspace } = useDashboardContext() as any;
  const workspaceId = workspace?.id || null;

  const [activeReport, setActiveReport] = useState<ReportType>('pl');
  const [loading, setLoading] = useState(false);

  // Filters
  const [plPeriod, setPlPeriod] = useState('this-month');
  const [vatPeriod, setVatPeriod] = useState('this-month');

  // Report Data States
  const [plData, setPlData] = useState<{
    income: ReportRow[];
    expenses: ReportRow[];
    netProfit: number;
  } | null>(null);

  const [vatData, setVatData] = useState<{
    outputVat: number;
    inputVat: number;
    netVat: number;
  } | null>(null);

  const [cashFlowData, setCashFlowData] = useState<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[]>([]);

  const supabase = createClient();

  const getStartEndDates = (period: string) => {
    const now = new Date();
    let start = '';
    let end = '';

    if (period === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (period === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (period === 'this-quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
    } else if (period === 'this-year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    }

    return { start, end };
  };

  const generatePLReport = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { start, end } = getStartEndDates(plPeriod);
      const { data, error } = await supabase
        .from('accounting_transactions')
        .select('total_amount, source_type, description')
        .eq('workspace_id', workspaceId)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const txs = data || [];
      const incomeMap: Record<string, number> = {};
      const expenseMap: Record<string, number> = {};

      txs.forEach(t => {
        const amt = Number(t.total_amount || 0);
        if (amt >= 0) {
          const key = t.source_type || 'manual';
          incomeMap[key] = (incomeMap[key] || 0) + amt;
        } else {
          const key = t.description || 'General Expense';
          expenseMap[key] = (expenseMap[key] || 0) + Math.abs(amt);
        }
      });

      const incomeRows = Object.entries(incomeMap).map(([label, amount]) => ({
        label: label === 'invoice' ? 'Invoiced Revenue' : label === 'bank_feed' ? 'Bank Receipts' : 'Manual Receipts',
        amount
      }));

      const expenseRows = Object.entries(expenseMap).map(([label, amount]) => ({
        label,
        amount
      }));

      const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
      const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);

      setPlData({
        income: incomeRows,
        expenses: expenseRows,
        netProfit: totalIncome - totalExpenses
      });
    } catch (err: any) {
      toast.error(err.message || 'Error generating P&L report');
    } finally {
      setLoading(false);
    }
  };

  const generateVatReport = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { start, end } = getStartEndDates(vatPeriod);

      // Output VAT: 15% of invoice totals
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('total_amount, amount_due')
        .eq('workspace_id', workspaceId)
        .gte('created_at', start + 'T00:00:00Z')
        .lte('created_at', end + 'T23:59:59Z');

      if (invError) throw invError;
      const totalInvoiced = (invData || []).reduce((sum, item) => sum + Number(item.total_amount || item.amount_due || 0), 0);
      const outputVat = totalInvoiced * 0.15;

      // Input VAT: from expense amounts (15% standard rate)
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('workspace_id', workspaceId)
        .gte('date', start)
        .lte('date', end);

      if (expError) throw expError;
      const totalExpenses = (expData || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const inputVat = totalExpenses * 0.15;

      setVatData({
        outputVat,
        inputVat,
        netVat: outputVat - inputVat
      });
    } catch (err: any) {
      toast.error(err.message || 'Error generating VAT report');
    } finally {
      setLoading(false);
    }
  };

  const generateCashFlowReport = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      // Fetch all transactions from past 12 months
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('accounting_transactions')
        .select('total_amount, date')
        .eq('workspace_id', workspaceId)
        .gte('date', twelveMonthsAgo)
        .order('date', { ascending: true });

      if (error) throw error;

      const txs = data || [];
      const monthsMap: Record<string, { income: number; expenses: number }> = {};

      // Seed past 12 months in order
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthsMap[key] = { income: 0, expenses: 0 };
      }

      txs.forEach(t => {
        const d = new Date(t.date);
        const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (monthsMap[key]) {
          const amt = Number(t.total_amount || 0);
          if (amt >= 0) {
            monthsMap[key].income += amt;
          } else {
            monthsMap[key].expenses += Math.abs(amt);
          }
        }
      });

      const formatted = Object.entries(monthsMap).map(([month, vals]) => ({
        month,
        income: vals.income,
        expenses: vals.expenses,
        net: vals.income - vals.expenses
      }));

      setCashFlowData(formatted);
    } catch (err: any) {
      toast.error(err.message || 'Error generating cash flow report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'pl') {
      generatePLReport();
    } else if (activeReport === 'vat') {
      generateVatReport();
    } else if (activeReport === 'cashflow') {
      generateCashFlowReport();
    }
  }, [workspaceId, activeReport, plPeriod, vatPeriod]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = '';
    let fileName = 'financial-report.csv';

    if (activeReport === 'pl' && plData) {
      fileName = `profit-and-loss-${plPeriod}.csv`;
      csvContent += 'Profit & Loss Statement\n';
      csvContent += `Period: ${plPeriod}\n\n`;
      csvContent += 'INCOME\nCategory,Amount\n';
      plData.income.forEach(r => {
        csvContent += `"${r.label}",${r.amount}\n`;
      });
      csvContent += `Total Income,${plData.income.reduce((s, r) => s + r.amount, 0)}\n\n`;
      csvContent += 'EXPENSES\nCategory,Amount\n';
      plData.expenses.forEach(r => {
        csvContent += `"${r.label}",${r.amount}\n`;
      });
      csvContent += `Total Expenses,${plData.expenses.reduce((s, r) => s + r.amount, 0)}\n\n`;
      csvContent += `Net Profit,${plData.netProfit}\n`;
    } else if (activeReport === 'vat' && vatData) {
      fileName = `vat-report-${vatPeriod}.csv`;
      csvContent += 'VAT Report (VAT201)\n';
      csvContent += `Period: ${vatPeriod}\n\n`;
      csvContent += `Output VAT (on sales),${vatData.outputVat}\n`;
      csvContent += `Input VAT (on purchases),${vatData.inputVat}\n`;
      csvContent += `Net VAT Payable/Refundable,${vatData.netVat}\n`;
    } else if (activeReport === 'cashflow') {
      fileName = 'cash-flow-12-months.csv';
      csvContent += 'Cash Flow Statement (Last 12 Months)\n\n';
      csvContent += 'Month,Income,Expenses,Net Flow\n';
      cashFlowData.forEach(r => {
        csvContent += `"${r.month}",${r.income},${r.expenses},${r.net}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-4xl mx-auto font-sans print:bg-white print:text-black print:px-0">
        
        {/* Header (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
          <div>
            <h1 className="text-[22px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Financial <span className="text-[#2563eb]">Reports</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]">
              Profit & Loss, VAT, and Cash Flow reports for your business
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-t1 border border-white/10 text-[11px] font-bold rounded-xl transition-all"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-t1 border border-white/10 text-[11px] font-bold rounded-xl transition-all"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Report Selector Tabs (Hidden when printing) */}
        <div className="grid grid-cols-3 gap-4 mb-8 print:hidden">
          {/* Card 1: Profit & Loss */}
          <button
            onClick={() => setActiveReport('pl')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-all ${
              activeReport === 'pl'
                ? 'bg-[#2563eb]/10 border-[#2563eb] shadow-md shadow-blue-500/5'
                : 'bg-[rgba(12,21,53,0.85)] border-[rgba(255,255,255,0.07)] hover:border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'pl' ? 'bg-[#2563eb] text-white' : 'bg-blue-500/10 text-[#2563eb]'}`}>
              <BarChart3 size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold text-[#eef2ff] block">Profit & Loss</span>
              <span className="text-[11px] text-[#94a3c8] mt-0.5 block">Income vs expenses statement</span>
            </div>
          </button>

          {/* Card 2: VAT Report */}
          <button
            onClick={() => setActiveReport('vat')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-all ${
              activeReport === 'vat'
                ? 'bg-[#10b981]/10 border-[#10b981] shadow-md shadow-emerald-500/5'
                : 'bg-[rgba(12,21,53,0.85)] border-[rgba(255,255,255,0.07)] hover:border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'vat' ? 'bg-[#10b981] text-white' : 'bg-emerald-500/10 text-[#10b981]'}`}>
              <Receipt size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold text-[#eef2ff] block">VAT Report (VAT201)</span>
              <span className="text-[11px] text-[#94a3c8] mt-0.5 block">Input & output VAT calculations</span>
            </div>
          </button>

          {/* Card 3: Cash Flow */}
          <button
            onClick={() => setActiveReport('cashflow')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-all ${
              activeReport === 'cashflow'
                ? 'bg-[#f59e0b]/10 border-[#f59e0b] shadow-md shadow-amber-500/5'
                : 'bg-[rgba(12,21,53,0.85)] border-[rgba(255,255,255,0.07)] hover:border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'cashflow' ? 'bg-[#f59e0b] text-white' : 'bg-amber-500/10 text-[#f59e0b]'}`}>
              <ArrowUpDown size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold text-[#eef2ff] block">Cash Flow</span>
              <span className="text-[11px] text-[#94a3c8] mt-0.5 block">12-month money inflow/outflow</span>
            </div>
          </button>
        </div>

        {/* Filters Panel per Report (Hidden when printing) */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mb-6 flex items-center justify-between print:hidden">
          <span className="text-[12px] font-semibold text-[#94a3c8]">
            Configure Report Parameters
          </span>

          <div className="flex items-center gap-3">
            {activeReport === 'pl' && (
              <select
                value={plPeriod}
                onChange={e => setPlPeriod(e.target.value)}
                className="bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none"
              >
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
              </select>
            )}

            {activeReport === 'vat' && (
              <select
                value={vatPeriod}
                onChange={e => setVatPeriod(e.target.value)}
                className="bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none"
              >
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
              </select>
            )}

            {activeReport === 'cashflow' && (
              <span className="text-[11px] text-[#4a5a82] font-semibold uppercase">
                Past 12 Months
              </span>
            )}

            <button
              onClick={() => {
                if (activeReport === 'pl') generatePLReport();
                else if (activeReport === 'vat') generateVatReport();
                else if (activeReport === 'cashflow') generateCashFlowReport();
              }}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-t3 hover:text-t1 hover:bg-white/10 transition-colors"
              title="Refresh Report Data"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Generated Report Content */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-8 print:border-none print:bg-white print:p-0">
          
          {/* Print Only Header */}
          <div className="hidden print:block mb-8">
            <h2 className="text-xl font-bold text-black uppercase tracking-tight">LeadsMind Financial Report</h2>
            <p className="text-xs text-slate-500 mt-1">Generated on {new Date().toLocaleString()}</p>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-[#2563eb]" size={24} />
              <span className="text-[12px] text-t3">Generating report metrics...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: P&L Statement */}
              {activeReport === 'pl' && plData && (
                <div>
                  <div className="border-b border-white/5 pb-4 mb-6">
                    <h3 className="text-[16px] font-bold text-[#eef2ff] print:text-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Profit & Loss Statement
                    </h3>
                    <span className="text-[11px] text-[#4a5a82] font-semibold uppercase">
                      Period: {plPeriod.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Income Section */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold uppercase tracking-[1px] text-[#10b981] mb-3">
                      Revenue / Income
                    </h4>
                    <table className="w-full text-left text-[12px]">
                      <tbody>
                        {plData.income.map((row, idx) => (
                          <tr key={idx} className="border-b border-white/[0.02] py-2">
                            <td className="py-2.5 text-[#eef2ff] print:text-black">{row.label}</td>
                            <td className="py-2.5 text-right font-semibold text-[#eef2ff] print:text-black font-space">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {plData.income.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-4 text-[#4a5a82] italic">No income recorded for this period</td>
                          </tr>
                        )}
                        <tr className="font-bold border-t border-white/10">
                          <td className="py-3 text-[#10b981]">Total Revenue</td>
                          <td className="py-3 text-right text-[#10b981] font-space">
                            {formatCurrency(plData.income.reduce((s, r) => s + r.amount, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Expenses Section */}
                  <div className="mb-8">
                    <h4 className="text-[12px] font-bold uppercase tracking-[1px] text-[#ef4444] mb-3">
                      Operating Expenses
                    </h4>
                    <table className="w-full text-left text-[12px]">
                      <tbody>
                        {plData.expenses.map((row, idx) => (
                          <tr key={idx} className="border-b border-white/[0.02] py-2">
                            <td className="py-2.5 text-[#eef2ff] print:text-black">{row.label}</td>
                            <td className="py-2.5 text-right font-semibold text-[#eef2ff] print:text-black font-space">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {plData.expenses.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-4 text-[#4a5a82] italic">No expenses recorded for this period</td>
                          </tr>
                        )}
                        <tr className="font-bold border-t border-white/10">
                          <td className="py-3 text-[#ef4444]">Total Expenses</td>
                          <td className="py-3 text-right text-[#ef4444] font-space">
                            {formatCurrency(plData.expenses.reduce((s, r) => s + r.amount, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Profit Summary Banner */}
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between print:border-slate-300 print:text-black">
                    <span className="text-[14px] font-bold text-[#eef2ff] print:text-black">Net Profit / Loss</span>
                    <span className={`text-[20px] font-bold font-space ${plData.netProfit >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {formatCurrency(plData.netProfit)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: VAT Report (VAT201) */}
              {activeReport === 'vat' && vatData && (
                <div>
                  <div className="border-b border-white/5 pb-4 mb-6">
                    <h3 className="text-[16px] font-bold text-[#eef2ff] print:text-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      VAT Statement (VAT201)
                    </h3>
                    <span className="text-[11px] text-[#4a5a82] font-semibold uppercase">
                      Period: {vatPeriod.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="space-y-4 text-[12px] mb-8">
                    <div className="flex justify-between py-3 border-b border-white/[0.03]">
                      <span className="text-[#94a3c8] print:text-black font-medium">Output VAT (15% on sales)</span>
                      <span className="font-bold text-[#eef2ff] print:text-black font-space">{formatCurrency(vatData.outputVat)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/[0.03]">
                      <span className="text-[#94a3c8] print:text-black font-medium">Input VAT (15% on purchases)</span>
                      <span className="font-bold text-[#eef2ff] print:text-black font-space">{formatCurrency(vatData.inputVat)}</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between print:border-slate-300 print:text-black">
                    <div>
                      <span className="text-[13px] font-bold text-[#eef2ff] print:text-black block">Net VAT Payable to SARS</span>
                      <span className="text-[10px] text-[#4a5a82] block mt-0.5">Negative indicates SARS refund due</span>
                    </div>
                    <span className={`text-[20px] font-bold font-space ${vatData.netVat >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {formatCurrency(vatData.netVat)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 3: Cash Flow Statement */}
              {activeReport === 'cashflow' && (
                <div>
                  <div className="border-b border-white/5 pb-4 mb-6">
                    <h3 className="text-[16px] font-bold text-[#eef2ff] print:text-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Cash Flow Statement
                    </h3>
                    <span className="text-[11px] text-[#4a5a82] font-semibold uppercase">
                      12-Month Inflow/Outflow Overview
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-white/10 font-bold text-[#4a5a82] print:text-black">
                          <th className="py-3">Month</th>
                          <th className="py-3 text-right">Inflow (Income)</th>
                          <th className="py-3 text-right">Outflow (Expenses)</th>
                          <th className="py-3 text-right">Net Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02] print:divide-slate-200">
                        {cashFlowData.map((row, idx) => (
                          <tr key={idx} className="text-[#eef2ff] print:text-black">
                            <td className="py-3 font-medium">{row.month}</td>
                            <td className="py-3 text-right text-[#10b981] font-space font-semibold">{formatCurrency(row.income)}</td>
                            <td className="py-3 text-right text-[#ef4444] font-space font-semibold">{formatCurrency(row.expenses)}</td>
                            <td className={`py-3 text-right font-space font-bold ${row.net >= 0 ? 'text-[#3b82f6]' : 'text-[#ef4444]'}`}>
                              {formatCurrency(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </>
          )}

        </div>
      </div>
    </Wrapper>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Receipt, ArrowUpDown, Download, Printer, RefreshCw, Landmark, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

type ReportType = 'pl' | 'vat' | 'cashflow' | 'compliance';

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

  // Compliance Audit Data States
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const supabase = createClient();

  const fetchContactsForCompliance = async () => {
    if (!workspaceId) return;
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('first_name', { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (err: any) {
      toast.error('Failed to load contacts for compliance: ' + err.message);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'compliance') {
      fetchContactsForCompliance();
    }
  }, [workspaceId, activeReport]);

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

  // LeadsMind does not currently calculate or track VAT anywhere in the invoice/expense
  // creation flow (see Task 14 audit — invoices.tax_total is always 0, no per-invoice or
  // per-expense VAT logic exists). This used to fabricate Output/Input VAT as a flat 15% of
  // raw invoice/expense totals and present it as a "VAT201" filing figure — a real business
  // could have acted on that fictional number. Rather than invent a calculation here (that's
  // a business/billing decision, not a display fix), this report now states plainly that VAT
  // isn't tracked instead of showing any computed number, since even "R0.00 payable" could be
  // misread as a confirmed, verified position.
  const generateVatReport = async () => {
    if (!workspaceId) return;
    setVatData(null);
    setLoading(false);
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
    } else if (activeReport === 'vat') {
      fileName = `vat-report-${vatPeriod}.csv`;
      csvContent += 'VAT Report (VAT201)\n';
      csvContent += `Period: ${vatPeriod}\n\n`;
      csvContent += 'VAT is not currently calculated or tracked by LeadsMind. Consult your accounting records for accurate SARS VAT201 filing figures.\n';
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

  const riskLabel = (flag?: string) => {
    if (!flag) return 'Low';
    return flag.charAt(0).toUpperCase() + flag.slice(1).toLowerCase();
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto print:bg-white print:text-black print:px-0">

        {/* Header (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
          <div>
            <h1 className="text-[22px] font-bold !text-dash-text">
              Financial <span className="text-dash-accent">Reports</span>
            </h1>
            <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
              Profit & Loss, VAT, and Cash Flow reports for your business
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DashButton onClick={handleExportCSV} variant="secondary" size="sm">
              <Download size={13} /> Export CSV
            </DashButton>
            <DashButton onClick={handlePrint} variant="secondary" size="sm">
              <Printer size={13} /> Print
            </DashButton>
          </div>
        </div>

        {/* Report Selector Tabs (Hidden when printing) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden">
          {/* Card 1: Profit & Loss */}
          <button
            onClick={() => setActiveReport('pl')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-colors motion-reduce:transition-none ${
              activeReport === 'pl'
                ? 'bg-dash-accent/10 border-dash-accent shadow-md shadow-dash-accent/5'
                : 'bg-white border-dash-border hover:border-dash-text/15'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'pl' ? 'bg-dash-accent text-white' : 'bg-dash-accent/10 text-dash-accent'}`}>
              <BarChart3 size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold !text-dash-text block">Profit & Loss</span>
              <span className="text-[11px] !text-dash-textMuted mt-0.5 block">Income vs expenses statement</span>
            </div>
          </button>

          {/* Card 2: VAT Report */}
          <button
            onClick={() => setActiveReport('vat')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-colors motion-reduce:transition-none ${
              activeReport === 'vat'
                ? 'bg-green/10 border-green shadow-md shadow-green/5'
                : 'bg-white border-dash-border hover:border-dash-text/15'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'vat' ? 'bg-green text-white' : 'bg-green/10 text-green'}`}>
              <Receipt size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold !text-dash-text block">VAT Report (VAT201)</span>
              <span className="text-[11px] !text-dash-textMuted mt-0.5 block">Input & output VAT calculations</span>
            </div>
          </button>

          {/* Card 3: Cash Flow */}
          <button
            onClick={() => setActiveReport('cashflow')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-colors motion-reduce:transition-none ${
              activeReport === 'cashflow'
                ? 'bg-amber-50 border-amber-500 shadow-md shadow-amber-500/5'
                : 'bg-white border-dash-border hover:border-dash-text/15'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'cashflow' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <ArrowUpDown size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold !text-dash-text block">Cash Flow</span>
              <span className="text-[11px] !text-dash-textMuted mt-0.5 block">12-month money inflow/outflow</span>
            </div>
          </button>

          {/* Card 4: FICA Compliance */}
          <button
            onClick={() => setActiveReport('compliance')}
            className={`p-5 rounded-2xl border flex flex-col items-start text-left gap-2 transition-colors motion-reduce:transition-none ${
              activeReport === 'compliance'
                ? 'bg-purple-50 border-purple-500 shadow-md shadow-purple-500/5'
                : 'bg-white border-dash-border hover:border-dash-text/15'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'compliance' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <Landmark size={16} />
            </div>
            <div>
              <span className="text-[13px] font-bold !text-dash-text block">FICA KYC Audit</span>
              <span className="text-[11px] !text-dash-textMuted mt-0.5 block">Audit trails & FICA report exports</span>
            </div>
          </button>
        </div>

        {/* Filters Panel per Report (Hidden when printing) */}
        <DashCard padding="default" interactive={false} className="mb-6 flex items-center justify-between print:hidden">
          <span className="text-[12px] font-semibold !text-dash-textMuted">
            Configure Report Parameters
          </span>

          <div className="flex items-center gap-3">
            {activeReport === 'pl' && (
              <select
                value={plPeriod}
                onChange={e => setPlPeriod(e.target.value)}
                className="bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none"
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
                className="bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none"
              >
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
              </select>
            )}

            {activeReport === 'cashflow' && (
              <span className="text-[11px] !text-dash-textMuted font-semibold">
                Past 12 Months
              </span>
            )}

            <button
              onClick={() => {
                if (activeReport === 'pl') generatePLReport();
                else if (activeReport === 'vat') generateVatReport();
                else if (activeReport === 'cashflow') generateCashFlowReport();
              }}
              className="p-2 rounded-xl bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60 transition-colors motion-reduce:transition-none"
              title="Refresh Report Data"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
            </button>
          </div>
        </DashCard>

        {/* Generated Report Content */}
        <DashCard padding="default" interactive={false} className="print:border-none print:bg-white print:p-0">

          {/* Print Only Header */}
          <div className="hidden print:block mb-8">
            <h2 className="text-xl font-bold text-black">LeadsMind Financial Report</h2>
            <p className="text-xs text-slate-500 mt-1">Generated on {new Date().toLocaleString()}</p>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin motion-reduce:animate-none text-dash-accent" size={24} />
              <span className="text-[12px] !text-dash-textMuted">Generating report metrics...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: P&L Statement */}
              {activeReport === 'pl' && plData && (
                <div>
                  <div className="border-b border-dash-border pb-4 mb-6">
                    <h3 className="text-[16px] font-bold !text-dash-text print:text-black">
                      Profit & Loss Statement
                    </h3>
                    <span className="text-[11px] !text-dash-textMuted font-semibold capitalize">
                      Period: {plPeriod.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Income Section */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold text-green mb-3">
                      Revenue / Income
                    </h4>
                    <table className="w-full text-left text-[12px]">
                      <tbody>
                        {plData.income.map((row, idx) => (
                          <tr key={idx} className="border-b border-dash-border py-2">
                            <td className="py-2.5 !text-dash-text print:text-black">{row.label}</td>
                            <td className="py-2.5 text-right font-semibold !text-dash-text print:text-black">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {plData.income.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-4 !text-dash-textMuted italic">No income recorded for this period</td>
                          </tr>
                        )}
                        <tr className="font-bold border-t border-dash-border">
                          <td className="py-3 text-green">Total Revenue</td>
                          <td className="py-3 text-right text-green">
                            {formatCurrency(plData.income.reduce((s, r) => s + r.amount, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Expenses Section */}
                  <div className="mb-8">
                    <h4 className="text-[12px] font-bold text-red mb-3">
                      Operating Expenses
                    </h4>
                    <table className="w-full text-left text-[12px]">
                      <tbody>
                        {plData.expenses.map((row, idx) => (
                          <tr key={idx} className="border-b border-dash-border py-2">
                            <td className="py-2.5 !text-dash-text print:text-black">{row.label}</td>
                            <td className="py-2.5 text-right font-semibold !text-dash-text print:text-black">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {plData.expenses.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-4 !text-dash-textMuted italic">No expenses recorded for this period</td>
                          </tr>
                        )}
                        <tr className="font-bold border-t border-dash-border">
                          <td className="py-3 text-red">Total Expenses</td>
                          <td className="py-3 text-right text-red">
                            {formatCurrency(plData.expenses.reduce((s, r) => s + r.amount, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Profit Summary Banner */}
                  <div className="p-5 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-between print:border-slate-300 print:text-black">
                    <span className="text-[14px] font-bold !text-dash-text print:text-black">Net Profit / Loss</span>
                    <span className={`text-[20px] font-bold ${plData.netProfit >= 0 ? 'text-green' : 'text-red'}`}>
                      {formatCurrency(plData.netProfit)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: VAT Report (VAT201) */}
              {activeReport === 'vat' && (
                <div>
                  <div className="border-b border-dash-border pb-4 mb-6">
                    <h3 className="text-[16px] font-bold !text-dash-text print:text-black">
                      VAT Statement (VAT201)
                    </h3>
                    <span className="text-[11px] !text-dash-textMuted font-semibold capitalize">
                      Period: {vatPeriod.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="p-5 rounded-xl bg-dash-surface border border-dash-border flex items-start gap-3 print:border-slate-300 print:text-black">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[13px] font-bold !text-dash-text print:text-black block">VAT is not currently tracked</span>
                      <span className="text-[11px] !text-dash-textMuted block mt-1 leading-relaxed">
                        LeadsMind does not currently calculate or record VAT on invoices or expenses.
                        Consult your accounting records for accurate SARS VAT201 filing figures.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Cash Flow Statement */}
              {activeReport === 'cashflow' && (
                <div>
                  <div className="border-b border-dash-border pb-4 mb-6">
                    <h3 className="text-[16px] font-bold !text-dash-text print:text-black">
                      Cash Flow Statement
                    </h3>
                    <span className="text-[11px] !text-dash-textMuted font-semibold">
                      12-Month Inflow/Outflow Overview
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-dash-border font-bold !text-dash-textMuted print:text-black">
                          <th className="py-3">Month</th>
                          <th className="py-3 text-right">Inflow (Income)</th>
                          <th className="py-3 text-right">Outflow (Expenses)</th>
                          <th className="py-3 text-right">Net Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dash-border print:divide-slate-200">
                        {cashFlowData.map((row, idx) => (
                          <tr key={idx} className="!text-dash-text print:text-black">
                            <td className="py-3 font-medium">{row.month}</td>
                            <td className="py-3 text-right text-green font-semibold">{formatCurrency(row.income)}</td>
                            <td className="py-3 text-right text-red font-semibold">{formatCurrency(row.expenses)}</td>
                            <td className={`py-3 text-right font-bold ${row.net >= 0 ? 'text-dash-accent' : 'text-red'}`}>
                              {formatCurrency(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: FICA Compliance Audit Panel */}
              {activeReport === 'compliance' && (
                <div>
                  <div className="border-b border-dash-border pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[16px] font-bold !text-dash-text">
                        FICA Regulatory Auditing Ledger
                      </h3>
                      <span className="text-[11px] !text-dash-textMuted font-semibold">
                        Generate official audit files for regulatory inspections
                      </span>
                    </div>

                    {/* Search bar */}
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-9 bg-white border border-dash-border text-xs px-3.5 rounded-xl !text-dash-text outline-none focus:border-purple-500/40"
                      />
                    </div>
                  </div>

                  {loadingContacts ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin motion-reduce:animate-none text-purple-600" size={24} />
                      <span className="text-[12px] !text-dash-textMuted">Loading compliance records...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-dash-border font-bold !text-dash-textMuted">
                            <th className="py-3">Contact</th>
                            <th className="py-3">ID Number</th>
                            <th className="py-3">FICA Status</th>
                            <th className="py-3">Risk Rating</th>
                            <th className="py-3 text-right">Audit PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dash-border">
                          {(() => {
                            const filtered = contacts.filter(c => {
                              const q = searchQuery.toLowerCase();
                              const name = `${c.first_name} ${c.last_name || ''}`.toLowerCase();
                              const idNum = (c.id_number || '').toLowerCase();
                              return name.includes(q) || idNum.includes(q);
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center !text-dash-textMuted italic">
                                    No matching compliance profiles found.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((c) => (
                              <tr key={c.id} className="!text-dash-text">
                                <td className="py-3.5">
                                  <div className="font-bold">{c.first_name} {c.last_name || ''}</div>
                                  <div className="text-[10px] !text-dash-textMuted">{c.email || 'No email'}</div>
                                </td>
                                <td className="py-3.5 font-mono text-[11px] font-semibold">
                                  {c.id_number || 'Missing ID'}
                                </td>
                                <td className="py-3.5">
                                  <DashStatusPill variant={c.kyc_id_verified ? 'success' : 'neutral'}>
                                    {c.kyc_id_verified ? 'Verified' : 'Unverified'}
                                  </DashStatusPill>
                                </td>
                                <td className="py-3.5">
                                  <DashStatusPill
                                    variant={
                                      c.kyc_risk_flag === 'HIGH' ? 'danger' :
                                      c.kyc_risk_flag === 'MEDIUM' ? 'warning' :
                                      'success'
                                    }
                                  >
                                    {riskLabel(c.kyc_risk_flag)}
                                  </DashStatusPill>
                                </td>
                                <td className="py-3.5 text-right">
                                  <a
                                    href={`/api/kyc/reports/download/${c.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors motion-reduce:transition-none"
                                  >
                                    Export <Download size={11} />
                                  </a>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* FICA Regulatory Audit Info card */}
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl flex gap-3 text-[11px] !text-dash-textMuted leading-relaxed mt-6">
                    <AlertCircle size={14} className="shrink-0 text-purple-600 mt-0.5" />
                    <span>
                      <strong>Regulatory Auditing Guide:</strong> Under the Financial Intelligence Centre Act (FICA), this platform keeps electronic audit logs for all verifications. Exporting PDF reports compiles legal profiles containing client details, HANIS outputs, sanctions screen details, and POPIA timestamps suitable for regulatory inspections.
                    </span>
                  </div>
                </div>
              )}

            </>
          )}

        </DashCard>
      </div>
    </Wrapper>
  );
}

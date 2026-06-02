'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  source_type: string;
  total_amount: number;
}

export default function TransactionsPage() {
  const { workspace } = useDashboardContext() as any;
  const workspaceId = workspace?.id || null;

  // List state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Filters state
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [txDate, setTxDate] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txReference, setTxReference] = useState('');

  const fetchTransactions = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId,
        page: page.toString(),
        limit: limit.toString(),
        search
      });

      const res = await fetch(`/api/finance/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const json = await res.json();

      let filtered = json.transactions || [];

      // Apply client-side filters for date & source_type to support complex range filtering instantly
      if (sourceType) {
        filtered = filtered.filter((tx: Transaction) => tx.source_type === sourceType);
      }
      if (fromDate) {
        filtered = filtered.filter((tx: Transaction) => tx.date >= fromDate);
      }
      if (toDate) {
        filtered = filtered.filter((tx: Transaction) => tx.date <= toDate);
      }

      setTransactions(filtered);
      setTotal(json.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Error loading transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [workspaceId, page, search, sourceType, fromDate, toDate]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDescription('');
    setTxAmount('');
    setTxType('income');
    setTxReference('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setModalMode('edit');
    setEditingId(tx.id);
    setTxDate(tx.date);
    setTxDescription(tx.description);
    setTxAmount(Math.abs(tx.total_amount).toString());
    setTxType(tx.total_amount >= 0 ? 'income' : 'expense');
    setTxReference(tx.reference || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription || !txAmount) {
      toast.error('Please enter description and amount');
      return;
    }

    try {
      const body = {
        workspaceId,
        date: txDate,
        description: txDescription,
        amount: Number(txAmount),
        type: txType,
        reference: txReference
      };

      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`/api/finance/transactions?id=${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save transaction');

      toast.success(modalMode === 'create' ? 'Transaction created' : 'Transaction updated');
      setIsModalOpen(false);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Error saving transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/finance/transactions?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete transaction');
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting transaction');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'invoice': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'expense': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'bank_feed': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      default: return 'bg-white/5 text-t3 border border-white/10';
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

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-5xl mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Transactions
            </h1>
            <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]">
              All income and expenses across your workspace
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-[12px] font-bold text-white rounded-xl shadow-lg shadow-blue-500/10 transition-all font-space"
          >
            <Plus size={16} /> Add Transaction
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mb-6 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t4" size={14} />
            <input
              type="text"
              placeholder="Search description or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#070d24] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
            />
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#4a5a82] font-semibold uppercase">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-[#070d24] border border-white/5 rounded-xl py-1.5 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
            />
            <span className="text-[11px] text-[#4a5a82] font-semibold uppercase">To</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-[#070d24] border border-white/5 rounded-xl py-1.5 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
            />
          </div>

          {/* Source Dropdown */}
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            className="bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
          >
            <option value="">All Sources</option>
            <option value="invoice">Invoice</option>
            <option value="expense">Expense</option>
            <option value="bank_feed">Bank</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Table List */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded-lg bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-t3 flex flex-col items-center gap-2">
              <AlertCircle size={24} className="text-[#4a5a82]" />
              <p className="text-[13px] text-[#94a3c8]">No transactions matched your criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-semibold text-[#4a5a82] uppercase tracking-[0.5px] bg-white/[0.01]">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Reference</th>
                      <th className="py-4 px-6">Source</th>
                      <th className="py-4 px-6 text-right">Amount</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="text-[12px] text-[#eef2ff] hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-6 text-[#94a3c8]">{tx.date}</td>
                        <td className="py-4 px-6 font-medium">{tx.description}</td>
                        <td className="py-4 px-6 text-[#94a3c8]">{tx.reference || '-'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceBadgeClass(tx.source_type)}`}>
                            {getSourceLabel(tx.source_type)}
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-right font-semibold font-space ${tx.total_amount >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {tx.total_amount >= 0 ? '+' : ''}{formatCurrency(tx.total_amount)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="text-t3 hover:text-[#2563eb] transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-t3 hover:text-[#ef4444] transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-white/5 p-4 flex items-center justify-between">
                <span className="text-[11px] text-[#4a5a82] font-semibold">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-white/[0.03] border border-white/5 text-t3 hover:text-t1 disabled:opacity-40 disabled:hover:text-t3 text-[11px] rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-white/[0.03] border border-white/5 text-t3 hover:text-t1 disabled:opacity-40 disabled:hover:text-t3 text-[11px] rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {modalMode === 'create' ? 'Add Transaction' : 'Edit Transaction'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-t3 hover:text-t1 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.8px] mb-1.5">Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.8px] mb-1.5">Description</label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                    placeholder="e.g. Server hosting subscription"
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
                    required
                  />
                </div>

                {/* Amount & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.8px] mb-1.5">Amount (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all font-space"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.8px] mb-1.5">Type</label>
                    <div className="flex bg-[#070d24] border border-white/5 rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setTxType('income')}
                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${txType === 'income' ? 'bg-[#10b981]/20 text-[#10b981]' : 'text-[#4a5a82]'}`}
                      >
                        Income
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxType('expense')}
                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${txType === 'expense' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'text-[#4a5a82]'}`}
                      >
                        Expense
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.8px] mb-1.5">Reference (Optional)</label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={e => setTxReference(e.target.value)}
                    placeholder="e.g. INV-0043"
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl py-2 px-3 text-[12px] text-[#eef2ff] outline-none focus:border-[#2563eb]/50 transition-all"
                  />
                </div>

                {/* Submit */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-white/5 hover:bg-white/5 text-[11px] font-bold rounded-xl text-t3 hover:text-t1 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-[11px] font-bold rounded-xl text-white transition-colors"
                  >
                    Save Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

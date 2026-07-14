'use client';

import React, { useEffect, useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

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
      case 'invoice': return 'bg-dash-accent/10 text-dash-accent border border-dash-accent/20';
      case 'expense': return 'bg-red/10 text-red border border-red/20';
      case 'bank_feed': return 'bg-green/10 text-green border border-green/20';
      default: return 'bg-dash-surface !text-dash-textMuted border border-dash-border';
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
      <div className="min-h-screen bg-white px-6 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-bold !text-dash-text">
              Transactions
            </h1>
            <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
              All income and expenses across your workspace
            </p>
          </div>
          <DashButton onClick={handleOpenCreate} variant="primary" size="sm">
            <Plus size={16} /> Add Transaction
          </DashButton>
        </div>

        {/* Filters */}
        <DashCard padding="default" interactive={false} className="mb-6 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
            <input
              type="text"
              placeholder="Search description or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dash-surface border border-dash-border rounded-xl py-2 pl-10 pr-4 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
            />
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] !text-dash-textMuted font-semibold">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-dash-surface border border-dash-border rounded-xl py-1.5 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
            />
            <span className="text-[11px] !text-dash-textMuted font-semibold">To</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-dash-surface border border-dash-border rounded-xl py-1.5 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
            />
          </div>

          {/* Source Dropdown */}
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            className="bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
          >
            <option value="">All Sources</option>
            <option value="invoice">Invoice</option>
            <option value="expense">Expense</option>
            <option value="bank_feed">Bank</option>
            <option value="manual">Manual</option>
          </select>
        </DashCard>

        {/* Table List */}
        <DashCard padding="none" interactive={false} className="overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center !text-dash-textMuted flex flex-col items-center gap-2">
              <AlertCircle size={24} className="!text-dash-textMuted" />
              <p className="text-[13px] !text-dash-textMuted">No transactions matched your criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dash-border text-[11px] font-semibold !text-dash-textMuted uppercase tracking-wide bg-dash-surface">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Reference</th>
                      <th className="py-4 px-6">Source</th>
                      <th className="py-4 px-6 text-right">Amount</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="text-[12px] !text-dash-text hover:bg-dash-surface/60 transition-colors motion-reduce:transition-none">
                        <td className="py-4 px-6 !text-dash-textMuted">{tx.date}</td>
                        <td className="py-4 px-6 font-medium">{tx.description}</td>
                        <td className="py-4 px-6 !text-dash-textMuted">{tx.reference || '-'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceBadgeClass(tx.source_type)}`}>
                            {getSourceLabel(tx.source_type)}
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-right font-semibold ${tx.total_amount >= 0 ? 'text-green' : 'text-red'}`}>
                          {tx.total_amount >= 0 ? '+' : ''}{formatCurrency(tx.total_amount)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="!text-dash-textMuted hover:text-dash-accent transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="!text-dash-textMuted hover:text-red transition-colors"
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
              <div className="border-t border-dash-border p-4 flex items-center justify-between">
                <span className="text-[11px] !text-dash-textMuted font-semibold">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text disabled:opacity-40 disabled:hover:!text-dash-textMuted text-[11px] rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text disabled:opacity-40 disabled:hover:!text-dash-textMuted text-[11px] rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </DashCard>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-dash-border bg-dash-surface">
                <h3 className="text-[15px] font-bold !text-dash-text">
                  {modalMode === 'create' ? 'Add Transaction' : 'Edit Transaction'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="!text-dash-textMuted hover:!text-dash-text transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="w-full bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">Description</label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                    placeholder="e.g. Server hosting subscription"
                    className="w-full bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
                    required
                  />
                </div>

                {/* Amount & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">Amount (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">Type</label>
                    <div className="flex bg-dash-surface border border-dash-border rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setTxType('income')}
                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${txType === 'income' ? 'bg-green/20 text-green' : '!text-dash-textMuted'}`}
                      >
                        Income
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxType('expense')}
                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${txType === 'expense' ? 'bg-red/20 text-red' : '!text-dash-textMuted'}`}
                      >
                        Expense
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">Reference (Optional)</label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={e => setTxReference(e.target.value)}
                    placeholder="e.g. INV-0043"
                    className="w-full bg-dash-surface border border-dash-border rounded-xl py-2 px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent/50 transition-colors"
                  />
                </div>

                {/* Submit */}
                <div className="pt-2 flex justify-end gap-3">
                  <DashButton type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" variant="primary" size="sm">
                    Save Transaction
                  </DashButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

'use client';

import React, { useState } from 'react';
import { Search, Landmark, Plus, Trash2, Pencil, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createAccount, updateAccount, deleteAccount } from '@/app/actions/chartOfAccounts';
import type { AccountType } from '@/app/actions/chartOfAccounts';
import AccountDialog, { AccountFormData } from './AccountDialog';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category?: string | null;
  parent_id?: string | null;
  tax_category?: string | null;
  is_system: boolean;
}

interface ChartOfAccountsClientProps {
  accounts: Account[];
}

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};
const TYPE_COLORS: Record<AccountType, string> = {
  asset: 'bg-dash-accent/10 border-dash-accent/20 text-dash-accent',
  liability: 'bg-amber-50 border-amber-200 text-amber-600',
  equity: 'bg-purple-50 border-purple-200 text-purple-600',
  revenue: 'bg-green/10 border-green/20 text-green',
  expense: 'bg-red/10 border-red/20 text-red',
};

export function ChartOfAccountsClient({ accounts: initial }: ChartOfAccountsClientProps) {
  const [accounts, setAccounts] = useState<Account[]>(initial);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(AccountFormData & { id: string }) | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  const byId = (id: string) => accounts.find(a => a.id === id);

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  const grouped = TYPE_ORDER.map(type => ({
    type,
    accounts: filtered.filter(a => a.type === type).sort((a, b) => a.code.localeCompare(b.code)),
  })).filter(g => g.accounts.length > 0);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (a: Account) => {
    setEditing({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      category: a.category || '',
      parentId: a.parent_id || null,
      taxCategory: a.tax_category || '',
    });
    setDialogOpen(true);
  };

  const handleConfirm = async (data: AccountFormData) => {
    if (editing) {
      const res = await updateAccount(editing.id, data);
      if (!res.success) {
        toast.error(res.error || 'Failed to update account');
        throw new Error(res.error);
      }
      setAccounts(prev => prev.map(a => a.id === editing.id ? res.account : a));
      toast.success('Account updated');
    } else {
      const res = await createAccount(data);
      if (!res.success) {
        toast.error(res.error || 'Failed to create account');
        throw new Error(res.error);
      }
      setAccounts(prev => [...prev, res.account]);
      toast.success('Account created');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteAccount(deleteTarget.id);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error || 'Failed to delete account');
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id));
    setDeleteOpen(false);
    toast.success('Account deleted');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] w-full bg-white">
      <div className="p-4 border-b border-dash-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-dash-surface">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full bg-white border border-dash-border rounded-lg pl-9 pr-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors"
          />
        </div>
        <DashButton variant="primary" onClick={openCreate}>
          <Plus size={14} /> New Account
        </DashButton>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        {grouped.length === 0 ? (
          <div className="p-16">
            <DashEmptyState
              icon={Landmark}
              title="No accounts found"
              description="Try a different search, or add a new account to your chart of accounts"
            />
          </div>
        ) : (
          <div className="max-w-[1000px] mx-auto p-6 space-y-8">
            {grouped.map(group => (
              <div key={group.type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold border', TYPE_COLORS[group.type])}>
                    {TYPE_LABELS[group.type]}
                  </span>
                  <span className="text-[11px] font-semibold !text-dash-textMuted">{group.accounts.length} account{group.accounts.length === 1 ? '' : 's'}</span>
                </div>
                <div className="bg-white border border-dash-border rounded-2xl overflow-hidden divide-y divide-dash-border">
                  {group.accounts.map(a => (
                    <div key={a.id} className="p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-bold !text-dash-textMuted font-mono w-14 shrink-0">{a.code}</span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold !text-dash-text truncate flex items-center gap-1.5">
                            {a.parent_id && byId(a.parent_id) ? (
                              <span className="!text-dash-textMuted font-normal">{byId(a.parent_id)!.name} / </span>
                            ) : null}
                            {a.name}
                            {a.is_system && <Lock size={11} className="!text-dash-textMuted shrink-0" />}
                          </p>
                          {(a.category || a.tax_category) && (
                            <p className="text-[11px] !text-dash-textMuted mt-0.5">
                              {[a.category, a.tax_category].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <DashButton variant="ghost" size="icon" onClick={() => openEdit(a)}>
                          <Pencil size={13} />
                        </DashButton>
                        <DashButton
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeleteTarget(a); setDeleteOpen(true); }}
                          disabled={a.is_system}
                          title={a.is_system ? 'System accounts cannot be deleted' : 'Delete account'}
                        >
                          <Trash2 size={13} className={a.is_system ? '' : 'text-red'} />
                        </DashButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accounts={accounts}
        editing={editing}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete account?"
        description={`This will permanently delete ${deleteTarget?.code} — ${deleteTarget?.name}. This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

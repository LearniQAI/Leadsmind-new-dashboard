'use client';

import React, { useState, useTransition } from 'react';
import { Search, Wallet, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createOrTopUpRetainer, getRetainerLedger } from '@/app/actions/retainers';
import RetainerDialog from './RetainerDialog';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

interface RetainersClientProps {
  retainers: any[];
  contacts: any[];
  workspaceId: string;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'active'
    ? 'bg-green/10 border-green/20 text-green'
    : 'bg-dash-surface border-dash-border !text-dash-textMuted';
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold border capitalize', color)}>
      {status || 'active'}
    </span>
  );
}

export function RetainersClient({ retainers: initial, contacts, workspaceId }: RetainersClientProps) {
  const [retainers, setRetainers] = useState<any[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id || null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, startLedgerLoad] = useTransition();

  const selected = retainers.find(r => r.id === selectedId);
  const existingContactIds = retainers.map(r => r.contact_id);

  const filtered = retainers.filter(r => {
    const q = search.toLowerCase();
    return (
      r.contact?.first_name?.toLowerCase().includes(q) ||
      r.contact?.last_name?.toLowerCase().includes(q) ||
      r.contact?.email?.toLowerCase().includes(q)
    );
  });

  const loadLedger = (retainerId: string) => {
    setSelectedId(retainerId);
    startLedgerLoad(async () => {
      const entries = await getRetainerLedger(retainerId, workspaceId);
      setLedger(entries);
    });
  };

  React.useEffect(() => {
    if (selectedId) loadLedger(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async (data: { contactId: string; amount: number }) => {
    const res = await createOrTopUpRetainer({ workspaceId, contactId: data.contactId, amount: data.amount });
    if (!res.success) {
      toast.error(res.error || 'Failed to save retainer');
      throw new Error(res.error);
    }

    const existing = retainers.find(r => r.contact_id === data.contactId);
    if (existing) {
      setRetainers(prev => prev.map(r => r.id === existing.id
        ? { ...r, amount_remaining: Number(r.amount_remaining) + data.amount, total_amount: Number(r.total_amount) + data.amount }
        : r));
      setSelectedId(existing.id);
      loadLedger(existing.id);
      toast.success('Retainer topped up');
    } else {
      const contact = contacts.find(c => c.id === data.contactId);
      const newRetainer = {
        id: res.retainerId,
        workspace_id: workspaceId,
        contact_id: data.contactId,
        amount_remaining: data.amount,
        total_amount: data.amount,
        status: 'active',
        created_at: new Date().toISOString(),
        contact,
      };
      setRetainers(prev => [newRetainer, ...prev]);
      setSelectedId(res.retainerId!);
      loadLedger(res.retainerId!);
      toast.success('Retainer created');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] w-full bg-white">
      {/* LEFT PANEL: List */}
      <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col border-r border-dash-border bg-dash-surface h-[400px] md:h-full">
        <div className="p-4 border-b border-dash-border">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search retainers..."
              className="w-full bg-white border border-dash-border rounded-lg pl-9 pr-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors"
            />
          </div>
          <DashButton variant="primary" className="w-full" onClick={() => setDialogOpen(true)}>
            <Wallet size={14} /> New Deposit
          </DashButton>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="h-8 w-8 !text-dash-textMuted mx-auto mb-2 opacity-40" />
              <p className="text-[11px] font-semibold !text-dash-textMuted">No retainers yet</p>
            </div>
          ) : (
            filtered.map(r => (
              <button
                key={r.id}
                onClick={() => loadLedger(r.id)}
                className={cn(
                  'w-full text-left p-4 transition-colors motion-reduce:transition-none border-b border-dash-border group relative',
                  selectedId === r.id ? 'bg-dash-accent/5 border-r-2 border-r-dash-accent' : 'hover:bg-white'
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[13px] font-semibold !text-dash-text truncate">
                    {r.contact ? `${r.contact.first_name || ''} ${r.contact.last_name || ''}`.trim() : 'Unknown Contact'}
                  </span>
                  <span className="text-xs font-bold !text-dash-text">
                    {(Number(r.amount_remaining) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-medium">
                    <Calendar size={12} />
                    {format(new Date(r.created_at), 'dd MMM')}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selected ? (
          <>
            <div className="p-4 border-b border-dash-border flex flex-wrap items-center justify-between gap-4 bg-dash-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                  <Wallet className="h-5 w-5 text-dash-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold !text-dash-text">
                    {selected.contact ? `${selected.contact.first_name || ''} ${selected.contact.last_name || ''}`.trim() : 'Unknown Contact'}
                  </h3>
                  <p className="text-[11px] !text-dash-textMuted font-semibold">{selected.contact?.email}</p>
                </div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-dash-surface">
              <div className="max-w-[850px] mx-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-dash-border rounded-2xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] !text-dash-textMuted mb-2">Current Balance</p>
                    <p className="text-3xl font-bold !text-dash-text tabular-nums">
                      {(Number(selected.amount_remaining) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </p>
                  </div>
                  <div className="bg-white border border-dash-border rounded-2xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] !text-dash-textMuted mb-2">Total Deposited</p>
                    <p className="text-3xl font-bold !text-dash-text tabular-nums">
                      {(Number(selected.total_amount) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-dash-border rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-dash-border">
                    <h4 className="text-sm font-bold !text-dash-text">Transaction History</h4>
                  </div>
                  {ledgerLoading ? (
                    <div className="p-8 text-center text-[12px] !text-dash-textMuted">Loading...</div>
                  ) : ledger.length === 0 ? (
                    <div className="p-8 text-center text-[12px] !text-dash-textMuted">No transactions yet</div>
                  ) : (
                    <div className="divide-y divide-dash-border">
                      {ledger.map((entry) => (
                        <div key={entry.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {entry.entry_type === 'credit_advance' ? (
                              <ArrowUpCircle className="h-5 w-5 text-green shrink-0" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5 text-red shrink-0" />
                            )}
                            <div>
                              <p className="text-[13px] font-semibold !text-dash-text">
                                {entry.entry_type === 'credit_advance' ? 'Deposit' : `Applied to ${entry.invoice?.invoice_number || 'invoice'}`}
                              </p>
                              <p className="text-[11px] !text-dash-textMuted">{format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}</p>
                            </div>
                          </div>
                          <span className={cn('text-sm font-bold tabular-nums', entry.entry_type === 'credit_advance' ? 'text-green' : 'text-red')}>
                            {entry.entry_type === 'credit_advance' ? '+' : '-'}
                            {(Number(entry.amount) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <DashEmptyState
              icon={Wallet}
              title="No retainer selected"
              description="Record a new deposit for a contact, or select an existing retainer to view its balance and history"
            />
          </div>
        )}
      </div>

      <RetainerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contacts={contacts}
        existingContactIds={existingContactIds}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, Check, CreditCard } from 'lucide-react';
import { getRetainerBalance } from '@/app/actions/retainers';
import { cn } from '@/lib/utils';

interface RetainerSelectorProps {
  contactId: string;
  workspaceId: string;
  onApply: (amount: number) => void;
}

const RetainerSelector: React.FC<RetainerSelectorProps> = ({
  contactId,
  workspaceId,
  onApply,
}) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId) return;
    getRetainerBalance(contactId, workspaceId).then(b => {
      setBalance(b);
      setLoading(false);
    });
  }, [contactId, workspaceId]);

  if (balance <= 0 && !loading) return null;

  return (
    <div className="p-4 bg-[var(--accentg)] border border-[var(--accent)]/20 rounded-[var(--r12)] animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[var(--accent2)]" />
          <span className="text-[10px] font-bold text-[var(--t1)] uppercase tracking-widest">Retainer Credit</span>
        </div>
        <span className="text-sm font-bold text-[var(--accent2)] font-space">${balance.toLocaleString()}</span>
      </div>
      
      <p className="text-[10px] text-[var(--t3)] leading-relaxed mb-4">
        Advance payment available. Applying this will reduce the balance due on this document.
      </p>

      <button 
        onClick={() => onApply(balance)}
        className="w-full h-10 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-[var(--r8)] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
      >
        Apply Credit <Check size={14} />
      </button>
    </div>
  );
};

export default RetainerSelector;

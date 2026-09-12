'use client';

import React, { useState } from 'react';
import { 
  FileCheck, Clock, Receipt, Plus, 
  ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface UnbilledUnloadedSelectorProps {
  onImport: (items: any[]) => void;
}

const UnbilledUnloadedSelector: React.FC<UnbilledUnloadedSelectorProps> = ({
  onImport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mock data for unbilled entries
  const [entries] = useState([
    { id: '1', type: 'time', description: 'Consultation - UI/UX Audit', amount: 450, date: '2026-05-10', duration: '3h 45m' },
    { id: '2', type: 'expense', description: 'Domain Acquisition - cloudvault.ai', amount: 1200, date: '2026-05-12' },
    { id: '3', type: 'time', description: 'Backend Integration - Auth Module', amount: 900, date: '2026-05-14', duration: '6h' },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleImport = () => {
    const itemsToImport = entries
      .filter(e => selectedIds.includes(e.id))
      .map(e => ({
        description: e.description,
        quantity: 1,
        rate: e.amount,
        type: e.type
      }));
    onImport(itemsToImport);
    setSelectedIds([]);
    setIsOpen(false);
  };

  return (
    <div className="bg-dash-surface border border-dash-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-dash-bg transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <AlertCircle size={16} />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-dash-text uppercase tracking-wide">Unbilled Work Found</h4>
            <p className="text-[10px] text-dash-textMuted font-medium">Click to import hours and expenses</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => toggleSelect(entry.id)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                  selectedIds.includes(entry.id)
                    ? "bg-dash-accent/10 border-dash-accent/30"
                    : "bg-dash-bg border-dash-border hover:border-dash-accent/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    entry.type === 'time' ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                  )}>
                    {entry.type === 'time' ? <Clock size={14} /> : <Receipt size={14} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-dash-text">{entry.description}</p>
                    <p className="text-[9px] text-dash-textMuted uppercase font-black">{entry.date} {entry.duration && `• ${entry.duration}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-dash-text">{formatCurrency(entry.amount)}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            disabled={selectedIds.length === 0}
            onClick={handleImport}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
          >
            Import {selectedIds.length} Items <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default UnbilledUnloadedSelector;

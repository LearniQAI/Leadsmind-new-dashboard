'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { ParsedContact } from './PreviewTable';

interface ManualGridTabProps {
  onParsed: (contacts: ParsedContact[]) => void;
  onClear: () => void;
}

interface GridRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string;
}

export function ManualGridTab({ onParsed, onClear }: ManualGridTabProps) {
  const [rows, setRows] = useState<GridRow[]>([
    { firstName: '', lastName: '', email: '', phone: '', tags: '' }
  ]);

  useEffect(() => {
    const activeRows = rows.filter(r => r.firstName || r.lastName || r.email || r.phone || r.tags);
    if (activeRows.length === 0) {
      onClear();
      return;
    }

    const contacts: ParsedContact[] = activeRows.map(row => {
      const errors: string[] = [];
      if (!row.firstName.trim()) errors.push('First name is required.');
      if (row.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        errors.push('Invalid email format.');
      }

      return {
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim() || 'Import',
        email: row.email.trim() || undefined,
        phone: row.phone.trim() || undefined,
        tags: row.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: errors.length === 0 ? 'valid' : 'invalid',
        errors,
      };
    });

    onParsed(contacts);
  }, [rows, onParsed, onClear]);

  const updateField = (index: number, field: keyof GridRow, value: string) => {
    setRows(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    setRows(prev => [...prev, { firstName: '', lastName: '', email: '', phone: '', tags: '' }]);
  };

  const deleteRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ firstName: '', lastName: '', email: '', phone: '', tags: '' }]);
      return;
    }
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]  tracking-wider font-semibold px-1">
        <span className="!text-dash-textMuted">Interactive Grid Input</span>
        <button
          type="button"
          onClick={addRow}
          className="text-dash-accent hover:text-dash-accent/80 font-semibold flex items-center gap-1 transition-all"
        >
          <Plus size={10} />
          Add row
        </button>
      </div>

      <div className="border border-dash-border bg-white rounded-xl overflow-hidden max-h-[220px] overflow-y-auto common-scrollbar">
        <table className="w-full text-left border-collapse text-[11px] ">
          <thead className="sticky top-0 bg-dash-surface !text-dash-textMuted font-semibold border-b border-dash-border z-10">
            <tr>
              <th className="py-2 px-2.5">First Name *</th>
              <th className="py-2 px-2.5">Last Name</th>
              <th className="py-2 px-2.5">Email</th>
              <th className="py-2 px-2.5">Phone</th>
              <th className="py-2 px-2.5">Tags (CSV)</th>
              <th className="py-2 px-2.5 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-border !text-dash-text">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-dash-surface transition-colors">
                <td className="py-1 px-1.5">
                  <input
                    type="text"
                    value={row.firstName}
                    onChange={(e) => updateField(index, 'firstName', e.target.value)}
                    placeholder="E.g., John"
                    className="w-full bg-transparent border border-transparent hover:border-dash-border focus:border-dash-accent rounded px-1.5 py-1 !text-dash-text outline-none transition-colors motion-reduce:transition-none"
                  />
                </td>
                <td className="py-1 px-1.5">
                  <input
                    type="text"
                    value={row.lastName}
                    onChange={(e) => updateField(index, 'lastName', e.target.value)}
                    placeholder="E.g., Doe"
                    className="w-full bg-transparent border border-transparent hover:border-dash-border focus:border-dash-accent rounded px-1.5 py-1 !text-dash-text outline-none transition-colors motion-reduce:transition-none"
                  />
                </td>
                <td className="py-1 px-1.5">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateField(index, 'email', e.target.value)}
                    placeholder="E.g., john@example.com"
                    className="w-full bg-transparent border border-transparent hover:border-dash-border focus:border-dash-accent rounded px-1.5 py-1 !text-dash-text outline-none transition-colors motion-reduce:transition-none"
                  />
                </td>
                <td className="py-1 px-1.5">
                  <input
                    type="text"
                    value={row.phone}
                    onChange={(e) => updateField(index, 'phone', e.target.value)}
                    placeholder="E.g., +15550199"
                    className="w-full bg-transparent border border-transparent hover:border-dash-border focus:border-dash-accent rounded px-1.5 py-1 !text-dash-text outline-none transition-colors motion-reduce:transition-none"
                  />
                </td>
                <td className="py-1 px-1.5">
                  <input
                    type="text"
                    value={row.tags}
                    onChange={(e) => updateField(index, 'tags', e.target.value)}
                    placeholder="lead, premium"
                    className="w-full bg-transparent border border-transparent hover:border-dash-border focus:border-dash-accent rounded px-1.5 py-1 !text-dash-text outline-none transition-colors motion-reduce:transition-none"
                  />
                </td>
                <td className="py-1 px-1 text-center">
                  <button
                    type="button"
                    onClick={() => deleteRow(index)}
                    className="!text-dash-textMuted hover:text-red p-1 rounded hover:bg-red/10 transition-all"
                  >
                    <X size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

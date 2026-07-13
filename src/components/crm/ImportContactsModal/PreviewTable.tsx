'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ParsedContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags?: string[];
  status: 'valid' | 'invalid';
  errors: string[];
}

interface PreviewTableProps {
  contacts: ParsedContact[];
}

export function PreviewTable({ contacts }: PreviewTableProps) {
  if (contacts.length === 0) return null;

  const validCount = contacts.filter(c => c.status === 'valid').length;
  const invalidCount = contacts.filter(c => c.status === 'invalid').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]  tracking-wider font-semibold px-1">
        <span className="!text-dash-textMuted">Parsed Data Preview</span>
        <div className="flex items-center gap-3">
          <span className="text-green flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green"></span>
            {validCount} Valid
          </span>
          {invalidCount > 0 && (
            <span className="text-red flex items-center gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red"></span>
              {invalidCount} Action Required
            </span>
          )}
        </div>
      </div>

      <div className="border border-dash-border bg-white rounded-xl overflow-hidden max-h-[220px] overflow-y-auto common-scrollbar">
        <table className="w-full text-left border-collapse text-[11.5px] ">
          <thead className="sticky top-0 bg-dash-surface !text-dash-textMuted font-semibold border-b border-dash-border z-10 text-[10.5px]">
            <tr>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Tags</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-border !text-dash-text">
            {contacts.map((contact, index) => (
              <tr 
                key={index}
                className={`hover:bg-dash-surface transition-colors ${
                  contact.status === 'invalid' ? 'bg-red/[0.02]' : ''
                }`}
              >
                <td className="py-2 px-3">
                  <div className="font-medium">
                    {contact.firstName || <span className="text-red italic">Missing</span>} {contact.lastName}
                  </div>
                </td>
                <td className="py-2 px-3 !text-dash-textMuted">
                  {contact.email || <span className="!text-dash-textMuted font-light">—</span>}
                </td>
                <td className="py-2 px-3 !text-dash-textMuted">
                  {contact.phone || <span className="!text-dash-textMuted font-light">—</span>}
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map((t, idx) => (
                        <span 
                          key={idx} 
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-dash-accent/10 border border-dash-accent/20 text-dash-accent"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="!text-dash-textMuted font-light text-[10px]">—</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-semibold">
                  {contact.status === 'valid' ? (
                    <span className="inline-flex items-center gap-1 text-green bg-green/10 px-2 py-0.5 rounded-full text-[10px]">
                      <CheckCircle2 size={10} />
                      Ready
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-red bg-red/10 px-2 py-0.5 rounded-full text-[10px] cursor-help"
                      title={contact.errors.join(', ')}
                    >
                      <AlertCircle size={10} />
                      Error
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

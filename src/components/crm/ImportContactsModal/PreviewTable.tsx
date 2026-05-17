'use client';

import React from 'react';

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
      <div className="flex items-center justify-between text-[11px] font-dm-sans uppercase tracking-wider font-semibold px-1">
        <span className="text-[#94a3c8]">Parsed Data Preview</span>
        <div className="flex items-center gap-3">
          <span className="text-[#10b981] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]"></span>
            {validCount} Valid
          </span>
          {invalidCount > 0 && (
            <span className="text-[#ef4444] flex items-center gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]"></span>
              {invalidCount} Action Required
            </span>
          )}
        </div>
      </div>

      <div className="border border-white/5 bg-[#080f28] rounded-xl overflow-hidden max-h-[220px] overflow-y-auto common-scrollbar">
        <table className="w-full text-left border-collapse text-[11.5px] font-dm-sans">
          <thead className="sticky top-0 bg-[#0c1535] text-[#94a3c8] font-semibold border-b border-white/5 z-10 text-[10.5px]">
            <tr>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Tags</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03] text-[#eef2ff]">
            {contacts.map((contact, index) => (
              <tr 
                key={index}
                className={`hover:bg-[#111d47]/20 transition-colors ${
                  contact.status === 'invalid' ? 'bg-[#ef4444]/[0.02]' : ''
                }`}
              >
                <td className="py-2 px-3">
                  <div className="font-medium">
                    {contact.firstName || <span className="text-[#ef4444] italic">Missing</span>} {contact.lastName}
                  </div>
                </td>
                <td className="py-2 px-3 text-[#94a3c8]">
                  {contact.email || <span className="text-[#4a5a82] font-light">—</span>}
                </td>
                <td className="py-2 px-3 text-[#94a3c8]">
                  {contact.phone || <span className="text-[#4a5a82] font-light">—</span>}
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map((t, idx) => (
                        <span 
                          key={idx} 
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#60a5fa]"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#4a5a82] font-light text-[10px]">—</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-semibold">
                  {contact.status === 'valid' ? (
                    <span className="inline-flex items-center gap-1 text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full text-[10px]">
                      <i className="fa-solid fa-circle-check text-[10px]"></i>
                      Ready
                    </span>
                  ) : (
                    <span 
                      className="inline-flex items-center gap-1 text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full text-[10px] cursor-help"
                      title={contact.errors.join(', ')}
                    >
                      <i className="fa-solid fa-circle-exclamation text-[10px]"></i>
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

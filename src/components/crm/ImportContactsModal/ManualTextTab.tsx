'use client';

import React, { useState, useEffect } from 'react';
import { ParsedContact } from './PreviewTable';

interface ManualTextTabProps {
  onParsed: (contacts: ParsedContact[]) => void;
  onClear: () => void;
}

export function ManualTextTab({ onParsed, onClear }: ManualTextTabProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!text.trim()) {
      onClear();
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const contacts: ParsedContact[] = lines.map(line => {
      // Split by comma, tab, or semicolon
      const separators = [',', '\t', ';'];
      let parts: string[] = [line];
      
      for (const sep of separators) {
        const currentParts = line.split(sep).map(p => p.trim());
        if (currentParts.length > parts.length) {
          parts = currentParts;
        }
      }

      // Schema: FirstName, LastName, Email, Phone, Tags
      const firstName = parts[0] || '';
      const lastName = parts[1] || 'Import';
      const email = parts[2] || '';
      const phone = parts[3] || '';
      const rawTags = parts[4] || '';

      const tags = rawTags 
        ? rawTags.split('&').map(t => t.trim()).filter(Boolean) 
        : [];

      const errors: string[] = [];
      if (!firstName) errors.push('First name is required.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format.');
      }

      return {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        tags,
        status: errors.length === 0 ? 'valid' : 'invalid',
        errors,
      };
    });

    onParsed(contacts);
  }, [text]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10.5px] font-semibold text-[#94a3c8] uppercase tracking-wider font-dm-sans">
          Raw Relationship Payload
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Enter one contact per line in one of these formats:\nJohn, Doe, john@example.com, +15550199, lead&saas\nJane, Smith, jane@example.com\nAlice, Johnson`}
          className="w-full h-[120px] bg-[#080f28] border border-white/5 rounded-xl p-3 text-[12px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:border-[#2563eb] outline-none font-dm-sans common-scrollbar resize-none"
        />
      </div>
      <div className="text-[10px] text-[#4a5a82] leading-relaxed font-dm-sans px-1">
        💡 Note: Separate tags using an ampersand (&) in the 5th column. E.g., <code className="text-[#3b82f6]">partner & tech</code>.
      </div>
    </div>
  );
}

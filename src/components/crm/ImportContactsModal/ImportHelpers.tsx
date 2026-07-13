'use client';

import React from 'react';
import { Info, FileSpreadsheet, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function ImportHelpers() {
  const downloadSampleCSV = () => {
    try {
      const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Tags'];
      const rows = [
        ['John', 'Doe', 'john.doe@example.com', '+15550199', 'lead,saas'],
        ['Jane', 'Smith', 'jane.smith@example.com', '+15550244', 'partner,enterprise'],
      ];
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'leadsmind_contacts_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Sample CSV template downloaded!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download template.');
    }
  };

  const copyFormatExample = () => {
    const text = `First Name, Last Name, Email, Phone, Tags\nJohn, Doe, john@example.com, +15550199, saas, lead\nJane, Smith, jane@example.com, , enterprise`;
    navigator.clipboard.writeText(text);
    toast.success('Format example copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      {/* Helper Box */}
      <div className="bg-dash-surface border border-dash-border rounded-xl p-4">
        <h4 className="text-[12px] font-semibold !text-dash-text tracking-wider mb-2 flex items-center gap-2">
          <Info size={13} className="text-dash-accent" />
          Import guidelines
        </h4>
        <p className="text-[11.5px] !text-dash-textMuted leading-relaxed mb-3">
          To ensure high-fidelity database alignment, ensure your file or copy-pasted text matches the schema rules. Your file should have a header row followed by contact records.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] !text-dash-textMuted">
          <div className="bg-white p-2.5 rounded-lg border border-dash-border">
            <span className="text-dash-accent font-semibold block mb-1">Required headers</span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong className="!text-dash-text">First Name:</strong> First name of the lead</li>
              <li><strong className="!text-dash-text">Last Name:</strong> Surname (optional, defaults to "Import")</li>
            </ul>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-dash-border">
            <span className="text-dash-accent font-semibold block mb-1">Optional headers</span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong className="!text-dash-text">Email:</strong> Standard email format</li>
              <li><strong className="!text-dash-text">Phone:</strong> Country code prefix included</li>
              <li><strong className="!text-dash-text">Tags:</strong> Comma-separated list</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadSampleCSV}
          className="flex-1 py-2 px-3 rounded-lg bg-dash-surface border border-dash-border hover:bg-dash-border/60 text-[11px] font-semibold !text-dash-text flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none"
        >
          <FileSpreadsheet size={13} className="text-green" />
          Download CSV template
        </button>
        <button
          type="button"
          onClick={copyFormatExample}
          className="flex-1 py-2 px-3 rounded-lg bg-dash-surface border border-dash-border hover:bg-dash-border/60 text-[11px] font-semibold !text-dash-text flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none"
        >
          <Copy size={13} className="text-dash-accent" />
          Copy example data
        </button>
      </div>
    </div>
  );
}

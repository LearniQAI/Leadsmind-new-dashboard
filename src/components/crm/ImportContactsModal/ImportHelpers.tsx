'use client';

import React from 'react';
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
      <div className="bg-[#0c1535] border border-white/5 rounded-xl p-4">
        <h4 className="text-[12px] font-semibold text-[#eef2ff] uppercase tracking-wider mb-2 font-space-grotesk flex items-center gap-2">
          <i className="fa-solid fa-circle-info text-[#3b82f6]"></i>
          Import Guidelines
        </h4>
        <p className="text-[11.5px] text-[#94a3c8] leading-relaxed mb-3 font-dm-sans">
          To ensure high-fidelity database alignment, ensure your file or copy-pasted text matches the schema rules. Your file should have a header row followed by contact records.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-dm-sans text-[#94a3c8]">
          <div className="bg-[#111d47]/50 p-2.5 rounded-lg border border-white/[0.03]">
            <span className="text-[#3b82f6] font-semibold block mb-1">Required Headers</span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong className="text-[#eef2ff]">First Name:</strong> First name of the lead</li>
              <li><strong className="text-[#eef2ff]">Last Name:</strong> Surname (optional, defaults to "Import")</li>
            </ul>
          </div>
          <div className="bg-[#111d47]/50 p-2.5 rounded-lg border border-white/[0.03]">
            <span className="text-[#3b82f6] font-semibold block mb-1">Optional Headers</span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong className="text-[#eef2ff]">Email:</strong> Standard email format</li>
              <li><strong className="text-[#eef2ff]">Phone:</strong> Country code prefix included</li>
              <li><strong className="text-[#eef2ff]">Tags:</strong> Comma-separated list</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadSampleCSV}
          className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#eef2ff] font-dm-sans flex items-center justify-center gap-2 transition-all"
        >
          <i className="fa-solid fa-file-csv text-[#10b981]"></i>
          Download CSV Template
        </button>
        <button
          type="button"
          onClick={copyFormatExample}
          className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#eef2ff] font-dm-sans flex items-center justify-center gap-2 transition-all"
        >
          <i className="fa-solid fa-copy text-[#3b82f6]"></i>
          Copy Example Data
        </button>
      </div>
    </div>
  );
}

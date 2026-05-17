'use client';

import React, { useState, useRef } from 'react';
import { ParsedContact } from './PreviewTable';
import { toast } from 'sonner';

interface CSVUploadTabProps {
  onParsed: (contacts: ParsedContact[]) => void;
  onClear: () => void;
}

export function CSVUploadTab({ onParsed, onClear }: CSVUploadTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV helper that handles quotes and commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const processFileContent = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast.error('CSV file must contain a header row and at least one contact row.');
      return;
    }

    const parsedHeaders = parseCSVLine(lines[0]);
    const parsedRows = lines.slice(1).map(line => parseCSVLine(line));

    setHeaders(parsedHeaders);
    setCsvRows(parsedRows);

    // Dynamic smart mapping defaults
    const initialMappings: Record<string, string> = {};
    const dbFields = ['firstName', 'lastName', 'email', 'phone', 'tags'];
    
    dbFields.forEach(field => {
      const matchedHeader = parsedHeaders.find(h => {
        const lowerH = h.toLowerCase().replace(/[\s_-]/g, '');
        const lowerF = field.toLowerCase();
        if (lowerF === 'firstname') return lowerH.includes('first') || lowerH === 'name' || lowerH === 'givenname';
        if (lowerF === 'lastname') return lowerH.includes('last') || lowerH === 'surname';
        return lowerH.includes(lowerF);
      });
      if (matchedHeader) {
        initialMappings[field] = matchedHeader;
      } else {
        initialMappings[field] = '';
      }
    });

    setMappings(initialMappings);
    generateContacts(parsedRows, parsedHeaders, initialMappings);
  };

  const generateContacts = (
    rows: string[][], 
    fileHeaders: string[], 
    currentMappings: Record<string, string>
  ) => {
    const contacts: ParsedContact[] = rows.map(row => {
      const getValueForField = (field: string): string => {
        const header = currentMappings[field];
        if (!header) return '';
        const idx = fileHeaders.indexOf(header);
        return idx !== -1 ? row[idx] || '' : '';
      };

      const firstName = getValueForField('firstName');
      const lastName = getValueForField('lastName') || 'Import';
      const email = getValueForField('email');
      const phone = getValueForField('phone');
      const rawTags = getValueForField('tags');

      const tags = rawTags 
        ? rawTags.split(',').map(t => t.trim()).filter(Boolean) 
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
  };

  const handleMappingChange = (field: string, header: string) => {
    const updated = { ...mappings, [field]: header };
    setMappings(updated);
    generateContacts(csvRows, headers, updated);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processFileContent(text);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!fileName ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/[0.02] ${
            dragActive ? 'border-[#2563eb] bg-[#2563eb]/5' : 'border-white/5 bg-[#080f28]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <div className="h-10 w-10 rounded-lg bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#3b82f6] flex items-center justify-center mb-3">
            <i className="fa-solid fa-cloud-arrow-up text-[16px]"></i>
          </div>
          <span className="text-[12.5px] font-semibold text-[#eef2ff] mb-1">
            Drag and drop your CSV file here
          </span>
          <span className="text-[11px] text-[#4a5a82]">
            or click to browse from your device
          </span>
        </div>
      ) : (
        <div className="bg-[#080f28] border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#34d399] flex items-center justify-center">
              <i className="fa-solid fa-file-csv text-[15px]"></i>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-[#eef2ff] max-w-[200px] truncate">{fileName}</div>
              <div className="text-[10px] text-[#94a3c8]">{csvRows.length} records detected</div>
            </div>
          </div>
          <button
            onClick={() => {
              setFileName(null);
              setHeaders([]);
              setCsvRows([]);
              setMappings({});
              onClear();
            }}
            className="h-7 w-7 rounded-md bg-white/5 border border-white/5 text-[#4a5a82] hover:text-[#ef4444] hover:bg-[#ef4444]/10 flex items-center justify-center transition-all"
          >
            <i className="fa-solid fa-trash-can text-[11px]"></i>
          </button>
        </div>
      )}

      {/* Header Mapping Section */}
      {headers.length > 0 && (
        <div className="bg-[#0c1535] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="text-[11.5px] font-semibold text-[#eef2ff] uppercase tracking-wider font-space-grotesk flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-split-up-and-left text-[#3b82f6]"></i>
            Header Mapping
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11.5px]">
            {['firstName', 'lastName', 'email', 'phone', 'tags'].map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <span className="text-[#94a3c8] font-medium capitalize font-dm-sans">
                  {field === 'firstName' ? 'First Name' : field === 'lastName' ? 'Last Name' : field}
                  {field === 'firstName' && <span className="text-[#ef4444] ml-0.5">*</span>}
                </span>
                <select
                  value={mappings[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="bg-[#111d47] border border-white/5 rounded-lg px-2.5 py-1.5 text-[#eef2ff] focus:border-[#2563eb] outline-none font-dm-sans text-[11.5px] cursor-pointer"
                >
                  <option value="" className="bg-[#080f28] text-[#4a5a82]">Do not import</option>
                  {headers.map(h => (
                    <option key={h} value={h} className="bg-[#080f28] text-[#eef2ff]">{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

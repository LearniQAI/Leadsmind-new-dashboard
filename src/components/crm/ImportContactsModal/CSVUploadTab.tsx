'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Trash2, Split } from 'lucide-react';
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
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-dash-surface ${
            dragActive ? 'border-dash-accent bg-dash-accent/5' : 'border-dash-border bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <div className="h-10 w-10 rounded-lg bg-dash-accent/10 border border-dash-accent/20 text-dash-accent flex items-center justify-center mb-3">
            <UploadCloud size={16} />
          </div>
          <span className="text-[12.5px] font-semibold !text-dash-text mb-1">
            Drag and drop your CSV file here
          </span>
          <span className="text-[11px] !text-dash-textMuted">
            or click to browse from your device
          </span>
        </div>
      ) : (
        <div className="bg-white border border-dash-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green/10 border border-green/20 text-green flex items-center justify-center">
              <FileSpreadsheet size={15} />
            </div>
            <div>
              <div className="text-[12px] font-semibold !text-dash-text max-w-[200px] truncate">{fileName}</div>
              <div className="text-[10px] !text-dash-textMuted">{csvRows.length} records detected</div>
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
            className="h-7 w-7 rounded-md bg-dash-surface border border-dash-border !text-dash-textMuted hover:text-red hover:bg-red/10 flex items-center justify-center transition-colors motion-reduce:transition-none"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* Header Mapping Section */}
      {headers.length > 0 && (
        <div className="bg-dash-surface border border-dash-border rounded-xl p-3.5 space-y-3">
          <div className="text-[11.5px] font-semibold !text-dash-text tracking-wider flex items-center gap-1.5">
            <Split size={13} className="text-dash-accent" />
            Header mapping
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11.5px]">
            {['firstName', 'lastName', 'email', 'phone', 'tags'].map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <span className="!text-dash-textMuted font-medium capitalize ">
                  {field === 'firstName' ? 'First Name' : field === 'lastName' ? 'Last Name' : field}
                  {field === 'firstName' && <span className="text-red ml-0.5">*</span>}
                </span>
                <select
                  value={mappings[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="bg-white border border-dash-border rounded-lg px-2.5 py-1.5 !text-dash-text focus:border-dash-accent outline-none text-[11.5px] cursor-pointer"
                >
                  <option value="" className="!text-dash-textMuted">Do not import</option>
                  {headers.map(h => (
                    <option key={h} value={h} className="bg-white !text-dash-text">{h}</option>
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

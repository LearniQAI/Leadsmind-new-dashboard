'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  fieldId: string;
  disabled?: boolean;
  isBuilder?: boolean;
  value?: any;
  onChange?: (val: any) => void;
}

export function UploadField({ fieldId, disabled, isBuilder, value, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // value is expected to be an array of file URLs or metadata
  const files = Array.isArray(value) ? value : [];

  const handleDragOver = (e: React.DragEvent) => {
    if (isBuilder || disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isBuilder || disabled) return;
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (isBuilder || disabled) return;
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBuilder || disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (newFiles: File[]) => {
    setUploading(true);

    // Simulate upload delay for UI purposes (Actual Supabase upload logic will live in UploadManager)
    await new Promise(r => setTimeout(r, 1000));

    const uploadedFiles = newFiles.map(f => ({
      name: f.name,
      size: f.size,
      url: URL.createObjectURL(f), // Temporary URL for preview
      type: f.type
    }));

    if (onChange) {
      onChange([...files, ...uploadedFiles]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    if (isBuilder || disabled || !onChange) return;
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => { if (!isBuilder && !disabled) fileInputRef.current?.click(); }}
        className={cn(
          "w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors motion-reduce:transition-none",
          isBuilder || disabled ? 'opacity-50 cursor-not-allowed bg-dash-surface border-dash-border'
          : isDragging ? 'border-dash-accent bg-dash-accent/5'
          : 'border-dash-border hover:border-dash-text/20 bg-white cursor-pointer'
        )}
      >
        <UploadCloud size={24} className={isDragging ? 'text-dash-accent' : '!text-dash-textMuted'} />
        <p className="mt-2 text-sm !text-dash-text">
          {uploading ? 'Uploading...' : 'Click or drag files here to upload'}
        </p>
        <p className="mt-1 text-[11px] !text-dash-textMuted">
          Max size: 10MB
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          style={{ display: 'none' }}
          multiple
          disabled={isBuilder || disabled || uploading}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {files.map((file: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-dash-surface border border-dash-border rounded-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} className="text-dash-accent flex-shrink-0" />
                <span className="text-[13px] !text-dash-text truncate">{file.name}</span>
                <span className="text-[11px] !text-dash-textMuted ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              {!isBuilder && !disabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="p-1 hover:bg-red/10 rounded !text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, File, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentDropzoneProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 20,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);

    if (files.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    onFilesChange(newFiles);
  }, [files, maxFiles, onFilesChange]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-[var(--r16)] p-8 transition-all cursor-pointer text-center",
          isDragActive
            ? "border-[var(--accent)] bg-[var(--accentg)]"
            : "border-[var(--bdr)] hover:border-[var(--bdrh)] bg-[rgba(255,255,255,0.02)]"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--n800)] flex items-center justify-center border border-[var(--bdr)]">
            <Paperclip className="h-5 w-5 text-[var(--t3)]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--t1)]">
              {isDragActive ? "Drop the files here" : "Click or drag to upload attachments"}
            </p>
            <p className="text-[10px] text-[var(--t4)] uppercase tracking-widest font-bold">
              Up to {maxFiles} files, max {maxSizeMB}MB each
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--r8)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[var(--red)] text-xs font-medium">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-[var(--r12)] bg-[var(--n800)] border border-[var(--bdr)] group animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-[var(--r8)] bg-[var(--n900)] flex items-center justify-center border border-[var(--bdr)]">
                  <File className="h-4 w-4 text-[var(--accent2)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--t1)] truncate">{file.name}</p>
                  <p className="text-[10px] text-[var(--t4)] font-medium">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                className="p-1.5 rounded-full hover:bg-[rgba(255,255,255,0.05)] text-[var(--t4)] hover:text-[var(--red)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentDropzone;

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { CSVUploadTab } from './CSVUploadTab';
import { ManualTextTab } from './ManualTextTab';
import { ManualGridTab } from './ManualGridTab';
import { PreviewTable, ParsedContact } from './PreviewTable';
import { ImportHelpers } from './ImportHelpers';
import { createContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ImportContactsModalProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ImportContactsModal({ isOpen: controlledOpen, onOpenChange: controlledOnChange, trigger }: ImportContactsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnChange !== undefined ? controlledOnChange : setInternalOpen;

  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'grid'>('upload');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const router = useRouter();

  const handleParsed = (contacts: ParsedContact[]) => {
    setParsedContacts(contacts);
  };

  const handleClear = () => {
    setParsedContacts([]);
  };

  const executeImport = async () => {
    const validContacts = parsedContacts.filter(c => c.status === 'valid');
    if (validContacts.length === 0) {
      toast.error('No valid contacts to import. Please resolve the errors in the preview.');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: validContacts.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validContacts.length; i++) {
      const contact = validContacts[i];
      setImportProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const result = await createContact({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          source: activeTab === 'upload' ? 'CSV Import' : activeTab === 'text' ? 'Text Pasted Import' : 'Manual Grid Import',
          tags: contact.tags,
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    setImporting(false);
    toast.success(`Import complete! Sync success: ${successCount}. Failures: ${failCount}`);

    // Refresh Next.js Server Components to fetch new database rows
    router.refresh();

    // Reset and close
    setParsedContacts([]);
    setOpen(false);
  };

  const defaultTrigger = trigger || (
    <button className="h-8 px-3 rounded-[6px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-semibold font-dm-sans flex items-center gap-2 transition-all">
      <i className="fa-solid fa-file-import text-[12px] text-[#4a5a82]"></i>
      Import
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {defaultTrigger}
      </DialogTrigger>
      <DialogContent className="bg-[#080f28] z-[1003] border border-white/10 text-white max-w-2xl rounded-[16px] overflow-hidden shadow-2xl p-6 font-dm-sans">

        {/* Header following Design System */}
        <DialogHeader className="space-y-0.5 pb-4 border-b border-white/5">
          <DialogTitle className="text-[18px] font-bold text-[#eef2ff] font-space-grotesk tracking-tight">
            IMPORT <span className="text-[#3b82f6]">CONTACTS</span>
          </DialogTitle>
          <DialogDescription className="text-[10px] text-[#4a5a82] uppercase tracking-[0.8px] font-semibold">
            Sync relationship records in bulk into your command center
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto common-scrollbar pr-1">
          {/* Tab Selector */}
          <div className="flex bg-[#04091a] p-1 rounded-lg border border-white/5">
            {[
              { id: 'upload', label: 'File Upload', icon: 'fa-cloud-arrow-up' },
              { id: 'text', label: 'Smart Copy-Paste', icon: 'fa-paste' },
              { id: 'grid', label: 'Interactive Grid', icon: 'fa-table' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  handleClear();
                }}
                className={`flex-1 py-1.5 rounded-md text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === tab.id
                    ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20'
                    : 'text-[#94a3c8] hover:text-[#eef2ff] hover:bg-white/[0.02]'
                  }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'upload' && (
            <CSVUploadTab onParsed={handleParsed} onClear={handleClear} />
          )}
          {activeTab === 'text' && (
            <ManualTextTab onParsed={handleParsed} onClear={handleClear} />
          )}
          {activeTab === 'grid' && (
            <ManualGridTab onParsed={handleParsed} onClear={handleClear} />
          )}

          {/* Guidelines Helpers */}
          {parsedContacts.length === 0 && (
            <ImportHelpers />
          )}

          {/* Previews */}
          {parsedContacts.length > 0 && (
            <PreviewTable contacts={parsedContacts} />
          )}
        </div>

        {/* Footer following Design System (Cancel/Ghost left, Confirm/Primary right) */}
        <DialogFooter className="pt-4 border-t border-white/5 flex items-center justify-end gap-3 w-full">
          {importing ? (
            <div className="flex items-center justify-between w-full">
              <div className="text-[11px] font-semibold text-[#94a3c8] flex items-center gap-2">
                <i className="fa-solid fa-spinner animate-spin text-[#3b82f6]"></i>
                Syncing database... ({importProgress.current} / {importProgress.total})
              </div>
              <div className="h-1.5 w-32 bg-[#04091a] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-[#2563eb] transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] hover:bg-white/10 border border-white/5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedContacts.length === 0 || parsedContacts.filter(c => c.status === 'valid').length === 0}
                onClick={executeImport}
                className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-[12px] font-bold transition-all shadow-lg shadow-[#2563eb]/20 flex items-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up text-[11px]"></i>
                Sync {parsedContacts.filter(c => c.status === 'valid').length} Contacts
              </button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

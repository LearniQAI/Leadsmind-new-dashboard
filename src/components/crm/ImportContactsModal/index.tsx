'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { FileUp, ShieldCheck, AlertTriangle, UploadCloud, ClipboardPaste, Table2, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { CSVUploadTab } from './CSVUploadTab';
import { ManualTextTab } from './ManualTextTab';
import { ManualGridTab } from './ManualGridTab';
import { PreviewTable, ParsedContact } from './PreviewTable';
import { ImportHelpers } from './ImportHelpers';
import { createContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DashButton } from '@/components/dashboard-ui/Button';

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

  // POPIA compliance declaration states
  const [showDeclaration, setShowDeclaration] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [purposeScope, setPurposeScope] = useState('');
  const [legalChecked, setLegalChecked] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setShowDeclaration(false);
      setDataSource('');
      setPurposeScope('');
      setLegalChecked(false);
      setParsedContacts([]);
    }
  };

  const handleParsed = useCallback((contacts: ParsedContact[]) => {
    setParsedContacts(contacts);
  }, []);

  const handleClear = useCallback(() => {
    setParsedContacts([]);
  }, []);

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
          // Record POPIA parameters
          consentTimestamp: new Date().toISOString(),
          processingPurposeScope: `[Import: ${dataSource}] - ${purposeScope}`
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
    setShowDeclaration(false);
    setDataSource('');
    setPurposeScope('');
    setLegalChecked(false);
    setOpen(false);
  };

  const defaultTrigger = trigger || (
    <button className="h-8 px-3 rounded-lg bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 text-[12px] font-semibold flex items-center gap-2 transition-colors motion-reduce:transition-none">
      <FileUp size={12} className="text-dash-textMuted" />
      Import
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {defaultTrigger}
      </DialogTrigger>
      <DialogContent className="bg-white z-[1003] border border-dash-border !text-dash-text max-w-xl rounded-2xl overflow-hidden shadow-xl p-6 max-h-[90vh] overflow-y-auto">

        {/* Header following Design System */}
        <DialogHeader className="space-y-0.5 pb-4 border-b border-dash-border">
          <DialogTitle className="text-[18px] font-bold !text-dash-text tracking-tight">
            Import contacts
          </DialogTitle>
          <DialogDescription className="text-[11px] !text-dash-textMuted font-semibold">
            Sync relationship records in bulk into your command center
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto common-scrollbar pr-1">
          {showDeclaration ? (
            <div className="space-y-4 text-left">
              <div className="p-4 bg-white border border-dash-border rounded-xl space-y-2">
                <h4 className="text-[12px] font-bold text-dash-accent tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-dash-accent" /> POPIA ingestion gateway
                </h4>
                <p className="text-[11px] !text-dash-textMuted leading-relaxed">
                  Under the South African Protection of Personal Information Act (POPIA), you are required to establish a lawful basis (typically explicit consent) prior to processing personal data for communication purposes.
                </p>
              </div>

              {/* Data Source Collection Method */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-text tracking-wider">
                  Data Source / Collection Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'optin', label: 'Direct Website Opt-in', desc: 'Filled in web forms' },
                    { id: 'relation', label: 'Existing Relationship', desc: 'Active customers' },
                    { id: 'purchased', label: 'Purchased List', desc: 'Acquired third-party' },
                    { id: 'comarketing', label: 'Co-marketing', desc: 'Joint marketing campaigns' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDataSource(opt.label)}
                      className={`p-2.5 rounded-lg border text-left transition-colors motion-reduce:transition-none ${
                        dataSource === opt.label
                          ? 'bg-dash-accent/10 border-dash-accent !text-dash-text'
                          : 'bg-white border-dash-border !text-dash-textMuted hover:border-dash-text/20 hover:!text-dash-text'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{opt.label}</div>
                      <div className="text-[9px] opacity-75">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {dataSource === 'Purchased List' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
                  <AlertTriangle size={12} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-amber-700 leading-normal">
                    <strong>POPIA Compliance Warning:</strong> Third-party lists require proof of double opt-in that explicitly authorises transferring contact info to you. Processing unauthorized data violates POPIA.
                  </div>
                </div>
              )}

              {/* Purpose Scope */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-text tracking-wider">
                  Intended Communication Purpose <span className="text-red-500">*</span>
                </label>
                <select
                  value={purposeScope}
                  onChange={(e) => setPurposeScope(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-lg p-2.5 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                >
                  <option value="">-- Choose Processing Purpose --</option>
                  <option value="Marketing Broadcasts">Marketing Broadcasts (Promotional content, newsletters)</option>
                  <option value="Product Alerts">Product Alerts (Feature updates, platform status)</option>
                  <option value="Transactional alerts">Transactional Alerts (Account notices, orders)</option>
                  <option value="Other">Other / General Informational Notifications</option>
                </select>
              </div>

              {/* Legal Checkbox */}
              <div className="flex items-start gap-3 p-3 bg-white border border-dash-border rounded-lg mt-2">
                <input
                  type="checkbox"
                  id="legalChecked"
                  checked={legalChecked}
                  onChange={(e) => setLegalChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-dash-accent rounded border-dash-border bg-white focus:ring-0 cursor-pointer"
                />
                <label htmlFor="legalChecked" className="text-[11px] !text-dash-textMuted leading-normal select-none cursor-pointer">
                  I declare that I have obtained explicit, verifiable POPIA-compliant consent from these contacts and acknowledge the legal penalties for non-compliance.
                </label>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="flex bg-white p-1 rounded-lg border border-dash-border">
                {[
                  { id: 'upload', label: 'File upload', icon: UploadCloud },
                  { id: 'text', label: 'Smart copy-paste', icon: ClipboardPaste },
                  { id: 'grid', label: 'Interactive grid', icon: Table2 }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      handleClear();
                    }}
                    className={`flex-1 py-1.5 rounded-md text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors motion-reduce:transition-none ${activeTab === tab.id
                        ? 'bg-dash-accent text-white shadow-[0_4px_12px_rgba(19,89,255,0.2)]'
                        : '!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface'
                      }`}
                  >
                    <tab.icon size={13} />
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
            </>
          )}
        </div>

        {/* Footer following Design System (Cancel/Ghost left, Confirm/Primary right) */}
        <DialogFooter className="pt-4 border-t border-dash-border flex items-center justify-end gap-3 w-full">
          {importing ? (
            <div className="flex items-center justify-between w-full">
              <div className="text-[11px] font-semibold !text-dash-textMuted flex items-center gap-2">
                <Loader2 size={13} className="animate-spin motion-reduce:animate-none text-dash-accent" />
                Syncing database… ({importProgress.current} / {importProgress.total})
              </div>
              <div className="h-1.5 w-32 bg-white rounded-full overflow-hidden border border-dash-border">
                <div
                  className="h-full bg-dash-accent transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : showDeclaration ? (
            <div className="flex items-center justify-between w-full">
              <DashButton type="button" variant="secondary" size="sm" onClick={() => setShowDeclaration(false)}>
                Back to preview
              </DashButton>
              <DashButton
                type="button"
                variant="primary"
                size="sm"
                disabled={!dataSource || !purposeScope || !legalChecked}
                onClick={executeImport}
              >
                <CheckCircle2 size={12} />
                Confirm & sync import
              </DashButton>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <DashButton type="button" variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </DashButton>
              <DashButton
                type="button"
                variant="primary"
                size="sm"
                disabled={parsedContacts.length === 0 || parsedContacts.filter(c => c.status === 'valid').length === 0}
                onClick={() => setShowDeclaration(true)}
              >
                <ArrowRight size={12} />
                Proceed to compliance ({parsedContacts.filter(c => c.status === 'valid').length} contacts)
              </DashButton>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

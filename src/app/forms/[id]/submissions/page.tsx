'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFormSubmissionsData } from '@/app/actions/marketing';
import { listTags, createTag, bulkAssignTags } from '@/app/actions/tags';
import {
  ArrowLeft, Mail, Database, Search, Eye, CheckCircle, X, AlertTriangle,
  MoreVertical, Tags, Plus, Loader2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashModal, DashModalContent } from '@/components/dashboard-ui/Modal';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashInput } from '@/components/dashboard-ui/FormField';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DashTableContainer, DashTable, DashTableHead, DashTableHeadCell,
  DashTableBody, DashTableRow, DashTableCell, DashTableEmptyState
} from '@/components/dashboard-ui/Table';

const SOURCE_BADGE_STYLES: Record<string, string> = {
  embed: 'bg-dash-accent/10 text-dash-accent',
  api: 'bg-purple/10 text-purple',
  manual: 'bg-amber/10 text-amber',
};

function SourceBadge({ sourceType }: { sourceType: string | null }) {
  const key = (sourceType || '').toLowerCase();
  const style = SOURCE_BADGE_STYLES[key] || 'bg-dash-textMuted/10 text-dash-textMuted';
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${style}`}>
      {sourceType || 'Unknown'}
    </span>
  );
}

interface TagOption {
  id: string;
  name: string;
}

function ExportToTagModal({
  open,
  onOpenChange,
  contactCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactCount: number;
  onConfirm: (tagId: string, tagName: string) => Promise<void>;
}) {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<{ tagName: string; count: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedTagId('');
    setShowCreate(false);
    setNewTagName('');
    setSuccessState(null);
    setLoading(true);
    (async () => {
      const res = await listTags();
      if (res.success) {
        setTags((res.data || []).map((t: any) => ({ id: t.id, name: t.name })));
      } else {
        toast.error(res.error || 'Failed to load tags');
      }
      setLoading(false);
    })();
  }, [open]);

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await createTag({ name });
      if (res.success && res.data) {
        const created = { id: res.data.id, name: res.data.name };
        setTags((prev) => [...prev, created]);
        setSelectedTagId(created.id);
        setNewTagName('');
        setShowCreate(false);
      } else {
        toast.error(res.error || 'Failed to create tag');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTagId) return;
    const tag = tags.find((t) => t.id === selectedTagId);
    if (!tag) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedTagId, tag.name);
      setSuccessState({ tagName: tag.name, count: contactCount });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        {successState ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-green/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-green" />
            </div>
            <h2 className="text-lg font-bold !text-dash-text mb-1.5">Contacts tagged</h2>
            <p className="text-[13px] !text-dash-textMuted leading-relaxed mb-6">
              Tagged <span className="font-semibold !text-dash-text">{successState.count}</span> contact{successState.count === 1 ? '' : 's'} with{' '}
              <span className="font-semibold !text-dash-text">{successState.tagName}</span>.
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full h-10 rounded-xl bg-dash-accent text-white text-[13px] font-bold hover:bg-dash-accent/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-dash-accent/10 text-dash-accent shrink-0">
                <Tags size={16} />
              </span>
              <div>
                <h2 className="text-[16px] font-bold !text-dash-text leading-tight">Export to tag</h2>
                <p className="text-[12px] !text-dash-textMuted mt-0.5">
                  {contactCount} contact{contactCount === 1 ? '' : 's'} selected
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={loading ? '' : selectedTagId}
                    onValueChange={setSelectedTagId}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 w-full bg-white border-dash-border rounded-xl text-[12px] shadow-sm">
                      <SelectValue placeholder={loading ? 'Loading tags…' : 'Choose a tag'} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                      {tags.length === 0 ? (
                        <div className="px-3 py-2 text-[12px] !text-dash-textMuted">No tags yet</div>
                      ) : (
                        tags.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-[12px]">
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!showCreate ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1 self-start"
                >
                  <Plus size={11} /> Create new tag
                </button>
              ) : (
                <div className="p-3 bg-dash-surface border border-dash-border rounded-xl flex flex-col gap-2">
                  <label className="text-[10px] font-bold !text-dash-textMuted block">New tag name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g. Webinar Leads"
                      className="flex-1 h-9 px-2.5 bg-white border border-dash-border rounded-lg !text-dash-text text-[11px] outline-none focus:border-dash-accent transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating || !newTagName.trim()}
                      className="h-9 px-3.5 rounded-lg bg-dash-accent text-white text-[11px] font-bold disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                    >
                      {creating ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setNewTagName(''); }}
                      className="h-9 px-3 rounded-lg border border-dash-border text-[11px] !text-dash-textMuted hover:!text-dash-text transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-5">
              <button
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl border border-dash-border text-[13px] font-bold !text-dash-textMuted hover:!text-dash-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedTagId || submitting}
                className="h-10 px-5 rounded-xl bg-dash-accent text-white text-[13px] font-bold hover:bg-dash-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Tag contacts
              </button>
            </div>
          </>
        )}
      </DashModalContent>
    </DashModal>
  );
}

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoadError(null);
      try {
        // Goes through requireFormAccess (owner OR active collaborator) —
        // previously queried Supabase directly here, gated only by the
        // viewer's own workspace_id, which silently rejected every real
        // collaborator (invited cross-workspace by design).
        const res = await getFormSubmissionsData(params.id);
        if (res.error || !res.data) {
          setLoadError(res.error || 'Form not found.');
          return;
        }

        setForm(res.data.form);
        setSubmissions(res.data.submissions);
      } catch (err) {
        console.error('Failed to load submissions data:', err);
        setLoadError('Failed to load submissions data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold !text-dash-text mb-2">Couldn't load submissions</h2>
          <p className="!text-dash-textMuted mb-6">{loadError}</p>
          <button
            onClick={() => router.push('/forms')}
            className="px-6 py-3 bg-dash-accent text-white font-bold tracking-wider rounded-xl hover:bg-dash-accent/90 transition-colors"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  const filteredSubmissions = submissions.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const email = (s.contact?.email || '').toLowerCase();
    const name = (`${s.contact?.first_name || ''} ${s.contact?.last_name || ''}`).toLowerCase();
    return email.includes(q) || name.includes(q) || JSON.stringify(s.data).toLowerCase().includes(q);
  });

  const exportableSubmissions = filteredSubmissions.filter(s => !!s.contact_id);
  const allExportableSelected = exportableSubmissions.length > 0 &&
    exportableSubmissions.every(s => selectedIds.has(s.id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      exportableSubmissions.forEach(s => {
        if (checked) next.add(s.id); else next.delete(s.id);
      });
      return next;
    });
  };

  const selectedContactIds = getSelectedContactIds(submissions, selectedIds);

  const handleExportConfirm = async (tagId: string) => {
    const res = await bulkAssignTags([tagId], 'contact', selectedContactIds);
    if (res.success === false) {
      toast.error(res.error || 'Failed to tag contacts');
      throw new Error(res.error || 'Failed to tag contacts');
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-white !text-dash-text p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/forms')}
              className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-xl transition-colors motion-reduce:transition-none border border-dash-border"
            >
              <ArrowLeft size={18} className="!text-dash-textMuted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                {form?.name} submissions inbox
              </h1>
              <p className="text-sm !text-dash-textMuted mt-0.5">View and manage raw submitted data</p>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setExportModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-dash-accent text-white text-[12.5px] font-bold hover:bg-dash-accent/90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Tags size={14} />
              Export to tag
              <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{selectedIds.size}</span>
            </button>
          )}
        </div>

        {/* KPIs & Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <DashCard padding="default" className="flex-1 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 !text-dash-textMuted">
                <Database className="w-4 h-4 text-green" />
                <span className="text-[10px] font-bold">Total captures</span>
              </div>
              <p className="text-3xl font-bold !text-dash-text mt-1">{submissions.length}</p>
            </div>

            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
              <DashInput
                type="text"
                placeholder="Search raw data or contacts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </DashCard>
        </div>

        {/* Table View */}
        <DashTableContainer>
          <div className="p-5 border-b border-dash-border flex justify-between items-center">
            <h3 className="text-xs font-bold !text-dash-textMuted">Recorded submissions</h3>
          </div>

          {filteredSubmissions.length === 0 ? (
            <DashTableEmptyState
              colSpan={6}
              icon={CheckCircle}
              title="No submissions found"
              description="Your form hasn't received any data yet, or your search query didn't match any records."
            />
          ) : (
            <DashTable>
              <DashTableHead>
                <tr>
                  <DashTableHeadCell className="w-10">
                    <Checkbox
                      checked={allExportableSelected}
                      onCheckedChange={(value) => toggleAll(!!value)}
                      disabled={exportableSubmissions.length === 0}
                      className="border-dash-border data-[state=checked]:bg-dash-accent data-[state=checked]:border-dash-accent"
                    />
                  </DashTableHeadCell>
                  <DashTableHeadCell>Contact record</DashTableHeadCell>
                  <DashTableHeadCell>Submitted at</DashTableHeadCell>
                  <DashTableHeadCell>Source type</DashTableHeadCell>
                  <DashTableHeadCell>Data preview</DashTableHeadCell>
                  <DashTableHeadCell className="text-right">Actions</DashTableHeadCell>
                </tr>
              </DashTableHead>
              <DashTableBody>
                {filteredSubmissions.map((sub) => {
                  const firstDataKey = Object.keys(sub.data || {})[0];
                  const firstDataValue = firstDataKey ? sub.data[firstDataKey] : '';
                  const canExport = !!sub.contact_id;

                  return (
                    <DashTableRow key={sub.id} clickable onClick={() => setSelectedSubmission(sub)}>
                      <DashTableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(sub.id)}
                          onCheckedChange={(value) => toggleOne(sub.id, !!value)}
                          disabled={!canExport}
                          title={canExport ? undefined : 'No linked contact — can\'t be tagged'}
                          className="border-dash-border data-[state=checked]:bg-dash-accent data-[state=checked]:border-dash-accent"
                        />
                      </DashTableCell>
                      <DashTableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-dash-accent/10 flex items-center justify-center text-dash-accent font-bold uppercase">
                            {sub.contact?.first_name?.[0] || sub.contact?.email?.[0] || '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold !text-dash-text">{sub.contact?.first_name} {sub.contact?.last_name || ''}</span>
                            <span className="text-[10px] !text-dash-textMuted mt-0.5">{sub.contact?.email || 'Anonymous'}</span>
                          </div>
                        </div>
                      </DashTableCell>
                      <DashTableCell className="!text-dash-textMuted">
                        {new Date(sub.submitted_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </DashTableCell>
                      <DashTableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <SourceBadge sourceType={sub.source_type} />
                          {sub.contact_sync_error && (
                            <span
                              title={sub.contact_sync_error}
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-red/10 text-red px-2 py-1 rounded-md"
                            >
                              <AlertTriangle size={10} /> Sync failed
                            </span>
                          )}
                        </div>
                      </DashTableCell>
                      <DashTableCell>
                        <div className="text-[11px] !text-dash-textMuted max-w-[200px] truncate">
                          {firstDataKey ? <><span className="!text-dash-text">{firstDataKey}:</span> {String(firstDataValue)}</> : 'No custom data'}
                        </div>
                      </DashTableCell>
                      <DashTableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-colors ml-auto">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border border-dash-border rounded-xl shadow-xl p-1.5 min-w-[190px]">
                            <DropdownMenuItem
                              onClick={() => setSelectedSubmission(sub)}
                              className="text-[13px] font-medium !text-dash-text px-3 py-2 rounded-lg cursor-pointer focus:bg-dash-surface flex items-center gap-2.5"
                            >
                              <Eye size={14} className="!text-dash-textMuted" /> View details
                            </DropdownMenuItem>
                            {canExport && (
                              <DropdownMenuItem
                                onClick={() => { setSelectedIds(new Set([sub.id])); setExportModalOpen(true); }}
                                className="text-[13px] font-medium !text-dash-text px-3 py-2 rounded-lg cursor-pointer focus:bg-dash-surface flex items-center gap-2.5"
                              >
                                <Tags size={14} className="!text-dash-textMuted" /> Export to tag
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </DashTableCell>
                    </DashTableRow>
                  );
                })}
              </DashTableBody>
            </DashTable>
          )}
        </DashTableContainer>

        {/* Detailed Viewer Modal */}
        <DashModal open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
          <DashModalContent className="max-w-2xl p-0 overflow-hidden">
            <div className="p-6 border-b border-dash-border flex justify-between items-start bg-dash-surface">
              <div>
                <h2 className="text-lg font-bold !text-dash-text">
                  Submission details
                </h2>
                <p className="text-xs !text-dash-textMuted mt-1">
                  Captured on {selectedSubmission ? new Date(selectedSubmission.submitted_at).toLocaleString() : ''}
                </p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="!text-dash-textMuted hover:!text-dash-text p-2">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
              {selectedSubmission?.contact_sync_error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-600">CRM contact sync failed for this submission</p>
                    <p className="text-[11px] !text-dash-textMuted mt-1">{selectedSubmission.contact_sync_error}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-dash-surface rounded-xl p-4 border border-dash-border">
                  <span className="text-[9px] font-bold !text-dash-textMuted mb-1 block">Contact email</span>
                  <div className="text-sm !text-dash-text flex items-center gap-2">
                    <Mail size={14} className="!text-dash-textMuted" />
                    {selectedSubmission?.contact?.email || 'Anonymous'}
                  </div>
                </div>
                <div className="bg-dash-surface rounded-xl p-4 border border-dash-border">
                  <span className="text-[9px] font-bold !text-dash-textMuted mb-1 block">Source / embed</span>
                  <div className="text-sm !text-dash-text flex items-center gap-2 truncate">
                    <Database size={14} className="!text-dash-textMuted" />
                    {selectedSubmission?.source_url || selectedSubmission?.source_type || 'Direct'}
                  </div>
                </div>
              </div>

              <h4 className="text-[11px] font-bold !text-dash-textMuted mb-4 border-b border-dash-border pb-2">
                Raw form data payload
              </h4>

              {selectedSubmission?.data && Object.keys(selectedSubmission.data).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(selectedSubmission.data).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-dash-surface border border-dash-border rounded-lg p-4">
                      <div className="text-[10px] font-bold !text-dash-textMuted mb-1">{key}</div>
                      <div className="text-sm !text-dash-text break-words">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm !text-dash-textMuted italic text-center py-8">
                  No custom form fields were captured in this submission.
                </div>
              )}
            </div>
          </DashModalContent>
        </DashModal>

        <ExportToTagModal
          open={exportModalOpen}
          onOpenChange={(open) => { setExportModalOpen(open); if (!open) setSelectedIds(new Set()); }}
          contactCount={selectedContactIds.length}
          onConfirm={handleExportConfirm}
        />

      </div>
    </div>
  );
}

function getSelectedContactIds(submissions: any[], selectedIds: Set<string>): string[] {
  const ids = new Set<string>();
  submissions.forEach(s => {
    if (selectedIds.has(s.id) && s.contact_id) ids.add(s.contact_id);
  });
  return Array.from(ids);
}

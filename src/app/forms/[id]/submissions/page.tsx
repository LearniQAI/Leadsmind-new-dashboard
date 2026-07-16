'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { ArrowLeft, Mail, Database, Search, Eye, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { DashModal, DashModalContent } from '@/components/dashboard-ui/Modal';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashTableContainer, DashTable, DashTableHead, DashTableHeadCell,
  DashTableBody, DashTableRow, DashTableCell, DashTableEmptyState
} from '@/components/dashboard-ui/Table';

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const { workspace } = useDashboardContext();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!workspace?.id) return;
      setLoadError(null);
      try {
        // Explicit workspace_id filter on both queries — defense in depth
        // on top of RLS, not a substitute for it.
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('name, config, id')
          .eq('id', params.id)
          .eq('workspace_id', workspace.id)
          .maybeSingle();

        if (formError) {
          setLoadError('Failed to load this form. Please try again.');
          return;
        }
        if (!formData) {
          setLoadError('Form not found.');
          return;
        }

        setForm(formData);

        const { data: submissionData, error: submissionsError } = await supabase
          .from('form_submissions')
          .select('*, contact:contacts(first_name, last_name, email)')
          .eq('form_id', params.id)
          .eq('workspace_id', workspace.id)
          .order('submitted_at', { ascending: false });

        if (submissionsError) {
          setLoadError('Failed to load submissions for this form. Please try again.');
          return;
        }

        setSubmissions(submissionData || []);
      } catch (err) {
        console.error('Failed to load submissions data:', err);
        setLoadError('Failed to load submissions data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id, supabase, workspace?.id]);

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

  return (
    <div className="min-h-screen bg-white !text-dash-text p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
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
            <p className="text-sm !text-dash-textMuted">View and manage raw submitted data</p>
          </div>
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
              colSpan={5}
              icon={CheckCircle}
              title="No submissions found"
              description="Your form hasn't received any data yet, or your search query didn't match any records."
            />
          ) : (
            <DashTable>
              <DashTableHead>
                <tr>
                  <DashTableHeadCell>Contact record</DashTableHeadCell>
                  <DashTableHeadCell>Submitted at</DashTableHeadCell>
                  <DashTableHeadCell>Source type</DashTableHeadCell>
                  <DashTableHeadCell>Data preview</DashTableHeadCell>
                  <DashTableHeadCell className="text-right">Action</DashTableHeadCell>
                </tr>
              </DashTableHead>
              <DashTableBody>
                {filteredSubmissions.map((sub) => {
                  const firstDataKey = Object.keys(sub.data || {})[0];
                  const firstDataValue = firstDataKey ? sub.data[firstDataKey] : '';

                  return (
                    <DashTableRow key={sub.id} clickable onClick={() => setSelectedSubmission(sub)}>
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
                          <span className="text-[9px] font-bold bg-dash-surface px-2 py-1 rounded-md !text-dash-textMuted">
                            {sub.source_type || 'Unknown'}
                          </span>
                          {sub.contact_sync_error && (
                            <span
                              title={sub.contact_sync_error}
                              className="inline-flex items-center gap-1 text-[9px] font-bold bg-red-500/10 text-red-600 px-2 py-1 rounded-md"
                            >
                              <AlertTriangle size={10} /> Sync Failed
                            </span>
                          )}
                        </div>
                      </DashTableCell>
                      <DashTableCell>
                        <div className="text-[11px] !text-dash-textMuted max-w-[200px] truncate">
                          {firstDataKey ? <><span className="!text-dash-text">{firstDataKey}:</span> {String(firstDataValue)}</> : 'No custom data'}
                        </div>
                      </DashTableCell>
                      <DashTableCell className="text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub); }}
                          className="h-8 px-3 rounded-lg bg-dash-surface hover:bg-dash-border/60 transition-colors motion-reduce:transition-none text-[10px] font-bold !text-dash-text flex items-center gap-1.5 ml-auto"
                        >
                          <Eye size={12} /> View details
                        </button>
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

      </div>
    </div>
  );
}

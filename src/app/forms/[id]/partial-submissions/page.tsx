'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Link as LinkIcon, Trash2, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RecoveryTokenHandler } from '@/lib/persistence/RecoveryTokenHandler';
import { RecoveryManager } from '@/lib/persistence/RecoveryManager';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import {
  DashTableContainer, DashTable, DashTableHead, DashTableHeadCell,
  DashTableBody, DashTableRow, DashTableCell, DashTableEmptyState
} from '@/components/dashboard-ui/Table';

export default function PartialSubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [partials, setPartials] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: formData } = await supabase
          .from('forms')
          .select('name, config, id, workspace_id')
          .eq('id', params.id)
          .single();

        setForm(formData);

        const { data: partialData } = await supabase
          .from('form_partial_submissions')
          .select('*')
          .eq('form_id', params.id)
          .order('updated_at', { ascending: false });

        setPartials(partialData || []);
      } catch (err) {
        console.error('Failed to load partial submissions data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id, supabase]);

  const generateAndCopyLink = async (partial: any) => {
    let token = partial.recovery_token;
    if (!token) {
      // Generate a new secure token and save it
      token = RecoveryTokenHandler.createToken();
      const expiresAt = RecoveryTokenHandler.getExpirationDate(form?.config?.sessionExpirationDays ?? 7);

      const { error } = await supabase
        .from('form_partial_submissions')
        .update({
          recovery_token: token,
          recovery_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', partial.id);

      if (error) {
        toast.error('Failed to generate recovery link');
        return;
      }

      // Update local state
      setPartials(prev =>
        prev.map(p => (p.id === partial.id ? { ...p, recovery_token: token, recovery_token_expires_at: expiresAt } : p))
      );
    }

    const link = RecoveryManager.generateRecoveryLink(params.id, token);
    navigator.clipboard.writeText(link);
    toast.success('Recovery link copied to clipboard!');
  };

  const deletePartial = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Discard submission?',
      description: 'Are you sure you want to discard this incomplete submission?',
      confirmLabel: 'Discard',
      onConfirm: async () => {
        const { error } = await supabase.from('form_partial_submissions').delete().eq('id', id).eq('workspace_id', form.workspace_id);
        if (error) {
          toast.error('Failed to delete incomplete submission');
          return;
        }

        setPartials(prev => prev.filter(p => p.id !== id));
        toast.success('Incomplete submission removed.');
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  // Calculate statistics
  const totalPartials = partials.length;
  const avgCompletion = totalPartials
    ? Math.round(partials.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / totalPartials)
    : 0;
  const emailsCollected = partials.filter(p => p.email).length;
  const activeRecoveryLinks = partials.filter(
    p => p.recovery_token && new Date(p.recovery_token_expires_at) > new Date()
  ).length;

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
              {form?.name} recovery dashboard
            </h1>
            <p className="text-sm !text-dash-textMuted">Incomplete sessions & auto-save recovery management</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Incomplete sessions', value: totalPartials, icon: <Clock className="text-amber-600" /> },
            { label: 'Avg. progress', value: `${avgCompletion}%`, icon: <BarChart3 className="text-dash-accent" /> },
            { label: 'Emails captured', value: emailsCollected, icon: <Mail className="text-purple-600" /> },
            { label: 'Active recovery links', value: activeRecoveryLinks, icon: <LinkIcon className="text-green" /> }
          ].map((kpi, i) => (
            <DashCard key={i} padding="default" className="flex flex-col gap-2">
              <div className="flex items-center gap-2 !text-dash-textMuted">
                {kpi.icon}
                <span className="text-[10px] font-bold">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold !text-dash-text mt-1">{kpi.value}</p>
            </DashCard>
          ))}
        </div>

        {/* Table View */}
        <DashTableContainer>
          <div className="p-5 border-b border-dash-border flex justify-between items-center">
            <h3 className="text-xs font-bold !text-dash-textMuted">Incomplete submissions</h3>
            <DashStatusPill variant="neutral">
              Auto-save: {form?.config?.autoSaveEnabled ?? true ? 'Enabled' : 'Disabled'}
            </DashStatusPill>
          </div>

          {partials.length === 0 ? (
            <DashTableEmptyState
              colSpan={5}
              icon={CheckCircle}
              title="No incomplete submissions"
              description="All form interactions are completed or no sessions have started. Excellent conversion!"
            />
          ) : (
            <DashTable>
              <DashTableHead>
                <tr>
                  <DashTableHeadCell>Contact / session</DashTableHeadCell>
                  <DashTableHeadCell>Active step</DashTableHeadCell>
                  <DashTableHeadCell>Progress</DashTableHeadCell>
                  <DashTableHeadCell>Last active</DashTableHeadCell>
                  <DashTableHeadCell className="text-right">Actions</DashTableHeadCell>
                </tr>
              </DashTableHead>
              <DashTableBody>
                {partials.map((partial) => (
                  <DashTableRow key={partial.id}>
                    <DashTableCell>
                      <div className="flex flex-col">
                        <span className="font-bold !text-dash-text">{partial.email || 'Anonymous Contact'}</span>
                        <span className="text-[10px] !text-dash-textMuted mt-0.5 font-mono">{partial.session_id.substring(0, 8)}...</span>
                      </div>
                    </DashTableCell>
                    <DashTableCell>
                      {partial.current_step_id ? (
                        <span className="capitalize">{partial.current_step_id.replace(/_/g, ' ')}</span>
                      ) : (
                        <span className="!text-dash-textMuted font-bold">Unstarted</span>
                      )}
                    </DashTableCell>
                    <DashTableCell>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-dash-accent">{Math.round(partial.completion_percentage)}%</span>
                        <div className="w-20 bg-dash-border h-1 rounded-full overflow-hidden">
                          <div className="bg-dash-accent h-full" style={{ width: `${partial.completion_percentage}%` }} />
                        </div>
                      </div>
                    </DashTableCell>
                    <DashTableCell className="!text-dash-textMuted">
                      {new Date(partial.updated_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </DashTableCell>
                    <DashTableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => generateAndCopyLink(partial)}
                          className="h-8 px-3 rounded-lg bg-dash-accent/10 border border-dash-accent/20 hover:bg-dash-accent hover:text-white transition-colors motion-reduce:transition-none text-[10px] font-bold text-dash-accent flex items-center gap-1.5"
                        >
                          <LinkIcon size={12} /> Recovery link
                        </button>
                        <button
                          onClick={() => deletePartial(partial.id)}
                          className="h-8 w-8 rounded-lg border border-dash-border hover:border-red/50 hover:bg-red/10 !text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </DashTableCell>
                  </DashTableRow>
                ))}
              </DashTableBody>
            </DashTable>
          )}
        </DashTableContainer>
      </div>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="danger"
        />
      )}
    </div>
  );
}

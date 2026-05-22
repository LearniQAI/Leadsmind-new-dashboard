'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ShieldAlert, GitCommit, History, Globe, BookOpen, Users } from 'lucide-react';
import { CollaborationIndicator } from './components/CollaborationIndicator';
import { VersionHistoryTimeline } from './components/VersionHistoryTimeline';
import { AuditLogsViewer } from './components/AuditLogsViewer';
import { DiagnosticsDashboard } from './components/DiagnosticsDashboard';
import { HelpDocumentationRenderer } from './components/HelpDocumentationRenderer';
import { CollaboratorsManager } from './components/CollaboratorsManager';

export default function GovernancePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'versions' | 'audit' | 'diagnostics' | 'collaborators' | 'help'>('versions');

  const loadForm = async () => {
    try {
      const { data } = await supabase
        .from('forms')
        .select('*')
        .eq('id', params.id)
        .single();
      if (data) setForm(data);
    } catch (err) {
      console.error('[GovernancePage] Failed to fetch form details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.has('accept')) {
      router.push('/forms?tab=collaborations');
      return;
    }
    loadForm();
  }, [params.id, searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04081a] p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#04081a] p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" /></div>}>
      <div className="min-h-screen bg-[#04081a] text-white p-8 font-dm-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Top Header Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/forms')}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
            >
              <ArrowLeft size={16} className="text-[#4a5a82]" />
            </button>
            <div>
              <h1 className="text-xl font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2">
                {form?.name}{' '}
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                  form?.status === 'published' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {form?.status || 'draft'}
                </span>
              </h1>
              <p className="text-xs text-[#4a5a82]">Version control, deployment history, and settings</p>
            </div>
          </div>

          {/* Collaborative Session presence indicator */}
          <CollaborationIndicator formId={params.id} />
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('versions')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'versions'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <GitCommit size={12} /> Version History
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <History size={12} /> Activity Log
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <ShieldAlert size={12} /> Form Health
          </button>

          <button
            onClick={() => setActiveTab('collaborators')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'collaborators'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Users size={12} /> Collaborators
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'help'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <BookOpen size={12} /> Help Guides
          </button>
        </div>

        {/* Central Display Pane */}
        <div className="mt-2 min-h-[400px]">
          {activeTab === 'versions' && (
            <VersionHistoryTimeline
              formId={params.id}
              currentDraft={form}
              onRollbackApplied={(snapshot) => {
                setForm(prev => ({ ...prev, fields: snapshot.fields, config: snapshot.config }));
              }}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogsViewer formId={params.id} />
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsDashboard formId={params.id} />
          )}

          {activeTab === 'collaborators' && (
            <CollaboratorsManager 
              formId={params.id} 
              workspaceId={form?.workspace_id}
              formName={form?.name}
            />
          )}

          {activeTab === 'help' && (
            <HelpDocumentationRenderer />
          )}
        </div>

      </div>
    </React.Suspense>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, ArrowLeft, GitCommit, History, Globe, BookOpen, Users } from 'lucide-react';
import { CollaborationIndicator } from './components/CollaborationIndicator';
import { CollaboratorsManager } from './components/CollaboratorsManager';
import { getFormForGovernance } from '@/app/actions/marketing';

export default function GovernancePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'collaborators'>('collaborators');

  const loadForm = async () => {
    try {
      // Owner/workspace-member only ('manage') — collaborators of any role
      // never qualify to manage collaborators themselves. Previously an
      // ungated direct Supabase query, open to any authenticated user.
      const res = await getFormForGovernance(params.id);
      if (res.error || !res.data) {
        setAccessError(res.error || 'Access denied.');
        return;
      }
      setForm(res.data);
    } catch (err) {
      console.error('[GovernancePage] Failed to fetch form details:', err);
      setAccessError('Failed to load this form.');
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
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-white p-8 flex flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert size={32} className="!text-dash-textMuted" />
        <p className="text-sm font-bold !text-dash-text">{accessError}</p>
        <button
          onClick={() => router.push('/forms')}
          className="text-xs font-bold text-dash-accent hover:text-dash-accent/80"
        >
          Back to forms
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /></div>}>
      <div className="min-h-screen bg-white !text-dash-text p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Top Header Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dash-border pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/forms')}
              className="p-2.5 bg-dash-surface hover:bg-dash-border/60 rounded-xl transition-colors motion-reduce:transition-none border border-dash-border"
            >
              <ArrowLeft size={16} className="!text-dash-textMuted" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 !text-dash-text">
                {form?.name}{' '}
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                  form?.status === 'published'
                    ? 'bg-green/10 border-green/20 text-green'
                    : 'bg-amber-50 border-amber-200 text-amber-600'
                }`}>
                  {form?.status || 'draft'}
                </span>
              </h1>
              <p className="text-xs !text-dash-textMuted">Version control, deployment history, and settings</p>
            </div>
          </div>

          {/* Collaborative Session presence indicator */}
          <CollaborationIndicator formId={params.id} />
        </div>

        {/* Central Display Pane */}
        <div className="mt-2 min-h-[400px]">
          {activeTab === 'collaborators' && (
            <CollaboratorsManager 
              formId={params.id} 
              workspaceId={form?.workspace_id}
              formName={form?.name}
            />
          )}
        </div>

      </div>
      </div>
    </Suspense>
  );
}

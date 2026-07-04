'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Settings2, Sliders, History } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowEditor } from './components/WorkflowEditor';
import { ExecutionLogs } from './components/ExecutionLogs';

export default function AutomationsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'logs'>('editor');
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const loadData = async () => {
    try {
      const { data: formData } = await supabase
        .from('forms')
        .select('name, workspace_id')
        .eq('id', params.id)
        .single();

      if (formData) {
        setForm(formData);
      }

      const { data: wfs } = await supabase
        .from('workflows')
        .select('*, steps:workflow_steps(count)')
        .eq('form_id', params.id)
        .order('created_at', { ascending: false });

      const mappedWfs = (wfs || []).map((w: any) => ({
        ...w,
        steps_count: w.steps?.[0]?.count || 0
      }));

      setWorkflows(mappedWfs);
      if (mappedWfs.length > 0 && !selectedWorkflowId) {
        setSelectedWorkflowId(mappedWfs[0].id);
      }
    } catch (err) {
      console.error('[AutomationsPage] Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id, supabase]);

  const handleCreateWorkflow = async () => {
    if (!form) return;
    try {
      const { data: newWf, error } = await supabase
        .from('workflows')
        .insert({
          form_id: params.id,
          workspace_id: form.workspace_id,
          name: `New Workflow ${workflows.length + 1}`,
          trigger_type: 'form_submitted',
          trigger_config: {},
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('New workflow created!');
      setWorkflows([newWf, ...workflows]);
      setSelectedWorkflowId(newWf.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create new workflow');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev =>
        prev.map(w => (w.id === id ? { ...w, is_active: !currentStatus } : w))
      );
      toast.success(currentStatus ? 'Workflow deactivated' : 'Workflow activated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update workflow status');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Workflow?',
      description: 'Are you sure you want to delete this workflow and all its steps?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('workflows').delete().eq('id', id).eq('workspace_id', form.workspace_id);
          if (error) throw error;

          setWorkflows(prev => prev.filter(w => w.id !== id));
          if (selectedWorkflowId === id) {
            setSelectedWorkflowId(null);
          }
          toast.success('Workflow deleted successfully');
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete workflow');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04081a] p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04081a] text-white p-8 font-dm-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Topbar */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/forms')}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
            >
              <ArrowLeft size={16} className="text-[#4a5a82]" />
            </button>
            <div>
              <h1 className="text-xl font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2">
                {form?.name} <span className="text-xs font-bold text-blue-500 font-dm-sans bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">Automations</span>
              </h1>
              <p className="text-xs text-[#4a5a82]">Event-driven triggers, CRM automation nodes & email chains</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Sliders size={12} /> Pipeline Builder
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <History size={12} /> Execution Logs
            </button>
          </div>
        </div>

        {/* Content columns */}
        <div className="flex gap-6 min-h-[600px]">
          
          {/* Left: Workflows list */}
          <WorkflowList
            workflows={workflows}
            selectedId={selectedWorkflowId}
            onSelect={setSelectedWorkflowId}
            onCreate={handleCreateWorkflow}
            onToggleActive={handleToggleActive}
            onDelete={handleDeleteWorkflow}
          />

          {/* Right: Active panel */}
          {activeTab === 'editor' ? (
            selectedWorkflowId ? (
              <WorkflowEditor
                key={selectedWorkflowId}
                workflowId={selectedWorkflowId}
                onSaved={loadData}
              />
            ) : (
              <div className="flex-1 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-[#4a5a82]">
                <Settings2 size={40} className="opacity-30 mb-4" />
                <h4 className="text-sm font-black uppercase tracking-wide text-white">No Workflow Selected</h4>
                <p className="text-xs mt-1">Select a workflow on the left sidebar or create a new one to begin.</p>
              </div>
            )
          ) : (
            <ExecutionLogs formId={params.id} />
          )}
        </div>

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

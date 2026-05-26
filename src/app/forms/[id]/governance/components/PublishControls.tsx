'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, XCircle, AlertTriangle, CheckCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PublishManager, PublishValidationResult } from '@/lib/governance/PublishManager';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface PublishControlsProps {
  formId: string;
  currentDraft: any;
  onPublishCompleted: () => void;
}

export function PublishControls({
  formId,
  currentDraft,
  onPublishCompleted
}: PublishControlsProps) {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<PublishValidationResult | null>(null);
  const [notes, setNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const runValidation = async () => {
    setValidating(true);
    try {
      const supabase = createClient();
      const { data: wfs } = await supabase
        .from('workflows')
        .select('*')
        .eq('form_id', formId);

      const res = PublishManager.validateForm(
        currentDraft?.fields || [],
        currentDraft?.config || {},
        wfs || []
      );
      
      setWorkflows(wfs || []);
      setValidationResult(res);
    } catch {
      toast.error('Validation diagnostics failed.');
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, [formId, currentDraft]);

  const handlePublish = async () => {
    if (!validationResult?.valid) {
      toast.error('Please resolve validation errors before publishing.');
      return;
    }

    setPublishing(true);
    try {
      const res = await PublishManager.publishDraft(formId, notes, 'Alex Cooper');
      if (res.success) {
        toast.success('Form published to production! Redirecting back to builder...');
        setNotes('');
        onPublishCompleted();
        setTimeout(() => {
          router.push(`/forms/builder/${formId}`);
        }, 1500);
      } else {
        toast.error(res.error || 'Failed to publish draft.');
      }
    } catch {
      toast.error('Failed to submit publish command.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Unpublish Form?',
      description: 'Are you sure you want to pull this form from production?',
      confirmLabel: 'Unpublish',
      onConfirm: async () => {
        const res = await PublishManager.unpublishForm(formId, 'Alex Cooper');
        if (res.success) {
          toast.success('Form pulled from production.');
          onPublishCompleted();
        } else {
          toast.error(res.error || 'Failed to unpublish.');
        }
      }
    });
  };

  return (
    <div className="bg-[#0c1535] border border-white/5 p-6 rounded-2xl font-dm-sans text-white flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-blue-400" />
          <h3 className="text-sm font-black uppercase tracking-wider font-space-grotesk">Production Publishing</h3>
        </div>
        
        <button
          onClick={handleUnpublish}
          className="h-7 px-3 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
        >
          Unpublish Form
        </button>
      </div>

      {/* Validation Summary */}
      {validating ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-blue-500" size={20} />
        </div>
      ) : validationResult && (
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Production Readiness Diagnostics</h4>

          {/* Validation Warnings/Errors */}
          {validationResult.errors.map((err, idx) => (
            <div key={idx} className="flex gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-xs text-rose-400">
              <XCircle size={14} className="shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}

          {validationResult.warnings.map((warn, idx) => (
            <div key={idx} className="flex gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}

          {validationResult.valid && validationResult.errors.length === 0 && (
            <div className="flex gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>All structural validations passed. The form is fully secure and ready to publish.</span>
            </div>
          )}
        </div>
      )}

      {/* Release Notes Input */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Publishing Release Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Describe changes in this publish (e.g. 'Updated budget selection dropdown options')"
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none min-h-[70px] resize-none focus:border-blue-500 transition-all"
        />
      </div>

      {/* Publish button */}
      <button
        onClick={handlePublish}
        disabled={publishing || !validationResult?.valid}
        className="h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
      >
        {publishing ? <Loader2 className="animate-spin" size={14} /> : <Send size={12} />} Publish Draft Layout
      </button>

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

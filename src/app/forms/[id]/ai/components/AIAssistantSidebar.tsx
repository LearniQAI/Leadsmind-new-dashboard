'use client';
// Trigger Vercel build webhook manually
import React, { useState } from 'react';
import { Sparkles, Loader2, Send, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AIFormGenerator } from '@/lib/ai/AIFormGenerator';
import { AIInsightEngine } from '@/lib/ai/AIInsightEngine';
import { AIWorkflowAdvisor } from '@/lib/ai/AIWorkflowAdvisor';
import { AIAnalyticsInterpreter } from '@/lib/ai/AIAnalyticsInterpreter';
import { SuggestionRenderer, SuggestionItem } from './SuggestionRenderer';
import { ChangeReviewPanel } from './ChangeReviewPanel';
import { AuditLogger } from '@/lib/governance/AuditLogger';

interface AIAssistantSidebarProps {
  formId: string;
  onApplyFormSchema?: (schema: any) => void;
  onApplyWorkflowSuggestion?: (wf: any) => Promise<any>;
  onApplyCopySuggestion?: (copy: any) => void;
  onRevertFormSchema?: (original: { name: string; fields: any[]; steps: any[] }) => void;
  onRevertCopySuggestion?: (original: { id: string; label: string; placeholder: string; helpText: string }) => void;
  onRevertWorkflowSuggestion?: (workflowId: string) => Promise<void>;
  currentFormName?: string;
  currentFields?: any[];
  currentSteps?: any[];
  selectedFieldId?: string | null;
  floatingOffsetClass?: string;
}

export function AIAssistantSidebar({
  formId,
  onApplyFormSchema,
  onApplyWorkflowSuggestion,
  onApplyCopySuggestion,
  onRevertFormSchema,
  onRevertCopySuggestion,
  onRevertWorkflowSuggestion,
  currentFormName,
  currentFields,
  currentSteps,
  selectedFieldId,
  floatingOffsetClass
}: AIAssistantSidebarProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'copy' | 'insights' | 'workflows'>('generate');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [copyText, setCopyText] = useState('');
  const [tone, setTone] = useState('conversion');

  // Human Review Panel state
  const [reviewingProposal, setReviewingProposal] = useState<SuggestionItem | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Revert stack scaffolding
  const [appliedPatches, setAppliedPatches] = useState<any[]>([]);

  const handleGenerateForm = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const schema = await AIFormGenerator.generateForm(prompt);
      const item: SuggestionItem = {
        id: crypto.randomUUID(),
        type: 'copy',
        title: `Generate form: ${schema.name}`,
        description: `Creates a multi-step form with ${schema.fields.length} optimized fields across ${schema.steps.length} stages.`,
        recommendation: `New Form Structure: [${schema.steps.map(s => s.title).join(' → ')}]`,
        meta: schema
      };
      setSuggestions([item, ...suggestions]);
      toast.success('AI suggested form structure!');
    } catch {
      toast.error('Failed to generate form schema.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeCopy = async () => {
    if (!copyText.trim()) return;
    setLoading(true);
    try {
      const options = await AIInsightEngine.optimizeCopy(copyText, tone);
      const items = options.map((opt, idx) => ({
        id: crypto.randomUUID(),
        type: 'copy' as const,
        title: `Copy Variant ${idx + 1} (${tone})`,
        description: `Optimized headline and CTA alternatives for high-intent traffic.`,
        recommendation: `Headline: "${opt.headline}"\nCTA: "${opt.cta}"\nHelper: "${opt.helperText}"`,
        meta: opt
      }));
      setSuggestions([...items, ...suggestions]);
      toast.success('Copy optimized!');
    } catch {
      toast.error('Failed to generate suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuditAnalytics = async () => {
    setLoading(true);
    try {
      const stats = { views: 120, submissions: 8, completedCount: 8, startedCount: 22, mobileConversionRate: 4, desktopConversionRate: 15, averageTimeSeconds: 155 };
      const insights = await AIAnalyticsInterpreter.interpretStats(stats);
      const recoveryRecs = await AIInsightEngine.getRecoveryOptimization(stats);

      const items: SuggestionItem[] = [
        ...insights.map(ins => ({
          id: crypto.randomUUID(),
          type: 'analytics' as const,
          title: `CRO Insight: ${ins.type} issue`,
          description: ins.explanation,
          recommendation: ins.recommendation
        })),
        ...recoveryRecs.map(rec => ({
          id: crypto.randomUUID(),
          type: 'recovery' as const,
          title: 'Recovery Timing Suggestion',
          description: 'AI detected friction inside form abandonment sequences.',
          recommendation: rec
        }))
      ];
      setSuggestions([...items, ...suggestions]);
      toast.success('Analytics audited!');
    } catch {
      toast.error('Audit failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowAdvice = async () => {
    setLoading(true);
    try {
      const advises = await AIWorkflowAdvisor.recommendWorkflows('sales lead intake');
      const items = advises.map(adv => ({
        id: crypto.randomUUID(),
        type: 'workflow' as const,
        title: adv.name,
        description: adv.description,
        recommendation: `Fires on ${adv.trigger_type.replace(/_/g, ' ')}. Action steps count: ${adv.steps.length}`,
        meta: adv
      }));
      setSuggestions([...items, ...suggestions]);
      toast.success('Automation suggestions ready!');
    } catch {
      toast.error('Workflow advice failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposedPatch = async () => {
    if (!reviewingProposal) return;
    const item = reviewingProposal;

    let revertPayload: any = null;

    if (item.type === 'copy' && onApplyFormSchema && item.meta?.fields) {
      // 1. Layout generation snapshot
      revertPayload = {
        type: 'schema',
        data: {
          name: currentFormName || '',
          fields: currentFields || [],
          steps: currentSteps || []
        }
      };
      onApplyFormSchema(item.meta);
      toast.success('Applied generated form schema layout to active Draft!');
    } else if (item.type === 'copy' && onApplyCopySuggestion && item.meta?.headline) {
      // 2. Copy optimization snapshot
      const activeField = currentFields?.find(f => f.id === selectedFieldId);
      if (activeField) {
        revertPayload = {
          type: 'copy_field',
          data: {
            id: activeField.id,
            label: activeField.label,
            placeholder: activeField.placeholder,
            helpText: activeField.helpText
          }
        };
      } else {
        revertPayload = {
          type: 'copy_form_name',
          data: {
            name: currentFormName || ''
          }
        };
      }
      onApplyCopySuggestion(item.meta);
      toast.success('Applied optimized copy to selected element!');
    } else if (item.type === 'workflow' && onApplyWorkflowSuggestion && item.meta) {
      // 3. Automation workflow database insert
      const createdId = await onApplyWorkflowSuggestion(item.meta);
      if (createdId) {
        revertPayload = {
          type: 'workflow',
          data: {
            id: createdId
          }
        };
        toast.success('Applied workflow template advice to active Draft!');
      } else {
        toast.error('Failed to apply workflow suggestion. Check database permissions.');
        return;
      }
    } else {
      toast.success(`Approved recommendation: "${item.title}"`);
    }

    // Save with the snapshot
    setAppliedPatches([{ ...item, revertPayload }, ...appliedPatches]);

    // Write audit log trace
    await AuditLogger.logAction(
      formId,
      'ai_approval',
      'Alex Cooper',
      `Approved AI recommendation: ${item.title}`,
      { suggestionId: item.id, type: item.type }
    );

    setSuggestions(prev => prev.filter(s => s.id !== item.id));
    setReviewingProposal(null);
  };

  const handleRevertLastPatch = async () => {
    if (appliedPatches.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Revert AI Patch?',
      description: 'Revert the last approved AI patch suggestion?',
      confirmLabel: 'Revert',
      onConfirm: async () => {
        const reverted = appliedPatches[0];
        setAppliedPatches(prev => prev.slice(1));

        try {
          const payload = reverted.revertPayload;
          if (!payload) {
            toast.success(`Removed tracking for: "${reverted.title}"`);
            return;
          }

          if (payload.type === 'schema' && onRevertFormSchema) {
            onRevertFormSchema(payload.data);
            toast.success(`Reverted form layout back to: "${payload.data.name}"`);
          } else if (payload.type === 'copy_field' && onRevertCopySuggestion) {
            onRevertCopySuggestion(payload.data);
            toast.success(`Reverted active field copy changes.`);
          } else if (payload.type === 'copy_form_name' && onRevertCopySuggestion) {
            onRevertCopySuggestion({ id: '', label: payload.data.name, placeholder: '', helpText: '' });
            toast.success(`Reverted form name.`);
          } else if (payload.type === 'workflow' && onRevertWorkflowSuggestion && payload.data.id) {
            await onRevertWorkflowSuggestion(payload.data.id);
            toast.success(`Deleted CRM automation from database.`);
          } else {
            toast.success(`Reverted changes from: "${reverted.title}"`);
          }
        } catch (err: any) {
          console.error('Revert failed:', err);
          toast.error(`Revert failed: ${err.message || err}`);
        }
      }
    });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 ${floatingOffsetClass || 'right-6'} w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center border border-blue-500/30 transition-all hover:scale-110 z-50`}
        title="LeadsMind AI Assistant"
      >
        <Sparkles size={20} className="animate-pulse" />
      </button>

      {/* Slide-out Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-[420px] bg-[#0c1535]/95 border-l border-white/7 backdrop-blur-xl transition-all duration-300 z-50 flex flex-col font-dm-sans shadow-2xl ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-space-grotesk">AI CRO Assistant</h3>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation tabs */}
        <div className="grid grid-cols-4 bg-white/2 border-b border-white/5 p-1">
          {(['generate', 'copy', 'insights', 'workflows'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Assistant panels */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6">
          
          {activeTab === 'generate' && (
            <div className="flex flex-col gap-3">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your form (e.g. 'Create a real estate client intake wizard')"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none min-h-[70px] resize-none"
              />
              <button
                onClick={handleGenerateForm}
                disabled={loading || !prompt.trim()}
                className="h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={12} />} Generate Form Schema
              </button>
            </div>
          )}

          {activeTab === 'copy' && (
            <div className="flex flex-col gap-3">
              <textarea
                value={copyText}
                onChange={e => setCopyText(e.target.value)}
                placeholder="Enter current form headline or CTA copy to optimize..."
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none min-h-[70px] resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white flex-1 focus:outline-none"
                >
                  <option value="conversion" className="bg-[#0b132c]">Conversion / Urgent</option>
                  <option value="playful" className="bg-[#0b132c]">Playful / Friendly</option>
                  <option value="professional" className="bg-[#0b132c]">Professional</option>
                </select>
                <button
                  onClick={handleOptimizeCopy}
                  disabled={loading || !copyText.trim()}
                  className="h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-[10px] font-black uppercase tracking-wider px-4 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="animate-spin" size={12} /> : null} Suggest
                </button>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-[#4a5a82]">Audits abandonment timing, dropouts, and mobile friction factors.</p>
              <button
                onClick={handleAuditAnalytics}
                disabled={loading}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : null} Audit Conversion Insights
              </button>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-[#4a5a82]">Inspects form context to recommend optimal recovery & notification logic.</p>
              <button
                onClick={handleWorkflowAdvice}
                disabled={loading}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : null} Recommends CRM Workflows
              </button>
              <a
                href={`/forms/${formId}/automations`}
                target="_blank"
                rel="noreferrer"
                className="h-9 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 cursor-pointer decoration-transparent"
              >
                Go to Automations Dashboard ↗
              </a>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Optimization Queue</h4>
              {appliedPatches.length > 0 && (
                <button
                  onClick={handleRevertLastPatch}
                  className="text-[9px] font-black uppercase tracking-wider text-rose-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Revert Last Approved
                </button>
              )}
            </div>
            <SuggestionRenderer
              suggestions={suggestions}
              onApply={(item) => setReviewingProposal(item)}
              onDismiss={(id) => setSuggestions(prev => prev.filter(s => s.id !== id))}
            />
          </div>

        </div>

      </div>

      {/* Review Proposal Modal Overlay */}
      {reviewingProposal && (
        <ChangeReviewPanel
          isOpen={!!reviewingProposal}
          onClose={() => setReviewingProposal(null)}
          onConfirm={handleApplyProposedPatch}
          proposalTitle={reviewingProposal.title}
          originalText="Current working draft configurations"
          proposedText={reviewingProposal.recommendation}
          type={reviewingProposal.type}
        />
      )}
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
    </>
  );
}

const crypto = {
  randomUUID: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
};

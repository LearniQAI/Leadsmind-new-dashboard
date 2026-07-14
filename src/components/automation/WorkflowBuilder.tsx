'use client';

import React, { useState } from 'react';
import {
  Settings, Plus, Zap, ArrowDown, Trash2, Power, Play,
  Clock, Mail, MessageSquare, AlertCircle, HelpCircle, CheckSquare, RefreshCw
} from 'lucide-react';
import { toggleWorkflowActive, deleteWorkflow, seedSARecipes } from '@/app/actions/automation-workspace';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function WorkflowBuilder({ workflows }: { workflows: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const handleToggle = async (id: string, currentState: boolean) => {
    setLoadingId(id);
    await toggleWorkflowActive(id, currentState);
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete workflow?',
      description: 'Are you sure you want to delete this workflow?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setLoadingId(id);
        await deleteWorkflow(id);
        setLoadingId(null);
      }
    });
  };

  const handleSeed = async () => {
    setSeeding(true);
    await seedSARecipes();
    setSeeding(false);
  };

  const formatDelay = (seconds: number) => {
    if (!seconds) return 'Immediate';
    if (seconds >= 86400) {
      const days = Math.round(seconds / 86400);
      return `Wait ${days} ${days === 1 ? 'Day' : 'Days'}`;
    }
    if (seconds >= 3600) {
      const hours = Math.round(seconds / 3600);
      return `Wait ${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
    }
    return `Wait ${seconds} Seconds`;
  };

  return (
    <div className="space-y-6">
      {/* Seed Actions Panel */}
      <div className="bg-white border border-dash-border rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="text-sm font-bold !text-dash-text mb-1">South African automation sequences</h4>
          <p className="text-xs !text-dash-textMuted">Instantly load specialized sequences for Overdue Invoices, SARS Deadlines, and LMS recovery loops.</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-5 py-2.5 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none inline-flex items-center gap-2"
        >
          {seeding ? <RefreshCw className="animate-spin motion-reduce:animate-none" size={14} /> : <Zap size={14} />}
          Seed SA recipes
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center p-12 bg-white border border-dash-border rounded-3xl shadow-sm">
          <Settings size={48} className="!text-dash-textMuted mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold !text-dash-text mb-2">No active workflows</h3>
          <p className="!text-dash-textMuted mb-6">Create deterministic operational flows to automate your pipeline.</p>
          <button className="px-6 py-3 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold transition-colors motion-reduce:transition-none inline-flex items-center gap-2 shadow-lg shadow-dash-accent/20">
            <Plus size={18} /> Build first workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((workflow) => {
            const steps = workflow.workflow_steps || [];
            const sortedSteps = [...steps].sort((a, b) => a.position - b.position);

            return (
              <div key={workflow.id} className={`bg-white border rounded-3xl p-6 transition-all motion-reduce:transition-none shadow-sm ${
                workflow.is_active ? 'border-dash-accent/30 shadow-lg shadow-dash-accent/5' : 'border-dash-border opacity-70'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold !text-dash-text flex items-center gap-2">
                      {workflow.name}
                      {!workflow.is_active && <span className="text-[10px] bg-dash-surface !text-dash-textMuted px-2 py-0.5 rounded font-bold">Paused</span>}
                    </h3>
                    <p className="text-sm !text-dash-textMuted mt-1">{workflow.description || 'Operational Workflow'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(workflow.id, workflow.is_active)}
                      disabled={loadingId === workflow.id}
                      className={`p-2 rounded-xl transition-colors motion-reduce:transition-none ${workflow.is_active ? 'text-amber-600 hover:bg-amber-100' : 'text-green hover:bg-green/10'}`}
                      title={workflow.is_active ? 'Pause Workflow' : 'Activate Workflow'}
                    >
                      <Power size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      disabled={loadingId === workflow.id}
                      className="p-2 !text-dash-textMuted hover:text-red hover:bg-red/10 rounded-xl transition-colors motion-reduce:transition-none"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Workflow Goal rules display */}
                {workflow.goal_rules && workflow.goal_rules.length > 0 && (
                  <div className="mb-4 p-3 bg-green/5 border border-green/20 rounded-2xl">
                    <p className="text-[10px] font-bold text-green mb-1 flex items-center gap-1">
                      🎯 Global goal tracking interceptor
                    </p>
                    <div className="text-xs !text-dash-text font-medium flex flex-wrap gap-1 mt-1">
                      {workflow.goal_rules.map((rule: any, idx: number) => (
                        <span key={idx} className="bg-green/5 px-2 py-0.5 rounded text-[11px] text-green border border-green/20">
                          {rule.field} {rule.operator === 'equals' ? '==' : '!='} {String(rule.value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linear Flow DAG Representation */}
                <div className="bg-dash-surface border border-dash-border rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-dash-accent/20 text-dash-accent flex items-center justify-center shrink-0">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold !text-dash-textMuted mb-1">When triggered by</p>
                      <p className="text-sm !text-dash-text font-semibold capitalize">
                        {workflow.trigger_type?.replace(/_/g, ' ') || 'Manual execution'}
                      </p>
                    </div>
                  </div>

                  <div className="ml-[15px] my-2 w-px h-6 bg-dash-border" />

                  <div className="space-y-4">
                    {sortedSteps.length === 0 ? (
                      <p className="text-xs !text-dash-textMuted italic p-3">No steps configured yet.</p>
                    ) : (
                      sortedSteps.map((step: any, i: number) => {
                        let icon = <Play size={14} />;
                        let title = step.type.replace(/_/g, ' ');
                        let subtitle = '';
                        let colorClass = 'bg-dash-surface !text-dash-text border-dash-border';
                        let hasFailover = false;

                        if (step.type === 'wait') {
                          icon = <Clock size={14} />;
                          title = formatDelay(step.config?.delaySeconds);
                          colorClass = 'bg-amber-100 text-amber-600 border-amber-200';
                        } else if (step.type === 'send_email') {
                          icon = <Mail size={14} />;
                          title = 'Send Email';
                          subtitle = step.config?.subject || '';
                          colorClass = 'bg-dash-accent/10 text-dash-accent border-dash-accent/20';
                          if (step.config?.backup_whatsapp_body) {
                            hasFailover = true;
                          }
                        } else if (step.type === 'send_whatsapp') {
                          icon = <MessageSquare size={14} />;
                          title = 'WhatsApp Text';
                          subtitle = step.config?.body || '';
                          colorClass = 'bg-green/10 text-green border-green/20';
                        } else if (step.type === 'if_else') {
                          icon = <HelpCircle size={14} />;
                          title = 'Branching Path';
                          const cond = step.config?.conditions?.[0];
                          subtitle = cond ? `${cond.field} ${cond.operator} ${cond.value}` : 'Check Condition';
                          colorClass = 'bg-purple-100 text-purple-600 border-purple-200';
                        } else if (step.type === 'create_task') {
                          icon = <CheckSquare size={14} />;
                          title = 'Create CRM Task';
                          subtitle = step.config?.title || '';
                          colorClass = 'bg-red/10 text-red border-red/20';
                        }

                        return (
                          <div key={step.id} className="relative">
                            {/* Vertical Line */}
                            {i !== sortedSteps.length - 1 && (
                              <div className="absolute top-8 left-[15px] w-px h-8 bg-dash-border" />
                            )}

                            <div className="flex items-start gap-4">
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold !text-dash-textMuted mb-1">Step {step.position}</p>
                                <p className="text-sm !text-dash-text font-semibold capitalize">{title}</p>
                                {subtitle && <p className="text-xs !text-dash-textMuted truncate mt-0.5">{subtitle}</p>}

                                {/* WhatsApp Backup Failover Node branch */}
                                {hasFailover && (
                                  <div className="mt-3 ml-2 pl-4 border-l-2 border-dashed border-green/30 space-y-2">
                                    <div className="flex items-center gap-2 text-green bg-green/5 border border-green/10 rounded-xl p-2.5">
                                      <MessageSquare size={12} className="shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-green">Bounce fallback route</p>
                                        <p className="text-[11px] !text-dash-text truncate">{step.config?.backup_whatsapp_body}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs !text-dash-textMuted font-bold">
                  <span>{workflow.execution_count || 0} executions</span>
                  <span>ID: {workflow.id.split('-')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}

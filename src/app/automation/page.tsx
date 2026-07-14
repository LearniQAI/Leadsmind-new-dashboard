import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getAutomationDashboardData } from '@/app/actions/automation-workspace';
import { WorkflowBuilder } from '@/components/automation/WorkflowBuilder';
import { WorkflowHistoryPanel } from '@/components/automation/WorkflowHistoryPanel';
import { Zap, Play, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function AutomationDashboardPage() {
  const { success, data, error } = await getAutomationDashboardData();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center !text-dash-textMuted">Error loading Automation Engine.</div>
      </Wrapper>
    );
  }

  const { workflows, executions, failures } = data;

  const activeWorkflows = workflows.filter((w: any) => w.is_active).length;
  const totalExecutions = workflows.reduce((acc: number, w: any) => acc + w.execution_count, 0);

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-80px)] space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold !text-dash-text mb-2 flex items-center gap-3">
              <Zap className="text-dash-accent" size={32} /> Automation engine
            </h1>
            <p className="!text-dash-textMuted">Operational orchestration connecting Forms, CRM, and intelligence workflows.</p>
          </div>
          <button className="px-6 py-3 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold transition-colors motion-reduce:transition-none shadow-lg shadow-dash-accent/20">
            Create workflow
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap size={80} className="text-dash-accent" />
            </div>
            <p className="text-xs font-bold !text-dash-textMuted mb-2">Active workflows</p>
            <h3 className="text-4xl font-bold !text-dash-text">{activeWorkflows}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Currently routing data.</p>
          </div>

          <div className="bg-white border border-green-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Play size={80} className="text-green" />
            </div>
            <p className="text-xs font-bold text-green mb-2">Total executions</p>
            <h3 className="text-4xl font-bold !text-dash-text">{totalExecutions}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Successful automations run.</p>
          </div>

          <div className={`bg-white border rounded-2xl p-6 relative overflow-hidden shadow-sm ${failures.length > 0 ? 'border-red-200' : 'border-dash-border'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AlertTriangle size={80} className={failures.length > 0 ? 'text-red' : '!text-dash-textMuted'} />
            </div>
            <p className={`text-xs font-bold mb-2 ${failures.length > 0 ? 'text-red' : '!text-dash-textMuted'}`}>
              Dead letter queue
            </p>
            <h3 className="text-4xl font-bold !text-dash-text">{failures.length}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Unresolved workflow failures.</p>
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <WorkflowBuilder workflows={workflows} />
          </div>
          <div className="lg:col-span-1 h-[600px]">
            <WorkflowHistoryPanel executions={executions} failures={failures} />
          </div>
        </div>

      </div>
    </Wrapper>
  );
}

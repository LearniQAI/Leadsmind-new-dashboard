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
        <div className="p-12 text-center text-white">Error loading Automation Engine.</div>
      </Wrapper>
    );
  }

  const { workflows, executions, failures } = data;

  const activeWorkflows = workflows.filter((w: any) => w.is_active).length;
  const totalExecutions = workflows.reduce((acc: number, w: any) => acc + w.execution_count, 0);

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Zap className="text-accent" size={32} /> Automation Engine
            </h1>
            <p className="text-t3">Operational orchestration connecting Forms, CRM, and intelligence workflows.</p>
          </div>
          <button className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors shadow-lg shadow-accent/20">
            Create Workflow
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-n800 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap size={80} className="text-accent" />
            </div>
            <p className="text-xs font-bold text-t4 uppercase tracking-widest mb-2">Active Workflows</p>
            <h3 className="text-4xl font-space font-black text-white">{activeWorkflows}</h3>
            <p className="text-sm text-t4 mt-2">Currently routing data.</p>
          </div>
          
          <div className="bg-n800 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Play size={80} className="text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Total Executions</p>
            <h3 className="text-4xl font-space font-black text-white">{totalExecutions}</h3>
            <p className="text-sm text-t4 mt-2">Successful automations run.</p>
          </div>

          <div className={`bg-n800 border rounded-2xl p-6 relative overflow-hidden ${failures.length > 0 ? 'border-red-500/30' : 'border-white/10'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AlertTriangle size={80} className={failures.length > 0 ? 'text-red-400' : 'text-t4'} />
            </div>
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${failures.length > 0 ? 'text-red-400' : 'text-t4'}`}>
              Dead Letter Queue
            </p>
            <h3 className="text-4xl font-space font-black text-white">{failures.length}</h3>
            <p className="text-sm text-t4 mt-2">Unresolved workflow failures.</p>
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

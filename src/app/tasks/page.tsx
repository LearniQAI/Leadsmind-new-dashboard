import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getTaskDashboardData } from '@/app/actions/task-workspace';
import { TasksBoard } from '@/components/kanban/TasksBoard';
import { EscalationPanel } from '@/components/tasks/EscalationPanel';
import { CheckSquare, Plus, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default async function TasksPage() {
  const { success, data, error } = await getTaskDashboardData();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Error loading Revenue Execution system.</div>
      </Wrapper>
    );
  }

  const { escalations } = data;

  return (
    <Wrapper>
      <div className="p-6 max-w-[1600px] mx-auto font-body min-h-[calc(100vh-80px)] space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <CheckSquare className="text-accent" size={32} /> Revenue Tasks
            </h1>
            <p className="text-t3">Operational followups, reminders, and execution tracking.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/tasks/dashboard" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
              <LayoutDashboard size={14} /> Analytics
            </Link>
          </div>
        </div>

        {/* Escalation Handling */}
        <EscalationPanel escalations={escalations} />

        {/* Full Task Board (Kanban, List, Calendar) */}
        <TasksBoard />
        
      </div>
    </Wrapper>
  );
}

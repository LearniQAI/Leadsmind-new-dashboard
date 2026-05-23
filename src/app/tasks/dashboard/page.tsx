import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getTaskDashboardData } from '@/app/actions/task-workspace';
import { LayoutDashboard, CheckSquare, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default async function TaskAnalyticsDashboardPage() {
  const { success, data, error } = await getTaskDashboardData();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Error loading Execution Dashboard.</div>
      </Wrapper>
    );
  }

  const { tasks, escalations } = data;

  const overdueCount = tasks.filter((t: any) => t.status === 'Overdue').length;
  const completedCount = tasks.filter((t: any) => t.status === 'Completed').length;
  const pendingCount = tasks.filter((t: any) => t.status === 'Pending' || t.status === 'In Progress').length;
  
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/tasks" className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-4">
              <CheckSquare size={16} /> Back to Task Board
            </Link>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <LayoutDashboard className="text-accent" size={32} /> Execution Dashboard
            </h1>
            <p className="text-t3">Workload summaries, completion rates, and team accountability metrics.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-n800 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp size={80} className="text-accent" />
            </div>
            <p className="text-xs font-bold text-t4 uppercase tracking-widest mb-2">Completion Rate</p>
            <h3 className="text-4xl font-space font-black text-white">{completionRate}%</h3>
            <p className="text-sm text-t4 mt-2">Overall execution metric.</p>
          </div>
          
          <div className="bg-n800 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <CheckCircle2 size={80} className="text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Completed</p>
            <h3 className="text-4xl font-space font-black text-white">{completedCount}</h3>
            <p className="text-sm text-t4 mt-2">Tasks finished.</p>
          </div>

          <div className="bg-n800 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Clock size={80} className="text-blue-400" />
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Pending</p>
            <h3 className="text-4xl font-space font-black text-white">{pendingCount}</h3>
            <p className="text-sm text-t4 mt-2">Active tasks in queue.</p>
          </div>

          <div className={`bg-n800 border rounded-2xl p-6 relative overflow-hidden ${overdueCount > 0 ? 'border-red-500/30' : 'border-white/10'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AlertTriangle size={80} className={overdueCount > 0 ? 'text-red-400' : 'text-t4'} />
            </div>
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${overdueCount > 0 ? 'text-red-400' : 'text-t4'}`}>
              Overdue
            </p>
            <h3 className="text-4xl font-space font-black text-white">{overdueCount}</h3>
            <p className="text-sm text-t4 mt-2">Requires immediate execution.</p>
          </div>
        </div>

        {/* Task Lists Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-n800 border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="text-blue-400" /> Upcoming Tasks
            </h2>
            <div className="space-y-3">
              {tasks.filter((t: any) => t.status === 'Pending' || t.status === 'In Progress').slice(0, 8).map((task: any) => (
                <div key={task.id} className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{task.title}</h4>
                    <p className="text-xs text-t4 mt-1 font-bold uppercase tracking-widest">
                      Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-n800 border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-space font-bold text-red-400 mb-6 flex items-center gap-2">
              <AlertTriangle /> Accountability Escalations
            </h2>
            <div className="space-y-3">
              {escalations.length === 0 ? (
                <p className="text-t4 text-center p-8">No open escalations.</p>
              ) : (
                escalations.map((esc: any) => (
                  <div key={esc.id} className="p-4 bg-n900 border border-red-500/30 rounded-2xl">
                    <h4 className="font-bold text-white text-sm mb-1">{esc.crm_tasks?.title}</h4>
                    <p className="text-xs text-red-400">{esc.escalation_reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </Wrapper>
  );
}

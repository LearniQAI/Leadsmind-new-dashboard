'use client';

import React from 'react';
import { updateTaskStatus } from '@/app/actions/task-workspace';
import { Calendar, CheckCircle2, Circle, Clock, Building2, User, Target } from 'lucide-react';

const COLUMNS = [
  { id: 'Pending', title: 'To Do', color: 'text-dash-textMuted' },
  { id: 'In Progress', title: 'In Progress', color: 'text-blue-600' },
  { id: 'Completed', title: 'Done', color: 'text-emerald-600' },
  { id: 'Overdue', title: 'Overdue', color: 'text-red-600' }
];

export function TaskKanban({ tasks }: { tasks: any[] }) {

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-50 text-red-600';
      case 'High': return 'bg-amber-50 text-amber-600';
      case 'Low': return 'bg-dash-bg text-dash-textMuted';
      default: return 'bg-blue-50 text-blue-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-8 h-[calc(100vh-250px)]">
      {COLUMNS.map(column => {
        const columnTasks = tasks.filter(t => t.status === column.id);

        return (
          <div key={column.id} className="flex flex-col h-full bg-dash-surface border border-dash-border shadow-sm rounded-3xl p-5">
            <div className={`mb-4 pb-4 border-b border-dash-border flex items-center justify-between`}>
              <h3 className={`font-space font-bold text-sm uppercase tracking-wider ${column.color}`}>{column.title}</h3>
              <span className="text-[10px] font-bold text-dash-textMuted bg-dash-bg border border-dash-border px-2 py-1 rounded-md">{columnTasks.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {columnTasks.map(task => (
                <div key={task.id} className="bg-dash-bg border border-dash-border shadow-sm rounded-2xl p-4 hover:border-dash-accent/40 transition-colors group">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <button
                      onClick={() => handleStatusChange(task.id, task.status === 'Completed' ? 'Pending' : 'Completed')}
                      className="mt-0.5 shrink-0 text-dash-textMuted hover:text-emerald-600 transition-colors"
                    >
                      {task.status === 'Completed' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} />}
                    </button>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm leading-tight ${task.status === 'Completed' ? 'text-dash-textMuted line-through' : 'text-dash-text'}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-dash-textMuted mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-dash-textMuted uppercase tracking-widest">
                        <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Entity Links */}
                  {(task.company || task.contact || task.opportunity) && (
                    <div className="space-y-1.5 pt-3 border-t border-dash-border">
                      {task.opportunity?.name && (
                        <p className="text-[10px] text-dash-textMuted flex items-center gap-1.5 truncate uppercase tracking-widest font-bold">
                          <Target size={10} className="text-dash-accent shrink-0" /> {task.opportunity.name}
                        </p>
                      )}
                      {task.company?.name && (
                        <p className="text-[10px] text-dash-textMuted flex items-center gap-1.5 truncate uppercase tracking-widest font-bold">
                          <Building2 size={10} className="text-dash-textMuted shrink-0" /> {task.company.name}
                        </p>
                      )}
                      {task.contact?.email && (
                        <p className="text-[10px] text-dash-textMuted flex items-center gap-1.5 truncate uppercase tracking-widest font-bold">
                          <User size={10} className="text-dash-textMuted shrink-0" /> {task.contact.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

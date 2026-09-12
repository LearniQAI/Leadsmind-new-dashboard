'use client';

import React, { useTransition } from 'react';
import { Calendar, CheckSquare, FileText, Lock, ShieldCheck, DollarSign, Clock, Download, CircleDot } from 'lucide-react';
import { approveProjectMilestone } from '@/app/actions/projects';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectTimelineProps {
  project: any;
  tasks: any[];
  deliverables: any[];
  settings: {
    show_tasks: boolean;
    show_employee_names: boolean;
    show_financials: boolean;
  };
}

export default function ProjectTimeline({ project, tasks, deliverables, settings }: ProjectTimelineProps) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = async (taskId: string) => {
    startTransition(async () => {
      try {
        const res = await approveProjectMilestone(taskId);
        if (res.success) {
          toast.success("Milestone approved successfully.");
        } else {
          toast.error(res.error || "Failed to approve milestone");
        }
      } catch (err: any) {
        toast.error("Error confirming approval: " + err.message);
      }
    });
  };

  // 1. Group / Filter tasks based on settings
  const displayTasks = settings.show_tasks ? tasks : tasks.filter(t => t.is_milestone);
  
  // Completed tasks count for the progress bar
  const totalDisplay = displayTasks.length;
  const completedDisplay = displayTasks.filter(t => t.status === 'done' || t.client_approved_at).length;
  const percent = totalDisplay > 0 ? Math.round((completedDisplay / totalDisplay) * 100) : 0;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-dash-border rounded-[24px] p-8 shadow-2xl relative overflow-hidden group space-y-8">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Project Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-dash-border">
        <div>
          <h3 className="text-xl font-bold text-dash-text font-space uppercase tracking-wide">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs text-dash-textMuted mt-2 font-sans max-w-2xl leading-relaxed">{project.description}</p>
          )}

          {/* Start and Due Date Gantt Header */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-mono text-dash-textMuted uppercase tracking-wider">
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> Start: {formatDate(project.start_date)}
              </span>
            )}
            {project.due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> Target Deadline: {formatDate(project.due_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            "text-[9px] font-black uppercase px-3 py-1 rounded-full border tracking-wider",
            project.status === 'completed'
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : project.status === 'active'
              ? "bg-dash-accent/10 text-dash-accent border-dash-accent/20"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            Status: {project.status || 'Planning'}
          </span>
        </div>
      </div>

      {/* Financial Details (Only if enabled in Settings Guardrails) */}
      {settings.show_financials && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-dash-surface p-5 rounded-2xl border border-dash-border">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-dash-textMuted uppercase tracking-wider flex items-center gap-1">
              <DollarSign size={12} /> Budget
            </span>
            <p className="text-base font-extrabold text-dash-text">
              {project.budget ? `R ${Number(project.budget).toLocaleString('en-ZA')}` : 'Not Specified'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-dash-textMuted uppercase tracking-wider flex items-center gap-1">
              <DollarSign size={12} /> Cost to Date
            </span>
            <p className="text-base font-extrabold text-dash-text">
              {project.cost ? `R ${Number(project.cost).toLocaleString('en-ZA')}` : 'Not Specified'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-dash-textMuted uppercase tracking-wider flex items-center gap-1">
              <Clock size={12} /> Tracked Hours
            </span>
            <p className="text-base font-extrabold text-dash-text">
              {project.tracked_hours ? `${project.tracked_hours} Hours` : 'Not Specified'}
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2 bg-dash-surface p-5 rounded-2xl border border-dash-border">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-dash-textMuted">
          <span>Delivery Progress Milestones</span>
          <span>{completedDisplay} / {totalDisplay} completed ({percent}%)</span>
        </div>
        <div className="h-2 w-full bg-dash-border/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-dash-accent rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* CSS Vertical Roadmap / Gantt Timeline */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[2px] flex items-center gap-1.5">
          <CheckSquare size={13} className="text-dash-accent" /> Delivery Roadmap & Timeline
        </h4>

        {displayTasks.length === 0 ? (
          <p className="text-xs text-dash-textMuted italic font-sans pl-1">No active milestones created yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-dash-border space-y-8 mt-4 ml-3">
            {displayTasks.map((t, tIdx) => {
              const isDone = t.status === 'done';
              const isApproved = !!t.client_approved_at;
              const isMilestone = t.is_milestone;
              
              // Mask internal employee names if toggled off
              const assigneeName = settings.show_employee_names && t.assigned_user
                ? `${t.assigned_user.first_name} ${t.assigned_user.last_name}`
                : "LeadsMind Delivery Team";

              return (
                <div key={tIdx} className="relative">
                  {/* Timeline Node Dot */}
                  <span className={cn(
                    "absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center bg-white",
                    isApproved
                      ? "border-emerald-500 text-emerald-600"
                      : isDone
                      ? "border-dash-accent text-dash-accent"
                      : "border-dash-border text-dash-textMuted"
                  )}>
                    <CircleDot size={10} className="fill-current" />
                  </span>

                  <div className="p-5 rounded-2xl bg-dash-surface border border-dash-border hover:border-dash-accent/30 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider",
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isDone
                            ? "bg-dash-accent/10 text-dash-accent border-dash-accent/20"
                            : "bg-white text-dash-textMuted border-dash-border"
                        )}>
                          {isApproved ? 'Approved ✓' : isDone ? 'Pending Approval' : 'In Progress'}
                        </span>

                        {isMilestone && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 tracking-wider">
                            Key Milestone
                          </span>
                        )}
                      </div>

                      <h5 className={cn(
                        "text-xs font-bold font-space uppercase tracking-wide",
                        isApproved ? "text-dash-textMuted line-through font-medium" : "text-dash-text"
                      )}>
                        {t.title}
                      </h5>

                      <div className="flex flex-wrap items-center gap-3 text-[9.5px] text-dash-textMuted font-mono uppercase">
                        {t.due_date && (
                          <span>Target: {formatDate(t.due_date)}</span>
                        )}
                        <span>Assignee: {assigneeName}</span>
                      </div>

                      {/* Approved Timestamp Log */}
                      {isApproved && (
                        <p className="text-[9px] text-emerald-600 font-sans italic flex items-center gap-1 mt-1">
                          <ShieldCheck size={11} /> Approved on {formatDate(t.client_approved_at)}
                        </p>
                      )}
                    </div>

                    {/* Milestone Approval Button */}
                    {isMilestone && !isApproved && (
                      <button
                        onClick={() => handleApprove(t.id)}
                        disabled={isPending}
                        className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/15 disabled:opacity-50 active:scale-95 shrink-0 flex items-center gap-1.5"
                      >
                        <ShieldCheck size={13} /> Approve Milestone
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deliverable Attachments (Only files marked as Client Deliverables) */}
      <div className="space-y-4 pt-6 border-t border-dash-border">
        <h4 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[2px] flex items-center gap-1.5">
          <FileText size={13} className="text-dash-accent" /> Client-Facing Deliverables & Files
        </h4>

        {deliverables.length === 0 ? (
          <div className="p-4 rounded-2xl bg-dash-surface border border-dash-border text-center">
            <p className="text-xs text-dash-textMuted italic font-sans">No deliverables have been marked for download yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deliverables.map((file, fIdx) => (
              <div 
                key={fIdx} 
                className="p-4 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-between gap-4 hover:border-dash-accent/30 transition-colors"
              >
                <div className="truncate space-y-1">
                  <p className="text-xs font-bold text-dash-text truncate uppercase font-space tracking-wide">
                    {file.name}
                  </p>
                  <p className="text-[9px] text-dash-textMuted font-mono">
                    {file.size ? `${(Number(file.size) / (1024 * 1024)).toFixed(2)} MB` : 'Size Unknown'}
                  </p>
                </div>

                <a
                  href={`/api/media/download?id=${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white border border-dash-border text-dash-textMuted hover:text-dash-text hover:bg-dash-accent/10 transition-all flex items-center justify-center shrink-0"
                >
                  <Download size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

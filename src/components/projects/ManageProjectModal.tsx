'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { DashButton } from '@/components/dashboard-ui/Button';
import {
  getProjectDetail,
  updateProjectDetails,
  createProjectTask,
  updateProjectTaskStatus,
  deleteProjectTask,
  saveProjectSettings,
} from '@/app/actions/projects';
import { getAssignableMembers } from '@/app/actions/tasks';

const STATUS_OPTIONS = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

interface ManageProjectModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageProjectModal({ projectId, isOpen, onClose, onChanged }: ManageProjectModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getProjectDetail(projectId), getAssignableMembers()]).then(([detailRes, membersRes]) => {
      if (cancelled) return;
      if (!detailRes.success) {
        toast.error(detailRes.error || 'Failed to load project.');
        onClose();
        return;
      }
      setDetail(detailRes.data);
      setName(detailRes.data.project.name || '');
      setDescription(detailRes.data.project.description || '');
      setStatus(detailRes.data.project.status || 'planning');
      setStartDate(detailRes.data.project.start_date ? detailRes.data.project.start_date.slice(0, 10) : '');
      setDueDate(detailRes.data.project.due_date ? detailRes.data.project.due_date.slice(0, 10) : '');
      setMembers((membersRes as any).data || []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  const refresh = async () => {
    const detailRes = await getProjectDetail(projectId);
    if (detailRes.success) setDetail(detailRes.data);
    onChanged();
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    const res = await updateProjectDetails(projectId, { name, description, status });
    setSaving(false);
    if (res.success) {
      toast.success('Project updated');
      await refresh();
    } else {
      toast.error(res.error || 'Failed to save changes');
    }
  };

  const handleSaveTimeline = async () => {
    setSavingTimeline(true);
    const existingSettings = detail?.project?.project_settings || {};
    const res = await saveProjectSettings(projectId, {
      show_tasks: existingSettings.show_tasks ?? true,
      show_employee_names: existingSettings.show_employee_names ?? false,
      show_financials: existingSettings.show_financials ?? false,
      start_date: startDate,
      due_date: dueDate,
    });
    setSavingTimeline(false);
    if (res.success) {
      toast.success('Timeline updated');
      await refresh();
    } else {
      toast.error(res.error || 'Failed to save timeline');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const res = await createProjectTask(projectId, { title: newTaskTitle, assignedTo: newTaskAssignee || null });
    if (res.success) {
      setNewTaskTitle('');
      setNewTaskAssignee('');
      await refresh();
    } else {
      toast.error(res.error || 'Failed to add task');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    const res = await updateProjectTaskStatus(projectId, taskId, nextStatus);
    if (res.success) {
      await refresh();
    } else {
      toast.error(res.error || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await deleteProjectTask(projectId, taskId);
    if (res.success) {
      await refresh();
    } else {
      toast.error(res.error || 'Failed to delete task');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] z-[1002] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle>Manage Project Node</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-dash-accent" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold !text-dash-textMuted">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-dash-border bg-white text-sm !text-dash-text"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold !text-dash-textMuted">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold !text-dash-textMuted">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DashButton onClick={handleSaveDetails} disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </DashButton>
            </div>

            <div className="border-t border-dash-border pt-4 space-y-3">
              <h4 className="text-sm font-bold !text-dash-text">Timeline</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold !text-dash-textMuted">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-dash-border bg-white text-sm !text-dash-text"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold !text-dash-textMuted">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-dash-border bg-white text-sm !text-dash-text"
                  />
                </div>
              </div>
              <DashButton onClick={handleSaveTimeline} disabled={savingTimeline} size="sm">
                {savingTimeline ? 'Saving...' : 'Save Timeline'}
              </DashButton>
            </div>

            <div className="border-t border-dash-border pt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="!text-dash-textMuted">Progress ({detail.progress}%)</span>
                <span className="!text-dash-textMuted">{detail.teamSize} team member{detail.teamSize === 1 ? '' : 's'}</span>
              </div>
              <Progress value={detail.progress} className="h-1.5 bg-dash-surface" />
            </div>

            <div className="border-t border-dash-border pt-4 space-y-3">
              <h4 className="text-sm font-bold !text-dash-text">Tasks & Stakeholders</h4>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {detail.tasks.length === 0 && (
                  <p className="text-xs !text-dash-textMuted">No tasks yet — add one below to start tracking progress.</p>
                )}
                {detail.tasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 bg-dash-surface rounded-lg px-3 py-2">
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${task.status === 'done' ? 'bg-dash-accent border-dash-accent text-white' : 'border-dash-border'}`}
                    >
                      {task.status === 'done' && <Check size={12} />}
                    </button>
                    <span className={`flex-1 text-xs font-medium !text-dash-text ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                      {task.title}
                    </span>
                    <span className="text-[10px] !text-dash-textMuted">
                      {task.assignee ? (task.assignee.first_name || task.assignee.email) : 'Unassigned'}
                    </span>
                    <button onClick={() => handleDeleteTask(task.id)} className="!text-dash-textMuted hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New task title..."
                  className="flex-1 h-10 px-3 rounded-lg border border-dash-border bg-white text-xs !text-dash-text"
                />
                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m: any) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.user?.first_name || m.user?.email || m.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DashButton onClick={handleAddTask} size="icon" variant="secondary">
                  <Plus size={16} />
                </DashButton>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2, Check, Star, Upload, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashButton } from '@/components/dashboard-ui/Button';
import {
  getProjectDetail,
  updateProjectDetails,
  createProjectTask,
  updateProjectTaskStatus,
  deleteProjectTask,
  moveProjectTaskToPosition,
  saveProjectSettings,
  uploadProjectDeliverable,
  setDeliverableVisibility,
} from '@/app/actions/projects';
import { getAssignableMembers } from '@/app/actions/tasks';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

const COLUMNS: { id: 'todo' | 'in_progress' | 'review' | 'done'; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

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
  const [newTaskMilestone, setNewTaskMilestone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const title = newTaskTitle.trim();
    if (!title) return;
    const assignedTo = newTaskAssignee;
    const isMilestone = newTaskMilestone;
    // Reset the form immediately (before the request resolves), not in the success branch —
    // otherwise a second Add click fired while the first request is still in flight closes
    // over the same stale newTaskMilestone/newTaskTitle values (confirmed live: two rapid
    // task-adds both ended up is_milestone=true because the reset only ever ran after the
    // first request's round trip completed).
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskMilestone(false);
    const res = await createProjectTask(projectId, { title, assignedTo: assignedTo || null, isMilestone });
    if (res.success) {
      await refresh();
    } else {
      toast.error(res.error || 'Failed to add task');
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

  // Drag-and-drop reorder — optimistic local splice, then delegate the actual position math
  // entirely to move_project_task_to_position (never compute/write position on the client),
  // same shape as Pipelines' KanbanBoard.tsx / Tasks' TasksBoard.tsx onDragEnd handlers.
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const prevTasks = detail.tasks;
    // Optimistic: just flip the dragged task's column for immediate visual feedback — the
    // exact intra-column order is re-synced from the server a moment later via refresh(),
    // same as Pipelines'/Tasks' onDragEnd handlers which also don't hand-roll a full
    // client-side re-sequence.
    const updated = detail.tasks.map((t: any) => (t.id === draggableId ? { ...t, status: destination.droppableId } : t));
    setDetail({ ...detail, tasks: updated });

    const res = await moveProjectTaskToPosition(projectId, draggableId, destination.droppableId as any, destination.index);
    if (!res.success) {
      toast.error(res.error || 'Failed to move task');
      setDetail({ ...detail, tasks: prevTasks });
    } else {
      await refresh();
    }
  };

  const handleUploadDeliverable = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await uploadProjectDeliverable(projectId, formData);
    setUploading(false);
    if (res.success) {
      toast.success('Deliverable uploaded');
      await refresh();
    } else {
      toast.error(res.error || 'Failed to upload deliverable');
    }
  };

  const handleToggleDeliverable = async (fileId: string, next: boolean) => {
    const res = await setDeliverableVisibility(projectId, fileId, next);
    if (res.success) {
      await refresh();
    } else {
      toast.error(res.error || 'Failed to update deliverable');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto z-[1002] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle>Manage Project Node</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-dash-accent" />
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({detail.tasks.length})</TabsTrigger>
              <TabsTrigger value="deliverables">Deliverables ({detail.deliverables.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
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
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New task title..."
                  className="flex-1 min-w-[160px] h-10 px-3 rounded-lg border border-dash-border bg-white text-xs !text-dash-text"
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
                <button
                  type="button"
                  onClick={() => setNewTaskMilestone((v) => !v)}
                  className={cn(
                    'h-10 px-3 rounded-lg border flex items-center gap-1.5 text-[11px] font-semibold shrink-0',
                    newTaskMilestone ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-dash-border !text-dash-textMuted'
                  )}
                  title="Mark as milestone"
                >
                  <Star size={13} className={newTaskMilestone ? 'fill-amber-500 text-amber-500' : ''} /> Milestone
                </button>
                <DashButton onClick={handleAddTask} size="icon" variant="secondary">
                  <Plus size={16} />
                </DashButton>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {COLUMNS.map((col) => {
                    const colTasks = detail.tasks.filter((t: any) => t.status === col.id);
                    return (
                      <div key={col.id} className="bg-dash-surface rounded-xl p-2 flex flex-col min-h-[220px]">
                        <div className="flex items-center justify-between px-1 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider !text-dash-textMuted">{col.label}</span>
                          <span className="text-[10px] !text-dash-textMuted">{colTasks.length}</span>
                        </div>
                        <Droppable droppableId={col.id}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-2 min-h-[60px]">
                              {colTasks.map((task: any, index: number) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(dragProvided) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className="bg-white rounded-lg border border-dash-border px-3 py-2 text-xs shadow-sm space-y-1"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className={cn('font-medium !text-dash-text', task.status === 'done' && 'line-through opacity-60')}>
                                          {task.title}
                                        </span>
                                        <button onClick={() => handleDeleteTask(task.id)} className="!text-dash-textMuted hover:text-danger shrink-0">
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] !text-dash-textMuted">
                                        <span>{task.assignee ? (task.assignee.first_name || task.assignee.email) : 'Unassigned'}</span>
                                        {task.is_milestone && (
                                          <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                                            <Star size={10} className="fill-amber-500 text-amber-500" />
                                            {task.client_approved_at ? 'Approved' : 'Milestone'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
            </TabsContent>

            <TabsContent value="deliverables" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs !text-dash-textMuted">Files marked as deliverables show up in the client portal's project timeline.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDeliverable(file);
                    e.target.value = '';
                  }}
                />
                <DashButton size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload size={14} className="mr-1.5" /> {uploading ? 'Uploading...' : 'Upload File'}
                </DashButton>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {detail.deliverables.length === 0 && (
                  <p className="text-xs !text-dash-textMuted italic">No files uploaded yet.</p>
                )}
                {detail.deliverables.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-3 bg-dash-surface rounded-lg px-3 py-2">
                    <span className="flex-1 text-xs font-medium !text-dash-text truncate">{file.name}</span>
                    <span className="text-[10px] !text-dash-textMuted shrink-0">
                      {file.size ? `${(Number(file.size) / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </span>
                    <button
                      onClick={() => handleToggleDeliverable(file.id, !file.is_client_deliverable)}
                      className={cn(
                        'shrink-0 h-8 px-2.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1',
                        file.is_client_deliverable ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-dash-border !text-dash-textMuted'
                      )}
                    >
                      <ShieldCheck size={12} /> {file.is_client_deliverable ? 'Client-visible' : 'Internal only'}
                    </button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

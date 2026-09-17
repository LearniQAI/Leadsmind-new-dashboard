'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'react-use';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, Clock, Tag, Share2, MoreHorizontal, Trash2, CheckCircle2,
  AlertCircle, ChevronRight, Loader2, ChevronDown, Paperclip, FileText, X, Download
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { PremiumDatePicker } from '@/components/ui/premium-date-picker';
import { RichTextEditor } from './RichTextEditor';
import { AssigneePicker } from './AssigneePicker';
import { ActivityThread } from './ActivityThread';
import { 
  getTaskDetails, updateTask, addTaskComment, toggleTaskAssignee, deleteTask, getAssignableMembers,
  uploadTaskAttachment, deleteTaskAttachment, getAttachmentUrl, getUserRole
} from '@/app/actions/tasks';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface TaskDetailDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

export function TaskDetailDrawer({ taskId, open, onOpenChange, onTaskUpdated }: TaskDetailDrawerProps) {
  const [task, setTask] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadTaskDetails = useCallback(async () => {
    const [taskRes, roleRes] = await Promise.all([
      getTaskDetails(taskId!),
      getUserRole()
    ]);
    if (taskRes.data) {
      setTask(taskRes.data);
      setTitle(taskRes.data.title);
      setDescription(taskRes.data.description || '');
    }
    if (roleRes) setRole(roleRes);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    if (taskId && open) {
      // `loading` defaulted to false and was never set true before this
      // fetch — the render below is `loading && !task ? spinner : task ?
      // content : NotFound`, so for however long getTaskDetails() took,
      // `loading` was false and `task` was still null (or stale from a
      // previously-viewed task), landing on the NotFound branch instead of
      // the spinner. Confirmed live: opening any task briefly flashed "Task
      // Not Found" before its real content appeared. Setting loading here,
      // synchronously before the fetch starts, is what the spinner branch
      // was already designed to key off — and clearing the stale task
      // avoids briefly showing the PREVIOUS task's content when reopening
      // the drawer on a different one.
      setLoading(true);
      setTask(null);
      loadTaskDetails();
      loadMembers();
    }
  }, [taskId, open, loadTaskDetails]);

  async function loadMembers() {
    const res = await getAssignableMembers();
    if (res.data) setMembers(res.data);
  }

  // Auto-save Title
  useDebounce(
    () => {
      if (task && title !== task.title) {
        saveUpdates({ title });
      }
    },
    800,
    [title]
  );

  async function saveUpdates(updates: any) {
    if (!taskId) return;
    const res = await updateTask(taskId, updates);
    if (!res.error) {
      setTask((prev: any) => ({ ...prev, ...updates }));
      onTaskUpdated();
      
      // Success feedback for explicit manual changes
      if (updates.status) toast.success(`Status updated to ${updates.status.replace('_', ' ')}`);
      else if (updates.priority) toast.success(`Priority updated to ${updates.priority}`);
      else if (updates.due_date !== undefined) toast.success(`Due date updated`);
    } else {
      toast.error('Failed to save changes');
    }
  }

  async function handleToggleAssignee(userId: string) {
    if (!task) return;
    
    // Optimistic Update
    const isAssigned = task.assignees.some((a: any) => a.user_id === userId);
    let newAssignees = [...task.assignees];
    
    if (isAssigned) {
      newAssignees = newAssignees.filter((a: any) => a.user_id !== userId);
    } else {
      newAssignees.push({ user_id: userId, profile: { first_name: '...', last_name: '...' } });
    }
    
    setTask({ ...task, assignees: newAssignees });
    
    const res = await toggleTaskAssignee(taskId!, userId);
    if (res.error) {
      toast.error(res.error);
      loadTaskDetails(); // Rollback
    } else {
      onTaskUpdated();
      loadTaskDetails(); // Refresh to get correct profile data
    }
  }

  async function handleAddComment(content: string, mentions: string[] = []) {
    const res = await addTaskComment(taskId!, content, mentions);
    if (res.data) {
      setTask((prev: any) => ({
        ...prev,
        comments: [res.data, ...(prev.comments || [])]
      }));
      onTaskUpdated();
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds the 10MB limit');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await uploadTaskAttachment(taskId, formData);
    if (!res.error) {
      toast.success('File attached');
      loadTaskDetails(); // Refresh to show new attachment
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  }

  async function handleDeleteAttachment(id: string) {
    const res = await deleteTaskAttachment(id);
    if (!res.error) {
      toast.success('File removed');
      loadTaskDetails();
    }
  }

  async function handleDownload(path: string, name: string) {
    const res = await getAttachmentUrl(path);
    if (res.url) {
      window.open(res.url, '_blank');
    } else {
      toast.error('Failed to generate download link');
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return;
    setLoading(true);
    const res = await deleteTask(task.id);
    if (!res.error) {
      toast.success('Task deleted');
      onOpenChange(false);
      onTaskUpdated();
    } else {
      toast.error('Failed to delete task');
    }
    setLoading(false);
    setDeleteConfirmOpen(false);
  };

  if (!taskId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[880px] w-full p-0 overflow-hidden rounded-2xl shadow-2xl bg-white flex flex-col max-h-[85vh]">
          <DialogTitle className="sr-only">{task?.title || 'Task details'}</DialogTitle>
          <DialogDescription className="sr-only">View and edit task details, assignees, due date, and activity.</DialogDescription>

          {loading && !task ? (
            <div className="flex items-center justify-center h-[420px]">
              <Loader2 className="w-8 h-8 text-dash-accent animate-spin motion-reduce:animate-none" />
            </div>
          ) : task ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-dash-border shrink-0">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={role === 'viewer'}>
                      <button className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50">
                        <Badge className={cn(
                          "text-[11px] font-semibold px-2 cursor-pointer transition-all capitalize",
                          task.status === 'done' ? "bg-green/10 text-green border-green/20" :
                          task.status === 'in_progress' ? "bg-dash-accent/10 text-dash-accent border-dash-accent/20" :
                          "bg-dash-surface !text-dash-textMuted border-dash-border"
                        )}>
                          {task.status.replace('_', ' ')}
                          <ChevronDown className="w-2.5 h-2.5 ml-1 opacity-40" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white border-dash-border z-[2100]">
                      {['todo', 'in_progress', 'in_review', 'done'].map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => saveUpdates({ status: s })}
                          className="text-[12px] font-medium py-2 px-4 focus:bg-dash-surface cursor-pointer capitalize"
                        >
                          {s.replace('_', ' ')}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="w-3 h-3 !text-dash-textMuted" />
                  <span className="text-[12px] !text-dash-textMuted font-medium">
                    #{task.id.slice(0, 4)}
                  </span>
                </div>
                <div className="flex items-center gap-1 pr-8">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body: two-column layout, matching the wide centered task-detail
                  pattern of premium SaaS tools (Linear/Height) instead of the
                  previous single-column right-side drawer. */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
                  {/* Left: title, description, attachments, activity */}
                  <div className="p-8 space-y-8 lg:border-r lg:border-dash-border">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={role === 'viewer'}
                      className="w-full bg-transparent text-2xl font-bold !text-dash-text outline-none placeholder:!text-dash-textMuted border-b border-transparent focus:border-dash-border pb-2 transition-all disabled:opacity-50 tracking-tight"
                      placeholder="Task title"
                    />

                    <div className="space-y-4">
                      <Label label="Description" />
                      <RichTextEditor
                        value={description}
                        onChange={(val) => {
                          setDescription(val);
                          saveUpdates({ description: val });
                        }}
                        readOnly={role === 'viewer'}
                      />
                    </div>

                    <Separator className="bg-dash-border" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label label="Attachments" />
                        <label className={cn(
                          "cursor-pointer",
                          (loading || role === 'viewer') && "opacity-50 pointer-events-none"
                        )}>
                          <input type="file" className="hidden" onChange={handleUpload} disabled={loading || role === 'viewer'} />
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dash-surface border border-dash-border hover:bg-dash-border/60 text-[12px] font-semibold !text-dash-textMuted transition-all">
                            {loading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Paperclip className="w-3 h-3" />
                                Add file
                              </>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="space-y-2">
                        {task.attachments?.map((file: any) => (
                          <div key={file.id} className="group flex items-center justify-between p-3 rounded-xl bg-dash-surface border border-dash-border hover:border-dash-border transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-semibold !text-dash-text truncate max-w-[200px]">{file.file_name}</span>
                                <span className="text-[11px] !text-dash-textMuted">
                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB • {format(new Date(file.created_at), 'MMM d, h:mm a')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownload(file.file_path, file.file_name)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {role !== 'viewer' && (
                                <button
                                  onClick={() => handleDeleteAttachment(file.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red/10 !text-dash-textMuted hover:text-red"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {(!task.attachments || task.attachments.length === 0) && (
                          <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-dash-border opacity-30">
                            <Paperclip className="w-8 h-8 mb-2" />
                            <span className="text-[12px] font-medium">No attachments yet</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator className="bg-dash-border" />

                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Label label="Activity" />
                        <div className="px-2 py-0.5 rounded-full bg-dash-surface text-[11px] font-semibold !text-dash-textMuted">
                          {task.comments?.length || 0}
                        </div>
                      </div>
                      <ActivityThread
                        activities={task.activities || []}
                        comments={task.comments || []}
                        onAddComment={handleAddComment}
                        members={members}
                      />
                    </div>
                  </div>

                  {/* Right: properties sidebar */}
                  <div className="p-6 space-y-6 bg-dash-surface/60">
                    <div className="space-y-3">
                      <Label label="Priority" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={role === 'viewer'}>
                          <button className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white border border-dash-border hover:border-dash-border transition-all disabled:opacity-50">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                task.priority === 'high' ? "bg-red" : task.priority === 'medium' ? "bg-amber" : "bg-green"
                              )} />
                              <span className="text-xs font-semibold !text-dash-text capitalize">{task.priority}</span>
                            </div>
                            <ChevronDown className="w-3 h-3 !text-dash-textMuted" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white border-dash-border z-[2100]">
                          {['low', 'medium', 'high'].map((p) => (
                            <DropdownMenuItem
                              key={p}
                              onClick={() => saveUpdates({ priority: p })}
                              className="text-[12px] font-medium py-2 px-4 focus:bg-dash-surface cursor-pointer capitalize"
                            >
                              {p}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3">
                      <PremiumDatePicker
                        date={task.due_date ? new Date(task.due_date) : undefined}
                        setDate={(d) => saveUpdates({ due_date: d ? d.toISOString() : null })}
                        disabled={role === 'viewer'}
                        variant="light"
                        fieldLabel="Due date"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label label="Assignees" />
                      <div className="flex flex-wrap items-center gap-2">
                        {task.assignees?.map((a: any) => (
                          <div key={a.user_id} className="flex items-center gap-2 bg-white border border-dash-border pl-1 pr-2.5 py-1 rounded-full group transition-all">
                            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white bg-dash-surface flex items-center justify-center shrink-0">
                              {a.profile?.avatar_url ? (
                                <img src={a.profile.avatar_url} alt={a.profile?.first_name || 'Assignee avatar'} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] text-dash-accent">{a.profile?.first_name?.[0]}</span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold !text-dash-text">{a.profile?.first_name}</span>
                            <button
                              onClick={() => handleToggleAssignee(a.user_id)}
                              className="w-4 h-4 rounded-full hover:bg-red/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Trash2 className="w-2.5 h-2.5 text-red" />
                            </button>
                          </div>
                        ))}
                        {role !== 'viewer' && (
                          <AssigneePicker currentAssignees={task.assignees} onToggle={handleToggleAssignee} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-dash-surface border-t border-dash-border flex items-center justify-between shrink-0">
                {(role === 'admin' || role === 'manager') ? (
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex items-center gap-2 text-red/60 hover:text-red text-[12px] font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete task
                  </button>
                ) : <div />}
                <span className="text-[11px] !text-dash-textMuted font-medium">
                  #{task.id.slice(0,8)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[420px] p-12 text-center">
              <AlertCircle className="w-12 h-12 !text-dash-textMuted mb-4" />
              <h3 className="!text-dash-text font-semibold">Task not found</h3>
              <p className="!text-dash-textMuted text-sm mt-2">The record might have been deleted or moved.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTask}
        title="Confirm deletion"
        description="You are about to permanently remove this task. This action cannot be reversed."
        confirmLabel="Delete task"
        variant="danger"
      />
    </>
  );
}

function Label({ label }: { label: string }) {
  return (
    <h5 className="text-[12px] font-semibold tracking-wide !text-dash-textMuted">
      {label}
    </h5>
  );
}

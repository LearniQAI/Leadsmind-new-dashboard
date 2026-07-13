'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'react-use';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from '@/components/ui/sheet';
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
      else if (updates.priority) toast.success(`Priority escalated to ${updates.priority}`);
      else if (updates.due_date !== undefined) toast.success(`Deadline recalibrated`);
    } else {
      toast.error('Failed to synchronize changes');
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
      toast.error('File exceeds 10MB tactical limit');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await uploadTaskAttachment(taskId, formData);
    if (!res.error) {
      toast.success('Payload attached successfully');
      loadTaskDetails(); // Refresh to show new attachment
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  }

  async function handleDeleteAttachment(id: string) {
    const res = await deleteTaskAttachment(id);
    if (!res.error) {
      toast.success('Payload decommissioned');
      loadTaskDetails();
    }
  }

  async function handleDownload(path: string, name: string) {
    const res = await getAttachmentUrl(path);
    if (res.url) {
      window.open(res.url, '_blank');
    } else {
      toast.error('Failed to generate secure download link');
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return;
    setLoading(true);
    const res = await deleteTask(task.id);
    if (!res.error) {
      toast.success('Task successfully decommissioned');
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[480px] p-0 flex flex-col h-full bg-white backdrop-blur-xl border-l border-dash-border shadow-[-20px_0_40px_rgba(0,0,0,0.4)]">
          {loading && !task ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-dash-accent animate-spin" />
            </div>
          ) : task ? (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Header Info */}
                <div className="p-8 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={role === 'viewer'}>
                          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50">
                            <Badge className={cn(
                              "text-[10px] font-black px-2 cursor-pointer transition-all",
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
                              className="text-[10px] font-bold tracking-widest py-2 px-4 focus:bg-dash-surface cursor-pointer"
                            >
                              {s.replace('_', ' ')}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="w-3 h-3 !text-dash-textMuted" />
                      <span className="text-[10px] !text-dash-textMuted font-bold tracking-widest">
                        Task-{task.id.slice(0, 4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={role === 'viewer'}
                    className="w-full bg-transparent text-2xl font-bold !text-dash-text outline-none placeholder:!text-dash-textMuted mb-4 border-b border-transparent focus:border-dash-border pb-2 transition-all disabled:opacity-50"
                    placeholder="Task Title"
                  />

                  <div className="grid grid-cols-2 gap-6 mt-8">
                    <div className="space-y-3">
                      <Label label="Priority" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={role === 'viewer'}>
                          <button className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-dash-surface border border-dash-border hover:border-dash-border transition-all disabled:opacity-50">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                task.priority === 'high' ? "bg-red" : task.priority === 'medium' ? "bg-amber" : "bg-green"
                              )} />
                              <span className="text-xs font-bold !text-dash-text capitalize">{task.priority}</span>
                            </div>
                            <ChevronDown className="w-3 h-3 !text-dash-textMuted" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white border-dash-border z-[2100]">
                          {['low', 'medium', 'high'].map((p) => (
                            <DropdownMenuItem 
                              key={p} 
                              onClick={() => saveUpdates({ priority: p })}
                              className="text-[10px] font-bold tracking-widest py-2 px-4 focus:bg-dash-surface cursor-pointer"
                            >
                              {p}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-3">
                      <Label label="Due Date" />
                      <PremiumDatePicker 
                        date={task.due_date ? new Date(task.due_date) : undefined}
                        setDate={(d) => saveUpdates({ due_date: d ? d.toISOString() : null })}
                        disabled={role === 'viewer'}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-dash-surface" />

                {/* Assignees */}
                <div className="p-8 py-6 space-y-4">
                  <Label label="Assigned Team" />
                  <div className="flex flex-wrap items-center gap-3">
                    {task.assignees?.map((a: any) => (
                      <div key={a.user_id} className="flex items-center gap-2 bg-dash-accent/10 border border-dash-accent/20 pl-1 pr-3 py-1 rounded-full group transition-all">
                        <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white bg-dash-surface flex items-center justify-center">
                          {a.profile?.avatar_url ? (
                            <img src={a.profile.avatar_url} alt={a.profile?.first_name || 'Assignee avatar'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-dash-accent">{a.profile?.first_name?.[0]}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-dash-accent">{a.profile?.first_name}</span>
                        <button 
                          onClick={() => handleToggleAssignee(a.user_id)}
                          className="w-4 h-4 rounded-full hover:bg-dash-accent/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-dash-accent" />
                        </button>
                      </div>
                    ))}
                    {role !== 'viewer' && (
                      <AssigneePicker currentAssignees={task.assignees} onToggle={handleToggleAssignee} />
                    )}
                  </div>
                </div>

                <Separator className="bg-dash-surface" />

                {/* Description */}
                <div className="p-8 py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label label="Description" />
                    <span className="text-[10px] !text-dash-textMuted font-bold tracking-widest italic">
                      Real-time sync active
                    </span>
                  </div>
                  <RichTextEditor 
                    value={description} 
                    onChange={(val) => {
                      setDescription(val);
                      saveUpdates({ description: val });
                    }} 
                    readOnly={role === 'viewer'}
                  />
                </div>

                <Separator className="bg-dash-surface" />

                {/* Attachments / Payload */}
                <div className="p-8 py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label label="Payload / Attachments" />
                    <label className={cn(
                      "cursor-pointer",
                      (loading || role === 'viewer') && "opacity-50 pointer-events-none"
                    )}>
                      <input type="file" className="hidden" onChange={handleUpload} disabled={loading || role === 'viewer'} />
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dash-surface border border-dash-border hover:bg-dash-border/60 text-[10px] font-black tracking-widest !text-dash-textMuted transition-all">
                        {loading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-3 h-3" />
                            Attach File
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
                            <span className="text-xs font-bold !text-dash-text truncate max-w-[200px]">{file.file_name}</span>
                            <span className="text-[10px] !text-dash-textMuted tracking-tight">
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
                      <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-dash-border opacity-20">
                        <Paperclip className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold tracking-widest">No Payloads Attached</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-dash-surface" />

                {/* Activity & Comments */}
                <div className="p-8 py-6 space-y-6 flex-1">
                  <div className="flex items-center gap-2">
                    <Label label="Activity Thread" />
                    <div className="px-2 py-0.5 rounded-full bg-dash-surface text-[10px] font-bold !text-dash-textMuted">
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

              {/* Footer Actions */}
              <div className="p-6 bg-dash-surface border-t border-dash-border flex items-center justify-between">
                {(role === 'admin' || role === 'manager') ? (
                  <button 
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex items-center gap-2 text-red/40 hover:text-red text-[11px] font-bold tracking-widest transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="bg-green/10 text-green border-green/20 text-[10px] font-black">
                      ID: {task.id.slice(0,8)}
                   </Badge>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <AlertCircle className="w-12 h-12 !text-dash-textMuted mb-4" />
              <h3 className="!text-dash-textMuted font-bold tracking-widest">Task Not Found</h3>
              <p className="!text-dash-textMuted text-sm mt-2">The record might have been deleted or moved.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
    <h5 className="text-[11px] font-black tracking-[0.2em] !text-dash-textMuted">
      {label}
    </h5>
  );
}

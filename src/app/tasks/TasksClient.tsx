'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
 Check, Clock, AlertCircle, Plus, MoreHorizontal, Pencil, Trash2, Calendar
} from 'lucide-react';
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { updateTaskStatus, updateTask, deleteTask, createTask } from '@/app/actions/tasks';
import { toast } from 'sonner';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = [
 { key: 'todo', label: 'To Do', dot: 'bg-amber-400' },
 { key: 'in_progress', label: 'In Progress', dot: 'bg-primary' },
 { key: 'done', label: 'Done', dot: 'bg-emerald-500' },
];

const priorityColors: Record<string, string> = {
 low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
 medium: 'bg-blue-100 text-blue-700 border-blue-200',
 high: 'bg-amber-100 text-amber-700 border-amber-200',
 urgent: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function TasksClient({ initialTasks }: { initialTasks: any[] }) {
 const [tasks, setTasks] = useState<any[]>(initialTasks);

 // Create/Edit dialog
 const [formOpen, setFormOpen] = useState(false);
 const [editingTask, setEditingTask] = useState<any>(null);
 const [formData, setFormData] = useState({
  title: '', description: '', priority: 'medium', status: 'todo', due_date: ''
 });
 const [saving, setSaving] = useState(false);

 // Delete dialog
 const [deleteOpen, setDeleteOpen] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<any>(null);
 const [deleting, setDeleting] = useState(false);

 const openCreate = (status = 'todo') => {
  setEditingTask(null);
  setFormData({ title: '', description: '', priority: 'medium', status, due_date: '' });
  setFormOpen(true);
 };

 const openEdit = (task: any) => {
  setEditingTask(task);
  setFormData({
   title: task.title || '',
   description: task.description || '',
   priority: task.priority || 'medium',
   status: task.status || 'todo',
   due_date: task.due_date ? task.due_date.split('T')[0] : ''
  });
  setFormOpen(true);
 };

 const handleSave = async () => {
  if (!formData.title.trim()) { toast.error('Task title is required'); return; }
  setSaving(true);
  try {
   if (editingTask) {
    const res = await updateTask(editingTask.id, formData);
    if (res.error) { toast.error(res.error); }
    else {
     toast.success('Task updated!');
     setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...formData } : t));
     setFormOpen(false);
    }
   } else {
    const res = await createTask(formData);
    if (res.error) { toast.error(res.error); }
    else {
     toast.success('Task created!');
     setTasks(prev => [res.data!, ...prev]);
     setFormOpen(false);
    }
   }
  } catch { toast.error('Failed to save'); }
  setSaving(false);
 };

 const handleStatusChange = async (taskId: string, newStatus: string) => {
  const res = await updateTaskStatus(taskId, newStatus);
  if (res.error) { toast.error(res.error); }
  else { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); }
 };

 const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeleting(true);
  const res = await deleteTask(deleteTarget.id);
  if (res.error) { toast.error(res.error); }
  else {
   toast.success('Task deleted');
   setTasks(prev => prev.filter(t => t.id !== deleteTarget.id));
   setDeleteOpen(false);
  }
  setDeleting(false);
 };

 function TaskCard({ task }: { task: any }) {
  return (
   <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm group hover:border-primary/40 hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-2">
     <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColors[task.priority] || priorityColors.medium}`}>
      {task.priority || 'medium'}
     </span>
     <DropdownMenu>
      <DropdownMenuTrigger asChild>
       <button className="text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
        <MoreHorizontal className="w-4 h-4" />
       </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[160px]">
       <DropdownMenuItem onClick={() => openEdit(task)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
        <Pencil size={14} /> Edit Task
       </DropdownMenuItem>
       {STATUSES.filter(s => s.key !== task.status).map(s => (
        <DropdownMenuItem key={s.key} onClick={() => handleStatusChange(task.id, s.key)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 rounded-lg mx-1 px-3 py-2">
         <span className={`w-2 h-2 rounded-full ${s.dot}`} /> Move to {s.label}
        </DropdownMenuItem>
       ))}
       <DropdownMenuItem onClick={() => { setDeleteTarget(task); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
        <Trash2 size={14} /> Delete
       </DropdownMenuItem>
      </DropdownMenuContent>
     </DropdownMenu>
    </div>
    <h4 className="font-bold text-gray-800 mb-1 leading-tight text-sm">{task.title}</h4>
    {task.description && <p className="text-gray-400 text-xs mb-2 line-clamp-2">{task.description}</p>}
    {task.due_date && (
     <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mt-2">
      <Calendar className="w-3 h-3 text-primary" />
      {new Date(task.due_date).toLocaleDateString()}
     </div>
    )}
    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
     <button onClick={() => openEdit(task)} className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
      Edit
     </button>
     <div className="flex gap-1.5">
      {STATUSES.filter(s => s.key !== task.status).map(s => (
       <button key={s.key} onClick={() => handleStatusChange(task.id, s.key)} title={`Move to ${s.label}`}
        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black border hover:scale-110 transition-all ${s.dot} border-transparent text-white`}>
        {s.key === 'done' ? <Check className="w-3 h-3 stroke-[3px]" /> : s.key === 'in_progress' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
       </button>
      ))}
     </div>
    </div>
   </div>
  );
 }

 return (
  <MetaData pageTitle="Tasks">
   <Wrapper>
    <div className="app__slide-wrapper space-y-6">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
      <div>
       <h1 className="card__title !text-4xl uppercase mb-1">Tasks <span className="text-primary">Manager</span></h1>
       <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Organize your workflow and crush your goals</p>
      </div>
      <Button onClick={() => openCreate()} className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
       <Plus className="w-4 h-4 mr-2" /> New Task
      </Button>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {STATUSES.map(col => {
       const colTasks = tasks.filter(t => t.status === col.key);
       return (
        <div key={col.key} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col">
         <div className="flex items-center justify-between mb-4">
          <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2 text-gray-700">
           <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
           {col.label}
          </h3>
          <div className="flex items-center gap-2">
           <span className="text-xs font-black text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{colTasks.length}</span>
           <button onClick={() => openCreate(col.key)} className="w-6 h-6 rounded-lg bg-white border border-gray-200 hover:bg-primary hover:border-primary hover:text-white text-gray-400 flex items-center justify-center transition-all">
            <Plus className="w-3.5 h-3.5" />
           </button>
          </div>
         </div>
         <div className="flex-1 overflow-y-auto space-y-3 max-h-[60vh] pr-1">
          {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
          {colTasks.length === 0 && (
           <button onClick={() => openCreate(col.key)} className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-300 hover:border-primary/40 hover:text-primary/60 transition-all flex flex-col items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Add task</span>
           </button>
          )}
         </div>
        </div>
       );
      })}
     </div>
    </div>

    {/* Create / Edit Dialog */}
    <Dialog open={formOpen} onOpenChange={setFormOpen}>
     <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-lg p-8 shadow-2xl">
      <DialogHeader>
       <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">
        {editingTask ? 'Edit' : 'New'} <span className="text-primary">Task</span>
       </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Title *</Label>
        <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Follow up with client" className="h-12 border-gray-200 rounded-xl" />
       </div>
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</Label>
        <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Any additional context..." className="min-h-[80px] border-gray-200 rounded-xl" />
       </div>
       <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Priority</Label>
         <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
          <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
           {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
         </Select>
        </div>
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status</Label>
         <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
          <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
           {STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
         </Select>
        </div>
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Due Date</Label>
         <Input type="date" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} className="h-12 border-gray-200 rounded-xl" />
        </div>
       </div>
      </div>
      <DialogFooter className="gap-3">
       <Button variant="outline" onClick={() => setFormOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
       <Button onClick={handleSave} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{saving ? 'Saving...' : (editingTask ? 'Save Changes' : 'Create Task')}</Button>
      </DialogFooter>
     </DialogContent>
    </Dialog>

    {/* Delete Dialog */}
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
     <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
      <DialogHeader>
       <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Task?</DialogTitle>
      </DialogHeader>
      <p className="text-gray-500 text-sm py-4">This will permanently delete <strong className="text-gray-800">{deleteTarget?.title}</strong>.</p>
      <DialogFooter className="gap-3">
       <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
       <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
      </DialogFooter>
     </DialogContent>
    </Dialog>
   </Wrapper>
  </MetaData>
 );
}

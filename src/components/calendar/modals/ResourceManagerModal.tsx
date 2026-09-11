'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Armchair, Wrench, Plus, Pencil, Ban, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  listResources,
  createResource,
  updateResource,
  deactivateResource,
  reactivateResource,
  type ResourceType,
} from '@/app/actions/calendar/resources';

interface ResourceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICON: Record<ResourceType, React.ElementType> = { room: Building2, desk: Armchair, equipment: Wrench };
const TYPE_LABEL: Record<ResourceType, string> = { room: 'Room', desk: 'Desk', equipment: 'Equipment' };

interface FormState {
  name: string;
  type: ResourceType;
  location: string;
  capacity: string;
}

const emptyForm: FormState = { name: '', type: 'room', location: '', capacity: '' };

export default function ResourceManagerModal({ isOpen, onClose }: ResourceManagerModalProps) {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listResources(true).then((res) => {
      if (res.success) setResources(res.data);
      else toast.error(res.error || 'Failed to load resources');
      setLoading(false);
    });
  };

  useEffect(() => {
    if (isOpen) {
      load();
      setEditingId(null);
      setForm(emptyForm);
    }
  }, [isOpen]);

  const startAdd = () => {
    setForm(emptyForm);
    setEditingId('new');
  };

  const startEdit = (r: any) => {
    setForm({ name: r.name, type: r.type, location: r.location || '', capacity: r.capacity != null ? String(r.capacity) : '' });
    setEditingId(r.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      location: form.location.trim() || null,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
    };
    const res = editingId === 'new' ? await createResource(payload) : await updateResource(editingId as string, payload);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Failed to save resource');
      return;
    }
    toast.success(editingId === 'new' ? 'Resource added' : 'Resource updated');
    cancelEdit();
    load();
  };

  const handleToggleActive = async (r: any) => {
    const res = r.is_active ? await deactivateResource(r.id) : await reactivateResource(r.id);
    if (!res.success) {
      toast.error(res.error || 'Failed to update resource');
      return;
    }
    toast.success(r.is_active ? `${r.name} deactivated` : `${r.name} reactivated`);
    load();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold !text-dash-text flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-dash-accent/10 flex items-center justify-center text-dash-accent">
              <Building2 size={16} />
            </span>
            Rooms, desks &amp; equipment
          </DialogTitle>
          <p className="text-[12px] !text-dash-textMuted pt-1">
            Manage your workspace's bookable resources. Attach one to a meeting from the booking form — the same time slot
            can never be double-booked for the same resource.
          </p>
        </DialogHeader>

        <div className="py-1 max-h-[60vh] overflow-y-auto space-y-4">
          {(editingId === 'new' || (editingId && resources.some((r) => r.id === editingId))) && (
            <div className="rounded-xl border border-dash-accent/30 bg-dash-accent/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold !text-dash-text">{editingId === 'new' ? 'Add resource' : 'Edit resource'}</span>
                <button onClick={cancelEdit} className="!text-dash-textMuted hover:!text-dash-text">
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold !text-dash-textMuted">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Conference Room A"
                    className="bg-white border-dash-border !text-dash-text h-10 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold !text-dash-textMuted">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ResourceType })}>
                    <SelectTrigger className="bg-white border-dash-border !text-dash-text h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-dash-border z-[1100]">
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="desk">Desk</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold !text-dash-textMuted">Capacity (optional)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="e.g. 8"
                    className="bg-white border-dash-border !text-dash-text h-10 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold !text-dash-textMuted">Location (optional)</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. 3rd floor, west wing"
                    className="bg-white border-dash-border !text-dash-text h-10 mt-1"
                  />
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[12px] h-10"
              >
                {saving ? <Loader2 className="animate-spin motion-reduce:animate-none mr-2" size={14} /> : null}
                {editingId === 'new' ? 'Add resource' : 'Save changes'}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 !text-dash-textMuted">
              <Loader2 className="animate-spin motion-reduce:animate-none" size={20} />
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 rounded-xl border border-dashed border-dash-border bg-dash-surface text-center">
              <Building2 className="h-7 w-7 !text-dash-textMuted mb-2" />
              <p className="text-[12px] font-bold !text-dash-textMuted">No resources yet</p>
              <p className="text-[11px] !text-dash-textMuted mt-1">Add a room, desk, or piece of equipment to start attaching it to meetings.</p>
            </div>
          ) : (
            <div className="bg-white border border-dash-border rounded-xl overflow-hidden divide-y divide-dash-border">
              {resources.map((r) => {
                const Icon = TYPE_ICON[r.type as ResourceType] ?? Building2;
                return (
                  <div key={r.id} className={cn('px-4 py-3 flex items-center justify-between gap-3', !r.is_active && 'opacity-50')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-dash-surface flex items-center justify-center !text-dash-textMuted shrink-0">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold !text-dash-text truncate">{r.name}</p>
                        <p className="text-[11px] !text-dash-textMuted truncate">
                          {TYPE_LABEL[r.type as ResourceType] ?? r.type}
                          {r.capacity ? ` · seats ${r.capacity}` : ''}
                          {r.location ? ` · ${r.location}` : ''}
                          {!r.is_active ? ' · inactive' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(r)} className="p-1.5 !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-colors motion-reduce:transition-none" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(r)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors motion-reduce:transition-none',
                          r.is_active ? '!text-dash-textMuted hover:!text-red hover:bg-red/5' : '!text-dash-textMuted hover:!text-green hover:bg-green/5'
                        )}
                        title={r.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {r.is_active ? <Ban size={14} /> : <RotateCcw size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {editingId === null && (
            <Button
              onClick={startAdd}
              variant="outline"
              className="w-full bg-white border-dash-border !text-dash-textMuted hover:!text-dash-text text-[12px] font-bold h-10"
            >
              <Plus size={14} className="mr-2" /> Add resource
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

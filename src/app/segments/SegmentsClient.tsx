'use client';

import React, { useState } from 'react';
import { Plus, Users, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SegmentRuleBuilder } from '@/components/crm/SegmentRuleBuilder';
import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { createSegment, updateSegment, deleteSegment } from '@/app/actions/segments';

interface SegmentRow {
  id: string;
  name: string;
  rule_group: RuleGroup;
  memberCount: number | null;
  created_at: string;
}

export default function SegmentsClient({ initialSegments }: { initialSegments: SegmentRow[] }) {
  const [segments, setSegments] = useState<SegmentRow[]>(initialSegments);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SegmentRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formRuleGroup, setFormRuleGroup] = useState<RuleGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SegmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingSegment(null);
    setFormName('');
    setFormRuleGroup(null);
    setFormOpen(true);
  };

  const openEdit = (segment: SegmentRow) => {
    setEditingSegment(segment);
    setFormName(segment.name);
    setFormRuleGroup(segment.rule_group);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Please enter a segment name'); return; }
    if (!formRuleGroup || formRuleGroup.rules.length === 0) { toast.error('Add at least one condition'); return; }

    setSaving(true);
    try {
      const res = editingSegment
        ? await updateSegment(editingSegment.id, { name: formName.trim(), ruleGroup: formRuleGroup })
        : await createSegment({ name: formName.trim(), ruleGroup: formRuleGroup });

      if (!res.success) { toast.error(res.error || 'Failed to save segment'); return; }

      toast.success(editingSegment ? 'Segment updated!' : 'Segment created!');
      setSegments((prev) => {
        if (editingSegment) {
          return prev.map((s) => (s.id === editingSegment.id ? { ...s, ...res.data, memberCount: null } : s));
        }
        return [{ ...res.data, memberCount: null }, ...prev];
      });
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteSegment(deleteTarget.id);
      if (!res.success) { toast.error(res.error || 'Failed to delete segment'); return; }
      toast.success('Segment deleted');
      setSegments((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight !text-dash-text">Segments</h1>
          <p className="text-sm !text-dash-textMuted font-medium">
            Save reusable rule-based contact segments to target in campaigns
          </p>
        </div>
        <DashButton onClick={openCreate}>
          <Plus size={14} /> New Segment
        </DashButton>
      </div>

      {segments.length === 0 ? (
        <DashEmptyState
          icon={Users}
          title="No segments yet"
          description="Create a rule-based segment to reuse as a saved audience across campaigns"
          actionLabel="New Segment"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <DashCard key={segment.id} className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-10 w-10 rounded-xl bg-dash-accent/10 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-dash-accent" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface">
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl p-2 min-w-[140px]">
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2 hover:bg-dash-surface rounded-lg p-2 font-bold"
                      onClick={() => openEdit(segment)}
                    >
                      <Pencil size={14} /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2 hover:bg-red/10 rounded-lg p-2 font-bold text-red"
                      onClick={() => setDeleteTarget(segment)}
                    >
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm font-bold !text-dash-text mb-1">{segment.name}</p>
              <p className="text-[11px] !text-dash-textMuted font-semibold">
                {segment.memberCount === null ? 'Count unavailable' : `${segment.memberCount} contact${segment.memberCount === 1 ? '' : 's'}`}
              </p>
              <p className="text-[11px] !text-dash-textMuted mt-1">
                {segment.rule_group.rules.length} condition{segment.rule_group.rules.length === 1 ? '' : 's'} ({segment.rule_group.logic})
              </p>
            </DashCard>
          ))}
        </div>
      )}

      <DashModal open={formOpen} onOpenChange={setFormOpen}>
        <DashModalContent className="max-w-2xl">
          <DashModalHeader>
            <DashModalTitle>{editingSegment ? 'Edit Segment' : 'New Segment'}</DashModalTitle>
          </DashModalHeader>
          <div className="space-y-4 px-1">
            <DashFormField label="Segment name">
              <DashInput
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. VIP customers"
              />
            </DashFormField>
            <DashFormField label="Conditions">
              <SegmentRuleBuilder value={formRuleGroup} onChange={setFormRuleGroup} />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setFormOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingSegment ? 'Save changes' : 'Create segment'}
            </DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Segment?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Campaigns using it will no longer resolve this audience.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

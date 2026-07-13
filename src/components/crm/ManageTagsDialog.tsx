'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { globalRenameTag, globalDeleteTag, createRegistryTag } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tags, Tag as TagIcon, Plus, SquarePen, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ManageTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tags: { id: string; name: string; count: number }[];
}

export function ManageTagsDialog({ isOpen, onClose, tags }: ManageTagsDialogProps) {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [createName, setCreateName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreate = async () => {
    if (!createName.trim()) return;

    setIsProcessing(true);
    const res = await createRegistryTag(createName.trim());
    if (res.success) {
      toast.success(`Strategic tag "${createName}" created`);
      setCreateName('');
    } else {
      toast.error(res.error || 'Failed to create tag');
    }
    setIsProcessing(false);
  };

  const handleRename = async (oldTag: string) => {
    if (!newName.trim() || newName === oldTag) {
      setEditingTag(null);
      return;
    }

    setIsProcessing(true);
    const res = await globalRenameTag(oldTag, newName.trim());
    if (res.success) {
      toast.success(`Tag renamed to "${newName}"`);
      setEditingTag(null);
      setNewName('');
    } else {
      toast.error(res.error || 'Failed to rename tag');
    }
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;

    setIsProcessing(true);
    const res = await globalDeleteTag(tagToDelete);
    if (res.success) {
      toast.success(`Tag "${tagToDelete}" deleted globally`);
      setTagToDelete(null);
    } else {
      toast.error(res.error || 'Failed to delete tag');
    }
    setIsProcessing(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="z-[1002] bg-white border-dash-border !text-dash-text max-w-md p-0 overflow-hidden rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-4 border-b border-dash-border">
            <DialogTitle className="text-xl font-extrabold tracking-tight !text-dash-text flex items-center gap-3">
              <Tags className="text-dash-accent" size={18} />
              Manage Strategic Tags
            </DialogTitle>
          </DialogHeader>

          {/* CREATE TAG SECTION */}
          <div className="p-4 border-b border-dash-border bg-dash-surface">
            <div className="flex gap-2">
              <input
                placeholder="Enter new strategic tag..."
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 bg-white border border-dash-border rounded-xl px-4 py-2 text-[13px] !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-all"
              />
              <DashButton
                onClick={handleCreate}
                disabled={isProcessing || !createName.trim()}
                size="sm"
                className="h-[38px]"
              >
                <Plus size={14} />
                Create
              </DashButton>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto p-4 space-y-2 no-scrollbar">
            {tags.length === 0 ? (
              <div className="py-12 text-center">
                <TagIcon className="text-dash-border mb-3 mx-auto" size={30} />
                <p className="text-sm !text-dash-textMuted">No tags found in the database.</p>
              </div>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group flex items-center justify-between p-3 rounded-xl bg-dash-surface border border-dash-border hover:border-dash-text/10 transition-all"
                >
                  <div className="flex-1 mr-4">
                    {editingTag === tag.name ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(tag.name)}
                          className="flex-1 bg-white border border-dash-accent/30 rounded-lg px-3 py-1.5 text-[13px] !text-dash-text focus:outline-none focus:border-dash-accent transition-all"
                        />
                        <button
                          onClick={() => handleRename(tag.name)}
                          disabled={isProcessing}
                          className="px-3 rounded-lg bg-dash-accent text-white text-[11px] font-bold disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="px-3 rounded-lg bg-dash-border/60 text-dash-textMuted text-[11px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold !text-dash-text">{tag.name}</span>
                        <span className="text-[10px] font-bold text-dash-textMuted bg-dash-border/50 px-2 py-0.5 rounded-full">
                          {tag.count} leads
                        </span>
                      </div>
                    )}
                  </div>

                  {!editingTag && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingTag(tag.name);
                          setNewName(tag.name);
                        }}
                        className="p-2 rounded-lg text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 transition-all"
                        title="Rename"
                      >
                        <SquarePen size={13} />
                      </button>
                      <button
                        onClick={() => setTagToDelete(tag.name)}
                        className="p-2 rounded-lg text-dash-textMuted hover:text-red hover:bg-red/10 transition-all"
                        title="Delete Globally"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-6 pt-2 border-t border-dash-border bg-dash-surface/60">
            <p className="text-[11px] !text-dash-textMuted leading-relaxed italic text-center">
              Global actions will update all contacts across the entire Relationship Hub instantly.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={handleDelete}
        title="Global Tag Deletion"
        description={`You are about to permanently remove the "${tagToDelete}" tag from all contacts in your database. This tactical operation cannot be reversed.`}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />
    </>
  );
}
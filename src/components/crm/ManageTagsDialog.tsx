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
        <DialogContent className="z-[1002] bg-[#0b0f1a] border-white/5 text-[#eef2ff] max-w-md p-0 overflow-hidden rounded-3xl shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-white/5">
            <DialogTitle className="text-xl font-extrabold font-space tracking-tight text-white flex items-center gap-3">
              <i className="fa-solid fa-tags text-[#2563eb]"></i>
              Manage Strategic Tags
            </DialogTitle>
          </DialogHeader>

          {/* CREATE TAG SECTION */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex gap-2">
              <input 
                placeholder="Enter new strategic tag..."
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[13px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb] transition-all font-dm-sans"
              />
              <button 
                onClick={handleCreate}
                disabled={isProcessing || !createName.trim()}
                className="h-[38px] px-4 rounded-xl bg-[#2563eb] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#2563eb]/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i>
                Create
              </button>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto p-4 space-y-2 no-scrollbar">
            {tags.length === 0 ? (
              <div className="py-12 text-center">
                <i className="fa-solid fa-tag text-3xl text-white/10 mb-3 block"></i>
                <p className="text-sm text-white/30 font-dm-sans">No tags found in the database.</p>
              </div>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex-1 mr-4">
                    {editingTag === tag.name ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(tag.name)}
                          className="flex-1 bg-white/5 border border-[#2563eb]/30 rounded-lg px-3 py-1.5 text-[13px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb] transition-all"
                        />
                        <button
                          onClick={() => handleRename(tag.name)}
                          disabled={isProcessing}
                          className="px-3 rounded-lg bg-[#2563eb] text-white text-[11px] font-bold uppercase tracking-widest disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="px-3 rounded-lg bg-white/5 text-white/60 text-[11px] font-bold uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-[#eef2ff] font-dm-sans">{tag.name}</span>
                        <span className="text-[10px] font-bold text-[#4a5a82] bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
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
                        className="p-2 rounded-lg text-[#4a5a82] hover:text-[#2563eb] hover:bg-[#2563eb]/10 transition-all"
                        title="Rename"
                      >
                        <i className="fa-solid fa-pen-to-square text-[13px]"></i>
                      </button>
                      <button
                        onClick={() => setTagToDelete(tag.name)}
                        className="p-2 rounded-lg text-[#4a5a82] hover:text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete Globally"
                      >
                        <i className="fa-solid fa-trash-can text-[13px]"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-6 pt-2 border-t border-white/5 bg-white/[0.01]">
            <p className="text-[11px] text-[#4a5a82] leading-relaxed italic text-center">
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
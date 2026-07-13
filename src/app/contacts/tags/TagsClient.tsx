'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Tag as TagIcon, MoreHorizontal } from 'lucide-react';
import { globalDeleteTag, globalRenameTag } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput } from '@/components/dashboard-ui/FormField';

interface TagData {
 id: string;
 name: string;
 count: number;
}

export default function TagsClient({ initialTags }: { initialTags: TagData[] }) {
 const [isProcessing, setIsProcessing] = useState(false);
 const [confirmConfig, setConfirmConfig] = useState<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
 } | null>(null);

 const [renameConfig, setRenameConfig] = useState<{
  isOpen: boolean;
  oldTag: string;
  newName: string;
 } | null>(null);

 const handleDelete = async (tag: string) => {
  setConfirmConfig({
   isOpen: true,
   title: 'Delete Tag?',
   description: `Are you sure you want to delete the tag "${tag}"? This will remove it from all contacts.`,
   confirmLabel: 'Delete',
   onConfirm: async () => {
    setIsProcessing(true);
    try {
     const res = await globalDeleteTag(tag);
     if (res.error) throw new Error(res.error);
     toast.success(`Tag "${tag}" deleted successfully.`);
    } catch (error: any) {
     toast.error(error.message || 'Failed to delete tag');
    } finally {
     setIsProcessing(false);
    }
   }
  });
 };

 const handleRename = (oldTag: string) => {
  setRenameConfig({
   isOpen: true,
   oldTag,
   newName: oldTag
  });
 };

 if (initialTags.length === 0) {
  return (
   <div className="py-20 text-center">
    <TagIcon size={40} className="mx-auto text-dash-accent/30 mb-4" />
    <p className="!text-dash-textMuted font-bold">No tags created yet</p>
   </div>
  );
 }

 return (
  <div className="grid gap-4">
   {initialTags.map((tag) => (
    <div key={tag.name} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-dash-border shadow-sm hover:border-dash-accent/30 transition-colors motion-reduce:transition-none">
     <div className="flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-dash-accent/10 flex items-center justify-center">
       <TagIcon size={18} className="text-dash-accent" />
      </div>
      <div>
       <p className="text-sm font-bold !text-dash-text">{tag.name}</p>
       <p className="text-[11px] !text-dash-textMuted font-semibold">{tag.count} contacts</p>
      </div>
     </div>

     <div className="flex items-center gap-2">
      <DropdownMenu>
       <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 !text-dash-textMuted hover:!text-dash-text" disabled={isProcessing}>
         <MoreHorizontal size={16} />
        </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl p-2 min-w-[140px]">
        <DropdownMenuItem
         className="cursor-pointer flex items-center gap-2 hover:bg-dash-surface rounded-lg p-2 font-bold text-dash-accent"
         onClick={() => handleRename(tag.name)}
        >
         <Edit2 size={14} className="text-dash-accent/70" />
         <span>Rename tag</span>
        </DropdownMenuItem>
        <DropdownMenuItem
         className="cursor-pointer flex items-center gap-2 hover:bg-red/10 rounded-lg p-2 font-bold text-red"
         onClick={() => handleDelete(tag.name)}
        >
         <Trash2 size={14} />
         <span>Delete tag</span>
        </DropdownMenuItem>
       </DropdownMenuContent>
      </DropdownMenu>
     </div>
    </div>
   ))}
   {confirmConfig && (
    <ConfirmDialog
     isOpen={confirmConfig.isOpen}
     onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
     onConfirm={confirmConfig.onConfirm}
     title={confirmConfig.title}
     description={confirmConfig.description}
     confirmLabel={confirmConfig.confirmLabel}
     variant="danger"
    />
   )}

   {renameConfig && (
    <Dialog open={renameConfig.isOpen} onOpenChange={(open) => setRenameConfig(prev => prev ? { ...prev, isOpen: open } : null)}>
     <DialogContent className="bg-white border-dash-border !text-dash-text max-w-sm rounded-2xl shadow-xl p-6 z-[1001]">
      <DialogHeader>
       <DialogTitle className="text-lg font-bold !text-dash-text">Rename tag</DialogTitle>
       <DialogDescription className="text-xs !text-dash-textMuted">
        Rename tag "{renameConfig.oldTag}" across all contacts.
       </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
       <DashInput
        autoFocus
        type="text"
        value={renameConfig.newName}
        onChange={(e) => setRenameConfig(prev => prev ? { ...prev, newName: e.target.value } : null)}
        placeholder="Enter new tag name..."
       />
      </div>
      <DialogFooter className="flex gap-2">
       <DashButton type="button" variant="secondary" className="flex-1" onClick={() => setRenameConfig(null)}>
        Cancel
       </DashButton>
       <DashButton
        type="button"
        variant="primary"
        className="flex-1"
        disabled={!renameConfig.newName.trim() || renameConfig.newName.trim() === renameConfig.oldTag}
        onClick={async () => {
         const targetName = renameConfig.newName.trim();
         setRenameConfig(null);
         setIsProcessing(true);
         try {
          const res = await globalRenameTag(renameConfig.oldTag, targetName);
          if (res.error) throw new Error(res.error);
          toast.success(`Tag renamed to "${targetName}".`);
         } catch (error: any) {
          toast.error(error.message || 'Failed to rename tag');
         } finally {
          setIsProcessing(false);
         }
        }}
       >
        Rename
       </DashButton>
      </DialogFooter>
     </DialogContent>
    </Dialog>
   )}
  </div>
 );
}

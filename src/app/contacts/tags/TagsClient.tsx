'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Tag as TagIcon, MoreHorizontal } from 'lucide-react';
import { globalDeleteTag, globalRenameTag } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
    <TagIcon size={40} className="mx-auto text-primary/30 mb-4" />
    <p className="text-primary/70 font-bold uppercase tracking-widest">No tags created yet</p>
   </div>
  );
 }

 return (
  <div className="grid gap-4">
   {initialTags.map((tag) => (
    <div key={tag.name} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-borderLight shadow-sm hover:border-primary/30 transition-all">
     <div className="flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
       <TagIcon size={18} className="text-primary" />
      </div>
      <div>
       <p className="text-sm font-bold text-primary uppercase tracking-tight">{tag.name}</p>
       <p className="text-[10px] text-primary/50 font-bold uppercase tracking-widest">{tag.count} contacts</p>
      </div>
     </div>
     
     <div className="flex items-center gap-2">
      <DropdownMenu>
       <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary/40 hover:text-primary" disabled={isProcessing}>
         <MoreHorizontal size={16} />
        </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl p-2 min-w-[140px]">
        <DropdownMenuItem 
         className="cursor-pointer flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 font-bold text-[#1359FF]"
         onClick={() => handleRename(tag.name)}
        >
         <Edit2 size={14} className="text-[#1359FF]/70" />
         <span>Rename Tag</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
         className="cursor-pointer flex items-center gap-2 hover:bg-rose-50 rounded-lg p-2 font-bold text-rose-500"
         onClick={() => handleDelete(tag.name)}
        >
         <Trash2 size={14} />
         <span>Delete Tag</span>
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
     <DialogContent className="bg-[#0b0f1a] border-white/5 text-[#eef2ff] max-w-sm rounded-3xl shadow-2xl p-6 z-[1001]">
      <DialogHeader>
       <DialogTitle className="text-lg font-bold font-space text-white uppercase">Rename Tag</DialogTitle>
       <DialogDescription className="text-xs text-[#4a5a82]">
        Rename tag "{renameConfig.oldTag}" across all contacts.
       </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
       <input
        autoFocus
        type="text"
        value={renameConfig.newName}
        onChange={(e) => setRenameConfig(prev => prev ? { ...prev, newName: e.target.value } : null)}
        placeholder="Enter new tag name..."
        className="w-full bg-[#04091a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none transition"
       />
      </div>
      <DialogFooter className="flex gap-2">
       <button
        type="button"
        onClick={() => setRenameConfig(null)}
        className="flex-1 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition"
       >
        Cancel
       </button>
       <button
        type="button"
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
        className="flex-1 py-2 bg-primary hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
       >
        Rename
       </button>
      </DialogFooter>
     </DialogContent>
    </Dialog>
   )}
  </div>
 );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Tag as TagIcon, MoreHorizontal } from 'lucide-react';
import { globalDeleteTag, globalRenameTag } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TagData {
 id: string;
 name: string;
 count: number;
}

export default function TagsClient({ initialTags }: { initialTags: TagData[] }) {
 const [isProcessing, setIsProcessing] = useState(false);

 const handleDelete = async (tag: string) => {
  if (!confirm(`Are you sure you want to delete the tag "${tag}"? This will remove it from all contacts.`)) return;
  
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
 };

 const handleRename = async (oldTag: string) => {
  const newTag = window.prompt(`Rename tag "${oldTag}" to:`, oldTag);
  if (!newTag || newTag === oldTag || newTag.trim() === '') return;
  
  setIsProcessing(true);
  try {
   const res = await globalRenameTag(oldTag, newTag.trim());
   if (res.error) throw new Error(res.error);
   toast.success(`Tag renamed to "${newTag.trim()}".`);
  } catch (error: any) {
   toast.error(error.message || 'Failed to rename tag');
  } finally {
   setIsProcessing(false);
  }
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
  </div>
 );
}

'use client';

import { useState } from 'react';
import { ContactNote } from '@/types/crm.types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createNote, deleteNote } from '@/app/actions/contacts';
import { format } from 'date-fns';
import { Trash2, MessageSquare, Plus } from 'lucide-react';

interface NotesSectionProps {
 contactId: string;
 notes: ContactNote[];
}

export function NotesSection({ contactId, notes }: NotesSectionProps) {
 const [content, setContent] = useState('');
 const [isPending, setIsPending] = useState(false);

 async function handleAddNote() {
  if (!content.trim()) return;
  setIsPending(true);
  try {
   const result = await createNote({ contactId, content });
   if (result.success) {
    toast.success('Note added');
    setContent('');
   } else {
    toast.error(result.error);
   }
  } catch {
   toast.error('Failed to add note');
  } finally {
   setIsPending(false);
  }
 }

 async function handleDeleteNote(id: string) {
  try {
   const result = await deleteNote(id, contactId);
   if (result.success) {
    toast.success('Note deleted');
   } else {
    toast.error(result.error);
   }
  } catch {
   toast.error('Failed to delete note');
  }
 }

 return (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
   <div className="card__wrapper no-height p-6">
    <textarea 
     placeholder="Jot down important details about this interaction..." 
     value={content}
     onChange={(e) => setContent(e.target.value)}
     className="w-full bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-2xl min-h-[140px] outline-none focus:border-primary/30 transition-all p-5 font-bold text-xs leading-relaxed"
    />
    <div className="flex justify-end mt-4">
     <button 
      onClick={handleAddNote} 
      disabled={isPending || !content.trim()}
      className="btn btn-md btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest gap-2 shadow-lg shadow-primary/20"
     >
      <Plus size={14} />
      Append Note
     </button>
    </div>
   </div>

   <div className="space-y-4">
    {notes.map((note) => (
     <div key={note.id} className="card__wrapper no-height group relative hover:border-white/10 transition-all">
       <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/5 transition-transform group-hover:scale-110">
           <MessageSquare size={16} className="text-primary" />
          </div>
          <div className="flex flex-col">
           <span className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em]">
            Internal Briefing
           </span>
           <span className="text-[9px] text-white/10 font-bold uppercase tracking-widest mt-0.5">
            {format(new Date(note.created_at), 'MMM d, yyyy · HH:mm')}
           </span>
          </div>
        </div>
        <button 
         className="btn btn-icon btn-sm btn-outline-theme-border !rounded-lg text-white/10 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
         onClick={() => handleDeleteNote(note.id)}
        >
         <Trash2 size={14} />
        </button>
       </div>
       <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-bold">
         "{note.content}"
        </p>
       </div>
     </div>
    ))}
    {notes.length === 0 && (
     <div className="flex flex-col items-center justify-center py-20 text-white/5 border-2 border-dashed border-white/[0.02] rounded-3xl">
       <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Notes Captured</p>
     </div>
    )}
   </div>
  </div>
 );
}


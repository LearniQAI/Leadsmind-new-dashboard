'use client';

import React, { useState } from 'react';
import { ContactNote } from '@/types/crm';
import { createNote, deleteNote } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface NotesManagerProps {
  contactId: string;
  notes: ContactNote[];
}

export function NotesManager({ contactId, notes }: NotesManagerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAddNote = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    const res = await createNote({ contactId, content });
    if (res.success) {
      toast.success('Note added');
      setContent('');
    } else {
      toast.error(res.error || 'Failed to add note');
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteNote(deleteId, contactId);
    if (res.success) toast.success('Note deleted');
    else toast.error('Failed to delete note');
    setDeleteId(null);
  };

  return (
    <div className="space-y-8">
      {/* Input Area */}
      <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-4 focus-within:border-[#2563eb]/40 transition-all">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Log a tactical note or strategic relationship insight..."
          className="w-full bg-transparent border-none text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] resize-none min-h-[100px] p-2 focus:outline-none focus:ring-0 font-dm-sans"
        />
        <div className="flex justify-end pt-3">
          <button
            onClick={handleAddNote}
            disabled={isSubmitting || !content.trim()}
            className="h-9 px-6 rounded-lg bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20 disabled:opacity-50"
          >
            <i className="fa-solid fa-plus text-[12px]"></i>
            Add Note
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-[12px] text-[#4a5a82] italic font-dm-sans">No notes recorded for this contact.</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-[#080f28] border border-white/5 rounded-[16px] p-5 hover:border-white/10 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#4a5a82]">
                    <i className="fa-solid fa-note-sticky text-[13px]"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#eef2ff] uppercase tracking-widest font-space-grotesk">Insight</span>
                    <p className="text-[10px] text-[#4a5a82] font-medium font-dm-sans">{format(new Date(note.created_at), 'MMM dd, yyyy · hh:mm a')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeleteId(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#4a5a82] hover:text-red-400 transition-all p-1"
                >
                  <i className="fa-solid fa-trash-can text-[12px]"></i>
                </button>
              </div>
              <p className="text-[13.5px] text-[#94a3c8] leading-relaxed font-dm-sans whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Purge Relationship Insight?"
        description="You are about to permanently delete this tactical note. This action cannot be reversed and the insight will be purged from the relationship history."
        confirmLabel="Purge Note"
        variant="danger"
      />
    </div>
  );
}

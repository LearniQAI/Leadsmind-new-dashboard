'use client';

import React, { useState } from 'react';
import { ContactNote } from '@/types/crm';
import { createNote, deleteNote } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, StickyNote, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';

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
      <div className="bg-dash-surface border border-dash-border rounded-2xl p-4 focus-within:border-dash-accent/40 transition-all">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Log a tactical note or strategic relationship insight..."
          className="w-full bg-transparent border-none text-[13.5px] !text-dash-text placeholder:text-dash-textMuted resize-none min-h-[100px] p-2 focus:outline-none focus:ring-0"
        />
        <div className="flex justify-end pt-3">
          <DashButton
            onClick={handleAddNote}
            disabled={isSubmitting || !content.trim()}
            size="sm"
          >
            <Plus size={12} />
            Add Note
          </DashButton>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-[12px] !text-dash-textMuted italic">No notes recorded for this contact.</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white border border-dash-border rounded-2xl p-5 hover:shadow-md transition-all motion-reduce:transition-none group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-dash-surface flex items-center justify-center text-dash-textMuted">
                    <StickyNote size={13} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold !text-dash-text">Insight</span>
                    <p className="text-[10px] !text-dash-textMuted font-medium">{format(new Date(note.created_at), 'MMM dd, yyyy · hh:mm a')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-dash-textMuted hover:text-red transition-all p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="text-[13.5px] !text-dash-textMuted leading-relaxed whitespace-pre-wrap">
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

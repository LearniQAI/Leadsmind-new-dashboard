'use client';

import React, { useState } from 'react';
import { addContactNote } from '@/app/actions/contact-workspace';
import { Clock, Send, FileText, User, RefreshCw, Link as LinkIcon, Loader2 } from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  auth_user?: { email: string };
  metadata?: any;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  auth_user?: { email: string };
}

export function ContactTimeline({ contactId, activities, notes }: { contactId: string, activities: Activity[], notes: Note[] }) {
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(false);

  const timeline = [
    ...activities.map(a => ({ ...a, isNote: false })),
    ...notes.map(n => ({ ...n, type: 'note', description: n.content, isNote: true }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setLoading(true);
    await addContactNote(contactId, noteContent);
    setNoteContent('');
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'note': return <FileText size={14} className="text-blue-400" />;
      case 'status_change': return <RefreshCw size={14} className="text-emerald-400" />;
      case 'crm_push': return <LinkIcon size={14} className="text-purple-400" />;
      default: return <Clock size={14} className="text-t4" />;
    }
  };

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-8 flex flex-col h-[600px]">
      <h3 className="text-lg font-space font-bold text-white mb-6 flex items-center gap-2">
        <Clock className="text-accent" /> Relationship Timeline
      </h3>

      <div className="flex-1 overflow-y-auto pr-4 space-y-6 relative custom-scrollbar">
        <div className="absolute top-0 bottom-0 left-[19px] w-px bg-white/5" />
        
        {timeline.length === 0 ? (
          <p className="text-t4 text-sm text-center pt-8">No relationship activity recorded yet.</p>
        ) : (
          timeline.map((item, i) => (
            <div key={item.id} className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-full bg-n900 border border-white/10 flex items-center justify-center shrink-0 z-10 relative">
                {getIcon(item.type)}
              </div>
              <div className="pt-1 w-full">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-xs font-bold text-t3 flex items-center gap-2">
                    <User size={12} className="text-t4" /> 
                    {item.auth_user?.email?.split('@')[0] || 'System'}
                  </span>
                  <span className="text-[10px] text-t4 uppercase tracking-widest font-semibold">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                
                {item.isNote ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white mt-2 leading-relaxed">
                    {item.description}
                  </div>
                ) : (
                  <p className="text-sm text-t2 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddNote} className="mt-6 pt-6 border-t border-white/10 relative">
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Log outreach attempt, note, or call details..."
          className="w-full bg-n900 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent resize-none h-24"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute bottom-3 right-3 p-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

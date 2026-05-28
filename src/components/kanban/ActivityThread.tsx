'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Clock, UserPlus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';

interface ActivityThreadProps {
  activities: any[];
  comments: any[];
  onAddComment: (content: string, mentions: string[]) => void;
  members?: any[];
}

export function ActivityThread({ activities, comments, onAddComment, members = [] }: ActivityThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  // Combine and sort by date
  const timeline = [
    ...activities.map(a => ({ ...a, itemType: 'activity' })),
    ...comments.map(c => ({ ...c, itemType: 'comment' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setNewComment(val);
    setCursorPos(pos);

    // Check for @ trigger
    const lastAt = val.lastIndexOf('@', pos - 1);
    if (lastAt !== -1) {
      const search = val.substring(lastAt + 1, pos);
      if (!search.includes(' ')) {
        setMentionSearch(search);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  };

  const insertMention = (member: any) => {
    const lastAt = newComment.lastIndexOf('@', cursorPos - 1);
    const before = newComment.substring(0, lastAt);
    const after = newComment.substring(cursorPos);
    
    // Store as @[USER_ID] for robust server parsing
    setNewComment(`${before}@[${member.user_id}]${after} `);
    setShowMentionPicker(false);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    
    // Extract mention IDs from @[UUID] format
    const mentionRegex = /@\[([a-fA-F0-9-]{36})\]/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      mentions.push(match[1]);
    }

    await onAddComment(newComment, mentions);
    setNewComment('');
    setSubmitting(false);
  };

  const filteredMembers = members.filter(m => 
    m.user?.first_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    m.user?.last_name?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const renderContent = (content: string) => {
    if (!content) return null;
    
    // Regex to find @[UUID] format and replace with names for display
    const mentionRegex = /@\[([a-fA-F0-9-]{36})\]/g;
    const parts = content.split(mentionRegex);
    
    // The split with capture group will include the IDs in the parts array
    // parts will be [textBefore, userId1, textAfter, userId2, ...]
    
    return parts.map((part, i) => {
      // Every odd index is a userId if it matches UUID format
      if (i % 2 !== 0) {
        const member = members.find(m => m.user_id === part);
        return (
          <span key={i} className="text-primary font-bold">
            @{member?.user?.first_name || 'unknown'}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Comment Input Area */}
      <div className="relative group">
        <Textarea
          placeholder="Add a comment... (use @ to mention)"
          value={newComment}
          onChange={handleTextChange}
          className="min-h-[100px] bg-white/[0.03] border-white/5 rounded-xl pr-12 focus:border-primary/50 transition-all resize-none text-[13px] placeholder:text-white/20 font-dm"
        />

        {showMentionPicker && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0c1433] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-2 border-b border-white/5 bg-white/[0.02]">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/20 px-2">Tag Teammate</span>
            </div>
            <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
              {filteredMembers.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => insertMention(m)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                >
                  <Avatar className="w-6 h-6 border border-white/10">
                    <AvatarImage src={m.user?.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-white/10">{m.user?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white/90">{m.user?.first_name} {m.user?.last_name}</span>
                    <span className="text-[9px] text-white/20">@{m.user?.first_name?.toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="absolute right-3 bottom-3 w-8 h-8 bg-primary hover:bg-primary/90 text-white rounded-lg shadow-lg"
        >
          {submitting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Timeline Display */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        {timeline.map((item, idx) => (
          <div key={item.id} className="relative pl-8 group">
            {/* Timeline Line */}
            {idx !== timeline.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-[-24px] w-[1px] bg-white/5" />
            )}
            
            {/* Timeline Icon/Avatar */}
            <div className="absolute left-0 top-0">
              {item.itemType === 'comment' ? (
                item.audio_url ? (
                  <div className="w-8 h-8 rounded-full bg-[#0F6E56]/20 flex items-center justify-center border-2 border-[#080f28] z-10">
                    <i className="fa-solid fa-microphone text-[12px] text-[#0f6e56]"></i>
                  </div>
                ) : (
                  <Avatar className="w-8 h-8 border-2 border-[#080f28] z-10 shadow-lg">
                    <AvatarImage src={item.user?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                      {item.user?.first_name?.[0]}{item.user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border-2 border-[#080f28] z-10">
                  {item.type === 'status_change' ? <ArrowRight className="w-3.5 h-3.5 text-amber" /> : 
                   item.type === 'assignment' ? <UserPlus className="w-3.5 h-3.5 text-primary" /> :
                   <Clock className="w-3.5 h-3.5 text-white/20" />}
                </div>
              )}
            </div>

            {/* Item Content */}
            {item.itemType === 'comment' && item.audio_url ? (
              <div className="w-full">
                <VoiceNoteCard
                  sender={{
                    first_name: item.user?.first_name,
                    last_name: item.user?.last_name,
                    full_name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim() || null,
                    profile_photo_url: item.user?.avatar_url,
                    avatar_preset_id: item.user?.avatar_preset_id,
                    job_title: item.user?.job_title || "Team Member",
                    identity_color: item.user?.identity_color
                  }}
                  createdAt={item.created_at}
                  deliveryChannel={item.delivery_channel || 'internal'}
                  audioUrl={item.audio_url}
                  caption={item.content}
                  transcript={item.transcript || item.original_text}
                  theme="dark"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-white/90">
                    {item.user?.first_name} {item.user?.last_name}
                  </span>
                  <span className="text-[10px] text-white/20 font-medium">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>

                {item.itemType === 'comment' ? (
                  <div className="bg-white/[0.03] border border-white/5 p-3 rounded-xl rounded-tl-none shadow-sm group-hover:bg-white/[0.05] transition-all">
                    <p className="text-[12.5px] text-white/60 leading-relaxed whitespace-pre-wrap font-dm">
                      {renderContent(item.content)}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/30 italic font-dm">
                    {item.description}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 opacity-20">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

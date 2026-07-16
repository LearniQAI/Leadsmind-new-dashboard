'use client';

import React from 'react';
import { Activity, Clock, FileText, User, ArrowRight, Phone, Mail, Building2, Link as LinkIcon, Target, Mic } from 'lucide-react';
import Link from 'next/link';
import { AvatarImage } from '@/components/common/AvatarImage';
import { VoiceNotePlayer } from '@/components/common/VoiceNotePlayer';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';

export function UnifiedActivityFeed({ 
  activities,
  viewerContext = 'internal'
}: { 
  activities: any[];
  viewerContext?: 'internal' | 'client';
}) {
  const getIcon = (type: string, entityType: string) => {
    if (type === 'note') return <FileText size={14} className="text-blue-400" />;
    if (type === 'call') return <Phone size={14} className="text-emerald-400" />;
    if (type === 'email') return <Mail size={14} className="text-amber-400" />;
    if (type === 'stage_change') return <Target size={14} className="text-purple-400" />;
    if (type === 'voice' || type === 'voice_note') return <Mic size={14} className="text-cyan-400" />;
    if (entityType === 'lead' || type === 'imported') return <Building2 size={14} className="text-accent" />;
    if (entityType === 'contact') return <User size={14} className="text-t4" />;
    return <Clock size={14} className="text-t4" />;
  };

  const nameColor = viewerContext === 'internal' ? '#5C4AC7' : '#1A1A1A';

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-space font-bold text-white flex items-center gap-2">
          <Activity className="text-accent" /> Activity Timeline
        </h3>
        <Link href="/crm/activity" className="text-xs font-bold text-t4 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative custom-scrollbar">
        <div className="absolute top-0 bottom-0 left-[19px] w-px bg-white/5" />
        
        {activities.length === 0 ? (
          <p className="text-t4 text-sm text-center pt-8">No recent CRM activity.</p>
        ) : (
          activities.map((item) => {
            const hasUser = !!item.auth_user;
            const firstName = item.auth_user?.first_name || '';
            const lastName = item.auth_user?.last_name || '';
            const initials = firstName && lastName
              ? `${firstName[0]}${lastName[0]}`
              : item.auth_user?.email?.slice(0, 2).toUpperCase() || 'LM';
            
            const isVoice = item.activity_type === 'voice' || item.activity_type === 'voice_note';

            return (
              <div key={item.id} className="relative flex gap-4">
                <div className="w-10 h-10 rounded-full bg-n900 border border-white/10 flex items-center justify-center shrink-0 z-10 relative">
                  {getIcon(item.activity_type, item.entity_type)}
                </div>
                <div className="pt-1 w-full min-w-0">
                  {isVoice ? (
                    <VoiceNoteCard
                      sender={item.auth_user ? {
                        first_name: item.auth_user.first_name,
                        last_name: item.auth_user.last_name,
                        full_name: item.auth_user.full_name || `${item.auth_user.first_name || ''} ${item.auth_user.last_name || ''}`.trim() || null,
                        profile_photo_url: item.auth_user.profile_photo_url,
                        avatar_preset_id: item.auth_user.avatar_preset_id,
                        job_title: item.auth_user.job_title || "Team Member",
                        identity_color: item.auth_user.identity_color
                      } : undefined}
                      createdAt={item.created_at}
                      deliveryChannel={item.metadata?.channel || 'internal'}
                      audioUrl={item.metadata?.audio_url || item.source_url || ''}
                      audioDuration={item.metadata?.duration}
                      caption={item.content}
                      transcript={item.metadata?.transcript || item.original_text}
                      theme="dark"
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-xs font-bold flex items-center gap-2 min-w-0">
                          {hasUser ? (
                            <>
                              <AvatarImage
                                src={item.auth_user.profile_photo_url}
                                emailPresetUrl={item.auth_user.avatar_preset_id ? `/assets/presets/${item.auth_user.avatar_preset_id}.png` : null}
                                initials={initials}
                                bgColor={item.auth_user.identity_color || '#3b82f6'}
                                size={32}
                                shape="circle"
                                className="border-slate-200/20 hover:scale-100 shadow-sm"
                              />
                              <span style={{ color: nameColor }} className="truncate">
                                {item.auth_user.full_name || `${firstName} ${lastName}`.trim() || item.auth_user.email.split('@')[0]}
                              </span>
                            </>
                          ) : (
                            <span className="text-t3">System Workflow</span>
                          )}
                        </span>
                        <span className="text-[10px] text-t4 uppercase tracking-widest font-semibold shrink-0">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white mt-1 font-dm-sans">
                        {item.content}
                      </p>
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.entity_type === 'contact' && item.entity_id ? (
                          <Link
                            href={`/contacts/${item.entity_id}`}
                            className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4 hover:text-white transition-colors"
                          >
                            <LinkIcon size={10} /> {item.entity_type}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                            <LinkIcon size={10} /> {item.entity_type}
                          </span>
                        )}
                        {item.metadata?.channel === 'whatsapp' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest">
                            WhatsApp {item.metadata.destination ? `(${item.metadata.destination})` : ''}
                          </span>
                        )}
                        {item.metadata?.channel === 'email' && (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest">
                            Email {item.metadata.destination ? `(${item.metadata.destination})` : ''}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

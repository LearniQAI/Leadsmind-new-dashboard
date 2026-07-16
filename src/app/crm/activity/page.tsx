import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { Activity, LayoutDashboard, FileText, Phone, Mail, Target, Building2, User, Link as LinkIcon, Clock, Mic } from 'lucide-react';
import Link from 'next/link';
import { AvatarImage } from '@/components/common/AvatarImage';
import { VoiceNotePlayer } from '@/components/common/VoiceNotePlayer';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';

export default async function GlobalActivityPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const activities = workspaceId ? await UnifiedActivityEngine.getGlobalActivity(workspaceId, 100) : [];

  const getIcon = (type: string, entityType: string) => {
    if (type === 'note') return <FileText size={16} className="text-blue-400" />;
    if (type === 'call') return <Phone size={16} className="text-emerald-400" />;
    if (type === 'email') return <Mail size={16} className="text-amber-400" />;
    if (type === 'stage_change') return <Target size={16} className="text-purple-400" />;
    if (type === 'voice' || type === 'voice_note') return <Mic size={16} className="text-cyan-400" />;
    if (entityType === 'lead' || type === 'imported') return <Building2 size={16} className="text-accent" />;
    if (entityType === 'contact') return <User size={16} className="text-t4" />;
    return <Clock size={16} className="text-t4" />;
  };

  const nameColor = '#5C4AC7'; // Brand purple for internal activities

  return (
    <Wrapper>
      <div className="p-6 max-w-4xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/crm" className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-4">
              <LayoutDashboard size={16} /> Back to CRM Workspace
            </Link>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Activity className="text-accent" size={32} /> Global Activity Feed
            </h1>
            <p className="text-t3">Chronological timeline of all events across LeadsMind modules.</p>
          </div>
        </div>

        {/* Full Feed */}
        <div className="bg-n800 border border-white/10 rounded-3xl p-8">
          <div className="space-y-8 relative">
            <div className="absolute top-0 bottom-0 left-[23px] w-px bg-white/5" />
            
            {activities.length === 0 ? (
              <p className="text-t4 text-center">No activity recorded yet.</p>
            ) : (
              activities.map((item: any) => {
                const hasUser = !!item.auth_user;
                const firstName = item.auth_user?.first_name || '';
                const lastName = item.auth_user?.last_name || '';
                const initials = firstName && lastName
                  ? `${firstName[0]}${lastName[0]}`
                  : item.auth_user?.email?.slice(0, 2).toUpperCase() || 'LM';
                
                const isVoice = item.activity_type === 'voice' || item.activity_type === 'voice_note';

                return (
                  <div key={item.id} className="relative flex gap-6 group font-dm-sans">
                    <div className="w-12 h-12 rounded-full bg-n900 border border-white/10 flex items-center justify-center shrink-0 z-10 relative group-hover:border-accent/50 transition-colors shadow-lg">
                      {getIcon(item.activity_type, item.entity_type)}
                    </div>
                    <div className="pt-2 w-full min-w-0">
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
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-sm font-bold flex items-center gap-2 min-w-0">
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
                                    {item.auth_user.full_name || `${firstName} ${lastName}`.trim() || item.auth_user.email}
                                  </span>
                                </>
                              ) : (
                                <span className="text-t3">System Workflow</span>
                              )}
                            </span>
                            <span className="text-xs text-t4 uppercase tracking-widest font-bold shrink-0">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="bg-n900 border border-white/5 rounded-2xl p-5 group-hover:border-white/10 transition-colors">
                            <p className="text-sm text-white leading-relaxed font-dm-sans">
                              {item.content}
                            </p>
                            
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-3 flex-wrap">
                              {item.entity_type === 'contact' && item.entity_id ? (
                                <Link
                                  href={`/contacts/${item.entity_id}`}
                                  className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4 hover:text-white transition-colors"
                                >
                                  <LinkIcon size={10} /> {item.entity_type} Record
                                </Link>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                                  <LinkIcon size={10} /> {item.entity_type} Record
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                                <Activity size={10} /> {item.activity_type.replace('_', ' ')}
                              </span>
                              {item.metadata?.channel === 'whatsapp' && (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest">
                                  WhatsApp {item.metadata.destination ? `(${item.metadata.destination})` : ''}
                                </span>
                              )}
                              {item.metadata?.channel === 'email' && (
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest">
                                  Email {item.metadata.destination ? `(${item.metadata.destination})` : ''}
                                </span>
                              )}
                            </div>
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

      </div>
    </Wrapper>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Headset, X, Video, Users, ExternalLink, Calendar, Send, PlayCircle, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashEmptyState } from '@/components/dashboard-ui';

const BRAND = '#7B3FF2';

interface LiveHelpWidgetProps {
  courseId: string;
  enrollment: any;
}

const TABS = ['advisors', 'cohorts', 'recordings', 'chat'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  advisors: 'Tutors',
  cohorts: 'RSVP',
  recordings: 'Recordings',
  chat: 'Chat',
};

export default function LiveHelpWidget({ courseId, enrollment }: LiveHelpWidgetProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('advisors');

  // Data States
  const [experts, setExperts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRsvps, setMyRsvps] = useState<Set<string>>(new Set());
  const [recordings, setRecordings] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [currentContact, setCurrentContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Input State
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (enrollment?.contact_id) {
      supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('id', enrollment.contact_id)
        .single()
        .then(({ data }) => {
          if (data) setCurrentContact(data);
        });
    }
  }, [enrollment?.contact_id]);

  useEffect(() => {
    if (isOpen) {
      fetchLiveHelpData();
    }
  }, [isOpen, courseId]);

  const activeSession = sessions.find(s => s.is_live);
  const upcomingSessions = sessions.filter(s => !s.is_live && new Date(s.start_time) > new Date());

  useEffect(() => {
    if (activeTab === 'chat' && activeSession) {
      fetchChats(activeSession.id);
      const interval = setInterval(() => fetchChats(activeSession.id), 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, activeSession?.id]);

  useEffect(() => {
    if (activeTab === 'recordings' && sessions.length > 0) {
      fetchRecordings();
    }
  }, [activeTab, sessions]);

  const fetchLiveHelpData = async () => {
    setLoading(true);
    try {
      const { data: expertData } = await supabase.from('lms_expert_profiles').select('*');
      const { data: sessionData } = await supabase.from('lms_expert_sessions').select('*').eq('course_id', courseId);

      if (expertData) setExperts(expertData);
      if (sessionData) {
        setSessions(sessionData);
        // Fetch RSVPs
        const { data: rsvpsData } = await supabase
          .from('lms_session_rsvps')
          .select('session_id')
          .eq('contact_id', enrollment.contact_id);
        if (rsvpsData) {
          setMyRsvps(new Set(rsvpsData.map((r: any) => r.session_id)));
        }
      }
    } catch (err) {
      console.error('Failed to load live help data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async (sessionId: string) => {
    const { data } = await supabase
      .from('lms_session_chats')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) setChats(data);
  };

  const fetchRecordings = async () => {
    const sIds = sessions.map(s => s.id);
    if (sIds.length === 0) return;
    const { data } = await supabase
      .from('lms_session_recordings')
      .select('*')
      .in('session_id', sIds)
      .order('created_at', { ascending: false });
    if (data) setRecordings(data);
  };

  const handleToggleRsvp = async (sessionId: string, isRsvped: boolean) => {
    try {
      if (isRsvped) {
        await supabase
          .from('lms_session_rsvps')
          .delete()
          .eq('session_id', sessionId)
          .eq('contact_id', enrollment.contact_id);
        setMyRsvps(prev => { const next = new Set(prev); next.delete(sessionId); return next; });
        toast.success('RSVP cancelled.');
      } else {
        await supabase
          .from('lms_session_rsvps')
          .insert({ session_id: sessionId, contact_id: enrollment.contact_id });
        setMyRsvps(prev => { const next = new Set(prev); next.add(sessionId); return next; });
        toast.success('RSVP confirmed!');
      }
    } catch (err: any) {
      toast.error('RSVP action failed: ' + err.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSession || !currentContact) return;
    const senderName = `${currentContact.first_name || ''} ${currentContact.last_name || ''}`.trim() || 'Student';
    const msg = chatInput.trim();
    setChatInput('');
    try {
      const { error } = await supabase
        .from('lms_session_chats')
        .insert({
          session_id: activeSession.id,
          sender_id: currentContact.id,
          sender_name: senderName,
          message: msg
        });
      if (error) throw error;
      fetchChats(activeSession.id);
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
    }
  };

  return (
    <>
      <style>{`
        .live-help-launcher { animation: live-help-breathe 3s ease-in-out infinite; }
        .live-help-launcher:hover,
        .live-help-launcher:focus-visible {
          animation: none;
          box-shadow: 0 0 28px color-mix(in srgb, var(--lh-brand) 42%, transparent),
            0 10px 24px rgba(15, 23, 42, 0.16);
        }
        @keyframes live-help-breathe {
          0%, 100% {
            box-shadow: 0 0 14px color-mix(in srgb, var(--lh-brand) 22%, transparent),
              0 8px 18px rgba(15, 23, 42, 0.13);
          }
          50% {
            box-shadow: 0 0 22px color-mix(in srgb, var(--lh-brand) 32%, transparent),
              0 9px 21px rgba(15, 23, 42, 0.14);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .live-help-launcher { animation: none; }
        }
        .live-help-modal-logo {
          box-shadow: 0 0 12px color-mix(in srgb, var(--lh-brand) 24%, transparent);
        }
      `}</style>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Virtual Support Office"
          title="Virtual Support Office"
          className="live-help-launcher fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-[1.07] active:scale-95 transition-all duration-200 border-[3px] bg-white group relative"
          style={{ '--lh-brand': BRAND, borderColor: BRAND } as React.CSSProperties}
        >
          <Headset className="h-6 w-6 group-hover:rotate-6 transition-transform duration-300" style={{ color: BRAND }} />
          {activeSession && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[1999] bg-black/20 backdrop-blur-[5px] animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[2000] w-[calc(100vw-3rem)] max-w-sm h-[560px] max-h-[75vh] bg-white border border-dash-border rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 font-dm-sans">
          {/* Header */}
          <div className="p-5 border-b border-dash-border flex items-center justify-between bg-dash-surface shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="live-help-modal-logo w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 bg-white"
                style={{ '--lh-brand': BRAND, borderColor: BRAND } as React.CSSProperties}
              >
                <Headset className="h-5 w-5" style={{ color: BRAND }} />
              </div>
              <div>
                <h3 className="text-sm font-bold !text-dash-text font-space-grotesk">Virtual Support Office</h3>
                <p className="text-[10px] !text-dash-textMuted font-medium pt-0.5">Assigned tutors & classrooms</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-11 h-11 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text bg-dash-border/30 hover:bg-dash-border/50 rounded-xl transition duration-150 min-w-[44px] min-h-[44px]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented tab control */}
          <div className="px-4 pt-3 pb-1 bg-white shrink-0">
            <div className="grid bg-dash-surface p-1 rounded-full text-[11px] h-9" style={{ gridTemplateColumns: `repeat(${activeSession ? 4 : 3}, minmax(0, 1fr))` }}>
              {TABS.map((tab) => {
                if (tab === 'chat' && !activeSession) return null;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'font-bold rounded-full transition-all h-full flex items-center justify-center',
                      isActive ? 'bg-white shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
                    )}
                    style={isActive ? { color: BRAND } : undefined}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto min-h-[200px] bg-white">
            {loading ? (
              <div className="py-8 text-center text-xs !text-dash-textMuted animate-pulse">Loading office portal...</div>
            ) : (
              <>
                {activeTab === 'advisors' && (
                  <div className="space-y-3">
                    {experts.length === 0 && (
                      <DashEmptyState icon={Users} title="No tutors assigned yet" description="Check back soon for assigned tutors." compact />
                    )}
                    {experts.map((exp) => {
                      const live = sessions.find(s => s.expert_id === exp.id && s.is_live);
                      return (
                        <div key={exp.id} className={cn('p-3.5 rounded-xl border', live ? 'bg-emerald-50 border-emerald-200' : 'bg-dash-surface border-dash-border')}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-bold !text-dash-text">{exp.name}</h4>
                              <p className="text-[10px] !text-dash-textMuted font-mono mt-0.5">{exp.email}</p>
                            </div>
                            {live && <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">Live</span>}
                          </div>
                          <p className="text-[11px] !text-dash-textMuted mt-2 line-clamp-2">{exp.bio || 'Tutor ready to help.'}</p>
                          {live && (
                            <a
                              href={live.meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full text-white rounded-lg text-[9px] font-black uppercase tracking-wider py-2.5 mt-3 flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.01] active:scale-95 transition-all"
                              style={{ backgroundColor: '#059669' }}
                            >
                              <Video size={11} /> Enter Live Room <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'cohorts' && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-widest">Upcoming group/cohort classes</h4>
                    {upcomingSessions.length === 0 ? (
                      <DashEmptyState icon={Calendar} title="No upcoming events" description="No cohort sessions are scheduled right now." compact />
                    ) : (
                      upcomingSessions.map((s) => {
                        const isRsvped = myRsvps.has(s.id);
                        return (
                          <div key={s.id} className="bg-dash-surface border border-dash-border p-3.5 rounded-xl space-y-2.5">
                            <div>
                              <span className="text-[10px] font-black uppercase capitalize" style={{ color: BRAND }}>{s.session_type.replace('_', ' ')}</span>
                              <span className="text-[10px] !text-dash-textMuted block font-mono mt-0.5">{new Date(s.start_time).toLocaleString()}</span>
                            </div>
                            <button
                              onClick={() => handleToggleRsvp(s.id, isRsvped)}
                              className={cn(
                                'w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all',
                                isRsvped ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'hover:opacity-80'
                              )}
                              style={!isRsvped ? { backgroundColor: `${BRAND}14`, borderColor: `${BRAND}33`, color: BRAND } : undefined}
                            >
                              {isRsvped ? 'Cancel RSVP' : 'RSVP for Session'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {activeTab === 'recordings' && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-widest">Class recording vault</h4>
                    {recordings.length === 0 ? (
                      <DashEmptyState icon={PlayCircle} title="No recordings yet" description="No historical recordings posted yet." compact />
                    ) : (
                      recordings.map((rec) => (
                        <div key={rec.id} className="bg-dash-surface border border-dash-border p-3.5 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-bold !text-dash-text">{rec.title}</span>
                          <a href={rec.video_url} target="_blank" rel="noopener noreferrer" style={{ color: BRAND }} className="hover:opacity-70">
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'chat' && activeSession && (
                  <div className="flex flex-col h-[280px]">
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-2">
                      {chats.length === 0 ? (
                        <DashEmptyState icon={MessageSquare} title="Chat room opened" description="Introduce yourself!" compact />
                      ) : (
                        chats.map((c) => (
                          <div key={c.id} className="bg-dash-surface border border-dash-border p-2.5 rounded-lg">
                            <div className="flex justify-between items-center text-[9px] font-mono !text-dash-textMuted">
                              <span className="font-bold" style={{ color: BRAND }}>{c.sender_name}</span>
                              <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[11px] !text-dash-text mt-0.5">{c.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="relative flex items-center bg-dash-surface rounded-full p-1 focus-within:ring-2 transition duration-200 shrink-0" style={{ ['--tw-ring-color' as any]: `${BRAND}33` }}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent px-3.5 py-2.5 text-[11px] !text-dash-text placeholder:!text-dash-textMuted outline-none"
                      />
                      <button
                        type="submit"
                        className="w-9 h-9 text-white rounded-full transition duration-150 flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95"
                        style={{ backgroundColor: BRAND }}
                      >
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

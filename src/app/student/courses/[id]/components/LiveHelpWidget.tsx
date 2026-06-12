'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  HelpCircle, X, Video, Users, Globe, ExternalLink, Calendar, MessageSquare, Send
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveHelpWidgetProps {
  courseId: string;
  enrollment: any;
}

export default function LiveHelpWidget({ courseId, enrollment }: LiveHelpWidgetProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'advisors' | 'cohorts' | 'recordings' | 'chat'>('advisors');
  
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
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border border-white/10 group relative"
        >
          <HelpCircle size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-wider pr-1 font-space-grotesk">Ask Live Expert</span>
          {activeSession && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="bg-[#080f28]/95 backdrop-blur-md border border-white/5 w-80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[450px]">
          {/* Header */}
          <div className="bg-[#04091a]/80 px-4 py-3 border-b border-white/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-space-grotesk">Virtual Support Office</h3>
                <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Assigned Tutors & Classrooms</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white p-1"><X size={15} /></button>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-white/5 bg-[#04091a]/30 px-3 py-1.5 gap-2 shrink-0 font-body">
            {(['advisors', 'cohorts', 'recordings', 'chat'] as const).map((tab) => {
              if (tab === 'chat' && !activeSession) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded transition-all ${
                    activeTab === tab ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {tab === 'advisors' ? 'Tutors' : tab === 'cohorts' ? 'RSVP' : tab === 'recordings' ? 'Recordings' : 'Chat 💬'}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-4 overflow-y-auto min-h-[200px]">
            {loading ? (
              <div className="py-8 text-center text-xs text-white/30 italic animate-pulse">Loading office portal...</div>
            ) : (
              <>
                {activeTab === 'advisors' && (
                  <div className="space-y-3">
                    {experts.map((exp) => {
                      const live = sessions.find(s => s.expert_id === exp.id && s.is_live);
                      return (
                        <div key={exp.id} className={`p-3 rounded-xl border ${live ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#04091a]/45 border-white/5'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-bold text-white">{exp.name}</h4>
                              <p className="text-[9px] text-white/40 font-mono mt-0.5">{exp.email}</p>
                            </div>
                            {live && <span className="text-[7px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Live</span>}
                          </div>
                          <p className="text-[10px] text-white/50 mt-2 line-clamp-2">{exp.bio || 'Tutor ready to help.'}</p>
                          {live && (
                            <a href={live.meeting_url} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider py-2 mt-3 flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/15">
                              <Video size={10} /> Enter Live Room <ExternalLink size={8} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'cohorts' && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Upcoming Group/Cohort Classes</h4>
                    {upcomingSessions.length === 0 ? (
                      <p className="text-xs text-white/30 italic py-4">No upcoming cohort events scheduled.</p>
                    ) : (
                      upcomingSessions.map((s) => {
                        const isRsvped = myRsvps.has(s.id);
                        return (
                          <div key={s.id} className="bg-[#04091a]/45 border border-white/5 p-3 rounded-xl space-y-2.5">
                            <div>
                              <span className="text-[9px] font-black text-primary uppercase capitalize">{s.session_type.replace('_', ' ')}</span>
                              <span className="text-[9px] text-white/40 block font-mono mt-0.5">{new Date(s.start_time).toLocaleString()}</span>
                            </div>
                            <button
                              onClick={() => handleToggleRsvp(s.id, isRsvped)}
                              className={`w-full py-1.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all ${
                                isRsvped ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                              }`}
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
                    <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Class Recording Vault</h4>
                    {recordings.length === 0 ? (
                      <p className="text-xs text-white/30 italic py-4">No historical recordings posted yet.</p>
                    ) : (
                      recordings.map((rec) => (
                        <div key={rec.id} className="bg-[#04091a]/45 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold text-white block">{rec.title}</span>
                          </div>
                          <a href={rec.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'chat' && activeSession && (
                  <div className="flex flex-col h-[280px]">
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-2">
                      {chats.length === 0 ? (
                        <p className="text-[10px] text-white/30 italic text-center py-8">Chat room opened. Introduce yourself!</p>
                      ) : (
                        chats.map((c) => (
                          <div key={c.id} className="bg-[#04091a]/45 border border-white/5 p-2 rounded-lg">
                            <div className="flex justify-between items-center text-[8px] font-mono text-white/30">
                              <span className="font-bold text-primary">{c.sender_name}</span>
                              <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[10px] text-white/70 mt-0.5">{c.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-1.5 border-t border-white/5 pt-2 shrink-0">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type message..."
                        className="flex-1 bg-[#04091a] border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                      />
                      <button type="submit" className="bg-primary hover:bg-primary/95 text-white p-2 rounded-lg"><Send size={11} /></button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

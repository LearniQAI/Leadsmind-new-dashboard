'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare, Video, Plus, Trash2, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SessionDetailsModalProps {
  session: any;
  onClose: () => void;
  supabase: any;
}

export default function SessionDetailsModal({ session, onClose, supabase }: SessionDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'rsvps' | 'chats' | 'recordings'>('rsvps');
  
  // Data States
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Recording Form
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [addingRecording, setAddingRecording] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [session.id]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // Fetch RSVPs with contact names/emails
      const { data: rsvpsData } = await supabase
        .from('lms_session_rsvps')
        .select(`
          id,
          created_at,
          contacts:contact_id (first_name, last_name, email)
        `)
        .eq('session_id', session.id);

      // Fetch chats
      const { data: chatsData } = await supabase
        .from('lms_session_chats')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      // Fetch recordings
      const { data: recsData } = await supabase
        .from('lms_session_recordings')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (rsvpsData) setRsvps(rsvpsData);
      if (chatsData) setChats(chatsData);
      if (recsData) setRecordings(recsData);
    } catch (err: any) {
      toast.error('Failed to load details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingTitle || !recordingUrl) {
      toast.error('Please enter a title and URL.');
      return;
    }
    setAddingRecording(true);
    try {
      const { data, error } = await supabase
        .from('lms_session_recordings')
        .insert({
          session_id: session.id,
          title: recordingTitle,
          video_url: recordingUrl
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setRecordings([data, ...recordings]);
        setRecordingTitle('');
        setRecordingUrl('');
        toast.success('Session recording link added successfully!');
      }
    } catch (err: any) {
      toast.error('Failed to add recording: ' + err.message);
    } finally {
      setAddingRecording(false);
    }
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lms_session_recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecordings(recordings.filter(r => r.id !== id));
      toast.success('Recording link deleted.');
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000c1] backdrop-blur-sm p-4">
      <div className="bg-dash-surface border border-dash-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-dash-bg px-6 py-4 border-b border-dash-border flex justify-between items-center shrink-0 gap-3">
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-dash-accent capitalize">
              Session details • {session.session_type.replace('_', ' ')}
            </span>
            <h2 className="text-sm font-space-grotesk font-black text-dash-text uppercase mt-0.5 max-w-md truncate">
              {session.meeting_url}
            </h2>
          </div>
          <button onClick={onClose} className="text-dash-textMuted hover:text-dash-text p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-dash-border bg-dash-bg px-6 gap-4 shrink-0">
          {(['rsvps', 'chats', 'recordings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 border-b-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'border-dash-accent text-dash-text'
                  : 'border-transparent text-dash-textMuted hover:text-dash-text'
              }`}
            >
              {tab === 'rsvps' && <Calendar size={12} />}
              {tab === 'chats' && <MessageSquare size={12} />}
              {tab === 'recordings' && <Video size={12} />}
              {tab === 'rsvps' ? 'RSVPs' : tab === 'chats' ? 'Chat Log' : 'Recordings'}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-dash-textMuted py-12">
              <Loader2 size={24} className="animate-spin text-dash-accent mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading Session Data...</span>
            </div>
          ) : (
            <>
              {/* RSVPs Tab */}
              {activeTab === 'rsvps' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-dash-border pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-dash-text">Registered Students ({rsvps.length})</h3>
                  </div>
                  {rsvps.length === 0 ? (
                    <p className="text-xs text-dash-textMuted italic py-6">No students have registered for this session yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {rsvps.map((rsvp) => {
                        const contact = rsvp.contacts;
                        const fullName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown Student';
                        const email = contact?.email || 'N/A';
                        return (
                          <div key={rsvp.id} className="flex justify-between items-center bg-dash-bg border border-dash-border px-4 py-3 rounded-xl">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent">
                                <User size={13} />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-dash-text block">{fullName || 'Unknown Student'}</span>
                                <span className="text-[10px] text-dash-textMuted font-mono">{email}</span>
                              </div>
                            </div>
                            <span className="text-[9px] text-dash-textMuted font-mono">
                              {new Date(rsvp.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Chats Tab */}
              {activeTab === 'chats' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-dash-border pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-dash-text">Group Chat History ({chats.length})</h3>
                  </div>
                  {chats.length === 0 ? (
                    <p className="text-xs text-dash-textMuted italic py-6">No messages have been sent in this session yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {chats.map((c) => (
                        <div key={c.id} className="bg-dash-bg border border-dash-border p-3 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-dash-accent uppercase">{c.sender_name}</span>
                            <span className="text-[8px] text-dash-textMuted font-mono">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-dash-text leading-relaxed">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recordings Tab */}
              {activeTab === 'recordings' && (
                <div className="space-y-6">
                  {/* Add Recording Form */}
                  <form onSubmit={handleAddRecording} className="bg-dash-bg border border-dash-border p-4 rounded-2xl space-y-3">
                    <h3 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest border-b border-dash-border pb-1.5">Add Class Recording</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-dash-textMuted uppercase tracking-widest block">Recording Title</label>
                        <input
                          type="text"
                          value={recordingTitle}
                          onChange={(e) => setRecordingTitle(e.target.value)}
                          placeholder="e.g. Session 1: Onboarding Basics"
                          className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs text-dash-text outline-none focus:border-dash-accent transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-dash-textMuted uppercase tracking-widest block">Video / URL Link</label>
                        <input
                          type="url"
                          value={recordingUrl}
                          onChange={(e) => setRecordingUrl(e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs text-dash-text outline-none focus:border-dash-accent transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={addingRecording}
                        className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl uppercase tracking-wider text-[9px] font-black h-8 px-4 flex items-center gap-1 shadow-lg shadow-dash-accent/20"
                      >
                        {addingRecording ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Add Recording
                      </Button>
                    </div>
                  </form>

                  {/* Recordings List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-dash-text">Class Recordings ({recordings.length})</h3>
                    {recordings.length === 0 ? (
                      <p className="text-xs text-dash-textMuted italic py-4">No recording links have been attached to this session.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {recordings.map((rec) => (
                          <div key={rec.id} className="flex justify-between items-center bg-dash-bg border border-dash-border px-4 py-3 rounded-xl gap-3">
                            <div className="space-y-1 min-w-0">
                              <span className="text-xs font-black text-dash-text block">{rec.title}</span>
                              <a
                                href={rec.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-dash-accent hover:underline font-mono block max-w-sm truncate"
                              >
                                {rec.video_url}
                              </a>
                            </div>
                            <button
                              onClick={() => handleDeleteRecording(rec.id)}
                              className="text-rose-500 hover:text-rose-600 p-1.5 shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

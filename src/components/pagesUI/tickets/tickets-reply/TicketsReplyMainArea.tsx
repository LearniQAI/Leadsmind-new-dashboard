'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Mic, Square, Trash2, Check, Send, AlertCircle, FileAudio, Sparkles, MessageSquare, LifeBuoy } from 'lucide-react';
import { AvatarImage } from '@/components/common/AvatarImage';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  contact?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Reply {
  id: string;
  type: 'text' | 'voice_note';
  direction: 'inbound' | 'outbound';
  content: string;
  transcript?: string;
  audioUrl?: string;
  duration?: number;
  created_at: string;
}

interface TicketsReplyMainAreaProps {
  initialTickets: Ticket[];
}

export function TicketsReplyMainArea({ initialTickets }: TicketsReplyMainAreaProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(
    initialTickets.length > 0 ? initialTickets[0].id : null
  );

  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [inputText, setInputText] = useState("");
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(12));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptRef = useRef("");

  // Sync ref with state to prevent stale closures in callbacks
  useEffect(() => {
    transcriptRef.current = transcriptText;
  }, [transcriptText]);

  // Load ticket selection from URL query parameters and local replies storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Read Ticket ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get('id');
      if (queryId) {
        const found = tickets.find(t => t.id === queryId || t.id.startsWith(queryId));
        if (found) setActiveTicketId(found.id);
      }
    }
  }, [tickets]);

  // Load Ticket Messages from Supabase API
  useEffect(() => {
    if (activeTicketId) {
      fetch(`/api/support/tickets/${activeTicketId}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            // Transform to local format
            const transformed = data.messages.map((m: any) => ({
              id: m.id,
              type: m.attachments?.find((a:any) => a.type === 'audio') ? 'voice_note' : 'text',
              direction: m.sender_type === 'customer' ? 'inbound' : 'outbound',
              content: m.message,
              transcript: m.message,
              audioUrl: m.attachments?.find((a:any) => a.type === 'audio')?.url,
              duration: m.attachments?.find((a:any) => a.type === 'audio')?.duration,
              created_at: m.created_at
            }));
            
            setReplies(prev => ({ ...prev, [activeTicketId]: transformed }));
          }
        })
        .catch(console.error);
    }
  }, [activeTicketId]);

  // Cleanup timers and recording contexts on unmount
  useEffect(() => {
    return () => {
      cleanupRecordingContext();
    };
  }, []);

  const cleanupRecordingContext = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start In-Browser Voice Recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    setTranscriptText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);

      // 1. Set MediaRecorder (WebM audio encoding)
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());

        // Create local audio payload URL
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0 && activeTicketId) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const newReply = {
              message: transcriptRef.current || 'Voice reply submitted via recording.',
              sender_type: 'agent',
              audioUrl: base64data,
              duration: recordingSeconds
            };

            fetch(`/api/support/tickets/${activeTicketId}/reply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newReply)
            }).then(res => res.json()).then(data => {
              if (data.reply) {
                setReplies(prev => ({
                  ...prev,
                  [activeTicketId]: [...(prev[activeTicketId] || []), data.reply]
                }));
              }
            }).catch(console.error);
          };
        }
      };

      // 2. Real-Time Web Speech recognition for transcription dictation
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              text += event.results[i][0].transcript;
            }
          }
          if (text) {
            setTranscriptText(prev => (prev + ' ' + text).trim());
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      // 3. Audio Levels Analyser Visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const draw = () => {
        if (!analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const levels = [];
        const step = Math.floor(dataArray.length / 16) || 1;
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          levels.push(Math.max(12, Math.min(100, (val / 255) * 100)));
        }
        setAudioLevels(levels);
      };
      draw();

      mediaRecorder.start(250);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 900) { // 15 mins max stops
            stopAndSaveRecording();
            return 900;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Microphone validation failed:', err);
      alert('Microphone hardware access was denied or is unavailable.');
    }
  };

  const stopAndSaveRecording = () => {
    cleanupRecordingContext();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    cleanupRecordingContext();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    audioChunksRef.current = [];
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeTicketId) return;

    const content = inputText.trim();
    setInputText(""); // Optimistic clear

    try {
      const res = await fetch(`/api/support/tickets/${activeTicketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, sender_type: 'agent' })
      });
      const data = await res.json();
      if (data.reply) {
        setReplies(prev => ({
          ...prev,
          [activeTicketId]: [...(prev[activeTicketId] || []), data.reply]
        }));
      }
    } catch (err) {
      console.error('Failed to send text reply:', err);
      // Optional: restore text if failed
    }
  };

  // Resolve Ticket Info
  const activeTicket = tickets.find(t => t.id === activeTicketId);
  const clientName = activeTicket?.contact
    ? `${activeTicket.contact.first_name || ''} ${activeTicket.contact.last_name || ''}`.trim()
    : 'System User';
  const clientInitials = activeTicket?.contact
    ? `${activeTicket.contact.first_name?.[0] || 'L'}${activeTicket.contact.last_name?.[0] || 'M'}`.toUpperCase()
    : 'SU';

  return (
    <div className="app__slide-wrapper">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-6 md:py-8 border-b border-white/5 bg-[#080f28]/40 mb-6 rounded-t-3xl">
        <div className="flex flex-col">
          <h1 className="text-[20px] md:text-[24px] font-space font-black text-t1 tracking-tighter leading-tight uppercase flex items-center gap-2">
            Ticket Workspace <span className="text-accent2">Reply</span> 💬
          </h1>
          <p className="text-[10px] md:text-[11px] text-t3 font-black uppercase tracking-[0.2em] mt-1">
            RESOLVE CLIENT INCIDENTS WITH TEXT OR VOICE NOTES
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/support" className="btn-ghost !rounded-xl !px-4 !py-2.5 !text-[11px] font-bold">
            Back to Ticket Hub
          </Link>
        </div>
      </div>

      <div className="chatbox__area mb-5">
        <div className="chatbox__main-wrapper">
          {/* 1. Left Sidebar: Active Support Tickets Selector */}
          <div className="chatbox__inbox-wrapper">
            <div className="chatbox__inbox-search">
              <span className="text-[9px] font-black uppercase tracking-widest text-t3 block px-3 mb-2">Active Tickets ({tickets.length})</span>
            </div>
            <div className="chatbox__inbox-inner custom-scrollbar" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {tickets.length === 0 ? (
                <div className="p-6 text-center text-t3 flex flex-col items-center gap-2">
                  <LifeBuoy className="w-8 h-8 opacity-25" />
                  <span className="text-xs font-semibold">No active tickets</span>
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = t.id === activeTicketId;
                  const tInitials = t.contact 
                    ? `${t.contact.first_name?.[0] || 'L'}${t.contact.last_name?.[0] || 'M'}`.toUpperCase()
                    : 'LM';
                  return (
                    <div 
                      key={t.id} 
                      className={`chatbox__author-item cursor-pointer transition-all duration-200 ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setActiveTicketId(t.id)}
                    >
                      <div className="chatbox__author-content min-w-0">
                        <div className="chatbox__author-thumb">
                          <AvatarImage
                            initials={tInitials}
                            bgColor={isSelected ? 'var(--accent2)' : 'var(--t4)'}
                            size={36}
                            shape="circle"
                          />
                        </div>
                        <div className="chatbox__author-info min-w-0 flex-1">
                          <h5 className="truncate text-xs font-bold text-white leading-tight">{t.title}</h5>
                          <p className="truncate text-[10px] text-t3 uppercase font-bold mt-1">
                            {t.priority} • {t.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Main Chat/Ticket Thread Workspace */}
          <div className="chatbox__chatting-wrapper">
            {activeTicket ? (
              <>
                {/* Thread Header */}
                <div className="chatbox__chatting-top">
                  <div className="chatbox__header">
                    <div className="chatting__user min-w-0">
                      <div className="chatting__user-thumb">
                        <AvatarImage
                          initials={clientInitials}
                          bgColor="#06b6d4"
                          size={36}
                          shape="circle"
                        />
                      </div>
                      <div className="chatting__user-content min-w-0">
                        <h5 className="chatting__user-info truncate font-space font-bold text-white text-[15px]">{activeTicket.title}</h5>
                        <p className="text-[10px] text-t3 font-bold uppercase tracking-wider mt-0.5">
                          Owner: {clientName} • Priority: <span className="text-amber">{activeTicket.priority}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-bold uppercase tracking-wider">
                        {activeTicket.status}
                      </span>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="chatbox__chatting-body custom-scrollbar" style={{ height: '340px', overflowY: 'auto' }}>
                    {/* Message 1: Initial Ticket Submission Description */}
                    <div className="chat__message-item mt-4 animate-in fade-in duration-300">
                      <div className="chat__message-thumb">
                        <AvatarImage
                          initials={clientInitials}
                          bgColor="#06b6d4"
                          size={32}
                          shape="circle"
                        />
                      </div>
                      <div className="chat__message-title max-w-[80%]">
                        <p className="text-[11px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">Original Inquiry</p>
                        <p className="text-white leading-relaxed text-sm">{activeTicket.description || 'No description provided.'}</p>
                        <span className="text-[9px] text-t3 font-bold uppercase block mt-2">
                          {new Date(activeTicket.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Replies Stream (Dynamic Local Storage Feed) */}
                    {(replies[activeTicketId] || []).map((reply) => {
                      const isVoice = reply.type === 'voice_note';
                      if (isVoice) {
                        return (
                          <div key={reply.id} className={`flex w-full mt-5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${reply.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[85%] w-full">
                              <VoiceNoteCard
                                sender={{
                                  first_name: "You",
                                  full_name: "You",
                                  job_title: "Support Agent",
                                  identity_color: "#2563eb"
                                }}
                                createdAt={reply.created_at}
                                deliveryChannel="internal"
                                audioUrl={reply.audioUrl}
                                audioDuration={reply.duration}
                                caption={reply.content}
                                transcript={reply.transcript}
                                theme="dark"
                              />
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={reply.id} className="chat__message-item is-right mt-5 animate-in fade-in duration-300">
                          <div className="chat__message-thumb">
                            <AvatarImage
                              initials="ME"
                              bgColor="#2563eb"
                              size={32}
                              shape="circle"
                            />
                          </div>
                          <div className="chat__message-title max-w-[80%]">
                            <p className="text-white text-sm">{reply.content}</p>
                            <span className="text-[9px] text-t3 font-bold uppercase block mt-1.5">
                              {new Date(reply.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls (Text Input & Voice Recording Engine) */}
                <div className="chatbox__chatting-footer bg-[#080f28] border-t border-white/5 p-4 rounded-b-3xl">
                  {isRecording ? (
                    /* Live Audio Recorder Workspace */
                    <div className="flex items-center justify-between gap-4 w-full bg-red/5 border border-red/20 rounded-2xl p-3 animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <span className="font-mono text-sm font-bold text-white tracking-widest">{formatTime(recordingSeconds)}</span>
                      </div>

                      {/* Speech telemetry visualizer */}
                      <div className="flex-1 flex items-center justify-center gap-1 h-8 max-w-[180px] bg-black/30 border border-white/5 rounded-xl px-3">
                        {audioLevels.map((lvl, index) => (
                          <div
                            key={index}
                            className="w-0.5 bg-gradient-to-t from-red to-orange-400 rounded-full transition-all duration-75"
                            style={{ 
                              height: `${lvl}%`,
                              minHeight: '4px',
                            }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red/10 border border-white/10 text-t2 hover:text-red flex items-center justify-center transition-all cursor-pointer"
                          title="Discard Recording"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={stopAndSaveRecording}
                          className="w-9 h-9 rounded-xl bg-green hover:bg-green/90 text-white flex items-center justify-center shadow-lg shadow-green/20 transition-all cursor-pointer"
                          title="Save & Transcribe Reply"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* General Text / Voice trigger footer input */
                    <form onSubmit={handleSendText} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-11 h-11 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-t2 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Record Voice Note"
                      >
                        <Mic size={18} />
                      </button>
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Write something to reply..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-white text-sm font-medium placeholder:text-white/20 focus:border-primary/50 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="w-11 h-11 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer"
                        title="Send Reply"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#04091a] h-[400px] rounded-3xl">
                <div className="w-16 h-16 bg-[#2563eb]/10 rounded-[1.5rem] flex items-center justify-center mb-6 border border-[#2563eb]/20 shadow-lg animate-bounce">
                  <LifeBuoy className="w-8 h-8 text-[#2563eb]" />
                </div>
                <h4 className="text-lg font-space font-bold text-[#eef2ff] mb-2">No Ticket Selected</h4>
                <p className="text-xs text-t3 max-w-xs leading-relaxed">
                  Select a support ticket from the active listing panel on the left to start responding.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketsReplyMainArea;

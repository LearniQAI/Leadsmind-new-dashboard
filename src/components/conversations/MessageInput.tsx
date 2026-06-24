'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getQuickReplies, createQuickReply } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { Mic, Trash2, Check, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string, isNote: boolean, audioUrl?: string, transcript?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  availablePlatforms?: any[];
  selectedPlatform?: string;
  onPlatformChange?: (platform: string) => void;
  isWhatsAppWindowClosed?: boolean;
}

const APPROVED_WHATSAPP_TEMPLATES = [
  {
    name: 'welcome_message',
    category: 'UTILITY',
    text: 'Hello {{1}}, welcome to LeadsMind! How can we help you today?',
    variables: ['Customer Name']
  },
  {
    name: 'appointment_reminder',
    category: 'UTILITY',
    text: 'Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}.',
    variables: ['Customer Name', 'Date', 'Time']
  },
  {
    name: 'payment_request',
    category: 'UTILITY',
    text: 'Hi {{1}}, your invoice of {{2}} is ready for payment. Link: {{3}}',
    variables: ['Customer Name', 'Amount', 'Invoice Link']
  }
];

export function MessageInput({ 
  onSend, 
  placeholder, 
  disabled,
  availablePlatforms,
  selectedPlatform = 'whatsapp',
  onPlatformChange,
  isWhatsAppWindowClosed = false
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isNote, setIsNote] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickReplyCreator, setShowQuickReplyCreator] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  
  // Quick reply creation inputs
  const [newShortcut, setNewShortcut] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // WhatsApp template selector state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVars, setTemplateVars] = useState<Record<number, string>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(12));
  const [isUploading, setIsUploading] = useState(false);

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

  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    setTranscriptText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          setIsUploading(true);
          try {
            const formData = new FormData();
            const filename = `voice-note-${Date.now()}.webm`;
            formData.append('file', audioBlob, filename);
            formData.append('pathPrefix', 'voicenotes');

            const uploadRes = await fetch('/api/lms/upload', {
              method: 'POST',
              body: formData,
            });

            if (!uploadRes.ok) {
              throw new Error('Failed to upload audio file');
            }

            const uploadData = await uploadRes.json();
            if (!uploadData.success || !uploadData.url) {
              throw new Error(uploadData.error || 'Failed to retrieve public audio URL');
            }

            const audioUrl = uploadData.url;
            const transcript = transcriptRef.current || '';

            onSend(transcript || 'Voice note', false, audioUrl, transcript);
            toast.success('Voice note sent!');
          } catch (err: any) {
            console.error('Failed to process voice note:', err);
            toast.error(err.message || 'Failed to upload/send voice note');
          } finally {
            setIsUploading(false);
          }
        }
      };

      // Real-Time Web Speech recognition for transcription
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

      // Audio Levels Analyser Visualizer
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
      toast.error('Microphone hardware access was denied or is unavailable.');
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

  // Load Quick Replies from Supabase
  useEffect(() => {
    async function loadQuickReplies() {
      const res = await getQuickReplies();
      if (res?.data) {
        setQuickReplies(res.data);
      }
    }
    loadQuickReplies();
  }, []);

  const handleSend = () => {
    // If WhatsApp window is closed and selected platform is WhatsApp, enforce template selection
    if (selectedPlatform === 'whatsapp' && isWhatsAppWindowClosed && !isNote) {
      if (!selectedTemplate) {
        toast.error('WhatsApp 24-hour compliance window is closed. Please select an approved template.');
        return;
      }
      // Construct message text from variables
      let finalMsg = selectedTemplate.text;
      selectedTemplate.variables.forEach((_: any, index: number) => {
        const val = templateVars[index + 1] || `[${selectedTemplate.variables[index]}]`;
        finalMsg = finalMsg.replace(`{{${index + 1}}}`, val);
      });
      onSend(finalMsg, false);
      setSelectedTemplate(null);
      setTemplateVars({});
      return;
    }

    if (!text.trim() || disabled) return;
    onSend(text, isNote);
    setText('');
  };

  const handleCreateQuickReply = async () => {
    if (!newShortcut || !newMessage) {
      toast.error('Shortcut and message are required.');
      return;
    }
    const cleanShortcut = newShortcut.startsWith('/') ? newShortcut : `/${newShortcut}`;
    const res = await createQuickReply(cleanShortcut, newMessage);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Quick reply created successfully!');
      setQuickReplies(prev => [...prev, res.data].sort((a, b) => a.shortcut.localeCompare(b.shortcut)));
      setNewShortcut('');
      setNewMessage('');
      setShowQuickReplyCreator(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredQuickReplies = quickReplies.filter(qr => 
    qr.shortcut.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
    qr.message.toLowerCase().includes(quickReplySearch.toLowerCase())
  );

  // Render variables preview if template selected
  const getTemplatePreview = () => {
    if (!selectedTemplate) return '';
    let preview = selectedTemplate.text;
    selectedTemplate.variables.forEach((_: any, index: number) => {
      const val = templateVars[index + 1] || `[${selectedTemplate.variables[index]}]`;
      preview = preview.replace(`{{${index + 1}}}`, val);
    });
    return preview;
  };

  const isWhatsAppBlocked = selectedPlatform === 'whatsapp' && isWhatsAppWindowClosed && !isNote;

  return (
    <div className="p-6 bg-[#080f28] border-t border-white/5 backdrop-blur-xl z-10">
      {/* 24-Hour window warning overlay */}
      {isWhatsAppBlocked && !selectedTemplate && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-[12px] uppercase tracking-wider font-space-grotesk">
              <i className="fa-solid fa-clock-rotate-left"></i>
              WhatsApp 24-Hour Window Closed
            </div>
            <p className="text-[12.5px] text-[#94a3c8] font-dm-sans mt-1">
              You can only send approved Meta templates to initiate a conversation with this contact.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {APPROVED_WHATSAPP_TEMPLATES.map((tmpl) => (
              <Button
                key={tmpl.name}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(tmpl)}
                className="h-8 px-3 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/20"
              >
                Use {tmpl.name.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Template variable config panel */}
      {selectedTemplate && isWhatsAppBlocked && (
        <div className="mb-4 bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-space-grotesk">
              Configure WhatsApp Template: {selectedTemplate.name.replace('_', ' ')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplate(null)}
              className="text-[#4a5a82] hover:text-[#eef2ff]"
            >
              Cancel
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedTemplate.variables.map((vname: string, idx: number) => (
              <div key={idx} className="space-y-1">
                <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider">{vname}</label>
                <input
                  type="text"
                  placeholder={`Enter ${vname}`}
                  value={templateVars[idx + 1] || ''}
                  onChange={(e) => setTemplateVars(prev => ({ ...prev, [idx + 1]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            ))}
          </div>
          <div className="bg-black/20 rounded-lg p-3 border border-white/5 text-[12.5px] text-[#94a3c8] font-dm-sans leading-relaxed">
            <span className="block text-[9px] font-bold text-[#4a5a82] uppercase mb-1">Preview Message</span>
            {getTemplatePreview()}
          </div>
        </div>
      )}

      {/* Mode switches (Reply vs Internal Note) */}
      <div className="flex items-center gap-1.5 mb-3 border-b border-white/5 pb-2">
        <button
          onClick={() => setIsNote(false)}
          className={cn(
            "px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
            !isNote 
              ? "bg-[#2563eb]/10 text-[#3b82f6] border border-[#2563eb]/20" 
              : "text-[#4a5a82] hover:text-[#94a3c8]"
          )}
        >
          <i className="fa-regular fa-paper-plane mr-1.5"></i>
          Customer Reply
        </button>
        <button
          onClick={() => setIsNote(true)}
          className={cn(
            "px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
            isNote 
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
              : "text-[#4a5a82] hover:text-[#94a3c8]"
          )}
        >
          <i className="fa-solid fa-lock mr-1.5"></i>
          Internal Agent Note
        </button>
      </div>

      <div className={cn(
        "bg-white/[0.03] border border-white/5 rounded-[12px] p-2 focus-within:border-[#2563eb]/40 transition-all shadow-inner flex flex-col gap-2",
        (disabled || isUploading) && "opacity-50 pointer-events-none"
      )}>
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#94a3c8] font-dm-sans">
            <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
            <span>Uploading voice note...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between gap-4 w-full bg-red-500/5 border border-red-500/20 rounded-xl p-3 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="font-mono text-sm font-bold text-white tracking-widest">{formatTime(recordingSeconds)}</span>
            </div>

            {/* Speech telemetry visualizer */}
            <div className="flex-1 flex items-center justify-center gap-1 h-8 max-w-[180px] bg-black/30 border border-white/5 rounded-xl px-3">
              {audioLevels.map((lvl, index) => (
                <div
                  key={index}
                  className="w-0.5 bg-gradient-to-t from-red-500 to-orange-400 rounded-full transition-all duration-75"
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
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 text-[#94a3c8] hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
                title="Discard Recording"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={stopAndSaveRecording}
                className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/20 transition-all cursor-pointer"
                title="Save & Send Voice Note"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea 
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isWhatsAppBlocked}
              placeholder={isWhatsAppBlocked ? "Free-form typing disabled. Choose a Template above." : (isNote ? "Add an internal note visible only to workspace members..." : (placeholder || "Type your message..."))}
              className={cn(
                "w-full bg-transparent border-none text-[#eef2ff] text-[13.5px] placeholder:text-[#4a5a82] resize-none max-h-32 min-h-[44px] p-3 focus:outline-none focus:ring-0 font-dm-sans",
                isWhatsAppBlocked && "cursor-not-allowed opacity-50"
              )}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            
            <div className="flex items-center justify-between px-2 pb-1 relative">
              <div className="flex items-center gap-3 relative">
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={cn(
                      "h-8 px-3 rounded-lg flex items-center justify-center gap-2 text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 transition-all text-[12px] font-bold font-dm-sans",
                      showTemplates && "bg-white/5 text-[#eef2ff]"
                    )}
                  >
                    <i className="fa-solid fa-bolt text-[13px]"></i>
                    Quick Replies
                  </button>
                  
                  {showTemplates && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#080f28] border border-white/10 rounded-xl shadow-2xl p-3.5 z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in duration-200">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Quick Replies (/shortcut)</span>
                        <button
                          onClick={() => setShowQuickReplyCreator(!showQuickReplyCreator)}
                          className="text-[10px] text-[#3b82f6] font-bold hover:underline"
                        >
                          {showQuickReplyCreator ? 'View List' : '+ Create New'}
                        </button>
                      </div>

                      {!showQuickReplyCreator ? (
                        <>
                          <input
                            type="text"
                            placeholder="Search quick replies..."
                            value={quickReplySearch}
                            onChange={(e) => setQuickReplySearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none"
                          />
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {filteredQuickReplies.length === 0 ? (
                              <div className="text-[11px] text-[#4a5a82] text-center py-4">No quick replies found. Type '/' in shortcut to filter.</div>
                            ) : (
                              filteredQuickReplies.map((tmpl) => (
                                <button
                                  key={tmpl.id}
                                  onClick={() => {
                                    setText(tmpl.message);
                                    setShowTemplates(false);
                                    textareaRef.current?.focus();
                                  }}
                                  className="w-full flex flex-col items-start px-2.5 py-2 rounded-lg hover:bg-white/[0.03] text-left transition-all group"
                                >
                                  <span className="text-[12px] font-bold text-[#eef2ff] group-hover:text-[#3b82f6] transition-colors font-space-grotesk">{tmpl.shortcut}</span>
                                  <span className="text-[11px] text-[#4a5a82] line-clamp-1 mt-0.5 font-dm-sans">{tmpl.message}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2 text-left">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider">Shortcut</label>
                            <input
                              type="text"
                              placeholder="e.g. /welcome"
                              value={newShortcut}
                              onChange={(e) => setNewShortcut(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#eef2ff] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider">Message</label>
                            <textarea
                              placeholder="Enter response message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#eef2ff] focus:outline-none h-16 resize-none"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={handleCreateQuickReply}
                            className="w-full h-8 bg-[#2563eb] text-white text-[11px] font-bold"
                          >
                            Save Quick Reply
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Platform Selector Tabs */}
                {availablePlatforms && availablePlatforms.length > 1 && (
                  <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
                    {availablePlatforms.map((p: any) => {
                      const isActive = selectedPlatform === p.platform;
                      return (
                        <button
                          key={p.platform}
                          onClick={() => onPlatformChange && onPlatformChange(p.platform)}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                            isActive 
                              ? "bg-[#2563eb] text-white" 
                              : "text-[#4a5a82] hover:text-[#eef2ff]"
                          )}
                        >
                          {p.platform === 'email' && <i className="fa-solid fa-envelope"></i>}
                          {p.platform === 'whatsapp' && <i className="fa-brands fa-whatsapp"></i>}
                          {p.platform === 'sms' && <i className="fa-solid fa-comment-dots"></i>}
                          {p.platform === 'facebook' && <i className="fa-brands fa-facebook-messenger"></i>}
                          {p.platform === 'instagram' && <i className="fa-brands fa-instagram"></i>}
                          {p.platform}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isNote && !isWhatsAppBlocked && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="h-9 w-9 rounded-[8px] bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                    title="Record Voice Note"
                  >
                    <Mic size={16} className="text-[#94a3c8] hover:text-white" />
                  </button>
                )}
                <button 
                  onClick={handleSend}
                  disabled={(!text.trim() && !selectedTemplate) || disabled}
                  className={cn(
                    "h-9 px-4 rounded-[8px] flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none font-dm-sans text-[13px] font-bold",
                    isNote 
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                      : "bg-[#2563eb] hover:bg-[#2563eb]/90 text-white shadow-[#2563eb]/20"
                  )}
                >
                  <span className="uppercase tracking-widest">{isNote ? 'Save Note' : 'Send'}</span>
                  <i className={cn(isNote ? "fa-solid fa-lock text-[11px]" : "fa-solid fa-paper-plane text-[11px]")}></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getQuickReplies, createQuickReply } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { Mic, Trash2, Check, Loader2, History, Zap, Send, Lock, Mail, MessageCircle } from 'lucide-react';
import { Instagram } from '@/components/icons/BrandIcons';

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
    <div className="p-6 bg-white border-t border-dash-border z-10">
      {/* 24-Hour window warning overlay */}
      {isWhatsAppBlocked && !selectedTemplate && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-[12px]">
              <History className="w-3.5 h-3.5" />
              WhatsApp 24-hour window closed
            </div>
            <p className="text-[12.5px] !text-dash-textMuted mt-1">
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
                className="h-8 px-3 text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold border border-amber-200"
              >
                Use {tmpl.name.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Template variable config panel */}
      {selectedTemplate && isWhatsAppBlocked && (
        <div className="mb-4 bg-dash-surface border border-dash-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600">
              Configure WhatsApp template: {selectedTemplate.name.replace('_', ' ')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplate(null)}
              className="!text-dash-textMuted hover:!text-dash-text"
            >
              Cancel
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedTemplate.variables.map((vname: string, idx: number) => (
              <div key={idx} className="space-y-1">
                <label className="text-[10px] font-bold !text-dash-textMuted">{vname}</label>
                <input
                  type="text"
                  placeholder={`Enter ${vname}`}
                  value={templateVars[idx + 1] || ''}
                  onChange={(e) => setTemplateVars(prev => ({ ...prev, [idx + 1]: e.target.value }))}
                  className="w-full bg-white border border-dash-border rounded-lg px-3 py-1.5 text-[12.5px] !text-dash-text focus:outline-none focus:border-dash-accent"
                />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg p-3 border border-dash-border text-[12.5px] !text-dash-textMuted leading-relaxed">
            <span className="block text-[9px] font-bold !text-dash-textMuted mb-1">Preview message</span>
            {getTemplatePreview()}
          </div>
        </div>
      )}

      {/* Mode switches (Reply vs Internal Note) */}
      <div className="flex items-center gap-1.5 mb-3 border-b border-dash-border pb-2">
        <button
          onClick={() => setIsNote(false)}
          className={cn(
            "px-3 py-1 rounded-lg text-[11px] font-bold transition-all motion-reduce:transition-none flex items-center",
            !isNote
              ? "bg-dash-accent/10 text-dash-accent border border-dash-accent/20"
              : "!text-dash-textMuted hover:!text-dash-text"
          )}
        >
          <Send className="w-3 h-3 mr-1.5" />
          Customer reply
        </button>
        <button
          onClick={() => setIsNote(true)}
          className={cn(
            "px-3 py-1 rounded-lg text-[11px] font-bold transition-all motion-reduce:transition-none flex items-center",
            isNote
              ? "bg-amber-100 text-amber-600 border border-amber-200"
              : "!text-dash-textMuted hover:!text-dash-text"
          )}
        >
          <Lock className="w-3 h-3 mr-1.5" />
          Internal agent note
        </button>
      </div>

      <div className={cn(
        "bg-dash-surface border border-dash-border rounded-[12px] p-2 focus-within:border-dash-accent/40 transition-all motion-reduce:transition-none shadow-inner flex flex-col gap-2",
        (disabled || isUploading) && "opacity-50 pointer-events-none"
      )}>
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm !text-dash-textMuted">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-dash-accent" />
            <span>Uploading voice note...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between gap-4 w-full bg-red/5 border border-red/20 rounded-xl p-3 animate-in slide-in-from-bottom-2 motion-reduce:animate-none">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-red rounded-full animate-ping motion-reduce:animate-none" />
              <span className="font-mono text-sm font-bold !text-dash-text tracking-widest">{formatTime(recordingSeconds)}</span>
            </div>

            {/* Speech telemetry visualizer */}
            <div className="flex-1 flex items-center justify-center gap-1 h-8 max-w-[180px] bg-white border border-dash-border rounded-xl px-3">
              {audioLevels.map((lvl, index) => (
                <div
                  key={index}
                  className="w-0.5 bg-red rounded-full transition-all motion-reduce:transition-none duration-75"
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
                className="w-9 h-9 rounded-xl bg-white hover:bg-red/10 border border-dash-border !text-dash-textMuted hover:text-red flex items-center justify-center transition-all motion-reduce:transition-none cursor-pointer"
                title="Discard Recording"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={stopAndSaveRecording}
                className="w-9 h-9 rounded-xl bg-green hover:bg-green/90 text-white flex items-center justify-center shadow-lg shadow-green/20 transition-all motion-reduce:transition-none cursor-pointer"
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
                "w-full bg-transparent border-none !text-dash-text text-[13.5px] placeholder:!text-dash-textMuted resize-none max-h-32 min-h-[44px] p-3 focus:outline-none focus:ring-0",
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
                      "h-8 px-3 rounded-lg flex items-center justify-center gap-2 !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60 transition-all motion-reduce:transition-none text-[12px] font-bold",
                      showTemplates && "bg-dash-border/60 !text-dash-text"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Quick replies
                  </button>

                  {showTemplates && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-dash-border rounded-xl shadow-2xl p-3.5 z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in duration-200 motion-reduce:animate-none">
                      <div className="flex items-center justify-between pb-1.5 border-b border-dash-border">
                        <span className="text-[10px] font-bold !text-dash-textMuted">Quick replies (/shortcut)</span>
                        <button
                          onClick={() => setShowQuickReplyCreator(!showQuickReplyCreator)}
                          className="text-[10px] text-dash-accent font-bold hover:underline"
                        >
                          {showQuickReplyCreator ? 'View list' : '+ Create new'}
                        </button>
                      </div>

                      {!showQuickReplyCreator ? (
                        <>
                          <input
                            type="text"
                            placeholder="Search quick replies..."
                            value={quickReplySearch}
                            onChange={(e) => setQuickReplySearch(e.target.value)}
                            className="w-full bg-dash-surface border border-dash-border rounded-lg px-2.5 py-1.5 text-[12px] !text-dash-text placeholder:!text-dash-textMuted focus:outline-none"
                          />
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {filteredQuickReplies.length === 0 ? (
                              <div className="text-[11px] !text-dash-textMuted text-center py-4">No quick replies found. Type '/' in shortcut to filter.</div>
                            ) : (
                              filteredQuickReplies.map((tmpl) => (
                                <button
                                  key={tmpl.id}
                                  onClick={() => {
                                    setText(tmpl.message);
                                    setShowTemplates(false);
                                    textareaRef.current?.focus();
                                  }}
                                  className="w-full flex flex-col items-start px-2.5 py-2 rounded-lg hover:bg-dash-surface text-left transition-all motion-reduce:transition-none group"
                                >
                                  <span className="text-[12px] font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none">{tmpl.shortcut}</span>
                                  <span className="text-[11px] !text-dash-textMuted line-clamp-1 mt-0.5">{tmpl.message}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2 text-left">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold !text-dash-textMuted">Shortcut</label>
                            <input
                              type="text"
                              placeholder="e.g. /welcome"
                              value={newShortcut}
                              onChange={(e) => setNewShortcut(e.target.value)}
                              className="w-full bg-dash-surface border border-dash-border rounded-lg px-2.5 py-1.5 text-[12px] !text-dash-text focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold !text-dash-textMuted">Message</label>
                            <textarea
                              placeholder="Enter response message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              className="w-full bg-dash-surface border border-dash-border rounded-lg px-2.5 py-1.5 text-[12px] !text-dash-text focus:outline-none h-16 resize-none"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={handleCreateQuickReply}
                            className="w-full h-8 bg-dash-accent text-white text-[11px] font-bold"
                          >
                            Save quick reply
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Platform Selector Tabs */}
                {availablePlatforms && availablePlatforms.length > 1 && (
                  <div className="flex items-center bg-dash-surface rounded-lg p-0.5 border border-dash-border">
                    {availablePlatforms.map((p: any) => {
                      const isActive = selectedPlatform === p.platform;
                      return (
                        <button
                          key={p.platform}
                          onClick={() => onPlatformChange && onPlatformChange(p.platform)}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all motion-reduce:transition-none flex items-center gap-1.5 capitalize",
                            isActive
                              ? "bg-dash-accent text-white"
                              : "!text-dash-textMuted hover:!text-dash-text"
                          )}
                        >
                          {p.platform === 'email' && <Mail className="w-3 h-3" />}
                          {p.platform === 'whatsapp' && <MessageCircle className="w-3 h-3 text-green" />}
                          {p.platform === 'sms' && <MessageCircle className="w-3 h-3" />}
                          {p.platform === 'facebook' && <MessageCircle className="w-3 h-3" />}
                          {p.platform === 'instagram' && <Instagram className="w-3 h-3" />}
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
                    className="h-9 w-9 rounded-[8px] bg-white hover:bg-dash-surface border border-dash-border !text-dash-text flex items-center justify-center transition-all motion-reduce:transition-none cursor-pointer"
                    title="Record Voice Note"
                  >
                    <Mic size={16} className="!text-dash-textMuted" />
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={(!text.trim() && !selectedTemplate) || disabled}
                  className={cn(
                    "h-9 px-4 rounded-[8px] flex items-center gap-2 shadow-lg active:scale-95 transition-all motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-50 disabled:pointer-events-none text-[13px] font-bold",
                    isNote
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                      : "bg-dash-accent hover:bg-dash-accent/90 text-white shadow-dash-accent/20"
                  )}
                >
                  <span>{isNote ? 'Save note' : 'Send'}</span>
                  {isNote ? <Lock className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

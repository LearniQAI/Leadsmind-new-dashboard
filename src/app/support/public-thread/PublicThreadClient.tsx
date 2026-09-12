'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Clock, 
  User, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast, Toaster } from 'sonner';

interface Attachment {
  type: string;
  url: string;
  name: string;
  size?: number;
}

interface Message {
  id: string;
  sender_type: 'customer' | 'agent';
  message: string;
  created_at: string;
  attachments?: Attachment[] | null;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  workspace_id: string;
  contact?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

interface PublicThreadClientProps {
  ticket: Ticket;
  initialMessages: Message[];
}

export function PublicThreadClient({ ticket, initialMessages }: PublicThreadClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; size: number } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25MB limit.');
      return;
    }

    setIsUploading(true);
    const uploaderData = new FormData();
    uploaderData.append('file', file);
    uploaderData.append('ticketId', ticket.id);

    try {
      const res = await fetch('/api/support/public-attachments', {
        method: 'POST',
        body: uploaderData
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedFile({
        url: data.fileUrl,
        name: data.fileName,
        size: data.fileSize
      });
      toast.success('File uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setIsSubmitting(true);

    const payload: any = {
      message: replyMessage,
      sender_type: 'customer'
    };

    if (uploadedFile) {
      payload.attachments = [{
        type: 'file',
        url: uploadedFile.url,
        name: uploadedFile.name,
        size: uploadedFile.size
      }];
    }

    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send reply');
      }

      // Append new message to local state
      const newMsg: Message = {
        id: data.reply.id || Math.random().toString(),
        sender_type: 'customer',
        message: replyMessage,
        created_at: new Date().toISOString(),
        attachments: uploadedFile ? [{ ...uploadedFile, type: 'file' }] : null
      };

      setMessages(prev => [...prev, newMsg]);
      setReplyMessage('');
      setUploadedFile(null);
      toast.success('Message sent!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to post reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color mapping functions for visual elegance
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      case 'in_progress':
        return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'resolved':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'closed':
        return 'bg-dash-surface border-dash-border text-dash-textMuted';
      default:
        return 'bg-dash-surface border-dash-border text-dash-textMuted';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'critical':
        return 'bg-rose-50 border-rose-200 text-rose-600';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-600';
      case 'normal':
      case 'medium':
        return 'bg-sky-50 border-sky-200 text-sky-600';
      case 'low':
        return 'bg-slate-100 border-slate-200 text-slate-600';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text font-sans selection:bg-dash-accent/30 flex flex-col antialiased">
      <Toaster theme="light" closeButton />

      {/* HEADER BANNER */}
      <header className="border-b border-dash-border bg-dash-surface backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/15">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-dash-textMuted tracking-wider uppercase">
                <span>LeadsMind Support Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-mono text-dash-textMuted">Ref: #{ticket.id.substring(0, 8)}</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5 max-w-[280px] sm:max-w-md md:max-w-xl truncate text-dash-text">
                {ticket.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border", getStatusStyle(ticket.status))}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className={cn("text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border", getPriorityStyle(ticket.priority))}>
              {ticket.priority} Priority
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SIDEBAR TICKET SPECS */}
        <div className="lg:col-span-1 space-y-4 order-last lg:order-first">
          <div className="bg-dash-surface border border-dash-border rounded-2xl p-5 space-y-4 sticky top-24">
            <h3 className="text-xs font-black uppercase text-dash-textMuted tracking-widest pb-3 border-b border-dash-border">
              Ticket Details
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-dash-textMuted">Submitted By:</span>
                <span className="font-semibold text-dash-text">
                  {ticket.contact?.first_name
                    ? `${ticket.contact.first_name} ${ticket.contact.last_name || ''}`.trim()
                    : 'Customer'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-dash-textMuted">Email:</span>
                <span className="font-mono text-dash-text truncate max-w-[180px]">{ticket.contact?.email || 'N/A'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-dash-textMuted">Created:</span>
                <span className="text-dash-text">
                  {new Date(ticket.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-dash-textMuted">Status:</span>
                <span className="font-semibold capitalize text-dash-text">{ticket.status.replace('_', ' ')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-dash-textMuted">Priority:</span>
                <span className="font-semibold capitalize text-dash-text">{ticket.priority}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-dash-border flex flex-col gap-2">
              <div className="p-3 bg-dash-bg border border-dash-border rounded-xl flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-[11px] text-dash-textMuted leading-normal">
                  Our team reads and handles tickets in real time. You will receive an email notice when someone replies.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MESSAGES FEED AREA */}
        <div className="lg:col-span-2 flex flex-col min-h-[500px] bg-dash-surface border border-dash-border rounded-2xl overflow-hidden">

          {/* Thread list */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[550px] custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-dash-textMuted">
                <MessageSquare className="w-8 h-8 opacity-30 mb-3" />
                <p className="text-xs uppercase tracking-widest font-black">No messages in thread</p>
                <p className="text-[11px] text-dash-textMuted mt-1">Start by sending a message below.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAgent = msg.sender_type === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-3 duration-300",
                      isAgent ? "mr-auto" : "ml-auto flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border",
                      isAgent
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-dash-bg border-dash-border text-dash-textMuted"
                    )}>
                      {isAgent ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble Container */}
                    <div className="space-y-1.5">
                      {/* Name / Date Meta */}
                      <div className={cn(
                        "flex items-center gap-2 text-[10px] font-semibold text-dash-textMuted",
                        !isAgent && "justify-end"
                      )}>
                        <span className={isAgent ? "text-indigo-600 font-extrabold uppercase tracking-wider text-[9px]" : "text-dash-textMuted"}>
                          {isAgent ? 'Support Agent' : 'You'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Bubble Text */}
                      <div className={cn(
                        "rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap shadow-sm border",
                        isAgent
                          ? "bg-dash-bg border-dash-border text-dash-text"
                          : "bg-indigo-600 border-indigo-600 text-white"
                      )}>
                        {msg.message}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={cn(
                            "mt-3.5 pt-3 border-t space-y-1.5",
                            isAgent ? "border-dash-border" : "border-white/20"
                          )}>
                            {msg.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg transition-colors border",
                                  isAgent
                                    ? "text-dash-text hover:text-dash-accent bg-dash-surface hover:bg-dash-border/40 border-dash-border"
                                    : "text-white hover:text-white bg-black/15 hover:bg-black/25 border-white/20"
                                )}
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[180px] font-medium">{file.name}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 ml-auto opacity-60" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply form */}
          <div className="p-4 sm:p-5 border-t border-dash-border bg-dash-surface">
            {ticket.status === 'closed' || ticket.status === 'resolved' ? (
              <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs mb-3">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span className="leading-normal font-semibold">
                  This ticket has been marked as <strong>{ticket.status}</strong>. Sending a new reply will reopen it automatically.
                </span>
              </div>
            ) : null}

            <form onSubmit={handleSendReply} className="mt-2 space-y-3">
              <div className="relative">
                <textarea
                  required
                  rows={3}
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full bg-dash-bg border border-dash-border hover:border-dash-accent/40 rounded-xl px-4 py-3 text-xs text-dash-text placeholder-dash-textMuted focus:outline-none focus:border-dash-accent transition resize-none leading-relaxed"
                />
              </div>

              {/* Uploaded File Indicator */}
              {uploadedFile && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-bold">{uploadedFile.name}</span>
                    <span className="text-[9px] text-dash-textMuted font-mono">({Math.round(uploadedFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="text-[9.5px] uppercase font-black tracking-wider hover:text-emerald-900 ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Toolbar Actions */}
              <div className="flex items-center justify-between">
                <label className="text-dash-textMuted hover:text-dash-text transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                  <span>{isUploading ? 'Uploading file...' : 'Attach document'}</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading || isSubmitting}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || !replyMessage.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98] select-none shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Reply Thread</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

      </main>
    </div>
  );
}

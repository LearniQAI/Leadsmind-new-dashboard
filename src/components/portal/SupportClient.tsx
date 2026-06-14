'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Headphones, Send, Clock, Paperclip, CheckCircle2, ShieldAlert, Star, AlertCircle, FileText, ArrowLeft, Plus } from 'lucide-react';
import { createPortalSupportTicket, replyToSupportTicket, submitCSATRating } from '@/app/actions/portal';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SupportClientProps {
  initialTickets: any[];
  workspaceId: string;
  contactId: string;
}

export default function SupportClient({ initialTickets, workspaceId, contactId }: SupportClientProps) {
  const [tickets, setTickets] = useState<any[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  
  // File upload state for replies
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSAT rating states
  const [csatRating, setCsatRating] = useState<number>(5);
  const [csatComment, setCsatComment] = useState('');
  const [csatSubmitted, setCsatSubmitted] = useState(false);

  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load thread messages for active ticket
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }
    
    async function loadThread() {
      setLoadingMessages(true);
      setCsatSubmitted(false);
      try {
        const { data, error } = await supabase
          .from('support_ticket_messages')
          .select('*, attachments:ticket_attachments(*)')
          .eq('ticket_id', selectedTicket.id)
          .eq('is_internal_note', false)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err: any) {
        toast.error("Failed to load conversation thread: " + err.message);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadThread();
  }, [selectedTicket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedTicket]);

  const handleTicketCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const category = formData.get('category') as string;

    if (!title || !description) {
      toast.error("Subject and description are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createPortalSupportTicket({ title, description, priority, category });
        if (res.success) {
          toast.success("Support ticket opened successfully.");
          // Reset form
          (e.target as HTMLFormElement).reset();
          // Reload tickets
          const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('contact_id', contactId)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
          setTickets(data || []);
        } else {
          toast.error(res.error || "Failed to create ticket");
        }
      } catch (err: any) {
        toast.error("Error creating ticket: " + err.message);
      }
    });
  };

  // Upload attachment file (specifically mapping to workspace_id folder name check for security policies)
  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedTicket) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setUploadingFile(true);
    try {
      const storagePath = `${workspaceId}/${selectedTicket.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { error } = await supabase.storage
        .from('support-ticket-files')
        .upload(storagePath, file, { upsert: true });

      if (error) throw error;

      setAttachedFiles([
        ...attachedFiles,
        {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          path: storagePath
        }
      ]);
      toast.success(`"${file.name}" attached successfully.`);
    } catch (err: any) {
      toast.error("File upload failed: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && attachedFiles.length === 0) return;

    const messageContent = replyMessage;
    const currentAttachments = attachedFiles;
    
    // Clear inputs optimistically
    setReplyMessage('');
    setAttachedFiles([]);

    try {
      const res = await replyToSupportTicket(selectedTicket.id, messageContent, currentAttachments);
      if (res.success) {
        // Refetch thread
        const { data } = await supabase
          .from('support_ticket_messages')
          .select('*, attachments:ticket_attachments(*)')
          .eq('ticket_id', selectedTicket.id)
          .eq('is_internal_note', false)
          .order('created_at', { ascending: true });
        setMessages(data || []);
      } else {
        toast.error(res.error || "Failed to send message reply.");
      }
    } catch (err: any) {
      toast.error("Error sending reply: " + err.message);
    }
  };

  const handleCSATSubmit = async () => {
    try {
      const res = await submitCSATRating(selectedTicket.id, csatRating, csatComment);
      if (res.success) {
        toast.success("Thank you for your rating!");
        setCsatSubmitted(true);
        // Refresh ticket status locally
        setSelectedTicket({
          ...selectedTicket,
          csat_rating: csatRating,
          csat_feedback: csatComment
        });
      } else {
        toast.error(res.error || "Failed to save feedback.");
      }
    } catch (err: any) {
      toast.error("Feedback submit error: " + err.message);
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ── LEFT SECTION: TICKET LIST OR WIZARD CREATION ── */}
      <div className={cn("space-y-6 lg:block", selectedTicket ? "hidden" : "block")}>
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[#4a5a82] uppercase tracking-[1.5px]">
            My Support Tickets
          </h3>
          <button
            onClick={() => setSelectedTicket(null)}
            className="lg:hidden text-xs text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <Plus size={14} /> New Ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-[var(--n800)] border border-[var(--bdr)] p-12 rounded-3xl text-center space-y-3 shadow-lg">
            <Headphones size={32} className="text-[#4a5a82] opacity-40 mx-auto" />
            <p className="text-xs text-[var(--t3)] font-sans">No support tickets opened yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {tickets.map((t, idx) => {
              const isSelected = selectedTicket?.id === t.id;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedTicket(t)}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer transition-all bg-[var(--n800)] text-left relative overflow-hidden group shadow-md",
                    isSelected
                      ? "border-[#8b5cf6] shadow-[#8b5cf6]/5"
                      : "border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[9.5px] font-mono text-[#4a5a82] uppercase font-bold">
                        Category: {t.category || 'General'}
                      </span>
                      <h4 className="text-xs font-bold text-[#eef2ff] uppercase tracking-wide font-space mt-1 group-hover:text-white line-clamp-1">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-[var(--t3)] font-sans line-clamp-1 mt-1">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border", getStatusBadgeColor(t.status))}>
                        {t.status}
                      </span>
                      <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", getPriorityBadgeColor(t.priority))}>
                        {t.priority}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 mt-4 flex justify-between items-center text-[9px] text-[#4a5a82] font-mono uppercase">
                    <span>ID: #{t.id.substring(0, 8)}</span>
                    <span>{new Date(t.created_at).toLocaleDateString('en-ZA')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT SECTION: TICKET THREAD CHAT ROOM OR NEW TICKET FORM ── */}
      <div className="lg:col-span-2">
        {selectedTicket ? (
          /* THREAD CHAT ROOM */
          <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
            
            {/* Thread Header */}
            <div className="p-5 border-b border-white/5 bg-[#0b1329]/50 flex justify-between items-center gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg bg-white/5 text-[var(--t3)] hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <span className="text-[9.5px] font-mono text-blue-400 uppercase font-black">
                    #{selectedTicket.id.substring(0, 8).toUpperCase()} • {selectedTicket.category || 'General'}
                  </span>
                  <h4 className="text-sm font-bold text-white font-space uppercase mt-0.5 line-clamp-1">
                    {selectedTicket.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-wider", getStatusBadgeColor(selectedTicket.status))}>
                  {selectedTicket.status}
                </span>
              </div>
            </div>

            {/* Thread Chat Dialogue Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#04091a]/10">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#4a5a82]">
                  <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-blue-500/10 animate-spin mb-3" />
                  <p className="text-[9.5px] font-black uppercase tracking-wider font-mono">Retrieving ticket thread...</p>
                </div>
              ) : (
                <>
                  {/* Initial Description Node */}
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-1 text-left">
                    <span className="text-[9px] font-mono text-[#4a5a82] uppercase font-bold">Opened Issue Brief</span>
                    <p className="text-xs text-[#eef2ff] leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  {/* Messages list */}
                  {messages.map((m, mIdx) => {
                    const isClient = m.sender_type === 'customer';
                    const isSys = m.sender_type === 'system';

                    if (isSys) {
                      return (
                        <div key={mIdx} className="flex justify-center text-[10px] text-[#4a5a82] italic font-mono uppercase tracking-wide">
                          — {m.message} —
                        </div>
                      );
                    }

                    return (
                      <div
                        key={mIdx}
                        className={cn(
                          "flex flex-col max-w-[80%] space-y-1 text-left",
                          isClient ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <span className="text-[9px] font-mono text-[#4a5a82] uppercase">
                          {isClient ? 'You' : 'Assigned Support Personnel'} • {new Date(m.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <div
                          className={cn(
                            "p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-md",
                            isClient
                              ? "bg-[#2563eb] text-white rounded-tr-none"
                              : "bg-[#0b1329] border border-white/5 text-[#eef2ff] rounded-tl-none"
                          )}
                        >
                          {m.message}

                          {/* Message attachments */}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                              {m.attachments.map((file: any, fIdx: number) => (
                                <a
                                  key={fIdx}
                                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/support-ticket-files/${file.storage_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[9.5px] font-black uppercase text-blue-300 hover:text-white bg-black/15 p-2 rounded-lg transition-colors"
                                >
                                  <FileText size={12} /> {file.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* CSAT Prompt Overlay inside message log */}
                  {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                    <div className="bg-[#111d47]/20 border border-white/5 p-6 rounded-[24px] space-y-4 text-center mt-6">
                      <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mx-auto">
                        <Star size={20} className="fill-current" />
                      </div>
                      
                      {selectedTicket.csat_rating || csatSubmitted ? (
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Satisfaction Feedback Received</h4>
                          <p className="text-[11px] text-[var(--t3)] leading-relaxed">
                            Thank you! Your rating of <strong>{selectedTicket.csat_rating || csatRating}/5 Stars</strong> has been logged to our CRM ledger.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-w-sm mx-auto">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">How was your service?</h4>
                            <p className="text-[10px] text-[var(--t3)]">Please rate your support resolution quality</p>
                          </div>

                          {/* Star picker */}
                          <div className="flex justify-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setCsatRating(star)}
                                className="text-yellow-400 hover:scale-110 transition-transform"
                              >
                                <Star 
                                  size={24} 
                                  className={cn(star <= csatRating ? "fill-current" : "opacity-35")} 
                                />
                              </button>
                            ))}
                          </div>

                          <textarea
                            placeholder="Provide any comments or review regarding the support resolution (Optional)"
                            value={csatComment}
                            onChange={(e) => setCsatComment(e.target.value)}
                            className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2 text-white focus:border-blue-500 outline-none text-[11px] h-14 resize-none font-sans"
                          />

                          <button
                            onClick={handleCSATSubmit}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl uppercase tracking-wider text-[9px] font-black h-9 transition-colors active:scale-95"
                          >
                            Submit CSAT Review
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Chat Reply Actions Form (Only available if ticket is not closed/resolved) */}
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
              <form onSubmit={handleSendReply} className="p-4 border-t border-white/5 bg-[#0b1329]/50 space-y-3 shrink-0">
                
                {/* Attached file tags */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1.5">
                    {attachedFiles.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-black/30 border border-white/5 px-2.5 py-1 rounded-lg text-[9.5px] text-[#94a3c8] font-mono">
                        <FileText size={11} /> {file.name} 
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 font-bold ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* File attach button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-3 rounded-xl bg-white/5 text-[var(--t3)] hover:text-white hover:bg-white/10 transition-colors shrink-0 disabled:opacity-50 relative"
                    title="Attach file (Max 10MB)"
                  >
                    <Paperclip size={16} />
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachFile}
                  />

                  {/* Input message */}
                  <input
                    type="text"
                    placeholder="Type your message reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-grow bg-[#080f28] border border-white/5 rounded-xl px-4 h-11 text-xs outline-none focus:border-blue-500 text-white font-sans"
                  />

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={!replyMessage.trim() && attachedFiles.length === 0}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-[#0b1329] disabled:text-[#4a5a82] text-white transition-colors shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* NEW TICKET CREATION WIZARD FORM */
          <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-3xl p-6 shadow-xl text-left space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)]">Submit Help Request</h3>
              <p className="text-[10px] text-[var(--t3)] uppercase tracking-wider mt-1">
                Open a tech or billing support desk ticket
              </p>
            </div>

            <form onSubmit={handleTicketCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue="General"
                    className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-[#eef2ff]"
                  >
                    <option value="General">General</option>
                    <option value="Billing">Billing (Invoicing/Fees)</option>
                    <option value="Tech">Technical (Portal/LMS)</option>
                    <option value="Complaint">Complaint</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                    Priority Tier
                  </label>
                  <select
                    name="priority"
                    defaultValue="normal"
                    className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-[#eef2ff]"
                  >
                    <option value="low">Low (Inquiry)</option>
                    <option value="normal">Normal (Standard help)</option>
                    <option value="high">High (Blocked tasks)</option>
                    <option value="urgent">Urgent (System issue)</option>
                  </select>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Summarize the issue (e.g. Cannot download Sprint 3 course certificate)"
                  required
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white placeholder-[#4a5a82]"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Detailed Description
                </label>
                <textarea
                  name="description"
                  rows={6}
                  placeholder="Provide complete details regarding your issue, including course names, invoice numbers, or scheduling details so our support team can verify the context..."
                  required
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 text-white placeholder-[#4a5a82] resize-none leading-relaxed font-sans"
                />
              </div>

              <div className="bg-[#111d47]/20 border border-white/5 p-4 rounded-xl flex gap-3 text-[10.5px] text-[#4a5a82] leading-relaxed">
                <AlertCircle size={14} className="shrink-0 text-blue-400 mt-0.5" />
                <span>
                  Support tickets are routed to LeadsMind operator queues. General/Billing queries are answered within 24 hours. Tech issues receive priority queue status.
                </span>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                {isPending ? "Filing Ticket..." : <><Send size={12} /> File Support Ticket</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

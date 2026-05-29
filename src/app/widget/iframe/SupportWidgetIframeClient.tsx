'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, Paperclip, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast, Toaster } from 'sonner';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface WidgetSettings {
  workspace_id: string;
  widget_key: string;
  welcome_message: string;
  brand_color: string;
  logo_url?: string | null;
  categories: Category[];
  departments?: any[];
}

interface SupportWidgetIframeClientProps {
  settings: WidgetSettings;
  isInline: boolean;
}

export function SupportWidgetIframeClient({ settings, isInline }: SupportWidgetIframeClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; size: number } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    description: '',
    priority: 'normal',
    category: settings.categories?.[0]?.name || 'General Inquiry'
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    setIsUploading(true);
    const uploaderData = new FormData();
    uploaderData.append('file', file);
    uploaderData.append('workspaceId', settings.workspace_id);

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
      toast.success('Attachment uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    // Format the description to include category and attachments if any
    let fullDescription = formData.description;
    if (formData.category) {
      fullDescription = `[Category: ${formData.category}]\n\n` + fullDescription;
    }

    const payload: any = {
      workspaceId: settings.workspace_id,
      name: formData.name,
      email: formData.email,
      subject: formData.subject,
      description: fullDescription,
      priority: formData.priority
    };

    // If file attachment exists, pass it along in a structured metadata attachment field
    if (uploadedFile) {
      payload.attachments = [{
        type: 'file',
        url: uploadedFile.url,
        name: uploadedFile.name,
        size: uploadedFile.size
      }];
    }

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit ticket.');
      }

      setTicketId(data.ticket?.id || null);
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred while submitting your ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setTicketId(null);
    setUploadedFile(null);
    setFormData({
      name: '',
      email: '',
      subject: '',
      description: '',
      priority: 'normal',
      category: settings.categories?.[0]?.name || 'General Inquiry'
    });
  };

  const brandColor = settings.brand_color || '#2563eb';

  return (
    <div className={cn(
      "min-h-screen bg-[#04091a] text-white flex flex-col font-sans selection:bg-primary/30",
      isInline ? "p-0 bg-transparent border-0" : "p-0"
    )}>
      <Toaster theme="dark" closeButton />

      {/* HEADER CARD */}
      {!isInline && (
        <div 
          className="px-6 py-5 flex items-center justify-between relative overflow-hidden border-b border-white/5 select-none shrink-0"
          style={{ backgroundColor: brandColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-white font-extrabold text-[13.5px] uppercase tracking-wider">Support Desk</h3>
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest mt-0.5">We reply within a few hours</p>
            </div>
          </div>
        </div>
      )}

      {/* BODY / FORM */}
      <div className={cn(
        "flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar",
        isInline ? "px-0 py-2" : ""
      )}>
        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="text-white font-extrabold text-lg uppercase tracking-tight mb-2">Request Logged!</h4>
            <p className="text-[#94a3c8] text-xs leading-normal max-w-[280px] mb-6">
              Your support ticket has been registered. An auto-reply reference email was sent to your mailbox.
            </p>
            {ticketId && (
              <a
                href={`/support/public-thread?id=${ticketId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors mb-4"
              >
                View Ticket Thread Online
              </a>
            )}
            <button 
              onClick={resetForm}
              className="text-[10px] uppercase font-black tracking-widest text-[#4a5a82] hover:text-white transition-colors"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Message header */}
            {!isInline && (
              <div className="text-[#94a3c8] text-[11.5px] leading-normal mb-1 bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                👋 {settings.welcome_message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-[#4a5a82] tracking-widest block">Full Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-[#4a5a82] tracking-widest block">Email Address *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-[#4a5a82] tracking-widest block">Inquiry Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#080f28] border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition cursor-pointer"
                >
                  {(settings.categories || []).map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  {(!settings.categories || settings.categories.length === 0) && (
                    <option value="General Inquiry">General Inquiry</option>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-[#4a5a82] tracking-widest block">Priority</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full bg-[#080f28] border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Urgent / Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-[#4a5a82] tracking-widest block">Subject *</label>
              <input
                required
                type="text"
                value={formData.subject}
                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition"
                placeholder="Brief summary of your request"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-[#4a5a82] tracking-widest block">Detailed Message *</label>
              <textarea
                required
                rows={isInline ? 5 : 4}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition resize-none leading-relaxed"
                placeholder="Explain what you need assistance with..."
              />
            </div>

            {/* Uploaded File Pill */}
            {uploadedFile && (
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400 text-xs animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-bold">{uploadedFile.name}</span>
                  <span className="text-[9px] text-[#4a5a82] font-mono">({Math.round(uploadedFile.size / 1024)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-[9.5px] uppercase font-black tracking-wider hover:text-emerald-300 ml-2"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <label className="text-[#4a5a82] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
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
                disabled={isSubmitting || isUploading}
                className="flex items-center gap-2 px-6 h-10 rounded-xl text-white text-xs font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98] select-none hover:shadow-xl shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Ticket</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
export default SupportWidgetIframeClient;

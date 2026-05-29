'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Paperclip, ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SupportWidgetProps {
  workspaceId: string;
  brandColor?: string;
  logoUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function SupportWidget({ 
  workspaceId, 
  brandColor = '#2563eb',
  logoUrl,
  position = 'bottom-right' 
}: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    subject: '',
    description: '',
    priority: 'normal'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create ticket via standard API route
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          ...formData
        })
      });

      if (!res.ok) throw new Error('Failed to submit ticket');
      
      setSubmitted(true);
      toast.success('Support ticket submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({
      email: '',
      name: '',
      subject: '',
      description: '',
      priority: 'normal'
    });
  };

  return (
    <div className={cn(
      "fixed z-[9999] flex flex-col items-end gap-4 pointer-events-none",
      position === 'bottom-right' ? "bottom-6 right-6" : "bottom-6 left-6 items-start"
    )}>
      
      {/* WIDGET PANEL */}
      <div className={cn(
        "pointer-events-auto w-[360px] sm:w-[400px] bg-[#04091a] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 transform origin-bottom-right",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-8 pointer-events-none absolute bottom-20"
      )}>
        {/* Header */}
        <div 
          className="px-6 py-5 flex items-center justify-between border-b border-white/5 relative overflow-hidden"
          style={{ backgroundColor: brandColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-sm tracking-wide">Support Desk</h3>
              <p className="text-white/70 text-xs mt-0.5">We typically reply within 2 hours</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors relative z-10"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
          {submitted ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">Request Received!</h4>
              <p className="text-[#94a3c8] text-sm mb-6">
                Your ticket has been logged in our system. A support agent will be in touch with you shortly via email.
              </p>
              <button 
                onClick={resetForm}
                className="text-sm font-semibold text-white/60 hover:text-white"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-wider">Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-wider">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-wider">Subject *</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="How can we help?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-wider">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors resize-none"
                  placeholder="Please provide details about your issue..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  type="button"
                  className="text-[#4a5a82] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach file
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* LAUNCHER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)] text-white transition-transform hover:scale-105 active:scale-95",
          isOpen ? "rotate-90" : "rotate-0"
        )}
        style={{ backgroundColor: brandColor }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

    </div>
  );
}

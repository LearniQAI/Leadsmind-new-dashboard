'use client';

import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { User, Mail, Phone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export interface FormBlockElementProps {
  buttonText?: string;
  placeholderName?: string;
  placeholderEmail?: string;
  placeholderPhone?: string;
  showPhone?: boolean;
}

export function FormBlockElement({
  buttonText = 'Secure Your Spot',
  placeholderName = 'Full Name',
  placeholderEmail = 'Email Address',
  placeholderPhone = 'Phone Number',
  showPhone = true
}: FormBlockElementProps) {
  // Safe craftjs connection hook (attaches block to drag-and-drop workspace)
  const { connectors: { connect, drag } } = useNode((node) => ({
    selected: node.events.selected
  }));
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      // Mock action callback to simulate handlePageFormSubmission
      const response = await fetch('/api/funnel/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          submittedAt: new Date().toISOString()
        })
      });
      
      toast.success('Your information has been securely captured!');
      setFormData({ name: '', email: '', phone: '' });
    } catch (err) {
      toast.error('Submission error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className="w-full max-w-md mx-auto p-8 rounded-2xl bg-[#0c1535]/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl relative overflow-hidden"
    >
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]" />
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82]">Your Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5a82]" />
            <input 
              type="text" 
              placeholder={placeholderName}
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-xs font-semibold text-[#eef2ff] placeholder:text-[#2a3557] focus:border-[#3b82f6]/50 focus:bg-white/[0.07] outline-none transition-all"
            />
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82]">Your Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5a82]" />
            <input 
              type="email" 
              placeholder={placeholderEmail}
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-xs font-semibold text-[#eef2ff] placeholder:text-[#2a3557] focus:border-[#3b82f6]/50 focus:bg-white/[0.07] outline-none transition-all"
            />
          </div>
        </div>

        {/* Phone Input */}
        {showPhone && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82]">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5a82]" />
              <input 
                type="tel" 
                placeholder={placeholderPhone}
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-xs font-semibold text-[#eef2ff] placeholder:text-[#2a3557] focus:border-[#3b82f6]/50 focus:bg-white/[0.07] outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#2563eb]/25 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Processing...' : (
            <>
              {buttonText}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

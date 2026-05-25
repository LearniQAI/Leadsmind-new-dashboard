'use client';

import React, { useState, useEffect } from 'react';
import { Mail, X, Check } from 'lucide-react';
import { subscribeToNewsletter } from '@/app/actions/publicBlog';

interface ExitIntentProps {
  workspaceId: string;
}

export default function ExitIntentCapture({ workspaceId }: ExitIntentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string>('');

  useEffect(() => {
    // Read WhatsApp referral tracking if cached
    const cached = localStorage.getItem('wa_referral_code');
    if (cached) setRefCode(cached);

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger if mouse leaves the top of the viewport
      if (e.clientY < 20) {
        const shown = sessionStorage.getItem('exit_intent_triggered');
        if (!shown) {
          setIsOpen(true);
          sessionStorage.setItem('exit_intent_triggered', '1');
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSubscribing(true);
      setSubMsg(null);
      setSubError(null);
      const res = await subscribeToNewsletter(email.trim(), workspaceId, refCode || undefined);
      if (res.error) {
        setSubError(res.error);
      } else {
        setSubMsg(res.message || 'Thank you for subscribing!');
        setEmail('');
        setTimeout(() => setIsOpen(false), 2000);
      }
    } catch (err: any) {
      setSubError(err.message || 'Subscription failed.');
    } finally {
      setSubscribing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#04091a]/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-[#080f28] border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-5">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-2 animate-bounce">
          <Mail className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Wait! Before you go</span>
          <h3 className="font-space-grotesk text-xl font-black text-white leading-tight">Get Exclusive Business Blueprints</h3>
          <p className="text-xs text-white/50 leading-relaxed max-w-sm mx-auto">
            Subscribe to our weekly newsletter and receive the <b>"Funnel Optimization & WhatsApp Conversion Guide"</b> for free.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-dm-sans text-left">
          <div className="relative">
            <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-business-email@co.za"
              className="w-full bg-[#04091a] border border-white/15 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-primary/50 transition"
              required
              disabled={subscribing}
            />
          </div>

          <button
            type="submit"
            disabled={subscribing}
            className="w-full bg-primary hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition disabled:opacity-50"
          >
            {subscribing ? 'Subscribing...' : 'Yes, Send Me The Guide'}
          </button>

          {subMsg && (
            <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1 mt-1.5 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{subMsg}</span>
            </div>
          )}
          {subError && (
            <div className="text-[10px] text-red-400 font-bold text-center mt-1.5">
              {subError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

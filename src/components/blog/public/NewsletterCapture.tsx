'use client';

import React, { useState } from 'react';
import { subscribeToNewsletter } from '@/app/actions/publicBlog';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

interface NewsletterCaptureProps {
  workspaceId?: string;
}

export const NewsletterCapture: React.FC<NewsletterCaptureProps> = ({ workspaceId }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setStatus('loading');
      const res = await subscribeToNewsletter(email.trim(), workspaceId);
      if (res.error) {
        setStatus('error');
        setMessage(res.error);
      } else {
        setStatus('success');
        setMessage(res.message || 'Thank you for subscribing!');
        setEmail('');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#EEF2FF] to-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-2">
        <h3 className="font-space text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
          Subscribe to <span className="text-primary">Corporate Insights</span>
        </h3>
        <p className="text-xs text-[#64748B] leading-relaxed max-w-md">
          Join 10,000+ industry executives. Get curated frameworks, marketing strategies, and conversion blueprints delivered directly to your inbox.
        </p>
      </div>

      {status === 'success' ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Lead Capture Successful</p>
            <p className="text-xs mt-0.5 text-emerald-600">{message}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your professional email..."
              className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-primary transition"
              required
              disabled={status === 'loading'}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="w-full bg-primary hover:bg-blue-600 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Unlock Exclusive Access</span>
            )}
          </button>

          {status === 'error' && (
            <p className="text-[10px] text-red-600 font-semibold mt-1.5 leading-normal">
              ⚠️ {message}
            </p>
          )}
        </form>
      )}

      <p className="text-[9px] text-[#94A3B8] leading-normal text-center pt-2">
        🔒 GDPR Compliant. Your data is piped directly into the secure LeadsMind CRM. Unsubscribe at any time.
      </p>
    </div>
  );
};
export default NewsletterCapture;

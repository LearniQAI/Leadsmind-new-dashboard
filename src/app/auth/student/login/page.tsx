'use client';

import React, { useState, useTransition } from 'react';
import { Mail, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StudentLoginPage() {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/student/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          setSuccess(true);
          toast.success('Magic link dispatched successfully!');
        }
      } catch {
        toast.error('Connection failed. Please try again.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-white flex flex-col items-center justify-center p-6 font-body relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#080f28]/60 border border-white/5 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-primary w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Student Portal</span>
          <h2 className="text-2xl font-space-grotesk font-black uppercase tracking-tight text-white mt-1.5">
            Passwordless <span className="text-primary-light">Access</span>
          </h2>
          <p className="text-xs text-white/40 mt-2">
            Enter your email to receive a secure, single-use login token
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              ✓
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Check Your Inbox</h3>
            <p className="text-[11px] text-white/50 leading-relaxed">
              We've dispatched a secure single-use magic link targeting your email <strong>{email}</strong>. It will remain active for 15 minutes.
            </p>
            <Button
              variant="ghost"
              onClick={() => setSuccess(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-primary-light hover:bg-white/5 w-full mt-2"
            >
              Request another link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-white/20 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs outline-none focus:border-primary text-white font-mono"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/95 text-white rounded-2xl uppercase tracking-wider text-[10px] font-black h-12 shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" /> Generating Token...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Request Magic Link
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-[10px] font-mono font-bold uppercase tracking-widest text-white/20">
        Secured by Cryptographic Tokens • LeadsMind
      </div>
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import { Mail, Phone, Lock, Loader2, Sparkles, ShieldCheck, Chrome } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function PortalLoginPage() {
  const [activeTab, setActiveTab] = useState<'magic' | 'otp' | 'password'>('magic');
  
  // Magic Link States
  const [magicEmail, setMagicEmail] = useState('');
  const [magicChannel, setMagicChannel] = useState<'email' | 'whatsapp'>('email');
  const [magicSuccess, setMagicSuccess] = useState(false);

  // OTP States
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Password States
  const [passEmail, setPassEmail] = useState('');
  const [passWord, setPassWord] = useState('');

  const [isPending, startTransition] = useTransition();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/portal/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: magicEmail, channel: magicChannel })
        });
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          setMagicSuccess(true);
          toast.success(`Magic link sent via ${magicChannel === 'whatsapp' ? 'WhatsApp' : 'email'}!`);
        }
      } catch {
        toast.error('Connection failed. Please try again.');
      }
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/portal/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: otpPhone })
        });
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          setOtpSent(true);
          toast.success('6-digit OTP code sent via WhatsApp!');
        }
      } catch {
        toast.error('Connection failed. Please try again.');
      }
    });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error('OTP code is required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/portal/otp-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: otpPhone, code: otpCode })
        });
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else if (data.redirectUrl) {
          toast.success('OTP verified! Logging in...');
          window.location.href = data.redirectUrl;
        }
      } catch {
        toast.error('Verification failed. Please check connection.');
      }
    });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passEmail.trim() || !passWord.trim()) {
      toast.error('Email and password are required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/portal/password-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: passEmail, password: passWord })
        });
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else if (data.redirectUrl) {
          toast.success('Credentials verified! Logging in...');
          window.location.href = data.redirectUrl;
        }
      } catch {
        toast.error('Sign in failed. Please try again.');
      }
    });
  };

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${appUrl}/portal/dashboard`
        }
      });
      if (error) toast.error(error.message);
    } catch {
      toast.error('OAuth connection failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#080f28]/60 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/5">
            <ShieldCheck className="text-blue-500 w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 font-mono">Client Portal</span>
          <h2 className="text-2xl font-space-grotesk font-black uppercase tracking-tight text-[#eef2ff] mt-1.5 font-space">
            Portal <span className="text-blue-400">Entry</span>
          </h2>
          <p className="text-xs text-[#94a3c8] mt-2">
            Secure multi-channel entry point for portal clients
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-white/5 mb-6 gap-2">
          {[
            { id: 'magic', label: 'Magic Link' },
            { id: 'otp', label: 'WhatsApp OTP' },
            { id: 'password', label: 'Password' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setMagicSuccess(false);
                setOtpSent(false);
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 font-black'
                  : 'border-transparent text-[#4a5a82] hover:text-[#94a3c8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. MAGIC LINK VIEW */}
        {activeTab === 'magic' && (
          magicSuccess ? (
            <div className="text-center space-y-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 font-bold">
                ✓
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Check Your Inbox</h3>
              <p className="text-[11px] text-[#94a3c8] leading-relaxed">
                We've dispatched a secure single-use access link targeting <strong>{magicEmail}</strong>. It will remain active for 15 minutes.
              </p>
              <button
                onClick={() => setMagicSuccess(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-white/5 w-full mt-2 py-2 rounded-xl transition-all border border-white/5"
              >
                Request another link
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-[#4a5a82] w-4 h-4" />
                  <input
                    type="email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-[#111d47]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Dispatch Channel
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-[#111d47]/30 border border-white/5 rounded-2xl cursor-pointer hover:bg-[#111d47]/50 transition-all">
                    <input
                      type="radio"
                      name="magicChannel"
                      checked={magicChannel === 'email'}
                      onChange={() => setMagicChannel('email')}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-[#94a3c8]">Email Link</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-[#111d47]/30 border border-white/5 rounded-2xl cursor-pointer hover:bg-[#111d47]/50 transition-all">
                    <input
                      type="radio"
                      name="magicChannel"
                      checked={magicChannel === 'whatsapp'}
                      onChange={() => setMagicChannel('whatsapp')}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-[#94a3c8]">WhatsApp</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl uppercase tracking-wider text-[10px] font-black h-12 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> Dispatching Link...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Request Magic Link
                  </>
                )}
              </button>
            </form>
          )
        )}

        {/* 2. WHATSAPP OTP VIEW */}
        {activeTab === 'otp' && (
          otpSent ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Enter 6-digit Verification PIN
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-3.5 text-[#4a5a82] w-4 h-4" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full bg-[#111d47]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none focus:border-blue-500 text-white font-mono tracking-[0.5em] text-center font-bold"
                    required
                    disabled={isPending}
                  />
                </div>
                <p className="text-[10px] text-[#4a5a82] text-center mt-1">
                  Sent to {otpPhone}. Pin expires in 5 minutes.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="flex-1 border border-white/5 hover:bg-white/5 text-white rounded-2xl uppercase tracking-wider text-[10px] font-bold h-12 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl uppercase tracking-wider text-[10px] font-black h-12 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  {isPending ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    'Verify PIN & Login'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  WhatsApp Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-[#4a5a82] w-4 h-4" />
                  <input
                    type="tel"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    placeholder="+27 82 123 4567"
                    className="w-full bg-[#111d47]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl uppercase tracking-wider text-[10px] font-black h-12 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> Dispatching PIN...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Send Verification PIN
                  </>
                )}
              </button>
            </form>
          )
        )}

        {/* 3. TRADITIONAL PASSWORD VIEW */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-[#4a5a82] w-4 h-4" />
                <input
                  type="email"
                  value={passEmail}
                  onChange={(e) => setPassEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-[#4a5a82] w-4 h-4" />
                <input
                  type="password"
                  value={passWord}
                  onChange={(e) => setPassWord(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl uppercase tracking-wider text-[10px] font-black h-12 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" /> Signing In...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Sign In with Password
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[#4a5a82] text-[9px] uppercase tracking-wider font-bold">Or Continue With</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending}
              className="w-full h-11 border border-white/5 bg-[#111d47]/20 hover:bg-[#111d47]/40 text-[#eef2ff] text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <Chrome className="w-4 h-4 text-rose-400" />
              Sign in with Google
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-[10px] font-mono font-bold uppercase tracking-widest text-[#4a5a82]">
        Secured by Cryptographic Tokens • LeadsMind Portal
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { unsubscribeEmail } from '@/app/actions/popia';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const workspaceIdParam = searchParams.get('workspace_id') || '';
  const tokenParam = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (workspaceIdParam) setWorkspaceId(workspaceIdParam);
    if (tokenParam) setToken(tokenParam);
  }, [emailParam, workspaceIdParam, tokenParam]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !workspaceId || !token) {
      setStatus('error');
      setErrorMessage('This unsubscribe link is missing required parameters or is invalid.');
      return;
    }

    setStatus('loading');
    try {
      const res = await unsubscribeEmail(email, workspaceId, token);
      if (res.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(res.error || 'Failed to opt-out.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage('An unexpected error occurred while processing your request.');
    }
  };

  return (
    <div className="w-full max-w-md bg-[#080f28] border border-white/5 rounded-[24px] shadow-2xl p-8 text-center relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo/Icon */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/5 text-[#3b82f6] mb-6 shadow-lg">
        <i className="fa-solid fa-envelope-circle-check text-2xl"></i>
      </div>

      {status === 'success' ? (
        <div className="space-y-4">
          <h1 className="text-[20px] font-black text-[#eef2ff] uppercase tracking-tight font-space-grotesk">
            Unsubscribed <span className="text-[#10b981]">Successful</span>
          </h1>
          <p className="text-[13px] text-[#94a3c8] leading-relaxed">
            Your email <strong className="text-white font-mono">{email}</strong> has been successfully removed from our communication lists. You will no longer receive marketing broadcasts or alerts from this workspace.
          </p>
          <div className="pt-2 text-[11px] text-[#4a5a82] uppercase tracking-[1px] font-bold">
            POPIA Compliance Secured
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-[20px] font-black text-[#eef2ff] uppercase tracking-tight font-space-grotesk">
              Confirm <span className="text-[#3b82f6]">Unsubscribe</span>
            </h1>
            <p className="text-[12px] text-[#94a3c8] leading-relaxed">
              Confirm you want to stop receiving all electronic communications and marketing campaigns.
            </p>
          </div>

          {status === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 text-left flex gap-2">
              <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest mb-1.5 font-dm-sans">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                readOnly
                placeholder="Enter your email"
                required
                className="w-full bg-[#04091a] border border-white/5 rounded-xl p-3 text-[13px] text-white/70 cursor-not-allowed font-mono"
              />
              <p className="text-[10px] text-[#4a5a82] mt-1">
                This is tied to the secure link you clicked and can't be edited.
              </p>
            </div>

            <input type="hidden" value={workspaceId} />
            <input type="hidden" value={token} />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full h-11 bg-red-500 text-white hover:bg-red-500/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[13px] font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                Processing Opt-out...
              </>
            ) : (
              <>
                <i className="fa-solid fa-user-slash text-[12px]"></i>
                Unsubscribe My Email
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#04091a] flex items-center justify-center p-6 font-dm-sans">
      <Suspense fallback={
        <div className="w-full max-w-md bg-[#080f28] border border-white/5 rounded-[24px] shadow-2xl p-8 text-center flex flex-col items-center justify-center">
          <i className="fa-solid fa-spinner animate-spin text-[#3b82f6] text-3xl mb-4"></i>
          <span className="text-[#94a3c8] text-[13px]">Loading compliance module...</span>
        </div>
      }>
        <UnsubscribeForm />
      </Suspense>
    </div>
  );
}

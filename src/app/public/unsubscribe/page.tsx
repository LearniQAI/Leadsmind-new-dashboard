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
    <div className="w-full max-w-md bg-dash-surface border border-dash-border rounded-[24px] shadow-xl p-8 text-center relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-dash-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo/Icon */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dash-bg border border-dash-border text-dash-accent mb-6 shadow-sm">
        <i className="fa-solid fa-envelope-circle-check text-2xl"></i>
      </div>

      {status === 'success' ? (
        <div className="space-y-4">
          <h1 className="text-[20px] font-black text-dash-text uppercase tracking-tight font-space-grotesk">
            Unsubscribed <span className="text-emerald-600">Successful</span>
          </h1>
          <p className="text-[13px] text-dash-textMuted leading-relaxed">
            Your email <strong className="text-dash-text font-mono">{email}</strong> has been successfully removed from our communication lists. You will no longer receive marketing broadcasts or alerts from this workspace.
          </p>
          <div className="pt-2 text-[11px] text-dash-textMuted uppercase tracking-[1px] font-bold">
            POPIA Compliance Secured
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-[20px] font-black text-dash-text uppercase tracking-tight font-space-grotesk">
              Confirm <span className="text-dash-accent">Unsubscribe</span>
            </h1>
            <p className="text-[12px] text-dash-textMuted leading-relaxed">
              Confirm you want to stop receiving all electronic communications and marketing campaigns.
            </p>
          </div>

          {status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-600 text-left flex gap-2">
              <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-dash-textMuted uppercase tracking-widest mb-1.5 font-dm-sans">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                readOnly
                placeholder="Enter your email"
                required
                className="w-full bg-dash-bg border border-dash-border rounded-xl p-3 text-[13px] text-dash-textMuted cursor-not-allowed font-mono"
              />
              <p className="text-[10px] text-dash-textMuted mt-1">
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
    <div className="min-h-screen bg-dash-bg flex items-center justify-center p-6 font-dm-sans">
      <Suspense fallback={
        <div className="w-full max-w-md bg-dash-surface border border-dash-border rounded-[24px] shadow-xl p-8 text-center flex flex-col items-center justify-center">
          <i className="fa-solid fa-spinner animate-spin text-dash-accent text-3xl mb-4"></i>
          <span className="text-dash-textMuted text-[13px]">Loading compliance module...</span>
        </div>
      }>
        <UnsubscribeForm />
      </Suspense>
    </div>
  );
}

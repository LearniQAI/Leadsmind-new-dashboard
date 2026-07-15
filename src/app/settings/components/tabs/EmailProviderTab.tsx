"use client";

import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle2, AlertTriangle, RefreshCw, Key } from 'lucide-react';
import { getEmailProvider, saveEmailProvider, verifyEmailProvider } from '@/app/actions/emailProviders';
import { toast } from 'sonner';

export default function EmailProviderTab({ workspaceId }: { workspaceId?: string }) {
  const [provider, setProvider] = useState('resend');
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [verified, setVerified] = useState(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getEmailProvider(workspaceId);
      if (res.success && res.data) {
        setProvider(res.data.provider || 'resend');
        setApiKey(res.data.apiKey || '');
        setFromEmail(res.data.fromEmail || '');
        setFromName(res.data.fromName || '');
        setVerified(res.data.verified || false);
        setLastVerifiedAt(res.data.lastVerifiedAt || null);
      }
    } catch (err: any) {
      toast.error('Failed to load email provider configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setSaving(true);
    try {
      const res = await saveEmailProvider(workspaceId, {
        apiKey,
        fromEmail,
        fromName
      });
      if (res.success) {
        toast.success('Email provider saved successfully.');
        await load();
      } else {
        toast.error(res.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!workspaceId) return;

    setVerifying(true);
    try {
      const res = await verifyEmailProvider(workspaceId);
      if (res.success) {
        toast.success('Test email sent successfully and settings verified!');
        await load();
      } else {
        toast.error(res.error || 'Verification failed. Double check your API key and sender identity.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error verifying configuration');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm !text-dash-textMuted">
        <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none text-dash-accent" />
        <span>Loading configuration…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Mail className="w-5 h-5 text-dash-accent" />
        <div>
          <h3 className="text-lg font-semibold !text-dash-text">Custom email provider</h3>
          <p className="text-sm !text-dash-textMuted">
            Route transactional emails (invoices, courier tracking, affiliate welcomes) through your own Resend account.
          </p>
        </div>
      </div>

      <div className="p-4 bg-dash-surface border border-dash-border rounded-lg flex items-start gap-3">
        {verified ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold !text-dash-text">Status: Verified</p>
              <p className="text-xs !text-dash-textMuted">
                Last verified: {lastVerifiedAt ? new Date(lastVerifiedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold !text-dash-text">Status: Unverified</p>
              <p className="text-xs !text-dash-textMuted">
                Please save your configuration and click "Send test email" to verify domain alignment.
              </p>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold !text-dash-textMuted mb-1.5">
            Email provider
          </label>
          <select
            value={provider}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-surface text-sm !text-dash-text focus:outline-none opacity-60"
          >
            <option value="resend">Resend (Standard)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold !text-dash-textMuted mb-1.5">
            Resend API key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="re_••••••••••••••••••••••••"
            className="w-full px-3 py-2 rounded-lg border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold !text-dash-textMuted mb-1.5">
              From email
            </label>
            <input
              type="email"
              required
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="no-reply@yourdomain.com"
              className="w-full px-3 py-2 rounded-lg border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold !text-dash-textMuted mb-1.5">
              From name
            </label>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 rounded-lg border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-dash-accent hover:bg-dash-accent/90 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors motion-reduce:transition-none"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />}
            {saving ? 'Saving…' : 'Save settings'}
          </button>

          {verified === false && apiKey && (
            <button
              type="button"
              disabled={verifying}
              onClick={handleVerify}
              className="px-4 py-2 rounded-lg border border-dash-border hover:bg-dash-surface !text-dash-text text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors motion-reduce:transition-none"
            >
              {verifying && <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />}
              {verifying ? 'Verifying…' : 'Send test email'}
            </button>
          )}

          {verified === true && (
            <button
              type="button"
              disabled={verifying}
              onClick={handleVerify}
              className="px-4 py-2 rounded-lg border border-dash-border hover:bg-dash-surface !text-dash-text text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors motion-reduce:transition-none"
            >
              {verifying && <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />}
              {verifying ? 'Retesting…' : 'Send test email'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

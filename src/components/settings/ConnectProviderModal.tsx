'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { getWorkspaceApiKey } from '@/app/actions/settings';

interface ConnectProviderModalProps {
  provider: string;
  category: string;
  open: boolean;
  onClose: () => void;
  onConnected: (accountLabel: string) => void;
}

export default function ConnectProviderModal({
  provider,
  category,
  open,
  onClose,
  onConnected,
}: ConnectProviderModalProps) {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  // Fields state
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [field3, setField3] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [oauthWarning, setOauthWarning] = useState<string | null>(null);

  // Zapier state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (open && provider === 'Zapier') {
      getWorkspaceApiKey().then(res => {
        if (res && res.data) {
          setApiKey(res.data);
        }
      });
    }
  }, [open, provider]);

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('https://www.leadsmind.io/api/v1');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setErrorMsg('No active workspace found.');
      return;
    }

    setErrorMsg(null);

    // OAuth categories do not submit this way
    if (category === 'email_calendar' || category === 'communication') {
      setOauthWarning(`OAuth connection for ${provider} is coming soon. You will be notified when it is ready.`);
      return;
    }

    // Validation: at least one field must have a value
    if (!field1.trim() && !field2.trim() && !field3.trim()) {
      setErrorMsg('Please fill in the required credential fields.');
      return;
    }

    setLoading(true);

    try {
      // Determine accountLabel based on categories
      let label = provider;
      if (category === 'bank' || category === 'payment_gateway') {
        label = field3.trim() || provider;
      } else if (category === 'identity_verification' || category === 'credit_bureau' || category === 'fraud_screening') {
        label = field3.trim() || provider;
      } else if (category === 'tax_government') {
        label = field1.trim() || provider;
      } else {
        label = field2.trim() || provider;
      }

      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          provider,
          category,
          accountLabel: label,
          webhookUrl: field1.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save connection.');
      }

      onConnected(label);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(4,9,26,0.75)] backdrop-blur-sm"
      />

      {/* Modal Content */}
      <div className="relative bg-[#080f28] border border-[rgba(255,255,255,0.13)] rounded-2xl w-full max-w-md p-5 shadow-2xl z-10 text-slate-200 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#4a5a82] hover:text-[#eef2ff] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h3 className="text-[#eef2ff] text-[17px] font-semibold font-space-grotesk" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Connect {provider}
          </h3>
          <p className="text-[#4a5a82] text-[12px] mt-1 font-dm-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {provider === 'Zapier' 
              ? 'Follow the instructions below to authenticate your LeadsMind integration in Zapier.'
              : `Enter your credentials to connect ${provider} to LeadsMind.`}
          </p>
        </div>

        {provider === 'Zapier' ? (
          <div className="space-y-5">
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] font-dm-sans">
                Zapier Base URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://www.leadsmind.io/api/v1"
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-[#eef2ff] text-[13px] w-full font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 bg-white/5 border border-white/5 text-[#94a3c8] hover:text-[#eef2ff] rounded-lg text-xs font-semibold font-dm-sans"
                >
                  {copiedUrl ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] font-dm-sans">
                Master API Secret Key
              </label>
              {apiKey ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    readOnly
                    value={apiKey}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-[#eef2ff] text-[13px] w-full font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="px-3 bg-white/5 border border-white/5 text-[#94a3c8] hover:text-[#eef2ff] rounded-lg text-xs font-semibold font-dm-sans"
                  >
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-[12px] text-amber-400 font-dm-sans leading-relaxed">
                  No Master API key found. Please generate one under{' '}
                  <a
                    href="/settings?tab=api"
                    className="text-blue-400 hover:underline font-semibold"
                    onClick={onClose}
                  >
                    Settings &gt; Developer
                  </a>{' '}
                  first.
                </div>
              )}
            </div>

            <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 space-y-2 text-[12px] text-[#94a3c8] font-dm-sans leading-relaxed">
              <p className="font-semibold text-white">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to your Zapier account and click "Create Zap".</li>
                <li>Search for and select the "LeadsMind" app.</li>
                <li>When prompted for authentication, enter your Master API Secret Key and set the Base URL to the one provided above.</li>
                <li>Test your connection and begin building triggers (e.g. Contact Created) and actions.</li>
              </ol>
            </div>

            <div className="pt-2 flex justify-between items-center gap-3">
              {apiKey && (
                <button
                  type="button"
                  onClick={() => {
                    onConnected('Active Connection');
                    onClose();
                  }}
                  className="bg-[#2563eb] text-white text-[13px] font-semibold rounded-lg px-4 py-2.5 hover:bg-[#1d4ed8] transition-colors font-dm-sans flex-1"
                >
                  Mark Connected
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-[#4a5a82] hover:text-[#cbd5e1] text-[12px] font-dm-sans transition-colors py-2.5 flex-1 text-center border border-[rgba(255,255,255,0.05)] rounded-lg hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* CATEGORY: Bank / Payments */}
            {(category === 'bank' || category === 'payment_gateway') && (
              <>
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    API Key / Client ID
                  </label>
                  <input
                    type="text"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    placeholder={`Provided by ${provider} developer portal`}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                    placeholder="Keep this private"
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    Account Name (optional)
                  </label>
                  <input
                    type="text"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. LeadsMind Business Account"
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <p className="text-[#4a5a82] text-[11px] font-dm-sans leading-relaxed pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Find your API credentials in your {provider} developer or business portal. These are stored securely and never shared.
                </p>
              </>
            )}

            {/* CATEGORY: Tax / Government */}
            {category === 'tax_government' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    Username or Tax Reference Number
                  </label>
                  <input
                    type="text"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    Password
                  </label>
                  <input
                    type="password"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <p className="text-[#4a5a82] text-[11px] font-dm-sans leading-relaxed pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Your SARS eFiling or CIPC login credentials. LeadsMind connects on your behalf using a secure session.
                </p>
              </>
            )}

            {/* CATEGORY: Identity, Credit Bureau, Fraud */}
            {(category === 'identity_verification' || category === 'credit_bureau' || category === 'fraud_screening') && (
              <>
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    Client ID (if required)
                  </label>
                  <input
                    type="text"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                    Account Name (optional)
                  </label>
                  <input
                    type="text"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. Production"
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                  />
                </div>

                <p className="text-[#4a5a82] text-[11px] font-dm-sans leading-relaxed pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Contact {provider} to get your API credentials. Enterprise pricing applies — contact them for a quote.
                </p>
              </>
            )}

            {/* CATEGORY: Email / Calendar & Communication (OAuth Flow) */}
            {(category === 'email_calendar' || category === 'communication') && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                  <ExternalLink className="w-8 h-8 text-[#2563eb] mb-3" />
                  <h4 className="text-[#eef2ff] text-[14px] font-semibold font-space-grotesk mb-1.5">
                    Connect via OAuth
                  </h4>
                  <p className="text-[#94a3c8] text-[12px] leading-relaxed max-w-xs font-dm-sans">
                    You will be redirected to {provider} to approve the connection. LeadsMind will only request read access to your calendar and email.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="bg-[#2563eb] text-white text-[13px] font-semibold rounded-lg w-full py-2.5 hover:bg-[#1d4ed8] transition-colors font-dm-sans"
                >
                  Continue to {provider}
                </button>

                {oauthWarning && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11.5px] font-dm-sans leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{oauthWarning}</span>
                  </div>
                )}
              </div>
            )}

            {/* Save & Cancel Buttons for Input-based Categories */}
            {category !== 'email_calendar' && category !== 'communication' && (
              <>
                {/* CATEGORY: Automation, eCommerce, Marketing, Analytics, Courier */}
                {(category === 'automation' || category === 'ecommerce' || category === 'marketing' || category === 'analytics' || category === 'courier') && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                        API Key or Webhook URL
                      </label>
                      <input
                        type="text"
                        value={field1}
                        onChange={e => setField1(e.target.value)}
                        placeholder={`Provided in your ${provider} account settings`}
                        className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                        Account Name (optional)
                      </label>
                      <input
                        type="text"
                        value={field2}
                        onChange={e => setField2(e.target.value)}
                        className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] w-full focus:border-[#2563eb] focus:outline-none placeholder-[#4a5a82] font-dm-sans"
                      />
                    </div>

                    <p className="text-[#4a5a82] text-[11px] font-dm-sans leading-relaxed pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Check your {provider} settings or integrations page for API keys.
                    </p>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#2563eb] text-white text-[13px] font-semibold rounded-lg w-full py-2.5 mt-6 hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-dm-sans"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Save Connection
                </button>
              </>
            )}

            {errorMsg && (
              <div className="text-rose-400 text-[11.5px] mt-2 font-dm-sans text-center">
                {errorMsg}
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-[#4a5a82] hover:text-[#cbd5e1] text-[12px] font-dm-sans mt-3 transition-colors inline-block"
              >
                Cancel
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

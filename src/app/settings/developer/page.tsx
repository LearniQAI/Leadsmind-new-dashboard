'use client';

import React, { useState, useEffect } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { ChevronDown, ChevronUp, Copy, Check, Trash2 } from 'lucide-react';

interface ApiKey {
  id: string;
  key_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

interface Webhook {
  id: string;
  url: string;
  label: string | null;
  active: boolean;
  created_at: string;
}

export default function DeveloperPage() {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keyLabel, setKeyLabel] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLabel, setWebhookLabel] = useState('');
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [explainerExpanded, setExplainerExpanded] = useState(true);
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);

  // General error messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickReferences = [
    { method: "GET", path: "/v1/contacts", desc: "List all your contacts" },
    { method: "POST", path: "/v1/contacts", desc: "Create a new contact" },
    { method: "GET", path: "/v1/invoices", desc: "List all invoices" },
    { method: "POST", path: "/v1/invoices", desc: "Create a new invoice" },
    { method: "GET", path: "/v1/deals", desc: "List all deals" },
    { method: "POST", path: "/v1/invoices/{id}/send", desc: "Send an invoice by email or WhatsApp" }
  ];

  // Fetch API keys
  const fetchApiKeys = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/settings/api-keys?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (res.ok) {
        setApiKeys(data.keys || []);
      }
    } catch {
      setErrorMsg('Failed to load API keys.');
    } finally {
      setKeysLoading(false);
    }
  };

  // Fetch Webhooks
  const fetchWebhooks = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/settings/webhooks?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (res.ok) {
        setWebhooks(data.webhooks || []);
      }
    } catch {
      setErrorMsg('Failed to load webhooks.');
    } finally {
      setWebhooksLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchApiKeys();
      fetchWebhooks();
    }
  }, [workspaceId]);

  // Create API key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setGenerating(true);
    setGeneratedKey(null);
    setCopySuccess(false);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, label: keyLabel || 'Default' })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedKey(data.key);
        setKeyLabel('');
        fetchApiKeys();
      } else {
        setErrorMsg(data.error || 'Failed to generate API key.');
      }
    } catch {
      setErrorMsg('Network error generating key.');
    } finally {
      setGenerating(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/settings/api-keys?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchApiKeys();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to revoke API key.');
      }
    } catch {
      setErrorMsg('Network error revoking key.');
    }
  };

  // Copy API key to clipboard
  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Add webhook
  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlValidationError(null);
    setErrorMsg(null);

    if (!workspaceId || !webhookUrl) return;

    if (!webhookUrl.startsWith('https://')) {
      setUrlValidationError("Please enter a valid https:// URL");
      return;
    }

    setAddingWebhook(true);

    let finalLabel = webhookLabel;
    if (!finalLabel.trim()) {
      try {
        finalLabel = new URL(webhookUrl).hostname;
      } catch {
        finalLabel = 'Webhook';
      }
    }

    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, url: webhookUrl, label: finalLabel })
      });
      const data = await res.json();
      if (res.ok) {
        setWebhookUrl('');
        setWebhookLabel('');
        fetchWebhooks();
      } else {
        setErrorMsg(data.error || 'Failed to add webhook.');
      }
    } catch {
      setErrorMsg('Network error adding webhook.');
    } finally {
      setAddingWebhook(false);
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/settings/webhooks?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchWebhooks();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete webhook.');
      }
    } catch {
      setErrorMsg('Network error deleting webhook.');
    }
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-[22px] font-bold leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}
          >
            Developer & <span className="text-[#3b82f6]">API</span>
          </h1>
          <p
            className="text-[11.5px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Access the LeadsMind API, manage your API keys, and set up webhooks.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            {errorMsg}
          </div>
        )}

        {/* Section 1: API KEYS */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          YOUR API KEYS
        </h3>

        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mb-6">
          <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="API Key Label (e.g. Website integration)"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="submit"
              disabled={generating}
              className="bg-[#3b82f6] text-white text-[13px] font-semibold rounded-lg px-4 py-2 hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generating...' : 'Generate New Key'}
            </button>
          </form>

          {generatedKey && (
            <div className="mb-6 p-4 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
              <span className="text-[#10b981] text-[11px] font-bold block mb-1">
                New API Key Generated
              </span>
              <p className="text-[#94a3c8] text-[11px] mb-3">
                Copy this key now. You will not be able to see it again.
              </p>
              <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[12px] text-white">
                <span className="flex-1 break-all select-all">{generatedKey}</span>
                <button
                  onClick={handleCopyKey}
                  className="bg-white/10 hover:bg-white/20 text-[11px] font-semibold rounded px-2.5 py-1 text-white flex-shrink-0 transition-colors"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {keysLoading ? (
            <div className="h-20 bg-white/[0.02] animate-pulse rounded-lg" />
          ) : apiKeys.length === 0 ? (
            <p className="text-[12px] text-[#4a5a82] italic text-center py-4">
              No active API keys found.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-4 p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-lg text-[13px]"
                >
                  <div className="min-w-0">
                    <span className="text-[#eef2ff] font-semibold block truncate">
                      {key.label}
                    </span>
                    <span className="font-mono text-[11px] text-[#4a5a82]">
                      {key.key_prefix}••••••••••••
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[11px] text-[#4a5a82]">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p
            className="text-[11px] text-[#4a5a82] italic mt-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Your API key gives full access to your workspace. Never share it publicly.
          </p>
        </div>

        {/* Section 2: PLAN LIMITS */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          YOUR PLAN LIMITS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span
              className="text-[26px] font-bold text-[#3b82f6] leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              300
            </span>
            <span
              className="text-[11px] text-[#4a5a82] mt-2 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Requests per minute
            </span>
          </div>

          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <div>
              <span
                className="text-[26px] font-bold text-[#10b981] leading-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                v1
              </span>
              <p
                className="text-[10px] text-[#4a5a82] mt-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                supported for 24 months
              </p>
            </div>
            <span
              className="text-[11px] text-[#4a5a82] mt-2 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Current API version
            </span>
          </div>

          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span
              className="text-[13px] font-bold text-[#eef2ff] leading-none truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              api.leadsmind.io
            </span>
            <span
              className="text-[11px] text-[#4a5a82] mt-2 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Base URL
            </span>
          </div>
        </div>

        {/* Section 3: WEBHOOKS */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          WEBHOOKS
        </h3>

        {/* What is a webhook explainer */}
        <div className="bg-[rgba(37,99,235,0.06)] border border-[rgba(37,99,235,0.12)] rounded-xl p-4 mb-4">
          <button 
            type="button"
            onClick={() => setExplainerExpanded(!explainerExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-[#eef2ff] text-[13px] font-semibold font-space-grotesk" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              What is a webhook?
            </span>
            {explainerExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#94a3c8]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#94a3c8]" />
            )}
          </button>
          {explainerExpanded && (
            <p className="text-[#94a3c8] text-[12px] leading-relaxed mt-2 font-dm-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              A webhook is a web address that LeadsMind sends data to automatically
              when something happens — like when a payment is received, a form is
              submitted, or a deal is won.
              <br /><br />
              Example: You connect Zapier. Zapier gives you a webhook URL.
              You paste it here. Every time an invoice is paid in LeadsMind,
              Zapier receives the details automatically and can trigger any
              workflow you've built — no manual work needed.
            </p>
          )}
        </div>

        {/* Add Webhook Form */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mb-4">
          <form onSubmit={handleAddWebhook} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                  Label (e.g. Zapier, Make.com)
                </label>
                <input
                  type="text"
                  placeholder="Give this webhook a name"
                  value={webhookLabel}
                  onChange={(e) => setWebhookLabel(e.target.value)}
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] focus:outline-none focus:border-[#2563eb] placeholder-[#4a5a82] font-dm-sans w-full"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5 font-dm-sans">
                  Your Webhook URL
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] focus:outline-none focus:border-[#2563eb] placeholder-[#4a5a82] font-dm-sans w-full"
                />
              </div>
            </div>

            {urlValidationError && (
              <p className="text-rose-400 text-[11px] font-dm-sans">
                {urlValidationError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingWebhook}
                className="bg-[#2563eb] text-white text-[12px] font-semibold rounded-lg px-5 py-2 hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 font-dm-sans"
              >
                {addingWebhook ? 'Adding...' : 'Add Webhook'}
              </button>
            </div>
          </form>
        </div>

        {/* Webhook List */}
        <div className="space-y-3 mb-6">
          {webhooksLoading ? (
            <div className="h-16 bg-white/[0.02] animate-pulse rounded-xl" />
          ) : webhooks.length === 0 ? (
            <p className="text-[12px] text-[#4a5a82] text-center py-4 font-dm-sans">
              No webhooks added yet. Add your first one above.
            </p>
          ) : (
            webhooks.map((hook) => (
              <div
                key={hook.id}
                className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#eef2ff] text-[13px] font-medium font-dm-sans">
                      {hook.label || 'No Label'}
                    </span>
                    {hook.active && (
                      <span className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2 py-0.5 font-dm-sans">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[#4a5a82] text-[11px] font-mono truncate block max-w-[300px] mt-0.5">
                    {hook.url}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(hook.url);
                      setCopiedWebhookId(hook.id);
                      setTimeout(() => setCopiedWebhookId(null), 2000);
                    }}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#4a5a82] hover:text-[#eef2ff] transition-all relative flex items-center justify-center"
                    title="Copy URL"
                  >
                    {copiedWebhookId === hook.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(hook.id)}
                    className="p-1.5 rounded bg-white/5 hover:bg-rose-500/10 text-[rgba(239,68,68,0.6)] hover:text-[#ef4444] transition-all flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Common Webhook Events */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mb-6">
          <h4 className="text-[#eef2ff] text-[13px] font-semibold font-space-grotesk mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Events LeadsMind sends to your webhooks
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              'invoice.paid', 'invoice.created', 'contact.created',
              'deal.won', 'form.submitted', 'payment.received',
              'booking.confirmed', 'course.completed', 'review.received',
              'email.opened', 'whatsapp.received', 'task.completed'
            ].map(evt => (
              <div 
                key={evt}
                className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-[#94a3c8] text-[11px] font-dm-sans"
              >
                {evt}
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: API QUICK REFERENCE */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          API QUICK REFERENCE
        </h3>
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="flex flex-col">
            {quickReferences.map((ref, rIndex) => (
              <div
                key={rIndex}
                className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)] py-2.5 last:border-0"
              >
                <span
                  className={`text-[10px] font-bold rounded px-2 py-0.5 min-w-[50px] text-center border ${
                    ref.method === 'GET'
                      ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]'
                      : 'bg-[rgba(37,99,235,0.1)] text-[#3b82f6] border-[rgba(37,99,235,0.2)]'
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {ref.method}
                </span>
                <span
                  className="text-[12px] font-mono text-[#eef2ff] flex-1 truncate"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {ref.path}
                </span>
                <span
                  className="text-[11px] text-[#4a5a82] text-right hidden sm:block truncate max-w-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {ref.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

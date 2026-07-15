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

  // Webhook logs state
  interface WebhookLog {
    id: string;
    webhook_id: string;
    event: string;
    response_status: number;
    success: boolean;
    error_message: string | null;
    delivered_at: string;
    webhook?: {
      label: string | null;
      url: string;
    } | null;
  }
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

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

  // Fetch Webhook Logs
  const fetchWebhookLogs = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/settings/webhooks/logs?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch {
      // Ignore
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchApiKeys();
      fetchWebhooks();
      fetchWebhookLogs();
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
        fetchWebhookLogs();
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
        fetchWebhookLogs();
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
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-bold leading-tight !text-dash-text">
            Developer &amp; <span className="text-dash-accent">API</span>
          </h1>
          <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
            Access the LeadsMind API, manage your API keys, and set up webhooks.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px]">
            {errorMsg}
          </div>
        )}

        {/* Section 1: API KEYS */}
        <h3 className="text-[11px] font-semibold !text-dash-textMuted mb-3 mt-8">
          Your API keys
        </h3>

        <div className="bg-white border border-dash-border rounded-xl p-5 mb-6 shadow-sm">
          <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="API Key Label (e.g. Website integration)"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              className="flex-1 bg-white border border-dash-border rounded-lg px-4 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent"
            />
            <button
              type="submit"
              disabled={generating}
              className="bg-dash-accent text-white text-[13px] font-semibold rounded-lg px-4 py-2 hover:bg-dash-accent/90 disabled:opacity-50 transition-colors motion-reduce:transition-none"
            >
              {generating ? 'Generating...' : 'Generate new key'}
            </button>
          </form>

          {generatedKey && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-700 text-[11px] font-bold block mb-1">
                New API key generated
              </span>
              <p className="!text-dash-textMuted text-[11px] mb-3">
                Copy this key now. You will not be able to see it again.
              </p>
              <div className="flex items-center gap-3 bg-dash-surface p-2.5 rounded border border-dash-border font-mono text-[12px] !text-dash-text">
                <span className="flex-1 break-all select-all">{generatedKey}</span>
                <button
                  onClick={handleCopyKey}
                  className="bg-dash-border/60 hover:bg-dash-border text-[11px] font-semibold rounded px-2.5 py-1 !text-dash-text flex-shrink-0 transition-colors motion-reduce:transition-none"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {keysLoading ? (
            <div className="h-20 bg-dash-surface animate-pulse motion-reduce:animate-none rounded-lg" />
          ) : apiKeys.length === 0 ? (
            <p className="text-[12px] !text-dash-textMuted italic text-center py-4">
              No active API keys found.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-4 p-3.5 bg-dash-surface border border-dash-border rounded-lg text-[13px]"
                >
                  <div className="min-w-0">
                    <span className="!text-dash-text font-semibold block truncate">
                      {key.label}
                    </span>
                    <span className="font-mono text-[11px] !text-dash-textMuted">
                      {key.key_prefix}••••••••••••
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[11px] !text-dash-textMuted">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors motion-reduce:transition-none"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] !text-dash-textMuted italic mt-4">
            Your API key gives full access to your workspace. Never share it publicly.
          </p>
        </div>

        {/* Section 2: PLAN LIMITS */}
        <h3 className="text-[11px] font-semibold !text-dash-textMuted mb-3 mt-8">
          Your plan limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-dash-border rounded-xl p-4 flex flex-col justify-between min-h-[90px] shadow-sm">
            <span className="text-[26px] font-bold text-dash-accent leading-none">
              300
            </span>
            <span className="text-[11px] !text-dash-textMuted mt-2 font-medium">
              Requests per minute
            </span>
          </div>

          <div className="bg-white border border-dash-border rounded-xl p-4 flex flex-col justify-between min-h-[90px] shadow-sm">
            <div>
              <span className="text-[26px] font-bold text-green-600 leading-none">
                v1
              </span>
              <p className="text-[10px] !text-dash-textMuted mt-0.5">
                supported for 24 months
              </p>
            </div>
            <span className="text-[11px] !text-dash-textMuted mt-2 font-medium">
              Current API version
            </span>
          </div>

          <div className="bg-white border border-dash-border rounded-xl p-4 flex flex-col justify-between min-h-[90px] shadow-sm">
            <span className="text-[13px] font-bold !text-dash-text leading-none truncate">
              api.leadsmind.io
            </span>
            <span className="text-[11px] !text-dash-textMuted mt-2 font-medium">
              Base URL
            </span>
          </div>
        </div>

        {/* Section 3: WEBHOOKS */}
        <h3 className="text-[11px] font-semibold !text-dash-textMuted mb-3 mt-8">
          Webhooks
        </h3>

        {/* What is a webhook explainer */}
        <div className="bg-dash-accent/5 border border-dash-accent/20 rounded-xl p-4 mb-4">
          <button
            type="button"
            onClick={() => setExplainerExpanded(!explainerExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="!text-dash-text text-[13px] font-semibold">
              What is a webhook?
            </span>
            {explainerExpanded ? (
              <ChevronUp className="w-4 h-4 !text-dash-textMuted" />
            ) : (
              <ChevronDown className="w-4 h-4 !text-dash-textMuted" />
            )}
          </button>
          {explainerExpanded && (
            <p className="!text-dash-textMuted text-[12px] leading-relaxed mt-2">
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
        <div className="bg-white border border-dash-border rounded-xl p-5 mb-4 shadow-sm">
          <form onSubmit={handleAddWebhook} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col">
                <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5">
                  Label (e.g. Zapier, Make.com)
                </label>
                <input
                  type="text"
                  placeholder="Give this webhook a name"
                  value={webhookLabel}
                  onChange={(e) => setWebhookLabel(e.target.value)}
                  className="bg-white border border-dash-border rounded-lg px-4 py-2.5 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent placeholder:!text-dash-textMuted w-full"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5">
                  Your webhook URL
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="bg-white border border-dash-border rounded-lg px-4 py-2.5 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent placeholder:!text-dash-textMuted w-full"
                />
              </div>
            </div>

            {urlValidationError && (
              <p className="text-red-600 text-[11px]">
                {urlValidationError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingWebhook}
                className="bg-dash-accent text-white text-[12px] font-semibold rounded-lg px-5 py-2 hover:bg-dash-accent/90 transition-colors motion-reduce:transition-none disabled:opacity-50"
              >
                {addingWebhook ? 'Adding...' : 'Add webhook'}
              </button>
            </div>
          </form>
        </div>

        {/* Webhook List */}
        <div className="space-y-3 mb-6">
          {webhooksLoading ? (
            <div className="h-16 bg-dash-surface animate-pulse motion-reduce:animate-none rounded-xl" />
          ) : webhooks.length === 0 ? (
            <p className="text-[12px] !text-dash-textMuted text-center py-4">
              No webhooks added yet. Add your first one above.
            </p>
          ) : (
            webhooks.map((hook) => (
              <div
                key={hook.id}
                className="bg-white border border-dash-border rounded-xl px-5 py-3 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="!text-dash-text text-[13px] font-medium">
                      {hook.label || 'No label'}
                    </span>
                    {hook.active && (
                      <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold rounded-full px-2 py-0.5">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="!text-dash-textMuted text-[11px] font-mono truncate block max-w-[300px] mt-0.5">
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
                    className="p-1.5 rounded bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-all motion-reduce:transition-none relative flex items-center justify-center"
                    title="Copy URL"
                  >
                    {copiedWebhookId === hook.id ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(hook.id)}
                    className="p-1.5 rounded bg-dash-surface hover:bg-red-50 text-red-400 hover:text-red-600 transition-all motion-reduce:transition-none flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Section: RECENT WEBHOOK DELIVERIES */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <h3 className="text-[11px] font-semibold !text-dash-textMuted">
            Recent webhook deliveries
          </h3>
          <button
            onClick={fetchWebhookLogs}
            disabled={logsLoading}
            className="text-[11px] text-dash-accent hover:underline"
          >
            {logsLoading ? 'Refreshing...' : 'Refresh logs'}
          </button>
        </div>

        <div className="bg-white border border-dash-border rounded-xl p-5 mb-6 shadow-sm">
          {logsLoading ? (
            <div className="h-20 bg-dash-surface animate-pulse motion-reduce:animate-none rounded-lg" />
          ) : logs.length === 0 ? (
            <p className="text-[12px] !text-dash-textMuted italic text-center py-4">
              No webhook deliveries recorded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-dash-surface border border-dash-border rounded-lg text-[13px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] !text-dash-text bg-dash-border/50 px-2 py-0.5 rounded">
                        {log.event}
                      </span>
                      <span
                        className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
                          log.success
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                      >
                        {log.response_status ? `Status ${log.response_status}` : 'Failed'}
                      </span>
                    </div>
                    <span className="!text-dash-textMuted text-[11px] font-mono truncate block mt-1.5">
                      Fired to: {log.webhook?.label || 'Unknown webhook'} ({log.webhook?.url || 'URL not found'})
                    </span>
                    {!log.success && log.error_message && (
                      <span className="text-red-500 text-[11px] block mt-1 font-mono">
                        Error: {log.error_message}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-left sm:text-right">
                    <span className="text-[11px] !text-dash-textMuted">
                      {new Date(log.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Common Webhook Events */}
        <div className="bg-white border border-dash-border rounded-xl p-5 mb-6 shadow-sm">
          <h4 className="!text-dash-text text-[13px] font-semibold mb-3">
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
                className="bg-dash-surface border border-dash-border rounded-lg px-3 py-2 !text-dash-textMuted text-[11px]"
              >
                {evt}
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: API QUICK REFERENCE */}
        <h3 className="text-[11px] font-semibold !text-dash-textMuted mb-3 mt-8">
          API quick reference
        </h3>
        <div className="bg-white border border-dash-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-col">
            {quickReferences.map((ref, rIndex) => (
              <div
                key={rIndex}
                className="flex items-center gap-3 border-b border-dash-border py-2.5 last:border-0"
              >
                <span
                  className={`text-[10px] font-bold rounded px-2 py-0.5 min-w-[50px] text-center border ${
                    ref.method === 'GET'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-dash-accent/10 text-dash-accent border-dash-accent/20'
                  }`}
                >
                  {ref.method}
                </span>
                <span className="text-[12px] font-mono !text-dash-text flex-1 truncate">
                  {ref.path}
                </span>
                <span className="text-[11px] !text-dash-textMuted text-right hidden sm:block truncate max-w-xs">
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

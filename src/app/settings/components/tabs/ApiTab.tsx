"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Copy, Check, ShieldAlert, Plus, Webhook, Activity, 
  Trash2, Code2, PlayCircle, CheckCircle2, ChevronDown, ChevronUp,
  Key, Layers, Database, Eye, EyeOff, AlertTriangle, Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { sendDemoLead } from '@/app/actions/demo_actions';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { 
  getOAuthClients, 
  createOAuthClient, 
  deleteOAuthClient, 
  getWebhookLogs 
} from '@/app/actions/settings';

interface ApiTabProps {
  apiKey: string | null;
  onRegenerateKey: () => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  workspaceId: string;
  webhooks: any[];
  onNewWebhook: () => void;
  onDeleteWebhook: (id: string) => void;
}

export default function ApiTab({
  apiKey,
  onRegenerateKey,
  onCopy,
  copiedId,
  workspaceId,
  webhooks,
  onNewWebhook,
  onDeleteWebhook
}: ApiTabProps) {
  const { role } = useDashboardContext() as any;
  const isAdmin = role === 'admin' || role === 'owner';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${origin}/api/webhooks/incoming?workspace_id=${workspaceId}`;
  
  const [sendingDemo, setSendingDemo] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'keys' | 'oauth' | 'webhooks' | 'docs'>('keys');

  // OAuth State
  const [oauthClients, setOauthClients] = useState<any[]>([]);
  const [loadingOauth, setLoadingOauth] = useState(false);
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [appName, setAppName] = useState('');
  const [redirectUris, setRedirectUris] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['contacts']);
  const [createdClient, setCreatedClient] = useState<{ clientId: string; clientSecret: string } | null>(null);

  // Webhook Logs State
  const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  // Docs State
  const [expandedDocSection, setExpandedDocSection] = useState<string | null>(null);

  const embedCode = `<script>
  (function(w,d,s,o,f,js,fjs){
    w['LeadsmindObj']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','lm','${origin}/api/v1/leads/sdk.js'));
  lm('init', { apiKey: '${apiKey || 'YOUR_API_KEY'}' });
</script>`;

  const fetchOauthClients = async () => {
    setLoadingOauth(true);
    const res = await getOAuthClients();
    if (res.data) {
      setOauthClients(res.data);
    } else if (res.error) {
      toast.error(res.error);
    }
    setLoadingOauth(false);
  };

  useEffect(() => {
    if (activeSubTab === 'oauth') {
      fetchOauthClients();
    }
  }, [activeSubTab]);

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName) return toast.error('App Name is required');
    const uris = redirectUris.split(',').map(u => u.trim()).filter(Boolean);
    if (uris.length === 0) return toast.error('At least one redirect URI is required');

    const res = await createOAuthClient(appName, uris, selectedScopes);
    if (res.data) {
      setCreatedClient({
        clientId: res.data.client_id,
        clientSecret: res.clientSecret
      });
      setAppName('');
      setRedirectUris('');
      fetchOauthClients();
      toast.success('OAuth Application created successfully');
    } else {
      toast.error(res.error || 'Failed to create application');
    }
  };

  const handleDeleteApp = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this application? It will instantly invalidate all issued tokens.')) return;
    const res = await deleteOAuthClient(clientId);
    if (res.success) {
      toast.success('OAuth Application deleted');
      fetchOauthClients();
    } else {
      toast.error(res.error || 'Failed to delete application');
    }
  };

  const handleViewWebhookLogs = async (webhookId: string) => {
    setSelectedWebhookForLogs(webhookId);
    setLoadingLogs(true);
    const res = await getWebhookLogs(webhookId);
    if (res.data) {
      setWebhookLogs(res.data);
    } else {
      toast.error(res.error || 'Failed to load delivery logs');
    }
    setLoadingLogs(false);
  };

  const handleSendDemo = async () => {
    if (!apiKey) { toast.error('Generate an API key first'); return; }
    setSendingDemo(true);
    const res = await sendDemoLead(apiKey);
    setSendingDemo(false);
    if (res.success) { toast.success('Demo lead captured! Check your Contacts page.'); }
    else { toast.error(res.error || 'Failed to send demo lead'); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-white/5 pb-px">
        <button
          onClick={() => setActiveSubTab('keys')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSubTab === 'keys' 
              ? 'border-accent text-t1' 
              : 'border-transparent text-t4 hover:text-t3'
          }`}
        >
          <span className="flex items-center gap-2"><Key size={14} /> API Keys & SDK</span>
        </button>
        <button
          onClick={() => setActiveSubTab('oauth')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSubTab === 'oauth' 
              ? 'border-accent text-t1' 
              : 'border-transparent text-t4 hover:text-t3'
          }`}
        >
          <span className="flex items-center gap-2"><Layers size={14} /> OAuth 2.0 Apps</span>
        </button>
        <button
          onClick={() => setActiveSubTab('webhooks')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSubTab === 'webhooks' 
              ? 'border-accent text-t1' 
              : 'border-transparent text-t4 hover:text-t3'
          }`}
        >
          <span className="flex items-center gap-2"><Webhook size={14} /> Outgoing Webhooks</span>
        </button>
        <button
          onClick={() => setActiveSubTab('docs')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSubTab === 'docs' 
              ? 'border-accent text-t1' 
              : 'border-transparent text-t4 hover:text-t3'
          }`}
        >
          <span className="flex items-center gap-2"><Code2 size={14} /> API Reference</span>
        </button>
      </div>

      {/* KEYS SUBTAB */}
      {activeSubTab === 'keys' && (
        <div className="space-y-8">
          <div className="bg-n800 border border-white/10 rounded-2xl p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-accent w-5 h-5" />
                <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Master API Secret</h4>
              </div>
              {isAdmin && (
                <button
                  onClick={onRegenerateKey}
                  className="text-[10px] font-black text-accent hover:text-accent2 uppercase tracking-[0.2em] transition-colors"
                >
                  Regenerate Key
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-n900 border border-white/5 rounded-xl px-4 py-3">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value={apiKey || '••••••••••••••••••••••••'}
                  className="flex-1 bg-transparent border-none outline-none text-t1 font-mono text-xs"
                />
                <button onClick={() => setShowKey(!showKey)} className="text-[10px] font-bold text-t3 hover:text-t1 uppercase tracking-wider">
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                onClick={() => onCopy(apiKey || '', 'apikey')}
                className="px-6 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-all"
              >
                {copiedId === 'apikey' ? <Check size={18} className="text-green" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-red/5 border border-red/10 rounded-xl">
              <ShieldAlert size={14} className="text-red mt-0.5 flex-shrink-0" />
              <p className="text-[10px] font-bold text-red/80 uppercase tracking-widest leading-relaxed">
                Never expose this secret in client-side code. Use it for backend integrations only.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Incoming Webhook</h4>
                <span className="px-2 py-0.5 rounded bg-green/10 text-green text-[9px] font-black uppercase tracking-widest">Endpoint</span>
              </div>
              <div className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4">
                <p className="text-[12px] text-t3 leading-relaxed">Use this endpoint to ingest data from external platforms (Zapier, custom CRM, etc).</p>
                <div className="flex gap-2">
                  <input
                    type="text" readOnly value={webhookUrl}
                    className="flex-1 bg-n900 border border-white/5 rounded-xl px-4 py-3 text-accent font-mono text-[11px] outline-none"
                  />
                  <button
                    onClick={() => onCopy(webhookUrl, 'webhook_url')}
                    className="px-4 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-all"
                  >
                    {copiedId === 'webhook_url' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                  <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto">
{`fetch('${webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${(apiKey || '').substring(0, 8)}...'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe'
  })
});`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">SDK Embed Script</h4>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20">ZERO-CODE</span>
              </div>
              <div className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4">
                <p className="text-[12px] text-t3 leading-relaxed">
                  Paste this script into the <code className="text-white">&lt;head&gt;</code> of any website to track visitors and capture form submissions automatically.
                </p>
                <div className="bg-[#050505] rounded-xl p-4 border border-white/5 relative group">
                  <pre className="text-[10px] text-blue-400 font-mono overflow-x-auto whitespace-pre-wrap">{embedCode}</pre>
                  <button
                    onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('SDK Script copied'); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <CheckCircle2 size={14} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Automatic form detection included</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30 flex-shrink-0">
              <PlayCircle size={28} />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Test Your Integration</h4>
              <p className="text-[12px] text-t3">Send a simulated lead through your API pipeline to verify everything is connected correctly.</p>
            </div>
            <button
              disabled={sendingDemo || !apiKey || !isAdmin}
              onClick={handleSendDemo}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-n900 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-500/20 whitespace-nowrap transition-all"
            >
              {sendingDemo ? 'Sending...' : 'Send Test Lead'}
            </button>
          </div>
        </div>
      )}

      {/* OAUTH SUBTAB */}
      {activeSubTab === 'oauth' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">OAuth 2.0 Client Applications</h4>
            <button
              onClick={() => { setShowCreateApp(true); setCreatedClient(null); }}
              className="flex items-center gap-2 text-accent text-[11px] font-black uppercase tracking-widest hover:text-accent2 transition-all"
            >
              <Plus size={14} /> New Application
            </button>
          </div>

          {createdClient && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Application Created! Copy Credentials Now</span>
              </div>
              <p className="text-[11px] text-t3 leading-relaxed">
                For security reasons, your Client Secret will only be displayed <strong>once</strong>. Ensure you save it securely before closing.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-wider text-t4">Client ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text" readOnly value={createdClient.clientId}
                      className="flex-1 bg-n900 border border-white/5 rounded-lg px-3 py-2 text-t1 font-mono text-xs outline-none"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdClient.clientId); toast.success('Client ID copied'); }}
                      className="px-3 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-lg"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-wider text-t4">Client Secret</label>
                  <div className="flex gap-2">
                    <input
                      type="text" readOnly value={createdClient.clientSecret}
                      className="flex-1 bg-n900 border border-white/5 rounded-lg px-3 py-2 text-t1 font-mono text-xs outline-none"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdClient.clientSecret); toast.success('Client Secret copied'); }}
                      className="px-3 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-lg"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCreatedClient(null)}
                className="px-4 py-2 bg-emerald-500 text-n900 font-bold uppercase tracking-wider text-[10px] rounded-lg"
              >
                I have saved the credentials
              </button>
            </div>
          )}

          {showCreateApp && !createdClient && (
            <form onSubmit={handleCreateApp} className="p-6 bg-n800 border border-white/10 rounded-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-xs font-bold text-t1 uppercase tracking-wider">Register New App</h5>
                <button
                  type="button" onClick={() => setShowCreateApp(false)}
                  className="text-[10px] uppercase font-bold text-t4 hover:text-t1"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-t4">Application Name</label>
                  <input
                    type="text" required placeholder="e.g. My Zapier App"
                    value={appName} onChange={e => setAppName(e.target.value)}
                    className="bg-n900 border border-white/5 rounded-xl px-4 py-3 text-t1 text-xs outline-none focus:border-accent"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-t4">Redirect URIs (comma separated)</label>
                  <input
                    type="text" required placeholder="e.g. https://zapier.com/dashboard"
                    value={redirectUris} onChange={e => setRedirectUris(e.target.value)}
                    className="bg-n900 border border-white/5 rounded-xl px-4 py-3 text-t1 text-xs font-mono outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-t4">Authorized Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {['contacts', 'pipelines', 'invoices', 'appointments', 'forms', 'tasks', 'products', 'orders', 'tags'].map(s => {
                    const active = selectedScopes.includes(s);
                    return (
                      <button
                        type="button" key={s}
                        onClick={() => setSelectedScopes(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          active 
                            ? 'bg-accent/10 border-accent/30 text-accent' 
                            : 'bg-white/5 border-white/5 text-t4 hover:text-t3'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-accent hover:bg-accent2 text-t1 font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all"
              >
                Register App
              </button>
            </form>
          )}

          <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-n800">
            {loadingOauth ? (
              <div className="p-12 flex justify-center items-center">
                <RefreshCw className="animate-spin text-accent" />
              </div>
            ) : oauthClients.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Layers size={32} className="text-t4 mb-4 opacity-20" />
                <p className="text-[11px] font-black text-t4 uppercase tracking-[0.3em]">No applications registered</p>
              </div>
            ) : (
              oauthClients.map(client => (
                <div key={client.client_id} className="p-5 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[13px] font-bold text-t1">{client.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-t3">
                      <span className="text-accent">ID: {client.client_id}</span>
                      <span className="text-t4">•</span>
                      <span className="max-w-[250px] truncate">URIs: {client.redirect_uris?.join(', ')}</span>
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {client.scopes?.map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-black text-t4 uppercase border border-white/5">{s}</span>
                      ))}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteApp(client.client_id)}
                      className="w-9 h-9 flex items-center justify-center text-t4 hover:text-red transition-all rounded-lg hover:bg-red/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WEBHOOKS SUBTAB */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Active Outgoing Webhooks</h4>
            {isAdmin && (
              <button
                onClick={onNewWebhook}
                className="flex items-center gap-2 text-accent text-[11px] font-black uppercase tracking-widest hover:text-accent2 transition-all"
              >
                <Plus size={14} /> New Endpoint
              </button>
            )}
          </div>

          <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-n800">
            {webhooks.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Webhook size={32} className="text-t4 mb-4 opacity-20" />
                <p className="text-[11px] font-black text-t4 uppercase tracking-[0.3em]">No active data streams</p>
              </div>
            ) : (
              webhooks.map(hook => (
                <div key={hook.id} className="p-5 flex flex-col gap-4 hover:bg-white/[0.005] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center text-green border border-green/10">
                        <Activity size={18} />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[13px] font-bold text-t1 truncate max-w-[300px]">{hook.url}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          {hook.events?.map((e: string) => (
                            <span key={e} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-black text-t4 uppercase border border-white/5">{e}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewWebhookLogs(hook.id)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          selectedWebhookForLogs === hook.id 
                            ? 'bg-accent/10 border-accent/20 text-accent' 
                            : 'bg-white/5 border-white/5 text-t3 hover:text-t1'
                        }`}
                      >
                        View logs
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => onDeleteWebhook(hook.id)}
                          className="w-9 h-9 flex items-center justify-center text-t4 hover:text-red transition-all rounded-lg hover:bg-red/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Webhook Signature Secret display */}
                  <div className="flex items-center justify-between p-3 bg-n900 border border-white/5 rounded-xl text-[11px]">
                    <div className="flex items-center gap-2 text-t3">
                      <Key size={12} className="text-accent" />
                      <span>Signing Secret:</span>
                      <span className="font-mono text-t1 select-all">{hook.secret || 'No secret configured'}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-t4 font-semibold">HMAC-SHA256</span>
                  </div>

                  {/* Logs subview */}
                  {selectedWebhookForLogs === hook.id && (
                    <div className="mt-2 border-t border-white/5 pt-4 space-y-3">
                      <h5 className="text-[11px] font-bold uppercase tracking-widest text-t1 flex items-center gap-2">
                        <Clock size={12} /> Delivery Logs (Last 20 attempts)
                      </h5>

                      {loadingLogs ? (
                        <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-accent" /></div>
                      ) : webhookLogs.length === 0 ? (
                        <p className="text-[10px] text-t4 uppercase tracking-wider text-center py-4">No logged deliveries yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-white/5 text-t4 uppercase tracking-wider">
                                <th className="pb-2 font-bold">Status</th>
                                <th className="pb-2 font-bold">Event</th>
                                <th className="pb-2 font-bold">Latency</th>
                                <th className="pb-2 font-bold">Time</th>
                                <th className="pb-2 font-bold text-right">Payload</th>
                              </tr>
                            </thead>
                            <tbody>
                              {webhookLogs.map(log => (
                                <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                                  <td className="py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      log.success 
                                        ? 'bg-green/10 text-green' 
                                        : 'bg-red/10 text-red'
                                    }`}>
                                      {log.response_status || 'FAIL'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-t1 font-semibold">{log.event}</td>
                                  <td className="py-2.5 text-t3 font-mono">
                                    {log.payload?.latency_ms ? `${log.payload.latency_ms}ms` : 'N/A'}
                                  </td>
                                  <td className="py-2.5 text-t4">{new Date(log.delivered_at).toLocaleString()}</td>
                                  <td className="py-2.5 text-right">
                                    <button
                                      onClick={() => setSelectedLogPayload(log.payload)}
                                      className="text-accent hover:underline uppercase text-[9px] font-black tracking-wider"
                                    >
                                      Inspect
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Payload Dialog */}
          {selectedLogPayload && (
            <div className="fixed inset-0 bg-[#04091a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-n800 border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-t1 uppercase tracking-wider">Inspect Webhook Payload</h4>
                  <button onClick={() => setSelectedLogPayload(null)} className="text-xs text-t4 hover:text-t1 uppercase font-bold">Close</button>
                </div>
                <div className="bg-n900 border border-white/5 rounded-xl p-4 overflow-auto max-h-[300px]">
                  <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(selectedLogPayload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOCS SUBTAB */}
      {activeSubTab === 'docs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">REST API v1 Reference</h4>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">Swagger-Free</span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'auth',
                title: 'Authentication',
                desc: 'Authenticate requests by passing your API Key or OAuth Access Token in the Authorization header.',
                code: `GET /api/v1/contacts HTTP/1.1
Host: api.leadsmind.io
Authorization: Bearer <your_token_here>`
              },
              {
                id: 'tasks',
                title: 'Tasks API (/api/v1/tasks)',
                desc: 'Query and manage workspace task checklist items.',
                code: `// List tasks
GET /api/v1/tasks?limit=10&offset=0

// Create a task
POST /api/v1/tasks
{
  "title": "Follow up with client",
  "status": "pending"
}`
              },
              {
                id: 'products',
                title: 'Products API (/api/v1/products)',
                desc: 'Manage your product and service catalog inventory.',
                code: `// List products
GET /api/v1/products

// Create a product
POST /api/v1/products
{
  "name": "Single Origin Coffee",
  "price": 120.00,
  "sku": "CF-SO-01"
}`
              },
              {
                id: 'orders',
                title: 'Orders API (/api/v1/orders)',
                desc: 'Create, query, and track sales orders linked to CRM contacts.',
                code: `// Create an order
POST /api/v1/orders
{
  "contact_id": "contact-uuid-here",
  "status": "pending",
  "total": 450.00
}`
              },
              {
                id: 'pipelines',
                title: 'Pipelines & Stages API',
                desc: 'Configure pipelines (/api/v1/pipelines) and stages (/api/v1/pipeline-stages).',
                code: `// Get pipeline stages
GET /api/v1/pipeline-stages?pipeline_id=pipeline-uuid-here`
              },
              {
                id: 'appointments',
                title: 'Appointments / Calendar API',
                desc: 'Create and update bookings and calendar appointments.',
                code: `// Create an appointment
POST /api/v1/appointments
{
  "title": "Strategy Consult",
  "start_time": "2026-06-25T10:00:00Z",
  "end_time": "2026-06-25T11:00:00Z"
}`
              },
              {
                id: 'forms',
                title: 'Forms API (/api/v1/forms)',
                desc: 'Register and fetch custom capture forms.',
                code: `// List forms
GET /api/v1/forms`
              },
              {
                id: 'tags',
                title: 'Tags API (/api/v1/tags)',
                desc: 'Manage strategic tags to segment contacts.',
                code: `// Create tag
POST /api/v1/tags
{
  "name": "High Priority",
  "color": "#ef4444"
}`
              }
            ].map(section => {
              const expanded = expandedDocSection === section.id;
              return (
                <div key={section.id} className="bg-n800 border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedDocSection(expanded ? null : section.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                  >
                    <span className="text-xs font-bold text-t1 uppercase tracking-wider">{section.title}</span>
                    {expanded ? <ChevronUp size={16} className="text-t4" /> : <ChevronDown size={16} className="text-t4" />}
                  </button>
                  {expanded && (
                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/5">
                      <p className="text-[12px] text-t3 leading-relaxed">{section.desc}</p>
                      <div className="bg-[#050505] rounded-lg p-3 border border-white/5">
                        <pre className="text-[10px] font-mono text-blue-400 overflow-x-auto whitespace-pre">
                          {section.code}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

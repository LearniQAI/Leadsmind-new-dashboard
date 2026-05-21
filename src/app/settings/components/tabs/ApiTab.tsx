"use client";
import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ShieldAlert, Plus, Webhook, Activity, Trash2, Code2, Globe, PlayCircle, CheckCircle2, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { sendDemoLead } from '@/app/actions/demo_actions';

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
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${origin}/api/webhooks/incoming?workspace_id=${workspaceId}`;
  const [sendingDemo, setSendingDemo] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const embedCode = `<script>
  (function(w,d,s,o,f,js,fjs){
    w['LeadsmindObj']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','lm','${origin}/api/v1/leads/sdk.js'));
  lm('init', { apiKey: '${apiKey || 'YOUR_API_KEY'}' });
</script>`;

  const handleSendDemo = async () => {
    if (!apiKey) { toast.error('Generate an API key first'); return; }
    setSendingDemo(true);
    const res = await sendDemoLead(apiKey);
    setSendingDemo(false);
    if (res.success) { toast.success('Demo lead captured! Check your Contacts page.'); }
    else { toast.error(res.error || 'Failed to send demo lead'); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-n800 border border-white/10 rounded-2xl p-8 space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-accent w-5 h-5" />
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Master API Secret</h4>
          </div>
          <button
            onClick={onRegenerateKey}
            className="text-[10px] font-black text-accent hover:text-accent2 uppercase tracking-[0.2em] transition-colors"
          >
            Regenerate Key
          </button>
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
          disabled={sendingDemo || !apiKey}
          onClick={handleSendDemo}
          className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-n900 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-500/20 whitespace-nowrap transition-all"
        >
          {sendingDemo ? 'Sending...' : 'Send Test Lead'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Active Webhooks</h4>
          <button
            onClick={onNewWebhook}
            className="flex items-center gap-2 text-accent text-[11px] font-black uppercase tracking-widest hover:text-accent2 transition-all"
          >
            <Plus size={14} /> New Endpoint
          </button>
        </div>
        <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-n800 shadow-sm">
          {webhooks.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Webhook size={32} className="text-t4 mb-4 opacity-20" />
              <p className="text-[11px] font-black text-t4 uppercase tracking-[0.3em]">No active data streams</p>
            </div>
          ) : (
            webhooks.map(hook => (
              <div key={hook.id} className="p-5 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center text-green border border-green/10">
                    <Activity size={18} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[13px] font-bold text-t1 truncate max-w-[300px]">{hook.url}</p>
                    <div className="flex gap-1.5 mt-1">
                      {hook.events.map((e: string) => (
                        <span key={e} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-black text-t4 uppercase border border-white/5">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteWebhook(hook.id)}
                  className="w-9 h-9 flex items-center justify-center text-t4 hover:text-red transition-all rounded-lg hover:bg-red/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

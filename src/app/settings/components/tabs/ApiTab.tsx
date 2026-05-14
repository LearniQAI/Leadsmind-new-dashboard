"use client";
import React from 'react';
import { ShieldCheck, Copy, Check, ShieldAlert, Plus, Webhook, Activity, Trash2 } from 'lucide-react';

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
          <input
            type="password"
            readOnly
            value={apiKey || '••••••••••••••••••••••••'}
            className="flex-1 bg-n900 border border-white/5 rounded-xl px-4 py-4 text-t1 font-mono text-xs outline-none focus:border-accent/30"
          />
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
            CRITICAL: Never expose this secret in client-side code. Use it for backend neural handshakes only.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Incoming Data Stream</h4>
          <span className="px-2 py-0.5 rounded bg-green/10 text-green text-[9px] font-black uppercase tracking-widest">Active</span>
        </div>
        <div className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4">
          <p className="text-[12px] text-t3 leading-relaxed">Use this endpoint to automatically ingest data from external platforms (Zapier, Custom CRM, etc).</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-n900 border border-white/5 rounded-xl px-4 py-3 text-accent font-mono text-[11px] outline-none"
            />
            <button
              onClick={() => onCopy(webhookUrl, 'webhook_url')}
              className="px-4 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-all"
            >
              {copiedId === 'webhook_url' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
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

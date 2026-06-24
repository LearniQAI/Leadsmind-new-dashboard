"use client";

import React, { useEffect, useState } from 'react';
import { Globe, Plus, CheckCircle2, AlertTriangle, Clock, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { addDomain, getDomains, deleteDomain } from '@/app/actions/domains';
import { toast } from 'sonner';

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending:          { label: 'Pending',          color: '#eab308', icon: Clock },
  verifying:        { label: 'Verifying',        color: '#eab308', icon: RefreshCw },
  ssl_provisioning: { label: 'Provisioning SSL', color: '#3b82f6', icon: RefreshCw },
  active:           { label: 'Active',           color: '#22c55e', icon: CheckCircle2 },
  error:            { label: 'Error',            color: '#ef4444', icon: AlertTriangle },
};

export default function CustomDomainsTab({ workspaceId }: { workspaceId?: string }) {
  const [domains, setDomains] = useState<any[]>([]);
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    const res = await getDomains(workspaceId);
    setLoading(false);
    if ((res as any)?.error) toast.error((res as any).error);
    else setDomains((res as any)?.data ?? []);
  };

  useEffect(() => { load(); }, [workspaceId]);

  const detectType = (h: string): 'apex' | 'subdomain' =>
    h.replace(/^https?:\/\//, '').split('/')[0].split('.').length <= 2 ? 'apex' : 'subdomain';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !hostname.trim()) return;
    setAdding(true);
    const res = await addDomain(workspaceId, hostname.trim(), detectType(hostname));
    setAdding(false);
    if ((res as any)?.success === false) { toast.error((res as any).error); return; }
    toast.success('Domain added. Add the DNS records to verify.');
    setHostname('');
    load();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteDomain(id);
    if ((res as any)?.success === false) { toast.error((res as any).error); return; }
    toast.success('Domain removed');
    load();
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-blue-500" />
        <div>
          <h3 className="text-lg font-semibold">Custom Domains</h3>
          <p className="text-sm text-gray-500">Connect your own domain to your CRM, courses, and billing portals.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="app.yourdomain.com"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
        />
        <button
          type="submit"
          disabled={adding || !hostname.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add Domain'}
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : domains.length === 0 ? (
        <div className="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
          No custom domains yet. Add one above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => {
            const s = STATUS[d.status] || STATUS.pending;
            const Icon = s.icon;
            return (
              <div key={d.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.hostname}</span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ color: s.color, background: `${s.color}1a` }}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {d.status !== 'active' && (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-gray-500">Add these DNS records at your registrar:</p>
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded p-2 font-mono">
                      <span>CNAME&nbsp;&nbsp;{d.domain_type === 'apex' ? '@' : d.hostname.split('.')[0]} → domains.leadsmind.com</span>
                      <button onClick={() => copy('domains.leadsmind.com', `${d.id}-c`)}>
                        {copied === `${d.id}-c` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    {d.verification_token && (
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded p-2 font-mono">
                        <span>TXT&nbsp;&nbsp;_leadsmind-verify → {d.verification_token}</span>
                        <button onClick={() => copy(d.verification_token, `${d.id}-t`)}>
                          {copied === `${d.id}-t` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

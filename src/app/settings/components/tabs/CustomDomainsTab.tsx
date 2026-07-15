"use client";

import React, { useEffect, useState } from 'react';
import { Globe, Plus, CheckCircle2, AlertTriangle, Clock, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { addDomain, getDomains, deleteDomain } from '@/app/actions/domains';
import { toast } from 'sonner';

const STATUS: Record<string, { label: string; className: string; icon: any }> = {
  pending:          { label: 'Pending',          className: 'text-amber-600 bg-amber-50', icon: Clock },
  verifying:        { label: 'Verifying',        className: 'text-amber-600 bg-amber-50', icon: RefreshCw },
  ssl_provisioning: { label: 'Provisioning SSL', className: 'text-dash-accent bg-dash-accent/10', icon: RefreshCw },
  active:           { label: 'Active',           className: 'text-green bg-green/10', icon: CheckCircle2 },
  error:            { label: 'Error',            className: 'text-red bg-red/10', icon: AlertTriangle },
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
        <Globe className="w-5 h-5 text-dash-accent" />
        <div>
          <h3 className="text-lg font-semibold !text-dash-text">Custom domains</h3>
          <p className="text-sm !text-dash-textMuted">Connect your own domain to your CRM, courses, and billing portals.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="app.yourdomain.com"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-dash-border bg-white !text-dash-text text-sm focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
        />
        <button
          type="submit"
          disabled={adding || !hostname.trim()}
          className="px-4 py-2 rounded-lg bg-dash-accent hover:bg-dash-accent/90 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors motion-reduce:transition-none"
        >
          <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add domain'}
        </button>
      </form>

      {loading ? (
        <div className="text-sm !text-dash-textMuted">Loading…</div>
      ) : domains.length === 0 ? (
        <div className="text-sm !text-dash-textMuted border border-dashed border-dash-border rounded-lg p-6 text-center">
          No custom domains yet. Add one above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => {
            const s = STATUS[d.status] || STATUS.pending;
            const Icon = s.icon;
            return (
              <div key={d.id} className="border border-dash-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium !text-dash-text">{d.hostname}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${s.className}`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(d.id)} className="!text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {d.status !== 'active' && (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="!text-dash-textMuted">Add these DNS records at your registrar:</p>
                    <div className="flex items-center justify-between bg-dash-surface rounded p-2 font-mono !text-dash-text">
                      <span>CNAME&nbsp;&nbsp;{d.domain_type === 'apex' ? '@' : d.hostname.split('.')[0]} → domains.leadsmind.com</span>
                      <button onClick={() => copy('domains.leadsmind.com', `${d.id}-c`)}>
                        {copied === `${d.id}-c` ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3 !text-dash-textMuted" />}
                      </button>
                    </div>
                    {d.verification_token && (
                      <div className="flex items-center justify-between bg-dash-surface rounded p-2 font-mono !text-dash-text">
                        <span>TXT&nbsp;&nbsp;_leadsmind-verify → {d.verification_token}</span>
                        <button onClick={() => copy(d.verification_token, `${d.id}-t`)}>
                          {copied === `${d.id}-t` ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3 !text-dash-textMuted" />}
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

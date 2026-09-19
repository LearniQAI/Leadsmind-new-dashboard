"use client";

import React, { useEffect, useState } from 'react';
import { Globe, Plus, CheckCircle2, AlertTriangle, Clock, Trash2, RefreshCw, Copy, Check, Info } from 'lucide-react';
import { addDomain, getDomains, deleteDomain } from '@/app/actions/domains';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui';
import { CUSTOM_DOMAIN_CNAME_TARGET } from '@/lib/domains/config';

const STATUS: Record<string, { label: string; className: string; icon: any; hint: string }> = {
  pending: {
    label: 'Waiting for DNS records',
    className: 'text-amber-600 bg-amber-50',
    icon: Clock,
    hint: 'Add the DNS records below at your domain provider, then click Verify.',
  },
  verifying: {
    label: 'Verifying DNS',
    className: 'text-amber-600 bg-amber-50',
    icon: RefreshCw,
    hint: 'Ownership confirmed. Waiting for your CNAME record to start pointing here.',
  },
  ssl_provisioning: {
    label: 'Issuing SSL certificate',
    className: 'text-dash-accent bg-dash-accent/10',
    icon: RefreshCw,
    hint: 'Your DNS is pointing correctly. The SSL certificate is being issued, usually within a few minutes.',
  },
  active: { label: 'Active', className: 'text-green bg-green/10', icon: CheckCircle2, hint: '' },
  error: {
    label: 'Error',
    className: 'text-red bg-red/10',
    icon: AlertTriangle,
    hint: 'Something went wrong verifying this domain. Check the records below and click Verify.',
  },
};

function CopyValue({ value, id, copied, onCopy }: { value: string; id: string; copied: string | null; onCopy: (v: string, id: string) => void }) {
  return (
    <button type="button" onClick={() => onCopy(value, id)} className="inline-flex items-center gap-1 font-mono text-left break-all hover:text-dash-accent transition-colors motion-reduce:transition-none" title="Copy">
      <span>{value}</span>
      {copied === id ? <Check className="w-3 h-3 text-green shrink-0" /> : <Copy className="w-3 h-3 !text-dash-textMuted shrink-0" />}
    </button>
  );
}

function RecordRow({ type, host, value, id, copied, onCopy }: { type: string; host: string; value: string; id: string; copied: string | null; onCopy: (v: string, id: string) => void }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[4.5rem_1fr_2fr] gap-x-3 gap-y-1 bg-dash-surface rounded p-2 !text-dash-text">
      <span className="font-semibold">{type}</span>
      <span><span className="!text-dash-textMuted">Host: </span><CopyValue value={host} id={`${id}-h`} copied={copied} onCopy={onCopy} /></span>
      <span className="col-span-2 sm:col-span-1"><span className="!text-dash-textMuted">Value: </span><CopyValue value={value} id={`${id}-v`} copied={copied} onCopy={onCopy} /></span>
    </div>
  );
}

export default function CustomDomainsTab({ workspaceId }: { workspaceId?: string }) {
  const [domains, setDomains] = useState<any[]>([]);
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    const res = await getDomains(workspaceId);
    setLoading(false);
    if ((res as any)?.error) toast.error((res as any).error);
    else setDomains((res as any)?.data ?? []);
  };

  useEffect(() => { load(); }, [workspaceId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !hostname.trim()) return;
    setAdding(true);
    const res = await addDomain(workspaceId, hostname.trim());
    setAdding(false);
    if ((res as any)?.success === false) { toast.error((res as any).error); return; }
    toast.success('Domain added. Add the DNS records to verify.');
    setHostname('');
    load();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteDomain(id);
    if ((res as any)?.success === false) { toast.error((res as any).error); return; }
    const detached = (res as any)?.detachedCourses ?? 0;
    toast.success(detached > 0
      ? `Domain removed. ${detached} course${detached === 1 ? '' : 's'} now use the default LeadsMind domain.`
      : 'Domain removed');
    load();
  };

  const handleVerify = async (domain: { id: string; hostname: string }) => {
    setVerifyingId(domain.id);
    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: domain.id }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Verification did not complete. Confirm the DNS records and try again.');
      }

      toast.success(`${domain.hostname} is verified and active.`);
      await load();
    } catch (error: any) {
      toast.error(error.message || `Could not verify ${domain.hostname}.`);
      await load();
    } finally {
      setVerifyingId(null);
    }
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
          <p className="text-sm !text-dash-textMuted">
            Connect your own domain for your courses, blog, and student and client portals. Websites are connected separately from the website builder.
            Staff tools (dashboard, CRM, settings) always stay on the LeadsMind domain.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="app.yourdomain.com"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-dash-border bg-white !text-dash-text text-sm focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
          />
          <DashButton type="submit" disabled={adding || !hostname.trim()} variant="primary" size="sm">
            <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add domain'}
          </DashButton>
        </form>
        <p className="text-xs !text-dash-textMuted">
          Recommended: use a subdomain such as <span className="font-mono">app.yourdomain.com</span> or <span className="font-mono">portal.yourdomain.com</span>.
          Subdomains work with every domain provider. Using your bare root domain (<span className="font-mono">yourdomain.com</span>) is possible only with some providers, and each of <span className="font-mono">yourdomain.com</span> and <span className="font-mono">www.yourdomain.com</span> needs to be added separately.
        </p>
        <p className="flex gap-1.5 text-xs !text-dash-textMuted">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-dash-accent" />
          <span>Your blog is automatically served on any verified custom domain connected to this workspace.</span>
        </p>
      </div>

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
            const isApex = (d.dns?.domainType ?? d.domain_type) === 'apex';
            const cnameHost = d.dns?.recordHost ?? (isApex ? '@' : d.hostname.split('.')[0]);
            const txtHost = d.dns?.txtHost ?? '_leadsmind-verify';
            return (
              <div key={d.id} className="border border-dash-border rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-medium !text-dash-text break-all">{d.hostname}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${s.className}`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.status !== 'active' && (
                      <DashButton type="button" onClick={() => handleVerify(d)} disabled={verifyingId === d.id} variant="primary" size="sm">
                        <RefreshCw className={`w-3 h-3 ${verifyingId === d.id ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                        {verifyingId === d.id ? 'Verifying…' : 'Verify'}
                      </DashButton>
                    )}
                    <button type="button" onClick={() => handleDelete(d.id)} aria-label={`Remove ${d.hostname}`} className="!text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {d.status !== 'active' && (
                  <div className="mt-3 space-y-3 text-xs">
                    {s.hint && <p className="!text-dash-text">{s.hint}</p>}

                    {d.last_check_error && (
                      <div className="flex gap-2 rounded bg-amber-50 text-amber-700 p-2">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <p>{d.last_check_error}</p>
                          {d.last_check_at && <p className="opacity-75 mt-0.5">Last checked {new Date(d.last_check_at).toLocaleString()}</p>}
                        </div>
                      </div>
                    )}

                    {isApex && (
                      <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 p-2 space-y-1">
                        <p className="font-semibold">Advanced: root domain</p>
                        <p>
                          A normal CNAME record isn&apos;t allowed on a root domain, and many providers (GoDaddy, for example) reject it.
                          It only works if your provider supports an <span className="font-semibold">ALIAS</span>, <span className="font-semibold">ANAME</span>, or CNAME-flattening record
                          (for example Cloudflare, or Namecheap&apos;s ALIAS record). Create that record with host <span className="font-mono">@</span>.
                        </p>
                        <p>
                          Not sure, or your provider doesn&apos;t support it? Remove this and add a subdomain instead, like <span className="font-mono">app.{d.hostname}</span> or <span className="font-mono">www.{d.hostname}</span>. It works everywhere.
                        </p>
                      </div>
                    )}

                    <p className="!text-dash-textMuted">Add these DNS records at your domain provider:</p>
                    <RecordRow
                      type={isApex ? 'ALIAS / CNAME' : 'CNAME'}
                      host={cnameHost}
                      value={CUSTOM_DOMAIN_CNAME_TARGET}
                      id={`${d.id}-c`}
                      copied={copied}
                      onCopy={copy}
                    />
                    {d.verification_token && (
                      <RecordRow type="TXT" host={txtHost} value={d.verification_token} id={`${d.id}-t`} copied={copied} onCopy={copy} />
                    )}

                    <p className="!text-dash-textMuted">
                      DNS changes usually take effect within minutes but can take up to 48 hours. We re-check automatically every 15 minutes, so you don&apos;t need to keep clicking Verify, though you can any time.
                      Some providers add your domain to the host automatically, so enter the Host exactly as shown.
                    </p>
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

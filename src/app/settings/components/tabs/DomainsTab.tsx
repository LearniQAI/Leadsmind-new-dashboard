"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Copy, Check, Info, PauseCircle, Star } from 'lucide-react';
import { getSenderDomains, registerSenderDomain, deleteSenderDomain, verifySenderDomain, updateSenderDomainIdentity } from '@/app/actions/domains';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui';

// Resend statuses (stored verbatim on sender_domains.status and on each record).
const STATUS_LABEL: Record<string, string> = {
  verified: 'Verified',
  pending: 'Checking DNS',
  not_started: 'Waiting for DNS',
  failed: 'Failed',
  temporary_failure: 'Temporary failure',
  partially_verified: 'Partially verified',
  partially_failed: 'Partially failed',
};

const statusTone = (status: string) =>
  status === 'verified'
    ? 'bg-green/10 text-green'
    : status === 'failed' || status === 'partially_failed'
      ? 'bg-red/10 text-red'
      : 'bg-amber-50 text-amber-600';

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;

export default function DomainsTab() {
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limits, setLimits] = useState<{ workspaceHourly: number; workspaceDaily: number; domainHourlyDefault: number } | null>(null);
  const [policy, setPolicy] = useState<{ windowDays: number; minSends: number; maxHardBounceRate: number; maxComplaintRate: number } | null>(null);
  const [newDomainName, setNewDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fromLocalPart, setFromLocalPart] = useState('');
  const [fromName, setFromName] = useState('');

  const selectedDomain = domains.find((d) => d.id === selectedId) ?? null;

  const loadDomains = async (keepSelection?: string | null) => {
    setIsLoading(true);
    const res = await getSenderDomains();
    setIsLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const list = res.data ?? [];
    setDomains(list);
    setLimits(res.limits ?? null);
    setPolicy(res.policy ?? null);
    const keep = keepSelection && list.some((d: any) => d.id === keepSelection) ? keepSelection : null;
    setSelectedId(keep ?? list[0]?.id ?? null);
  };

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    setFromLocalPart(selectedDomain?.from_local_part ?? '');
    setFromName(selectedDomain?.from_name ?? '');
  }, [selectedDomain?.id, selectedDomain?.from_local_part, selectedDomain?.from_name]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) {
      toast.error('Please enter a domain name');
      return;
    }
    setIsRegistering(true);
    const res = await registerSenderDomain(newDomainName);
    setIsRegistering(false);
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      toast.success('Domain added. Add the DNS records below, then check verification.');
      setNewDomainName('');
      await loadDomains(res.data.id);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Remove this sending domain? Emails can no longer be sent from it.')) return;
    const res = await deleteSenderDomain(domainId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Domain removed');
      await loadDomains(selectedId === domainId ? null : selectedId);
    }
  };

  const handleVerify = async (domainId: string) => {
    setIsVerifying(true);
    const res = await verifySenderDomain(domainId);
    setIsVerifying(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data?.status === 'verified') toast.success('Domain verified. You can now send from it.');
    else toast.message('Verification requested. DNS changes can take a while to propagate. Check again shortly.');
    await loadDomains(domainId);
  };

  const handleSaveIdentity = async (makeDefault = false) => {
    if (!selectedDomain) return;
    setIsSavingIdentity(true);
    const res = await updateSenderDomainIdentity(selectedDomain.id, { fromLocalPart, fromName, makeDefault });
    setIsSavingIdentity(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(makeDefault ? 'Default sending domain updated' : 'From identity saved');
      await loadDomains(selectedDomain.id);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied DNS record to clipboard');
  };

  // DMARC is a policy the user chooses, not a Resend-issued value, so a generic recommendation is correct here.
  const getExpectedDMARCHost = () => '_dmarc';
  const getExpectedDMARCValue = (domainName: string) => `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${domainName || 'yourdomain.com'}`;

  const CopyField = ({ label, text, id }: { label: string; text: string; id: string }) => (
    <div className="space-y-1.5 min-w-0">
      <span className="block text-xs font-bold !text-dash-textMuted">{label}</span>
      <div className="font-mono text-xs !text-dash-textMuted bg-dash-surface border border-dash-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <span className="break-all whitespace-pre-wrap">{text}</span>
        <button onClick={() => copyToClipboard(text, id)} className="!text-dash-textMuted hover:!text-dash-text p-1 hover:bg-dash-border/60 rounded-lg transition-colors motion-reduce:transition-none flex-shrink-0" aria-label={`Copy ${label}`}>
          {copiedId === id ? <Check size={14} className="text-green" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );

  const records: any[] = Array.isArray(selectedDomain?.records) ? selectedDomain.records : [];
  const rep = selectedDomain?.reputation;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">

      <div className="bg-dash-accent/5 border border-dash-accent/15 rounded-2xl p-6 flex gap-4 items-start">
        <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent flex-shrink-0">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold !text-dash-text">Send from your own domain, no email account needed</h4>
          <p className="text-sm !text-dash-textMuted leading-relaxed max-w-2xl">
            LeadsMind sends campaigns, sequences and automated emails from your domain through its own email service. Add the DNS records we show for your domain; once they are <strong>verified</strong>, every workspace email can go out from it. Unverified or paused domains cannot send.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-dash-accent"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold !text-dash-text">Sending domains</h4>
                <p className="text-xs !text-dash-textMuted font-medium">Verified by the LeadsMind email service</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 mb-6">
              <div className="space-y-2">
                <label htmlFor="new-sending-domain" className="text-xs font-bold !text-dash-textMuted block">Add sending domain</label>
                <div className="flex gap-2">
                  <input
                    id="new-sending-domain"
                    type="text"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="e.g. mail.company.com"
                    disabled={isRegistering}
                    className="flex-1 min-w-0 bg-white border border-dash-border rounded-xl px-4 py-2.5 !text-dash-text font-bold focus:border-dash-accent/50 transition-all motion-reduce:transition-none outline-none text-sm placeholder:!text-dash-textMuted placeholder:font-normal"
                  />
                  <DashButton type="submit" disabled={isRegistering} variant="primary" size="sm" className="shrink-0">
                    <Plus size={16} />
                    <span>{isRegistering ? 'Adding...' : 'Add'}</span>
                  </DashButton>
                </div>
              </div>
            </form>

            <div className="border-t border-dash-border pt-4">
              <label className="text-xs font-bold !text-dash-textMuted block mb-3">Your domains</label>
              {isLoading && domains.length === 0 ? (
                <div className="py-8 text-center text-sm !text-dash-textMuted">Loading domains...</div>
              ) : domains.length === 0 ? (
                <div className="py-8 text-center text-sm !text-dash-textMuted border border-dashed border-dash-border rounded-xl">
                  No sending domains yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {domains.map((d) => {
                    const isSelected = selectedId === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedId(d.id)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all motion-reduce:transition-none ${
                          isSelected ? 'bg-dash-accent/10 border-dash-accent/40' : 'bg-white border-dash-border hover:bg-dash-surface'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <span className="text-sm font-bold !text-dash-text flex items-center gap-1.5 break-all">
                            {d.domain_name}
                            {d.is_default && <Star size={12} className="text-dash-accent flex-shrink-0" aria-label="Default" />}
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusTone(d.status)}`}>
                              {STATUS_LABEL[d.status] ?? d.status}
                            </span>
                            {d.paused_at && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red/10 text-red">Paused</span>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(d.id);
                          }}
                          className="p-1.5 !text-dash-textMuted hover:text-red rounded-lg transition-colors motion-reduce:transition-none"
                          aria-label={`Remove ${d.domain_name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {limits && (
            <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm space-y-2">
              <h4 className="text-sm font-bold !text-dash-text">Sending limits</h4>
              <p className="text-sm !text-dash-textMuted leading-relaxed">
                Up to <strong>{limits.workspaceHourly.toLocaleString()}</strong> emails per hour and <strong>{limits.workspaceDaily.toLocaleString()}</strong> per day for this workspace, and {limits.domainHourlyDefault.toLocaleString()} per hour per domain. Campaign emails over the limit wait for the next window automatically.
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          {selectedDomain ? (
            <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-6 relative shadow-sm">
              <div className="flex items-center justify-between border-b border-dash-border pb-4 gap-4 flex-wrap">
                <div className="min-w-0">
                  <h4 className="text-[16px] font-bold !text-dash-text">DNS setup</h4>
                  <p className="text-sm !text-dash-textMuted font-medium break-all">Domain: <span className="text-dash-accent font-bold">{selectedDomain.domain_name}</span></p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedDomain.status === 'verified' ? (
                    <div className="flex items-center gap-1.5 text-green text-sm font-bold">
                      <CheckCircle2 size={14} /> Verified{selectedDomain.verified_at ? ` ${new Date(selectedDomain.verified_at).toLocaleDateString()}` : ''}
                    </div>
                  ) : (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusTone(selectedDomain.status)}`}>
                      {STATUS_LABEL[selectedDomain.status] ?? selectedDomain.status}
                    </span>
                  )}
                  <DashButton onClick={() => handleVerify(selectedDomain.id)} disabled={isVerifying} variant="primary" size="sm">
                    <RefreshCw size={12} className={isVerifying ? 'animate-spin motion-reduce:animate-none' : ''} />
                    {isVerifying ? 'Checking...' : 'Check verification'}
                  </DashButton>
                </div>
              </div>

              {selectedDomain.paused_at && (
                <div className="bg-red/5 border border-red/20 rounded-xl p-4 flex gap-2.5 items-start text-sm text-red leading-relaxed">
                  <PauseCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Sending from this domain was paused automatically on {new Date(selectedDomain.paused_at).toLocaleString()} to protect deliverability
                    {selectedDomain.pause_reason ? `: ${selectedDomain.pause_reason}` : ''}. Contact support to review it.
                  </span>
                </div>
              )}

              <div className="bg-dash-surface border border-dash-border rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold !text-dash-text">Records to add at your DNS provider</span>
                  <p className="text-xs !text-dash-textMuted leading-relaxed">
                    These are the exact records the email service generated for this domain. SPF lives on the <code>send</code> subdomain (a TXT with <code>include:amazonses.com</code>, an MX for bounce handling, and any other record listed), so it never clashes with your existing root SPF. Add every record below. DKIM is a key unique to this domain. Names are relative to your domain; some DNS providers want the full name instead.
                  </p>
                </div>
                {records.length === 0 ? (
                  <div className="py-6 text-center text-sm !text-dash-textMuted">No records yet. Click “Check verification” to load them.</div>
                ) : (
                  <div className="space-y-3">
                    {records.map((r, i) => (
                      <div key={`${r.purpose}-${r.type}-${r.name}-${i}`} className="bg-white border border-dash-border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-dash-accent/10 text-dash-accent px-2.5 py-1 rounded">{r.type}</span>
                            <span className="text-xs font-bold !text-dash-text">{r.purpose === 'OTHER' ? 'Required' : r.purpose}</span>
                            {r.priority !== undefined && r.priority !== null && <span className="text-xs !text-dash-textMuted">Priority {r.priority}</span>}
                            {r.ttl && <span className="text-xs !text-dash-textMuted">TTL {r.ttl}</span>}
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusTone(r.status)}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </div>
                        <CopyField label="Name / Host" text={r.name} id={`rec-${i}-host`} />
                        <CopyField label="Value" text={r.value} id={`rec-${i}-val`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-dash-surface border border-dash-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-bold !text-dash-text">DMARC policy (recommended)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedDomain.dmarc_status ? 'bg-green/10 text-green' : 'bg-amber-50 text-amber-600'}`}>
                    {selectedDomain.dmarc_status ? '● Enforcing policy found' : '○ Not found'}
                  </span>
                </div>
                <p className="text-xs !text-dash-textMuted leading-relaxed">
                  Optional, but mailbox providers trust domains with an enforcing DMARC policy. It is checked alongside verification and never blocks sending.
                </p>
                <CopyField label="Name / Host" text={getExpectedDMARCHost()} id="dmarc-host" />
                <CopyField label="Value" text={getExpectedDMARCValue(selectedDomain.domain_name)} id="dmarc-val" />
              </div>

              <div className="bg-dash-surface border border-dash-border rounded-xl p-5 space-y-4">
                <span className="text-sm font-bold !text-dash-text">From identity</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="from-local-part" className="block text-xs font-bold !text-dash-textMuted">From address</label>
                    <div className="flex items-center bg-white border border-dash-border rounded-xl overflow-hidden">
                      <input
                        id="from-local-part"
                        value={fromLocalPart}
                        onChange={(e) => setFromLocalPart(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2.5 text-sm !text-dash-text outline-none"
                      />
                      <span className="px-3 py-2.5 text-sm !text-dash-textMuted bg-dash-surface border-l border-dash-border break-all">@{selectedDomain.domain_name}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="from-name" className="block text-xs font-bold !text-dash-textMuted">From name</label>
                    <input
                      id="from-name"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Your company"
                      className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-sm !text-dash-text outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <DashButton onClick={() => handleSaveIdentity(false)} disabled={isSavingIdentity} variant="primary" size="sm">Save</DashButton>
                  {!selectedDomain.is_default && (
                    <DashButton onClick={() => handleSaveIdentity(true)} disabled={isSavingIdentity} variant="secondary" size="sm">
                      <Star size={12} /> Make default
                    </DashButton>
                  )}
                </div>
                <p className="text-xs !text-dash-textMuted">The default domain is used by automated emails (sequences, invoices, course emails). Campaigns can use any address on a verified domain.</p>
              </div>

              {rep && policy && (
                <div className="bg-dash-surface border border-dash-border rounded-xl p-5 space-y-2">
                  <span className="text-sm font-bold !text-dash-text">Reputation (last {policy.windowDays} days)</span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white border border-dash-border rounded-xl p-3">
                      <div className="text-lg font-bold !text-dash-text">{rep.sent.toLocaleString()}</div>
                      <div className="text-xs !text-dash-textMuted">Sent</div>
                    </div>
                    <div className="bg-white border border-dash-border rounded-xl p-3">
                      <div className="text-lg font-bold !text-dash-text">{pct(rep.hardBounceRate)}</div>
                      <div className="text-xs !text-dash-textMuted">Hard bounces (limit {pct(policy.maxHardBounceRate)})</div>
                    </div>
                    <div className="bg-white border border-dash-border rounded-xl p-3">
                      <div className="text-lg font-bold !text-dash-text">{pct(rep.complaintRate)}</div>
                      <div className="text-xs !text-dash-textMuted">Complaints (limit {pct(policy.maxComplaintRate)})</div>
                    </div>
                  </div>
                  <p className="text-xs !text-dash-textMuted">
                    A domain that crosses a limit after at least {policy.minSends} sends is paused automatically, so one domain cannot hurt delivery for everyone else.
                  </p>
                </div>
              )}

              {selectedDomain.status !== 'verified' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2.5 items-start text-sm text-amber-700 leading-relaxed">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>Emails from this domain are blocked until it is verified. DNS changes can take up to a few hours to be visible.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-dash-border rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-dash-accent/10 rounded-full flex items-center justify-center mb-6 border border-dash-accent/20 text-dash-accent">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-[16px] font-bold !text-dash-text">No domain selected</h4>
              <p className="text-sm !text-dash-textMuted max-w-sm mt-2">
                Add a sending domain to get the exact DNS records to enter at your DNS provider.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

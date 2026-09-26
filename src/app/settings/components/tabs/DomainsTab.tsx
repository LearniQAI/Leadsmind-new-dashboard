"use client";

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, Clock, Copy, Gauge, Globe, Info, MailCheck, PauseCircle,
  Plus, RefreshCw, Send, ShieldCheck, Star, Trash2, XCircle, Calendar, Layers,
} from 'lucide-react';
import { getSenderDomains, registerSenderDomain, deleteSenderDomain, verifySenderDomain, updateSenderDomainIdentity } from '@/app/actions/domains';
import { toast } from 'sonner';
import { DashButton, DashCard, DashEmptyState, DashStatusPill } from '@/components/dashboard-ui';

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

type PillVariant = 'success' | 'warning' | 'danger';

// Same StatusPill variants as the rest of the dashboard (bg-<token>/10 text-<token>). Note the
// project's amber/green/red are flat tokens, so shade utilities like amber-50 render nothing.
const statusVariant = (status: string): PillVariant =>
  status === 'verified' ? 'success' : status === 'failed' || status === 'partially_failed' ? 'danger' : 'warning';

const domainPill = (d: any): { variant: PillVariant; label: string } =>
  d.paused_at ? { variant: 'danger', label: 'Paused' } : { variant: statusVariant(d.status), label: STATUS_LABEL[d.status] ?? d.status };

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;

// Matches the dashboard KPI value treatment (PipelineStats / home KPI cards).
const STAT_VALUE_CLASS = 'text-[24px] font-bold !text-dash-text tracking-tight tabular-nums leading-none';
const SECTION_TITLE_CLASS = 'text-[15px] font-bold !text-dash-text';
const SECTION_SUB_CLASS = 'text-[13px] !text-dash-textMuted mt-0.5';
const FIELD_LABEL_CLASS = 'block text-[11px] font-semibold !text-dash-textMuted mb-1.5';
const INPUT_CLASS =
  'w-full h-11 bg-white border border-dash-border rounded-xl px-4 text-sm !text-dash-text placeholder:!text-dash-textMuted/70 outline-none focus:border-dash-accent focus:ring-2 focus:ring-dash-accent/15 transition-colors motion-reduce:transition-none disabled:opacity-60';

function CopyValue({ label, text, id, copiedId, onCopy }: { label: string; text: string; id: string; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  const copied = copiedId === id;
  return (
    <div className="min-w-0">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <div className="group flex items-start gap-2 bg-dash-surface border border-dash-border rounded-xl pl-3.5 pr-1.5 py-1.5 min-h-[44px]">
        {/* overflow-wrap:anywhere: short values wrap at spaces, long keys only where they must. */}
        <code className="flex-1 min-w-0 py-1.5 font-mono text-[13px] leading-6 !text-dash-text [overflow-wrap:anywhere]">{text}</code>
        <button
          type="button"
          onClick={() => onCopy(text, id)}
          className={`shrink-0 mt-0.5 h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors motion-reduce:transition-none ${
            copied ? 'bg-green/10 text-green' : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
          }`}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

function RecordStatus({ status }: { status: string }) {
  if (status === 'verified') {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green"><CheckCircle2 size={15} /> Verified</span>;
  }
  if (status === 'failed' || status === 'partially_failed') {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red"><XCircle size={15} /> {STATUS_LABEL[status] ?? 'Failed'}</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber"><Clock size={15} /> {status === 'pending' ? 'Checking' : 'Waiting'}</span>;
}

function DnsRecordRow({
  type, purpose, meta, host, value, status, idPrefix, copiedId, onCopy,
}: {
  type: string; purpose: string; meta?: string; host: string; value: string; status: React.ReactNode; idPrefix: string;
  copiedId: string | null; onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[112px_minmax(0,1fr)] gap-4 p-5 border-t border-dash-border first:border-t-0">
      <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
        <div className="flex flex-wrap md:flex-col items-center md:items-start gap-x-2 gap-y-1">
          <span className="inline-flex items-center justify-center min-w-[52px] h-7 px-2.5 rounded-lg bg-dash-accent/10 text-dash-accent font-mono text-xs font-bold">{type}</span>
          <span className="text-xs font-semibold !text-dash-text">{purpose}</span>
          {meta && <span className="w-full md:w-auto text-[11px] !text-dash-textMuted">{meta}</span>}
        </div>
        <div className="md:hidden">{status}</div>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="hidden md:flex justify-end -mb-1">{status}</div>
        <div className="grid grid-cols-1 gap-3">
          <CopyValue label="Name / Host" text={host} id={`${idPrefix}-host`} copiedId={copiedId} onCopy={onCopy} />
          <CopyValue label="Value" text={value} id={`${idPrefix}-val`} copiedId={copiedId} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
}

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

  const records: any[] = Array.isArray(selectedDomain?.records) ? selectedDomain.records : [];
  const rep = selectedDomain?.reputation;
  const selectedPill = selectedDomain ? domainPill(selectedDomain) : null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">

      {/* 1. Intro */}
      <DashCard interactive={false} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dash-accent/[0.07] via-transparent to-transparent pointer-events-none" />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-5 md:gap-6">
          <div className="w-12 h-12 rounded-2xl bg-dash-accent/10 text-dash-accent flex items-center justify-center shrink-0">
            <MailCheck size={22} />
          </div>
          <div className="min-w-0 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-lg md:text-xl font-bold !text-dash-text tracking-tight">Send from your own domain. No email account needed.</h3>
              <p className="text-sm !text-dash-textMuted leading-relaxed max-w-2xl">
                LeadsMind sends your campaigns, sequences and automated emails from your domain through its own email service. Unverified or paused domains cannot send.
              </p>
            </div>
            <ol className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
              {['Add your domain', 'Add the DNS records we show', 'Verify, then start sending'].map((step, i) => (
                <li key={step} className="inline-flex items-center gap-2 text-[13px] font-semibold !text-dash-text bg-white/80 border border-dash-border rounded-full pl-1.5 pr-3.5 py-1.5 w-fit">
                  <span className="w-6 h-6 rounded-full bg-dash-accent text-white text-xs font-bold inline-flex items-center justify-center">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </DashCard>

      {/* 2. Sending domains */}
      <section className="space-y-4" aria-labelledby="sending-domains-title">
        <div>
          <h4 id="sending-domains-title" className={SECTION_TITLE_CLASS}>Sending domains</h4>
          <p className={SECTION_SUB_CLASS}>Verified by the LeadsMind email service. Select a domain to see its DNS setup.</p>
        </div>

        <DashCard interactive={false} className="p-5 md:p-6">
          <form onSubmit={handleRegister}>
            <label htmlFor="new-sending-domain" className="block text-[13px] font-semibold !text-dash-text mb-2">Add a sending domain</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 !text-dash-textMuted pointer-events-none" />
                <input
                  id="new-sending-domain"
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="mail.yourcompany.com"
                  disabled={isRegistering}
                  aria-describedby="new-sending-domain-help"
                  className={`${INPUT_CLASS} pl-11 font-medium`}
                />
              </div>
              <DashButton type="submit" disabled={isRegistering} variant="primary" className="shrink-0">
                <Plus size={16} />
                <span>{isRegistering ? 'Adding...' : 'Add domain'}</span>
              </DashButton>
            </div>
            <p id="new-sending-domain-help" className="text-xs !text-dash-textMuted mt-2">
              Use a subdomain like <span className="font-mono !text-dash-text">mail.yourdomain.com</span> for the smoothest setup.
            </p>
          </form>
        </DashCard>

        {isLoading && domains.length === 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-[92px] rounded-2xl border border-dash-border bg-dash-surface animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : domains.length === 0 ? (
          <DashCard interactive={false} className="border-dashed">
            <DashEmptyState icon={ShieldCheck} title="No sending domains yet" description="Add a domain above to get the exact DNS records to enter at your DNS provider." />
          </DashCard>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
            {domains.map((d) => {
              const isSelected = selectedId === d.id;
              const pill = domainPill(d);
              return (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(d.id);
                    }
                  }}
                  className={`relative text-left rounded-2xl border p-4 md:p-5 cursor-pointer transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent ${
                    isSelected
                      ? 'bg-dash-accent/[0.04] border-dash-accent ring-1 ring-dash-accent'
                      : 'bg-white border-dash-border shadow-sm hover:shadow-md hover:border-dash-accent/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-dash-accent text-white' : 'bg-dash-accent/10 text-dash-accent'}`}>
                      <Globe size={18} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold !text-dash-text truncate" title={d.domain_name}>{d.domain_name}</span>
                        {d.is_default && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-dash-accent shrink-0">
                            <Star size={11} className="fill-current" /> Default
                          </span>
                        )}
                      </div>
                      <DashStatusPill variant={pill.variant} dot className="whitespace-nowrap">{pill.label}</DashStatusPill>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="shrink-0 -mr-1 -mt-1 h-8 w-8 inline-flex items-center justify-center rounded-lg !text-dash-textMuted hover:text-red hover:bg-red/10 transition-colors motion-reduce:transition-none"
                      aria-label={`Remove ${d.domain_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. DNS setup for the selected domain */}
      {selectedDomain && selectedPill && (
        <section className="space-y-4" aria-labelledby="dns-setup-title">
          <DashCard interactive={false} className="overflow-hidden">
            <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-dash-border">
              <div className="min-w-0 space-y-1.5">
                <h4 id="dns-setup-title" className={SECTION_TITLE_CLASS}>DNS setup</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold !text-dash-text [overflow-wrap:anywhere]">{selectedDomain.domain_name}</span>
                  <DashStatusPill variant={selectedPill.variant} dot>
                    {selectedPill.label}
                    {selectedDomain.status === 'verified' && selectedDomain.verified_at ? ` · ${new Date(selectedDomain.verified_at).toLocaleDateString()}` : ''}
                  </DashStatusPill>
                </div>
                {selectedDomain.last_checked_at && (
                  <p className="text-xs !text-dash-textMuted">Last checked {new Date(selectedDomain.last_checked_at).toLocaleString()}</p>
                )}
              </div>
              <DashButton onClick={() => handleVerify(selectedDomain.id)} disabled={isVerifying} variant="primary" className="shrink-0 w-full sm:w-auto">
                <RefreshCw size={15} className={isVerifying ? 'animate-spin motion-reduce:animate-none' : ''} />
                {isVerifying ? 'Checking...' : 'Check verification'}
              </DashButton>
            </div>

            {(selectedDomain.paused_at || selectedDomain.status !== 'verified') && (
              <div className="px-5 md:px-6 pt-5 space-y-3">
                {selectedDomain.paused_at && (
                  <div className="bg-red/5 border border-red/20 rounded-xl p-4 flex gap-3 items-start text-sm text-red leading-relaxed">
                    <PauseCircle size={18} className="mt-0.5 shrink-0" />
                    <span>
                      Sending from this domain was paused automatically on {new Date(selectedDomain.paused_at).toLocaleString()} to protect deliverability
                      {selectedDomain.pause_reason ? `: ${selectedDomain.pause_reason}` : ''}. Contact support to review it.
                    </span>
                  </div>
                )}
                {selectedDomain.status !== 'verified' && (
                  <div className="bg-amber/10 border border-amber/30 rounded-xl p-4 flex gap-3 items-start text-sm !text-dash-text leading-relaxed">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber" />
                    <span>Emails from this domain are blocked until it is verified. DNS changes can take up to a few hours to be visible.</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-5 md:p-6 space-y-5">
              <div>
                <h5 className="text-[13px] font-bold !text-dash-text">Records to add at your DNS provider</h5>
                <p className="text-xs !text-dash-textMuted mt-0.5">The exact records the email service generated for this domain. Add every record below.</p>
              </div>

              <ul className="rounded-xl bg-dash-accent/[0.04] border border-dash-accent/10 p-4 space-y-2.5">
                {[
                  { icon: Send, text: <>SPF lives on the <code className="font-mono !text-dash-text">send</code> subdomain (a TXT with <code className="font-mono !text-dash-text">include:amazonses.com</code> and an MX for bounces), so it never clashes with your root SPF.</> },
                  { icon: ShieldCheck, text: <>DKIM is a signing key unique to this domain. Copy it exactly as shown.</> },
                  { icon: Info, text: <>Names are relative to your domain. Some DNS providers want the full name instead.</> },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-[13px] !text-dash-textMuted leading-relaxed">
                    <Icon size={15} className="text-dash-accent shrink-0 mt-px" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              {records.length === 0 ? (
                <div className="rounded-xl border border-dashed border-dash-border py-10 text-center text-sm !text-dash-textMuted">
                  No records yet. Click “Check verification” to load them.
                </div>
              ) : (
                <div className="rounded-2xl border border-dash-border overflow-hidden">
                  {records.map((r, i) => (
                    <DnsRecordRow
                      key={`${r.purpose}-${r.type}-${r.name}-${i}`}
                      type={r.type}
                      purpose={r.purpose === 'OTHER' ? 'Required' : r.purpose}
                      meta={[r.priority !== undefined && r.priority !== null ? `Priority ${r.priority}` : null, r.ttl ? `TTL ${r.ttl}` : null].filter(Boolean).join(' · ') || undefined}
                      host={r.name}
                      value={r.value}
                      status={<RecordStatus status={r.status} />}
                      idPrefix={`rec-${i}`}
                      copiedId={copiedId}
                      onCopy={copyToClipboard}
                    />
                  ))}
                </div>
              )}

              <div className="pt-2">
                <div className="mb-3">
                  <h5 className="text-[13px] font-bold !text-dash-text">DMARC policy <span className="font-medium !text-dash-textMuted">(recommended)</span></h5>
                  <p className="text-xs !text-dash-textMuted mt-0.5">Optional, but mailbox providers trust domains with an enforcing DMARC policy. It is checked alongside verification and never blocks sending.</p>
                </div>
                <div className="rounded-2xl border border-dash-border overflow-hidden">
                  <DnsRecordRow
                    type="TXT"
                    purpose="DMARC"
                    meta="Optional"
                    host={getExpectedDMARCHost()}
                    value={getExpectedDMARCValue(selectedDomain.domain_name)}
                    status={
                      selectedDomain.dmarc_status
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green"><CheckCircle2 size={15} /> Enforcing policy found</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-semibold !text-dash-textMuted"><Clock size={15} /> Not found</span>
                    }
                    idPrefix="dmarc"
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                  />
                </div>
              </div>
            </div>
          </DashCard>

          <div className="grid grid-cols-1 gap-4">
            <DashCard interactive={false} className="p-5 md:p-6 space-y-5">
              <div>
                <h5 className="text-[13px] font-bold !text-dash-text">From identity</h5>
                <p className="text-xs !text-dash-textMuted mt-0.5">The default domain is used by automated emails (sequences, invoices, course emails). Campaigns can use any address on a verified domain.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label htmlFor="from-local-part" className={FIELD_LABEL_CLASS}>From address</label>
                  <div className="flex items-stretch h-11 bg-white border border-dash-border rounded-xl overflow-hidden focus-within:border-dash-accent focus-within:ring-2 focus-within:ring-dash-accent/15">
                    <input
                      id="from-local-part"
                      value={fromLocalPart}
                      onChange={(e) => setFromLocalPart(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 text-sm !text-dash-text outline-none bg-transparent"
                    />
                    <span className="px-3 flex items-center text-sm !text-dash-textMuted bg-dash-surface border-l border-dash-border max-w-[55%] truncate" title={`@${selectedDomain.domain_name}`}>@{selectedDomain.domain_name}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <label htmlFor="from-name" className={FIELD_LABEL_CLASS}>From name</label>
                  <input id="from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your company" className={INPUT_CLASS} />
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <DashButton onClick={() => handleSaveIdentity(false)} disabled={isSavingIdentity} variant="primary" size="sm">Save identity</DashButton>
                {!selectedDomain.is_default && (
                  <DashButton onClick={() => handleSaveIdentity(true)} disabled={isSavingIdentity} variant="secondary" size="sm">
                    <Star size={13} /> Make default
                  </DashButton>
                )}
              </div>
            </DashCard>

            {rep && policy && (
              <DashCard interactive={false} className="p-5 md:p-6 space-y-5">
                <div>
                  <h5 className="text-[13px] font-bold !text-dash-text">Reputation <span className="font-medium !text-dash-textMuted">· last {policy.windowDays} days</span></h5>
                  <p className="text-xs !text-dash-textMuted mt-0.5">A domain that crosses a limit after at least {policy.minSends} sends is paused automatically, so one domain cannot hurt delivery for everyone else.</p>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {[
                    { label: 'Sent', value: rep.sent.toLocaleString(), hint: null as string | null },
                    { label: 'Hard bounces', value: pct(rep.hardBounceRate), hint: `limit ${pct(policy.maxHardBounceRate)}` },
                    { label: 'Complaints', value: pct(rep.complaintRate), hint: `limit ${pct(policy.maxComplaintRate)}` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-dash-surface border border-dash-border p-4">
                      <p className="text-[11px] font-semibold !text-dash-textMuted mb-2">{s.label}</p>
                      <p className={STAT_VALUE_CLASS}>{s.value}</p>
                      {s.hint && <p className="text-[11px] !text-dash-textMuted mt-1.5">{s.hint}</p>}
                    </div>
                  ))}
                </div>
              </DashCard>
            )}
          </div>
        </section>
      )}

      {/* 4. Sending limits */}
      {limits && (
        <section className="space-y-4" aria-labelledby="sending-limits-title">
          <div>
            <h4 id="sending-limits-title" className={SECTION_TITLE_CLASS}>Sending limits</h4>
            <p className={SECTION_SUB_CLASS}>Campaign emails over a limit wait for the next window automatically.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {[
              { icon: Gauge, tone: 'bg-dash-accent/10 text-dash-accent', label: 'Per hour', sub: 'emails · this workspace', value: limits.workspaceHourly },
              { icon: Calendar, tone: 'bg-green/10 text-green', label: 'Per day', sub: 'emails · this workspace', value: limits.workspaceDaily },
              { icon: Layers, tone: 'bg-amber/10 text-amber', label: 'Per domain', sub: 'emails per hour, each domain', value: limits.domainHourlyDefault },
            ].map(({ icon: Icon, tone, label, sub, value }) => (
              <DashCard key={label} padding="default" interactive={false} className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold !text-dash-textMuted mb-1.5">{label}</p>
                  <p className={`${STAT_VALUE_CLASS} whitespace-nowrap`}>{value.toLocaleString()}</p>
                  <p className="text-[11px] !text-dash-textMuted mt-1.5">{sub}</p>
                </div>
              </DashCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Mail, Tag, Send, Loader2, EyeOff, Ban, PenLine, UserX, MessageCircle, MessageSquare, CheckCircle2, Circle } from 'lucide-react';
import { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { invokeRightToErasure, ErasureReceipt } from '@/app/actions/popia';
import { inviteContactToPortal, revokeContactPortalAccess, impersonateContact } from '@/app/actions/portal';
import { ErasureReceiptModal } from '@/components/crm/ErasureReceiptModal';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

interface ProfileSidebarProps {
  contact: Contact;
}

export function ProfileSidebar({ contact }: ProfileSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ErasureReceipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [consentRecord, setConsentRecord] = useState<any>(null);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<'email' | 'whatsapp' | 'sms'>('email');
  const [selectedChecks, setSelectedChecks] = useState<string[]>([
    'hanis_identity',
    'credit_report',
    'sanctions_screen',
  ]);

  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadConsent() {
      setLoadingConsent(true);
      const { data, error } = await supabase
        .from('kyc_consent')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConsentRecord(data);
      }
      setLoadingConsent(false);
    }
    loadConsent();
  }, [contact.id, supabase]);

  const handleSendRequest = async () => {
    setLoadingConsent(true);
    try {
      const res = await fetch('/api/kyc/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          workspaceId: contact.workspace_id,
          checkTypes: selectedChecks,
          channel: dispatchChannel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Consent request successfully sent via ${dispatchChannel.toUpperCase()}!`);
      setShowRequestModal(false);
      
      const { data: updated } = await supabase
        .from('kyc_consent')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setConsentRecord(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch request.');
    } finally {
      setLoadingConsent(false);
    }
  };

  const handlePortalInvite = async () => {
    setPortalLoading(true);
    try {
      const res = await inviteContactToPortal(contact.id);
      if (res.success) {
        toast.success('Portal invitation dispatched successfully!');
      } else {
        toast.error(res.error || 'Failed to dispatch portal invitation.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePortalRevoke = async () => {
    const confirmed = window.confirm('Are you sure you want to revoke client portal access immediately?');
    if (!confirmed) return;
    setPortalLoading(true);
    try {
      const res = await revokeContactPortalAccess(contact.id);
      if (res.success) {
        toast.success('Portal access revoked immediately.');
      } else {
        toast.error(res.error || 'Failed to revoke portal access.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePortalImpersonate = async () => {
    setPortalLoading(true);
    try {
      const res = await impersonateContact(contact.id);
      if (res.success) {
        toast.success('Entering client view impersonation...');
        window.open('/portal/dashboard', '_blank');
      } else {
        toast.error(res.error || 'Failed to impersonate client.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleErasure = async () => {
    const email = contact.email || 'this contact';
    const confirmed = window.confirm(
      `WARNING: You are executing a POPIA Right-to-Erasure request for ${email}.\n\n` +
      `This will:\n` +
      `- Cancel all running sequence executions.\n` +
      `- Remove the contact from enrollment queues.\n` +
      `- Add their email to the workspace global suppression block list.\n` +
      `- Permanently anonymize CRM fields.\n\n` +
      `Are you sure you want to proceed? This is irreversible.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await invokeRightToErasure(contact.id);
      if (res.success && res.data) {
        setReceipt(res.data);
        setShowReceipt(true);
        toast.success('POPIA Erasure request successfully executed.');
      } else {
        toast.error(res.error || 'Failed to process erasure request.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-[280px] shrink-0 space-y-6">
      {/* Identity Card */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-dash-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-text font-bold text-2xl mb-4 overflow-hidden relative z-10">
            {contact.first_name[0] || '?'}{contact.last_name ? contact.last_name[0] : ''}
          </div>
          <h2 className="text-[18px] font-bold !text-dash-text tracking-tight relative z-10">
            {contact.first_name} {contact.last_name || ''}
          </h2>
          <p className="text-[12px] !text-dash-textMuted relative z-10">{contact.email || 'No email provided'}</p>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between py-2 border-b border-dash-border">
            <span className="text-[11px] font-semibold !text-dash-textMuted">Status</span>
            <DashStatusPill variant={contact.first_name === 'ANONYMIZED' ? 'danger' : 'success'}>
              {contact.first_name === 'ANONYMIZED' ? 'Erased (POPIA)' : 'Active'}
            </DashStatusPill>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-dash-border">
            <span className="text-[11px] font-semibold !text-dash-textMuted">Source</span>
            <span className="text-[12px] font-semibold !text-dash-text">{contact.source || 'Direct'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[11px] font-semibold !text-dash-textMuted">Created</span>
            <span className="text-[11px] font-medium !text-dash-textMuted">{format(new Date(contact.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Tactical Info */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
        <h4 className="text-[12px] font-bold !text-dash-text mb-5">Tactical channels</h4>
        <div className="space-y-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted group-hover:text-dash-accent group-hover:border-dash-accent/40 transition-colors motion-reduce:transition-none">
              <Phone size={13} />
            </div>
            <span className="text-[13px] !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">{contact.phone || 'Not available'}</span>
          </div>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted group-hover:text-dash-accent group-hover:border-dash-accent/40 transition-colors motion-reduce:transition-none">
              <Mail size={13} />
            </div>
            <span className="text-[13px] !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none truncate">{contact.email || 'Not available'}</span>
          </div>
        </div>
      </div>

      {/* Strategic Tags */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[12px] font-bold !text-dash-text">Strategic tags</h4>
          <Tag size={12} className="text-dash-accent" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags && contact.tags.length > 0 ? contact.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-dash-accent/10 text-dash-accent text-[11px] font-semibold border border-dash-accent/10">
              {tag}
            </span>
          )) : (
            <span className="text-[11px] !text-dash-textMuted italic">No tags assigned</span>
          )}
        </div>
      </div>

      {/* Portal Access Management */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-bold !text-dash-text">Portal access</h4>
          <DashStatusPill
            variant={
              (contact as any).portal_access_revoked
                ? 'danger'
                : (contact as any).portal_access_enabled
                ? 'success'
                : 'warning'
            }
          >
            {(contact as any).portal_access_revoked ? 'Revoked' : (contact as any).portal_access_enabled ? 'Active' : 'No access'}
          </DashStatusPill>
        </div>

        <div className="space-y-2">
          {!(contact as any).portal_access_enabled || (contact as any).portal_access_revoked ? (
            <DashButton
              variant="primary"
              size="sm"
              className="w-full"
              onClick={handlePortalInvite}
              disabled={portalLoading || contact.first_name === 'ANONYMIZED'}
            >
              {portalLoading ? (
                <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <>
                  <Send size={12} />
                  {(contact as any).portal_access_revoked ? 'Re-invite to portal' : 'Invite to portal'}
                </>
              )}
            </DashButton>
          ) : (
            <>
              <DashButton variant="secondary" size="sm" className="w-full" onClick={handlePortalImpersonate} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <>
                    <EyeOff size={12} />
                    Impersonate view
                  </>
                )}
              </DashButton>
              <DashButton variant="destructive" size="sm" className="w-full" onClick={handlePortalRevoke} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <>
                    <Ban size={12} />
                    Revoke access
                  </>
                )}
              </DashButton>
            </>
          )}
        </div>
      </div>

      {/* Compliance & Consent Gate */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-bold !text-dash-text">POPIA compliance</h4>
          {loadingConsent ? (
            <span className="text-[11px] !text-dash-textMuted">Loading…</span>
          ) : !consentRecord ? (
            <DashStatusPill variant="warning">Not requested</DashStatusPill>
          ) : consentRecord.status === 'obtained' ? (
            <DashStatusPill variant="success">Obtained</DashStatusPill>
          ) : consentRecord.status === 'pending' ? (
            <DashStatusPill variant="info" className="motion-safe:animate-pulse">Pending</DashStatusPill>
          ) : (
            <DashStatusPill variant="danger">{consentRecord.status}</DashStatusPill>
          )}
        </div>

        {consentRecord && consentRecord.status === 'obtained' && (
          <div className="text-[11px] !text-dash-textMuted space-y-1 font-mono">
            <div><strong>Given:</strong> {new Date(consentRecord.consent_given_at).toLocaleDateString()}</div>
            <div><strong>IP:</strong> {consentRecord.ip_address || 'N/A'}</div>
          </div>
        )}

        <DashButton
          variant="primary"
          size="sm"
          className="w-full bg-purple-600 hover:bg-purple-500 shadow-none hover:translate-y-0"
          onClick={() => setShowRequestModal(true)}
          disabled={loadingConsent || contact.first_name === 'ANONYMIZED'}
        >
          <PenLine size={12} />
          {consentRecord ? 'Re-request consent' : 'Request consent'}
        </DashButton>
      </div>

      {/* Operations & Compliance */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm space-y-3">
        <h4 className="text-[12px] font-bold !text-dash-text">Compliance gateways</h4>
        <DashButton
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleErasure}
          disabled={loading || contact.first_name === 'ANONYMIZED'}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
              Erasing…
            </>
          ) : contact.first_name === 'ANONYMIZED' ? (
            <>
              <UserX size={12} />
              POPIA erased
            </>
          ) : (
            <>
              <UserX size={12} />
              Right to erasure (POPIA)
            </>
          )}
        </DashButton>
      </div>

      <ErasureReceiptModal
        isOpen={showReceipt}
        onOpenChange={setShowReceipt}
        receipt={receipt}
      />

      {/* Consent Request Dispatch Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-dash-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none">
            <div>
              <h3 className="text-[16px] font-bold !text-dash-text tracking-tight">
                Request explicit POPIA consent
              </h3>
              <p className="text-[12px] !text-dash-textMuted mt-1 leading-relaxed">
                Generate a secure, tracked link for <strong className="!text-dash-text">{contact.first_name} {contact.last_name || ''}</strong> to sign under South African POPIA regulations.
              </p>
            </div>

            {/* Channels selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold !text-dash-textMuted">
                Dispatch channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'sms', label: 'SMS', icon: MessageSquare }
                ].map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setDispatchChannel(ch.id as any)}
                    className={cn(
                      "h-10 rounded-xl border flex flex-col items-center justify-center text-[11px] font-bold transition-colors motion-reduce:transition-none",
                      dispatchChannel === ch.id
                        ? "bg-purple-600/10 border-purple-500 text-purple-600"
                        : "bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text"
                    )}
                  >
                    <ch.icon size={13} className="mb-0.5" />
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Check types checklist selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold !text-dash-textMuted">
                Verifications scope
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'hanis_identity', label: 'ID / HANIS verification' },
                  { id: 'credit_report', label: 'Credit report verification' },
                  { id: 'sanctions_screen', label: 'Sanctions screening (AML)' },
                  { id: 'pep_check', label: 'Politically exposed person (PEP)' },
                  { id: 'address_verification', label: 'Address verification' }
                ].map(chk => {
                  const active = selectedChecks.includes(chk.id);
                  return (
                    <button
                      key={chk.id}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setSelectedChecks(selectedChecks.filter(c => c !== chk.id));
                        } else {
                          setSelectedChecks([...selectedChecks, chk.id]);
                        }
                      }}
                      className={cn(
                        "w-full h-9 px-4 rounded-xl border flex items-center justify-between text-[11.5px] font-semibold transition-colors motion-reduce:transition-none",
                        active
                          ? "bg-purple-600/5 border-purple-500/20 !text-dash-text"
                          : "bg-white border-dash-border !text-dash-textMuted hover:!text-dash-text"
                      )}
                    >
                      <span>{chk.label}</span>
                      {active ? (
                        <CheckCircle2 size={12} className="text-purple-600" />
                      ) : (
                        <Circle size={12} className="text-dash-border" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <DashButton variant="secondary" size="default" className="flex-1" onClick={() => setShowRequestModal(false)}>
                Cancel
              </DashButton>
              <DashButton
                variant="primary"
                size="default"
                className="flex-1 bg-purple-600 hover:bg-purple-500 shadow-none hover:translate-y-0"
                onClick={handleSendRequest}
                disabled={selectedChecks.length === 0}
              >
                <Send size={12} />
                Dispatch request
              </DashButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { invokeRightToErasure, ErasureReceipt } from '@/app/actions/popia';
import { inviteContactToPortal, revokeContactPortalAccess, impersonateContact } from '@/app/actions/portal';
import { ErasureReceiptModal } from '@/components/crm/ErasureReceiptModal';
import { toast } from 'sonner';

interface ProfileSidebarProps {
  contact: Contact;
}

export function ProfileSidebar({ contact }: ProfileSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ErasureReceipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

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
    <div className="w-[280px] shrink-0 space-y-6">
      {/* Identity Card */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-2xl mb-4 font-space-grotesk overflow-hidden shadow-2xl relative z-10">
            {contact.first_name[0] || '?'}{contact.last_name ? contact.last_name[0] : ''}
          </div>
          <h2 className="text-[18px] font-bold text-[#eef2ff] font-space-grotesk tracking-tight relative z-10">
            {contact.first_name} {contact.last_name || ''}
          </h2>
          <p className="text-[12px] text-[#4a5a82] font-dm-sans relative z-10">{contact.email || 'No email provided'}</p>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Status</span>
            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border",
              contact.first_name === 'ANONYMIZED'
                ? "bg-red-500/15 text-red-400 border-red-500/20"
                : "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20"
            )}>
              {contact.first_name === 'ANONYMIZED' ? 'Erased (POPIA)' : 'Active'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Source</span>
            <span className="text-[12px] font-semibold text-[#eef2ff] font-dm-sans">{contact.source || 'Direct'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Created</span>
            <span className="text-[11px] font-medium text-[#4a5a82] font-dm-sans">{format(new Date(contact.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Tactical Info */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl">
        <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] mb-5 font-dm-sans">Tactical Channels</h4>
        <div className="space-y-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/40 transition-all">
              <i className="fa-solid fa-phone text-[12px]"></i>
            </div>
            <span className="text-[13px] text-[#94a3c8] font-dm-sans group-hover:text-[#eef2ff] transition-colors">{contact.phone || 'Not available'}</span>
          </div>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/40 transition-all">
              <i className="fa-solid fa-envelope text-[12px]"></i>
            </div>
            <span className="text-[13px] text-[#94a3c8] font-dm-sans group-hover:text-[#eef2ff] transition-colors truncate">{contact.email || 'Not available'}</span>
          </div>
        </div>
      </div>

      {/* Strategic Tags */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">Strategic Tags</h4>
          <i className="fa-solid fa-tag text-[10px] text-[#2563eb]"></i>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags && contact.tags.length > 0 ? contact.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-[#2563eb]/10 text-[#3b82f6] text-[9px] font-bold uppercase tracking-tight border border-[#2563eb]/10">
              {tag}
            </span>
          )) : (
            <span className="text-[11px] text-[#4a5a82] italic font-dm-sans">No tags assigned</span>
          )}
        </div>
      </div>

      {/* Portal Access Management */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">Portal Access</h4>
          <span className={cn(
            "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border",
            (contact as any).portal_access_revoked
              ? "bg-red-500/15 text-red-400 border-red-500/20"
              : (contact as any).portal_access_enabled
              ? "bg-emerald-500/15 text-emerald-400 border-[#10b981]/20"
              : "bg-amber-500/15 text-amber-400 border-amber-500/20"
          )}>
            {(contact as any).portal_access_revoked ? 'Revoked' : (contact as any).portal_access_enabled ? 'Active' : 'No Access'}
          </span>
        </div>

        <div className="space-y-2">
          {!(contact as any).portal_access_enabled || (contact as any).portal_access_revoked ? (
            <button
              type="button"
              onClick={handlePortalInvite}
              disabled={portalLoading || contact.first_name === 'ANONYMIZED'}
              className="w-full h-9 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/95 disabled:opacity-50 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#2563eb]/10"
            >
              {portalLoading ? (
                <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane text-[10px]"></i>
                  {(contact as any).portal_access_revoked ? 'Re-Invite to Portal' : 'Invite to Portal'}
                </>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePortalImpersonate}
                disabled={portalLoading}
                className="w-full h-9 rounded-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {portalLoading ? (
                  <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-user-secret text-[10px]"></i>
                    Impersonate View
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePortalRevoke}
                disabled={portalLoading}
                className="w-full h-9 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {portalLoading ? (
                  <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-ban text-[10px]"></i>
                    Revoke Access
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Operations & Compliance */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl space-y-3">
        <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">Compliance Gateways</h4>
        <button
          type="button"
          onClick={handleErasure}
          disabled={loading || contact.first_name === 'ANONYMIZED'}
          className="w-full h-9 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          {loading ? (
            <>
              <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
              Erasing...
            </>
          ) : contact.first_name === 'ANONYMIZED' ? (
            <>
              <i className="fa-solid fa-user-slash text-[10px]"></i>
              POPIA Erased
            </>
          ) : (
            <>
              <i className="fa-solid fa-user-slash text-[10px]"></i>
              Right to Erasure (POPIA)
            </>
          )}
        </button>
      </div>

      <ErasureReceiptModal
        isOpen={showReceipt}
        onOpenChange={setShowReceipt}
        receipt={receipt}
      />
    </div>
  );
}

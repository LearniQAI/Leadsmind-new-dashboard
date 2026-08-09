'use client';

import React, { useState } from 'react';
import { Phone, Mail, Tag, Send, Loader2, EyeOff, Ban } from 'lucide-react';
import { Contact } from '@/types/crm';
import { format } from 'date-fns';
import { inviteContactToPortal, revokeContactPortalAccess, impersonateContact } from '@/app/actions/portal';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

interface ProfileSidebarProps {
  contact: Contact;
}

export function ProfileSidebar({ contact }: ProfileSidebarProps) {
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
    </div>
  );
}

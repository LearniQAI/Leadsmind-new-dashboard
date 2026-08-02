'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, UserCheck, Clock, Ban, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';
import { InviteStatusCard } from './InviteStatusCard';
import { InviteActionsDropdown } from './InviteActionsDropdown';
import { InvitePresenceList } from './InvitePresenceList';
import {
  inviteFormCollaborator,
  getFormCollaborators,
  removeFormCollaborator,
  updateFormCollaboratorRole,
  resendFormInvitation,
} from '@/app/actions/collaborators';
import type { FormCollaborator, InviteStatus } from '@/types/invitation.types';

type FilterTab = 'all' | 'pending' | 'active' | 'removed';

const filterTabs: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Users },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'active', label: 'Active', icon: UserCheck },
  { key: 'removed', label: 'Removed', icon: Ban },
];

interface InviteManagerProps {
  formId: string
  formName: string
  isOwner?: boolean
}

export function InviteManager({ formId, formName, isOwner = true }: InviteManagerProps) {
  const [invites, setInvites] = useState<FormCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [sending, setSending] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFormCollaborators(formId);
      if (res.error) { toast.error(res.error); return; }
      if (res.data) {
        setInvites(res.data.map((item: any) => ({
          id: item.id,
          formId: item.form_id,
          email: item.email,
          role: item.role,
          status: item.status,
          invitedBy: item.invited_by,
          createdAt: item.created_at,
        })));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    fetchInvites();
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setOwnerEmail(data.user.email);
    });
  }, [fetchInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    if (invites.find(i => i.email.toLowerCase() === inviteEmail.toLowerCase() && i.status === 'active')) {
      toast.error('User is already a collaborator.');
      return;
    }
    if (invites.find(i => i.email.toLowerCase() === inviteEmail.toLowerCase() && i.status === 'pending')) {
      toast.error('A pending invitation already exists for this email.');
      return;
    }

    setSending(true);
    try {
      const res = await inviteFormCollaborator({
        email: inviteEmail, formId, formName, role: inviteRole
      });
      if (res.error) { toast.error(res.error); return; }
      if (res.warning) toast.warning(res.warning);
      else toast.success('Invitation sent!');
      setInviteEmail('');
      await fetchInvites();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    }
    setSending(false);
  };

  const filteredInvites = invites.filter(i => {
    const matchesSearch = !search || i.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || i.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: invites.length,
    pending: invites.filter(i => i.status === 'pending').length,
    active: invites.filter(i => i.status === 'active').length,
    removed: invites.filter(i => i.status === 'removed').length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 !text-dash-text">
            <Users className="text-dash-accent" size={22} /> Collaboration
          </h2>
          <p className="text-xs !text-dash-textMuted mt-1">Manage people who can access this form.</p>
        </div>
        <InvitePresenceList formId={formId} />
      </div>

      <form onSubmit={handleInvite} className="bg-white border border-dash-border rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="text-[10px] font-bold uppercase tracking-widest !text-dash-textMuted">Invite People</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={15} />
            <input
              type="email" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Collaborator email..."
              disabled={sending}
              className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 text-sm !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-colors disabled:opacity-50"
            />
          </div>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as any)}
            disabled={sending}
            className="bg-white border border-dash-border rounded-xl py-3 px-4 text-sm !text-dash-text focus:outline-none focus:border-dash-accent cursor-pointer min-w-[130px] disabled:opacity-50"
          >
            <option value="editor">Can Edit</option>
            <option value="viewer">Can View</option>
          </select>
          <DashButton
            type="submit" disabled={!inviteEmail || sending} variant="primary"
            className="min-w-[140px] text-[11px] font-bold uppercase tracking-widest"
          >
            {sending ? <><Loader2 size={14} className="animate-spin" /> Sending</> : <><UserPlus size={14} /> Send Invite</>}
          </DashButton>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-dash-surface border border-dash-border p-1 rounded-xl overflow-x-auto">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap',
                filter === tab.key
                  ? 'bg-dash-accent text-white shadow-md'
                  : '!text-dash-textMuted hover:!text-dash-text'
              )}
            >
              <tab.icon size={11} />
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[8px]',
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-dash-border/60 !text-dash-textMuted'
                )}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={13} />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-full bg-white border border-dash-border rounded-xl py-2 pl-9 pr-3 text-xs !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-colors"
          />
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-[10px] font-bold uppercase tracking-widest !text-dash-textMuted animate-pulse">Loading collaborators...</div>
        ) : filteredInvites.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-dash-border rounded-2xl bg-dash-surface">
            <div className="w-12 h-12 rounded-2xl bg-white border border-dash-border mx-auto mb-4 flex items-center justify-center">
              <Users size={20} className="!text-dash-textMuted opacity-60" />
            </div>
            <p className="text-[11px] font-bold !text-dash-textMuted uppercase tracking-widest">
              {search ? 'No matching collaborators' : filter === 'all' ? 'No collaborators yet' : `No ${filter} invitations`}
            </p>
            {!search && filter === 'all' && (
              <p className="text-[9px] !text-dash-textMuted mt-2">Invite someone above to get started</p>
            )}
          </div>
        ) : (
          filteredInvites.map(invite => (
            <div
              key={invite.id}
              className="group flex items-center gap-4 p-4 bg-white border border-dash-border hover:border-dash-text/20 rounded-2xl transition-all shadow-sm"
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 border-white flex-shrink-0',
                invite.status === 'active' ? 'bg-success text-white' : 'bg-amber-500 text-white'
              )}>
                {invite.email.substring(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold !text-dash-text truncate">{invite.email}</span>
                  <InviteStatusCard
                    status={invite.status as InviteStatus}
                    role={invite.role}
                  />
                </div>
                <p className="text-[9px] !text-dash-textMuted mt-0.5">
                  Invited {new Date(invite.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {invite.status === 'active' && (
                  <select
                    value={invite.role}
                    onChange={e => {
                      updateFormCollaboratorRole(invite.id, e.target.value as any, formId);
                      toast.success('Role updated');
                      fetchInvites();
                    }}
                    className="bg-white border border-dash-border rounded-lg py-1.5 px-2.5 text-[9px] font-bold uppercase tracking-wider !text-dash-textMuted focus:outline-none cursor-pointer"
                  >
                    <option value="editor">Edit</option>
                    <option value="viewer">View</option>
                  </select>
                )}
                <InviteActionsDropdown
                  collabId={invite.id}
                  formId={formId}
                  status={invite.status}
                  email={invite.email}
                  onResend={resendFormInvitation}
                  onRemove={removeFormCollaborator}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

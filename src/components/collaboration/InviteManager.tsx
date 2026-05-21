'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, UserCheck, Clock, Ban, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { InviteStatusCard } from './InviteStatusCard';
import { InviteActionsDropdown } from './InviteActionsDropdown';
import { InvitePresenceList } from './InvitePresenceList';
import {
  inviteFormCollaborator,
  getFormCollaborators,
  removeFormCollaborator,
  updateFormCollaboratorRole,
  resendFormInvitation,
  revokeFormInvitation,
} from '@/app/actions/collaborators';
import type { FormCollaborator, InviteStatus } from '@/types/invitation.types';

type FilterTab = 'all' | 'pending' | 'accepted' | 'declined' | 'expired';

const filterTabs: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Users },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: UserCheck },
  { key: 'declined', label: 'Declined', icon: Ban },
  { key: 'expired', label: 'Expired', icon: AlertTriangle },
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
    accepted: invites.filter(i => i.status === 'active').length,
    declined: invites.filter(i => i.status === 'declined').length,
    expired: invites.filter(i => i.status === 'expired').length,
  };

  return (
    <div className="flex flex-col gap-6 font-dm-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2 text-white">
            <Users className="text-blue-500" size={24} /> Collaboration
          </h2>
          <p className="text-xs text-t3 mt-1">Manage people who can access this form.</p>
        </div>
        <InvitePresenceList formId={formId} />
      </div>

      <form onSubmit={handleInvite} className="bg-[#0c1535] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-t3">Invite People</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t4" size={15} />
            <input
              type="email" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Collaborator email..."
              disabled={sending}
              className="w-full bg-[#04091a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-t4 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as any)}
            disabled={sending}
            className="bg-[#04091a] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer appearance-none min-w-[130px] disabled:opacity-50"
          >
            <option value="editor" className="bg-[#0c1535]">Can Edit</option>
            <option value="viewer" className="bg-[#0c1535]">Can View</option>
          </select>
          <button
            type="submit" disabled={!inviteEmail || sending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 min-w-[140px]"
          >
            {sending ? <><Loader2 size={14} className="animate-spin" /> Sending</> : <><UserPlus size={14} /> Send Invite</>}
          </button>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-[#0c1535] border border-white/5 p-1 rounded-xl overflow-x-auto">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                filter === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-t3 hover:text-t1'
              )}
            >
              <tab.icon size={11} />
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[8px]',
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-white/5 text-t3'
                )}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" size={13} />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-full bg-[#0c1535] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-t4 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-t3 animate-pulse">Loading collaborators...</div>
        ) : filteredInvites.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 mx-auto mb-4 flex items-center justify-center">
              <Users size={20} className="text-t4 opacity-40" />
            </div>
            <p className="text-[11px] font-bold text-t3 uppercase tracking-widest">
              {search ? 'No matching collaborators' : filter === 'all' ? 'No collaborators yet' : `No ${filter} invitations`}
            </p>
            {!search && filter === 'all' && (
              <p className="text-[9px] text-t4 mt-2">Invite someone above to get started</p>
            )}
          </div>
        ) : (
          filteredInvites.map(invite => (
            <div
              key={invite.id}
              className="group flex items-center gap-4 p-4 bg-[#0c1535] border border-white/5 hover:border-white/10 rounded-2xl transition-all"
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 border-[#04091a] flex-shrink-0',
                invite.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              )}>
                {invite.email.substring(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{invite.email}</span>
                  <InviteStatusCard
                    status={invite.status as InviteStatus}
                    role={invite.role}
                  />
                </div>
                <p className="text-[9px] text-t4 mt-0.5">
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
                    className="bg-[#04091a] border border-white/10 rounded-lg py-1.5 px-2.5 text-[9px] font-black uppercase tracking-wider text-t2 focus:outline-none cursor-pointer"
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
                  onRevoke={revokeFormInvitation}
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

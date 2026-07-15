"use client";
import React from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';

interface TeamTabProps {
  members: any[];
  invitations: any[];
  onInviteClick: () => void;
  onEditMember: (member: any) => void;
  onDeleteMember: (member: any) => void;
  onDeleteInvitation: (invite: any) => void;
}

function roleBadgeClass(role?: string) {
  switch (role) {
    case 'admin': return 'bg-purple-50 text-purple-600 border border-purple-200';
    case 'hr': return 'bg-dash-accent/10 text-dash-accent border border-dash-accent/20';
    case 'payroll': return 'bg-green/10 text-green border border-green/20';
    case 'viewer': return 'bg-amber-50 text-amber-600 border border-amber-200';
    default: return 'bg-dash-surface !text-dash-textMuted border border-dash-border';
  }
}

export default function TeamTab({
  members,
  invitations,
  onInviteClick,
  onEditMember,
  onDeleteMember,
  onDeleteInvitation
}: TeamTabProps) {
  const { role } = useDashboardContext() as any;
  const isAdmin = role === 'admin' || role === 'owner';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h4 className="text-[15px] font-bold !text-dash-text">Team members</h4>
          <p className="text-[11px] !text-dash-textMuted font-medium mt-0.5">People with access to this workspace</p>
        </div>
        {isAdmin && (
          <button
            onClick={onInviteClick}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[10px] h-10 px-6 rounded-xl shadow-[0_4px_16px_rgba(19,89,255,0.3)] flex items-center gap-2 transition-colors motion-reduce:transition-none active:scale-95"
          >
            <Plus size={14} /> Invite team member
          </button>
        )}
      </div>

      <div className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-dash-surface border-b border-dash-border">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold !text-dash-textMuted">Member</th>
              <th className="px-6 py-4 text-[10px] font-bold !text-dash-textMuted">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold !text-dash-textMuted">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold !text-dash-textMuted text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-border">
            {members.map((member: any) => (
              <tr key={member.id} className="hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent font-bold text-sm">
                      {member.user?.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold !text-dash-text">
                        {member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : 'Anonymous member'}
                      </span>
                      <span className="text-[10px] !text-dash-textMuted font-medium">{member.user?.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-bold capitalize ${roleBadgeClass(member.role)}`}>
                    {member.role || 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green"></div>
                    <span className="text-[10px] font-bold !text-dash-textMuted">Active</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditMember(member)}
                        className="p-2 !text-dash-textMuted hover:text-dash-accent transition-colors motion-reduce:transition-none group-hover:bg-white rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteMember(member)}
                        className="p-2 !text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none group-hover:bg-white rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {/* Pending Invitations */}
            {invitations.map((invite: any) => (
              <tr key={invite.id} className="hover:bg-dash-surface transition-colors motion-reduce:transition-none group bg-dash-surface/40">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted font-bold text-sm">
                      {invite.email[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold !text-dash-textMuted">Pending invite</span>
                      <span className="text-[10px] !text-dash-textMuted font-medium">{invite.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-bold capitalize ${roleBadgeClass(invite.role)}`}>
                    {invite.role || 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-dash-accent/40 animate-pulse motion-reduce:animate-none"></div>
                    <span className="text-[10px] font-bold text-dash-accent/60">Invited</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <button
                      onClick={() => onDeleteInvitation(invite)}
                      className="p-2 !text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none group-hover:bg-white rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

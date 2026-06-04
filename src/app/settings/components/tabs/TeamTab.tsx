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
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Active Team Nodes</h4>
          <p className="text-[11px] text-t3 font-medium uppercase tracking-widest mt-0.5">Authorized access protocols</p>
        </div>
        {isAdmin && (
          <button
            onClick={onInviteClick}
            className="bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-lg shadow-accent/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={14} /> Invite Team Member
          </button>
        )}
      </div>

      <div className="bg-n800 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4">Identity</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4">Protocol</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.map((member: any) => (
              <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent2/10 border border-accent2/20 flex items-center justify-center text-accent2 font-space font-bold text-sm">
                      {member.user?.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-t1">
                        {member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : 'Anonymous Member'}
                      </span>
                      <span className="text-[10px] text-t3 font-medium">{member.user?.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    member.role === 'admin' ? 'bg-purple/10 text-purple border border-purple/20' : 
                    member.role === 'hr' ? 'bg-blue/10 text-blue border border-blue/20' : 
                    member.role === 'payroll' ? 'bg-green/10 text-green border border-green/20' : 
                    member.role === 'viewer' ? 'bg-amber/10 text-amber border border-amber/20' : 
                    'bg-white/5 text-t3 border border-white/10'
                    }`}>
                    {member.role || 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black text-t3 uppercase tracking-widest">Active</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEditMember(member)}
                        className="p-2 text-t4 hover:text-accent transition-colors group-hover:bg-white/5 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteMember(member)}
                        className="p-2 text-t4 hover:text-red transition-colors group-hover:bg-white/5 rounded-lg"
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
              <tr key={invite.id} className="hover:bg-white/[0.02] transition-colors group bg-white/[0.01]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-t4 font-space font-bold text-sm">
                      {invite.email[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-t3">Pending Invite</span>
                      <span className="text-[10px] text-t3 font-medium">{invite.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    invite.role === 'admin' ? 'bg-purple/10 text-purple border border-purple/20' : 
                    invite.role === 'hr' ? 'bg-blue/10 text-blue border border-blue/20' : 
                    invite.role === 'payroll' ? 'bg-green/10 text-green border border-green/20' : 
                    invite.role === 'viewer' ? 'bg-amber/10 text-amber border border-amber/20' : 
                    'bg-white/5 text-t3 border border-white/10'
                    }`}>
                    {invite.role || 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse"></div>
                    <span className="text-[10px] font-black text-accent/60 uppercase tracking-widest">Invited</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <button 
                      onClick={() => onDeleteInvitation(invite)}
                      className="p-2 text-t4 hover:text-red transition-colors group-hover:bg-white/5 rounded-lg"
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

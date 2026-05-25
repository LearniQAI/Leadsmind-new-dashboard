import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getGovernanceDashboardData } from '@/app/actions/governance-workspace';
import { WorkspaceAuditTimeline } from '@/components/governance/WorkspaceAuditTimeline';
import { ApprovalPanel } from '@/components/governance/ApprovalPanel';
import { Shield, Users, UserPlus, ShieldCheck, Mail } from 'lucide-react';

export default async function TeamWorkspacePage() {
  const { success, data, error } = await getGovernanceDashboardData();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Error loading Workspace Governance.</div>
      </Wrapper>
    );
  }

  const { members, teams, approvals, auditLogs } = data;

  return (
    <Wrapper>
      <div className="p-6 max-w-[1600px] mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Shield className="text-accent" size={32} /> Workspace Governance
            </h1>
            <p className="text-t3">Team collaboration, role permissions, approvals, and audit logging.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors shadow-lg shadow-accent/20 flex items-center gap-2">
              <UserPlus size={18} /> Invite Member
            </button>
          </div>
        </div>

        {/* Pending Approvals */}
        <ApprovalPanel approvals={approvals} />

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Members & Teams (Left Col) */}
          <div className="lg:col-span-2 space-y-8">
            
            <div className="bg-n800 border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-blue-400" /> Active Members
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member: any) => (
                  <div key={member.user_id} className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center justify-between hover:border-white/20 transition-colors">
                    <div>
                      <h4 className="font-bold text-white text-sm">{member.auth_user?.email || 'Unknown User'}</h4>
                      <p className="text-xs text-t4 mt-1 font-mono">ID: {member.user_id?.split('-')[0]}</p>
                    </div>
                    <span className="bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1">
                      <ShieldCheck size={10} className="text-accent" /> {member.workspace_roles?.name || 'Owner'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-n800 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
                  <Users className="text-purple-400" /> Operational Teams
                </h2>
                <button className="text-xs font-bold text-accent uppercase tracking-widest hover:text-white transition-colors">
                  + Create Team
                </button>
              </div>
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <p className="text-t4 text-center p-8 bg-n900 rounded-2xl border border-white/5">No teams created.</p>
                ) : (
                  teams.map((team: any) => (
                    <div key={team.id} className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{team.name}</h4>
                        <p className="text-xs text-t4 mt-1">{team.description}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-t4">
                        Manage
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Audit Log (Right Col) */}
          <div className="lg:col-span-1 h-[800px]">
            <WorkspaceAuditTimeline logs={auditLogs} />
          </div>

        </div>

      </div>
    </Wrapper>
  );
}

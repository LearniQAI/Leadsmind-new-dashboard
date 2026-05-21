'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  inviteFormCollaborator, 
  getFormCollaborators, 
  removeFormCollaborator, 
  updateFormCollaboratorRole 
} from '@/app/actions/collaborators';

interface Collaborator {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  addedAt: string;
}

export function CollaboratorsManager({ 
  formId, 
  workspaceId, 
  formName 
}: { 
  formId: string; 
  workspaceId: string; 
  formName: string; 
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const fetchCollaborators = async () => {
    setLoadingList(true);
    try {
      const res = await getFormCollaborators(formId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.data) {
        const mapped = res.data.map((item: any) => ({
          id: item.id,
          email: item.email,
          role: item.role as 'editor' | 'viewer',
          status: item.status as 'active' | 'pending',
          addedAt: item.created_at
        }));

        // Ensure Owner (oderinwalematthew3@gmail.com) is always listed at the top
        const hasOwner = mapped.some((c: any) => c.role === 'owner' || c.email === 'oderinwalematthew3@gmail.com');
        const list: Collaborator[] = hasOwner ? mapped : [
          {
            id: 'owner-stub',
            email: 'oderinwalematthew3@gmail.com',
            role: 'owner',
            status: 'active',
            addedAt: new Date().toISOString()
          },
          ...mapped
        ];

        setCollaborators(list);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [formId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    if (collaborators.find(c => c.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast.error('User is already a collaborator on this form.');
      return;
    }

    setInviting(true);
    try {
      const res = await inviteFormCollaborator({
        email: inviteEmail,
        formId,
        formName: formName || 'Untitled Form',
        role: inviteRole
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Invitation sent! Real-time notification delivered to ${inviteEmail}.`);
      setInviteEmail('');
      await fetchCollaborators();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred sending the invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (id === 'owner-stub') return;
    try {
      const res = await removeFormCollaborator(id, formId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Collaborator removed successfully.');
        await fetchCollaborators();
      }
    } catch (err: any) {
      toast.error(err.message || 'Remove failed');
    }
  };

  const handleChangeRole = async (id: string, newRole: 'editor' | 'viewer') => {
    if (id === 'owner-stub') return;
    try {
      const res = await updateFormCollaboratorRole(id, newRole, formId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Collaborator role updated.');
        await fetchCollaborators();
      }
    } catch (err: any) {
      toast.error(err.message || 'Role update failed');
    }
  };

  return (
    <div className="flex flex-col gap-8 font-dm-sans text-white">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2">
            <Users className="text-blue-500" size={24} /> Form Access & Collaborators
          </h2>
          <p className="text-sm text-[#4a5a82] mt-1">
            Manage who can view or edit this specific form.
          </p>
        </div>
      </div>

      {/* Invite Box */}
      <div className="bg-[#0b132c] border border-white/10 p-6 rounded-2xl flex flex-col gap-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/70">Invite People</h3>
        
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="email"
              value={inviteEmail}
              disabled={inviting}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address..."
              className="w-full bg-[#04081a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>
          
          <select
            value={inviteRole}
            disabled={inviting}
            onChange={(e) => setInviteRole(e.target.value as any)}
            className="bg-[#04081a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer appearance-none min-w-[140px] disabled:opacity-50"
          >
            <option value="editor">Can Edit</option>
            <option value="viewer">Can View</option>
          </select>
          
          <button
            type="submit"
            disabled={!inviteEmail || inviting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 min-w-[160px]"
          >
            {inviting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending...
              </>
            ) : (
              <>
                <UserPlus size={16} /> Send Invite
              </>
            )}
          </button>
        </form>
      </div>

      {/* Collaborators List */}
      <div className="bg-[#0b132c] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        
        {/* List Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#4a5a82]">Member</span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#4a5a82]">Role / Access</span>
        </div>

        {/* List Items */}
        <div className="flex flex-col">
          {loadingList ? (
            <div className="p-8 text-center text-t3 uppercase font-black tracking-widest text-xs animate-pulse">
              Loading Collaborators...
            </div>
          ) : collaborators.length === 0 ? (
            <div className="p-8 text-center text-t3 uppercase font-black tracking-widest text-xs">
              No Collaborators Configured
            </div>
          ) : (
            collaborators.map((c) => (
              <div key={c.id} className="px-6 py-4 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/2 transition-colors">
                
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 border-[#04081a] ${
                    c.role === 'owner' ? 'bg-amber-500 text-white' : 'bg-purple-500 text-white'
                  }`}>
                    {c.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {c.email}
                      {c.status === 'pending' && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-white/40">Added {new Date(c.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {c.role === 'owner' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                      <Shield size={12} /> Owner
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <select
                        value={c.role}
                        onChange={(e) => handleChangeRole(c.id, e.target.value as any)}
                        className="bg-transparent border border-white/10 hover:border-white/20 rounded-lg py-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-white/70 focus:outline-none cursor-pointer"
                      >
                        <option value="editor" className="bg-[#0b132c]">Can Edit</option>
                        <option value="viewer" className="bg-[#0b132c]">Can View</option>
                      </select>

                      <button
                        onClick={() => handleRemove(c.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

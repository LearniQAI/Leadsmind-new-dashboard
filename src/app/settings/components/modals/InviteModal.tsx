"use client";
import React from 'react';
import { Users, X, User as UserIcon, Globe, ShieldCheck, Check } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteMode: 'invite' | 'create';
  setInviteMode: (mode: 'invite' | 'create') => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteName: string;
  setInviteName: (name: string) => void;
  invitePassword: string;
  setInvitePassword: (password: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
  selectedPermissions: string[];
  togglePermission: (id: string) => void;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  permissionModules: any[];
}

export default function InviteModal({
  isOpen,
  onClose,
  inviteMode,
  setInviteMode,
  inviteEmail,
  setInviteEmail,
  inviteName,
  setInviteName,
  invitePassword,
  setInvitePassword,
  inviteRole,
  setInviteRole,
  selectedPermissions,
  togglePermission,
  isSaving,
  onSubmit,
  permissionModules
}: InviteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-n900/90 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-n800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                <Users size={24} />
              </div>
              <div>
                <h4 className="text-[20px] font-space font-bold text-t1 uppercase tracking-tight">
                  Add <span className="text-accent2">Team Member</span>
                </h4>
                <p className="text-[11px] text-t3 font-medium uppercase tracking-[0.2em]">Authorize a new workspace node</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-t3 hover:text-t1 transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Toggle Mode */}
          <div className="flex p-1 bg-n900 border border-white/5 rounded-xl mb-8">
            <button
              onClick={() => setInviteMode('invite')}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${inviteMode === 'invite' ? "bg-white/5 text-t1 shadow-sm" : "text-t3 hover:text-t2"
                }`}
            >
              Send Invitation Email
            </button>
            <button
              onClick={() => setInviteMode('create')}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${inviteMode === 'create' ? "bg-white/5 text-t1 shadow-sm" : "text-t3 hover:text-t2"
                }`}
            >
              Direct Account Creation
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {inviteMode === 'create' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-t3">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" size={14} />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full bg-n900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-t1 font-bold outline-none focus:border-accent/50 transition-all text-sm"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-t3">Email Address</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" size={14} />
                  <input
                    type="email"
                    required
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-n900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-t1 font-bold outline-none focus:border-accent/50 transition-all text-sm"
                  />
                </div>
              </div>
              {inviteMode === 'create' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-t3">Initial Password</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" size={14} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full bg-n900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-t1 font-bold outline-none focus:border-accent/50 transition-all text-sm"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-t3">Access Protocol (Role)</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-n900 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold outline-none focus:border-accent/50 transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="member">Member (Restricted Access)</option>
                  <option value="admin">Admin (Full System Access)</option>
                  <option value="viewer">Viewer (Read-Only Access)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-t3 block">Module Permissions</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {permissionModules.map((module) => {
                  const Icon = module.icon;
                  const isSelected = selectedPermissions.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      disabled={inviteRole === 'admin'}
                      onClick={() => togglePermission(module.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${inviteRole === 'admin'
                        ? "bg-accent/5 border-accent/20 text-accent opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-accent/10 border-accent/30 text-accent2 shadow-sm"
                          : "bg-n900 border-white/5 text-t3 hover:border-white/10 hover:text-t2"
                        }`}
                    >
                      <Icon size={14} />
                      <span className="text-[11px] font-bold truncate">{module.label}</span>
                      {isSelected && <Check size={12} className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-xl border border-white/5 text-t3 font-bold hover:bg-white/5 hover:text-t1 transition-all text-[11px] uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-[2] bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-14 rounded-xl shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Processing Neural Handshake...' : inviteMode === 'invite' ? 'Send Invitation' : 'Create Account Directly'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

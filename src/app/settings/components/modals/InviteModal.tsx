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
        className="absolute inset-0 bg-dash-text/40 backdrop-blur-sm animate-in fade-in duration-300 motion-reduce:animate-none"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-white border border-dash-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 motion-reduce:animate-none max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-dash-accent"></div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-dash-accent/10 flex items-center justify-center text-dash-accent border border-dash-accent/20">
                <Users size={24} />
              </div>
              <div>
                <h4 className="text-[20px] font-bold !text-dash-text tracking-tight">
                  Add <span className="text-dash-accent">team member</span>
                </h4>
                <p className="text-[11px] !text-dash-textMuted font-medium">Add a new member to this workspace</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-dash-surface !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
              <X size={20} />
            </button>
          </div>

          {/* Toggle Mode */}
          <div className="flex p-1 bg-dash-surface border border-dash-border rounded-xl mb-5">
            <button
              onClick={() => setInviteMode('invite')}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none ${inviteMode === 'invite' ? "bg-white !text-dash-text shadow-sm" : "!text-dash-textMuted hover:!text-dash-text"
                }`}
            >
              Send invitation email
            </button>
            <button
              onClick={() => setInviteMode('create')}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none ${inviteMode === 'create' ? "bg-white !text-dash-text shadow-sm" : "!text-dash-textMuted hover:!text-dash-text"
                }`}
            >
              Create account directly
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {inviteMode === 'create' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold !text-dash-textMuted">Full name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 !text-dash-text font-medium outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none text-sm"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-textMuted">Email address</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
                  <input
                    type="email"
                    required
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 !text-dash-text font-medium outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none text-sm"
                  />
                </div>
              </div>
              {inviteMode === 'create' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold !text-dash-textMuted">Initial password</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 !text-dash-text font-medium outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none text-sm"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-textMuted">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-medium outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none text-sm appearance-none cursor-pointer"
                >
                  <option value="member">Member (restricted access)</option>
                  <option value="admin">Admin (full access)</option>
                  <option value="viewer">Viewer (read-only access)</option>
                  <option value="hr">HR (human resources manager)</option>
                  <option value="payroll">Payroll (finance & payroll clerk)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-bold !text-dash-textMuted block">Module permissions</label>
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
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors motion-reduce:transition-none text-left ${inviteRole === 'admin'
                        ? "bg-dash-accent/5 border-dash-accent/20 text-dash-accent opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-dash-accent/10 border-dash-accent/30 text-dash-accent shadow-sm"
                          : "bg-dash-surface border-dash-border !text-dash-textMuted hover:border-dash-accent/30 hover:!text-dash-text"
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
                className="flex-1 px-6 py-4 rounded-xl border border-dash-border !text-dash-textMuted font-bold hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none text-[11px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-[2] bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] h-14 rounded-xl shadow-[0_4px_16px_rgba(19,89,255,0.3)] transition-colors motion-reduce:transition-none disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : inviteMode === 'invite' ? 'Send invitation' : 'Create account directly'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

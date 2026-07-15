"use client";
import React from 'react';
import { Shield, X, Check } from 'lucide-react';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  role: string;
  setRole: (role: string) => void;
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  isSaving: boolean;
  onSave: () => void;
  permissionModules: any[];
}

export default function EditMemberModal({
  isOpen,
  onClose,
  member,
  role,
  setRole,
  permissions,
  setPermissions,
  isSaving,
  onSave,
  permissionModules
}: EditMemberModalProps) {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300 motion-reduce:animate-none">
      <div className="bg-white border border-dash-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 motion-reduce:animate-none max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-dash-border bg-dash-surface flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold !text-dash-text tracking-tight">Update access</h3>
              <p className="text-[11px] !text-dash-textMuted font-medium mt-0.5">Managing {member.user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-dash-surface rounded-xl !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[11px] font-bold !text-dash-textMuted">Member</label>
            <div className="p-4 bg-dash-surface border border-dash-border rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent font-bold">
                {member.user?.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[14px] font-bold !text-dash-text">{member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : 'Anonymous member'}</p>
                <p className="text-[11px] !text-dash-textMuted">{member.user?.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-bold !text-dash-textMuted">Role</label>
            <div className="grid grid-cols-2 gap-4">
              {['member', 'admin', 'hr', 'payroll', 'viewer'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    if (r === 'admin') setPermissions(permissionModules.map(m => m.id));
                  }}
                  className={`p-4 rounded-2xl border transition-colors motion-reduce:transition-none text-left relative overflow-hidden ${
                    role === r
                    ? "bg-dash-accent/10 border-dash-accent/40 text-dash-accent"
                    : "bg-dash-surface border-dash-border !text-dash-textMuted hover:border-dash-accent/30"
                  }`}
                >
                  <p className="text-[12px] font-bold capitalize">{r}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {r === 'admin' ? 'Full access to all modules' :
                     r === 'hr' ? 'HR management access' :
                     r === 'payroll' ? 'Payroll processing access' :
                     r === 'viewer' ? 'Read-only access' :
                     'Access to selected modules'}
                  </p>
                  {role === r && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-dash-accent" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-bold !text-dash-textMuted block">Modules</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {permissionModules.map((module) => {
                const Icon = module.icon;
                const isSelected = permissions.includes(module.id);
                return (
                  <button
                    key={module.id}
                    type="button"
                    disabled={role === 'admin'}
                    onClick={() => {
                      if (permissions.includes(module.id)) {
                        setPermissions(permissions.filter(p => p !== module.id));
                      } else {
                        setPermissions([...permissions, module.id]);
                      }
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-colors motion-reduce:transition-none text-left ${
                      role === 'admin'
                        ? "bg-dash-accent/5 border-dash-accent/20 text-dash-accent opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-dash-accent/10 border-dash-accent/30 text-dash-accent"
                          : "bg-dash-surface border-dash-border !text-dash-textMuted hover:border-dash-accent/30"
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
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl border border-dash-border !text-dash-textMuted font-bold hover:bg-dash-surface transition-colors motion-reduce:transition-none text-[11px]"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 px-6 py-4 rounded-xl bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] h-14 shadow-[0_4px_16px_rgba(19,89,255,0.3)] disabled:opacity-50 transition-colors motion-reduce:transition-none"
            >
              {isSaving ? 'Updating...' : 'Save permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

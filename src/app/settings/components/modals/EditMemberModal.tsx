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
    <div className="fixed inset-0 bg-n900/90 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-n800 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-[18px] font-space font-black text-t1 tracking-tight uppercase">Update Access Protocol</h3>
              <p className="text-[10px] text-t3 font-black uppercase tracking-widest mt-0.5">Managing {member.user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-t4 hover:text-t1 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-t3">Identity Status</label>
            <div className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent2/10 flex items-center justify-center text-accent2 font-space font-bold">
                {member.user?.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[14px] font-bold text-t1">{member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : 'Anonymous Member'}</p>
                <p className="text-[11px] text-t3">{member.user?.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-t3">System Role</label>
            <div className="grid grid-cols-2 gap-4">
              {['member', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    if (r === 'admin') setPermissions(permissionModules.map(m => m.id));
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                    role === r 
                    ? "bg-accent/10 border-accent/40 text-accent2" 
                    : "bg-n900 border-white/5 text-t3 hover:border-white/10"
                  }`}
                >
                  <p className="text-[12px] font-black uppercase tracking-widest">{r}</p>
                  <p className="text-[10px] opacity-60 mt-1">{r === 'admin' ? 'Universal Node Control' : 'Segmented Module Access'}</p>
                  {role === r && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(37,99,235,1)]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-t3 block">Active Modules</label>
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
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                      role === 'admin'
                        ? "bg-accent/5 border-accent/20 text-accent opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-accent/10 border-accent/30 text-accent2"
                          : "bg-n900 border-white/5 text-t3 hover:border-white/10"
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
              className="flex-1 px-6 py-4 rounded-xl border border-white/5 text-t3 font-bold hover:bg-white/5 transition-all text-[11px] uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 px-6 py-4 rounded-xl bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-14 rounded-xl shadow-lg shadow-accent/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? 'Updating...' : 'Sync Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

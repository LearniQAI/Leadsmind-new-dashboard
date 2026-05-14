"use client";
import React from 'react';
import { Globe, Copy, Check } from 'lucide-react';

interface WorkspaceTabProps {
  branding: any;
  isSaving: boolean;
  onSave: (name: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

export default function WorkspaceTab({ 
  branding, 
  isSaving, 
  onSave, 
  onCopy, 
  copiedId 
}: WorkspaceTabProps) {
  const [name, setName] = React.useState(branding?.platform_name || 'LeadsMind Workspace');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid gap-8">
        <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Globe size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Core Configuration</h4>
              <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Global workspace identity</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-t3">Workspace Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold focus:border-accent/50 transition-all outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-t3">Permanent Slug</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-t3 font-mono text-[11px] flex items-center">
                  leadsmind.ai/w/{branding?.workspace_id || 'neural-node-01'}
                </div>
                <button
                  onClick={() => onCopy(`leadsmind.ai/w/${branding?.workspace_id}`, 'slug')}
                  className="px-4 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-colors"
                >
                  {copiedId === 'slug' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => onSave(name)}
              disabled={isSaving}
              className="bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-11 px-8 rounded-xl shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Processing...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        <div className="bg-n800 border border-white/5 rounded-2xl p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-[14px] font-bold text-t1 uppercase font-space">Workspace Deletion</h4>
              <p className="text-[12px] text-t3 leading-relaxed">
                Permanently remove this workspace and all its data. This action is irreversible.
              </p>
            </div>
            <button className="flex-shrink-0 px-4 py-2.5 bg-red/10 text-red hover:bg-red/20 border border-red/20 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">
              Terminate Node
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

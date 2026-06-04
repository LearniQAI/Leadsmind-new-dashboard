"use client";
import React from 'react';
import { Plus, Monitor } from 'lucide-react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';

interface BrandingTabProps {
  branding: any;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  isSaving: boolean;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveBranding: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function BrandingTab({
  branding,
  primaryColor,
  setPrimaryColor,
  isSaving,
  onLogoUpload,
  onSaveBranding,
  fileInputRef
}: BrandingTabProps) {
  const { role } = useDashboardContext() as any;
  const isAdmin = role === 'admin' || role === 'owner';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-n800 border border-white/5 rounded-2xl p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-t3">Platform Logo</label>
            <input type="file" ref={fileInputRef} onChange={onLogoUpload} className="hidden" accept="image/*" />
            <div
              onClick={() => isAdmin && fileInputRef.current?.click()}
              className={`h-40 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/[0.01] overflow-hidden relative ${
                isAdmin 
                ? "hover:border-accent/30 hover:bg-accent/5 cursor-pointer group" 
                : "opacity-60 cursor-not-allowed"
              }`}
            >
              {branding?.logo_url ? (
                <div className="w-full h-full bg-white/5 flex items-center justify-center p-6">
                  <img src={branding.logo_url} alt="Logo" className="max-h-20 object-contain drop-shadow-lg" />
                  {isAdmin && (
                    <div className="absolute inset-0 bg-n900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                      <span className="text-[11px] font-black text-white uppercase tracking-widest">Change Logo</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-t4 group-hover:text-accent transition-colors">
                    <Plus size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-t4">Upload Brand Asset</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-t3">Identity Color</label>
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl border border-white/10 relative overflow-hidden ${isAdmin ? "cursor-pointer hover:scale-105 transition-transform" : "opacity-60"}`}
                style={{ backgroundColor: primaryColor }}
              >
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={primaryColor.startsWith('#') ? primaryColor.substring(0, 7) : '#2563eb'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
              <input
                type="text"
                disabled={!isAdmin}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-mono text-xs uppercase outline-none focus:border-accent/50 disabled:opacity-60"
              />
            </div>
            {isAdmin && (
              <button
                onClick={onSaveBranding}
                disabled={isSaving}
                className="w-full bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-11 rounded-xl mt-2 transition-all shadow-lg shadow-accent/20"
              >
                {isSaving ? 'Updating...' : 'Save Branding'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-n800 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center flex-1">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 border border-accent/20">
              <Monitor className="w-7 h-7 text-accent" />
            </div>
            <h4 className="text-[16px] font-space font-bold text-t1 uppercase mb-2">Live Preview</h4>
            <p className="text-[12px] text-t3 max-w-[200px] leading-relaxed">Your workspace interface will automatically adapt to these identity markers.</p>
          </div>

          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-6">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-accent mb-2">Neural Tip</h5>
            <p className="text-[11px] text-t2 leading-relaxed">Use a high-contrast primary color for better accessibility across the system components.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

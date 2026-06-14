"use client";
import React from 'react';
import { Plus, Monitor, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';

interface BrandingTabProps {
  branding: any;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  buttonColor: string;
  setButtonColor: (color: string) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  typography: string;
  setTypography: (font: string) => void;
  customDomain: string;
  setCustomDomain: (domain: string) => void;
  sslStatus: string;
  isSaving: boolean;
  isVerifyingCname: boolean;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFaviconUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveBranding: () => void;
  onVerifyCname: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  faviconInputRef: React.RefObject<HTMLInputElement>;
}

export default function BrandingTab({
  branding,
  primaryColor,
  setPrimaryColor,
  buttonColor,
  setButtonColor,
  textColor,
  setTextColor,
  typography,
  setTypography,
  customDomain,
  setCustomDomain,
  sslStatus,
  isSaving,
  isVerifyingCname,
  onLogoUpload,
  onFaviconUpload,
  onSaveBranding,
  onVerifyCname,
  fileInputRef,
  faviconInputRef
}: BrandingTabProps) {
  const { role } = useDashboardContext() as any;
  const isAdmin = role === 'admin' || role === 'owner';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-sm">
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Left Side: Brand Visuals and Identity Colors */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-8 space-y-8 shadow-xl">
          
          {/* Logo & Favicon Assets */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-accent border-b border-white/5 pb-2">Platform Assets</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.1em] text-t3">Business Logo</label>
                <input type="file" ref={fileInputRef} onChange={onLogoUpload} className="hidden" accept="image/*" />
                <div
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                  className={`h-32 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/[0.01] overflow-hidden relative ${
                    isAdmin ? "hover:border-accent/30 hover:bg-accent/5 cursor-pointer group" : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {branding?.logo_url ? (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center p-4">
                      <img src={branding.logo_url} alt="Logo" className="max-h-16 object-contain" />
                      {isAdmin && (
                        <div className="absolute inset-0 bg-n900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                          <span className="text-[9px] font-black text-white uppercase tracking-widest">Change</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Plus size={18} className="text-t4 group-hover:text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-t4">Upload Logo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.1em] text-t3">Favicon (.ico/.png)</label>
                <input type="file" ref={faviconInputRef} onChange={onFaviconUpload} className="hidden" accept="image/*" />
                <div
                  onClick={() => isAdmin && faviconInputRef.current?.click()}
                  className={`h-32 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/[0.01] overflow-hidden relative ${
                    isAdmin ? "hover:border-accent/30 hover:bg-accent/5 cursor-pointer group" : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {branding?.favicon_url ? (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center p-4">
                      <img src={branding.favicon_url} alt="Favicon" className="max-h-10 w-10 object-contain rounded" />
                      {isAdmin && (
                        <div className="absolute inset-0 bg-n900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                          <span className="text-[9px] font-black text-white uppercase tracking-widest">Change</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Plus size={18} className="text-t4 group-hover:text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-t4">Upload Favicon</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Theme Colors */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-accent border-b border-white/5 pb-2">Custom Theme Colors</h4>
            
            {/* Primary/Sidebar Background */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold text-t2">Primary Background</span>
                <span className="text-[10px] text-t3">Sidebar & main frame layout fill</span>
              </div>
              <div className="flex items-center gap-2 w-48">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={primaryColor.startsWith('#') ? primaryColor.substring(0, 7) : '#04091a'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent disabled:opacity-60"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full bg-n600 border border-white/5 rounded-lg px-2.5 py-1.5 text-t1 font-mono text-xs uppercase outline-none focus:border-accent/50 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Button / Action color */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold text-t2">Button & Brand Accent</span>
                <span className="text-[10px] text-t3">Highlights, CTAs, and active outlines</span>
              </div>
              <div className="flex items-center gap-2 w-48">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={buttonColor.startsWith('#') ? buttonColor.substring(0, 7) : '#2563eb'}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent disabled:opacity-60"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-full bg-n600 border border-white/5 rounded-lg px-2.5 py-1.5 text-t1 font-mono text-xs uppercase outline-none focus:border-accent/50 disabled:opacity-60"
                />
              </div>
            </div>

            {/* General Text color */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold text-t2">Global Text Color</span>
                <span className="text-[10px] text-t3">Main copy, descriptions, and labels</span>
              </div>
              <div className="flex items-center gap-2 w-48">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={textColor.startsWith('#') ? textColor.substring(0, 7) : '#eef2ff'}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent disabled:opacity-60"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full bg-n600 border border-white/5 rounded-lg px-2.5 py-1.5 text-t1 font-mono text-xs uppercase outline-none focus:border-accent/50 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Typography configuration */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-accent border-b border-white/5 pb-2">Custom Typography</h4>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold text-t2">Font Family</span>
                <span className="text-[10px] text-t3">Adaptive layout text rendering</span>
              </div>
              <select
                disabled={!isAdmin}
                value={typography}
                onChange={(e) => setTypography(e.target.value)}
                className="w-48 bg-n600 border border-white/5 rounded-lg px-2.5 py-2 text-t1 text-xs outline-none focus:border-accent/50 disabled:opacity-60"
              >
                <option value="Inter">Inter (Default)</option>
                <option value="Outfit">Outfit (Premium)</option>
                <option value="Poppins">Poppins</option>
                <option value="Roboto">Roboto</option>
                <option value="system-ui">System Default</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={onSaveBranding}
              disabled={isSaving}
              className="w-full bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-11 rounded-xl transition-all shadow-lg shadow-accent/20"
            >
              {isSaving ? 'Saving Configurations...' : 'Save Theme & Assets'}
            </button>
          )}

        </div>

        {/* Right Side: Custom Domain Configuration & DNS Setup */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Custom Subdomain Management */}
          <div className="bg-n800 border border-white/5 rounded-2xl p-8 space-y-6 shadow-xl flex-grow">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-t1 font-space">Custom DNS Domain</h4>
                <p className="text-[10px] text-t3">White-label your customer portal</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-t3">Custom Domain URL</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g. portal.mybusiness.co.za"
                  className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold text-xs focus:border-accent/50 outline-none placeholder:text-t4 placeholder:font-normal"
                />
              </div>

              {/* DNS Configuration CNAME guidelines */}
              {customDomain && (
                <div className="bg-n700 border border-white/5 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-t3">Required DNS Configuration</span>
                  <p className="text-[11px] text-t2 leading-relaxed">
                    Access your DNS manager dashboard (GoDaddy, Cloudflare, etc.) and register the following record:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono p-2.5 bg-n900/60 rounded border border-white/5">
                    <div>
                      <span className="block text-t4">Type</span>
                      <span className="text-accent2 font-bold">CNAME</span>
                    </div>
                    <div>
                      <span className="block text-t4">Name / Subdomain</span>
                      <span className="text-t1 font-bold">{customDomain.split('.')[0]}</span>
                    </div>
                    <div>
                      <span className="block text-t4">Points To</span>
                      <span className="text-t1 font-bold break-all">cname.leadsmind.io</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SSL Propagation Status Card */}
              {customDomain && (
                <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-t2 block">SSL / CNAME Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        sslStatus === 'active' 
                          ? 'bg-green/10 text-green border border-green/20' 
                          : sslStatus === 'failed'
                            ? 'bg-red/10 text-red border border-red/20'
                            : 'bg-amber/10 text-amber border border-amber/20'
                      }`}>
                        {sslStatus === 'active' ? 'Active / SSL Provisioned' : sslStatus === 'failed' ? 'Failed / DNS Error' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onVerifyCname}
                    disabled={isVerifyingCname}
                    className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 font-black uppercase tracking-wider text-[9px] h-9 px-4 rounded-lg transition-all"
                  >
                    <RefreshCw size={10} className={isVerifyingCname ? 'animate-spin' : ''} />
                    {isVerifyingCname ? 'Checking...' : 'Check DNS'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Display block */}
          <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 border border-accent/20">
              <Monitor className="w-5 h-5 text-accent" />
            </div>
            <h4 className="text-xs font-bold text-t1 uppercase mb-1">Live Theme Preview</h4>
            <p className="text-[11px] text-t3 max-w-[220px] leading-relaxed">The portal UI automatically inherits the typography and accent configurations specified in real-time.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

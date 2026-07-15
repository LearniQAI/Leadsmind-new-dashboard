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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none text-sm">
      <div className="grid md:grid-cols-2 gap-8">

        {/* Left Side: Brand Visuals and Identity Colors */}
        <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-8 shadow-sm">

          {/* Logo & Favicon Assets */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold text-dash-accent border-b border-dash-border pb-2">Platform assets</h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-text">Business logo</label>
                <input type="file" ref={fileInputRef} onChange={onLogoUpload} className="hidden" accept="image/*" />
                <div
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                  className={`h-32 border border-dashed border-dash-border rounded-2xl flex flex-col items-center justify-center gap-2 bg-dash-surface overflow-hidden relative ${
                    isAdmin ? "hover:border-dash-accent/30 hover:bg-dash-accent/5 cursor-pointer group" : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {branding?.logo_url ? (
                    <div className="w-full h-full bg-dash-surface flex items-center justify-center p-4">
                      <img src={branding.logo_url} alt="Logo" className="max-h-16 object-contain" />
                      {isAdmin && (
                        <div className="absolute inset-0 bg-dash-text/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity motion-reduce:transition-none backdrop-blur-xs">
                          <span className="text-[9px] font-bold text-white">Change</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Plus size={18} className="!text-dash-textMuted group-hover:text-dash-accent" />
                      <span className="text-[9px] font-bold !text-dash-textMuted">Upload logo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-text">Favicon (.ico/.png)</label>
                <input type="file" ref={faviconInputRef} onChange={onFaviconUpload} className="hidden" accept="image/*" />
                <div
                  onClick={() => isAdmin && faviconInputRef.current?.click()}
                  className={`h-32 border border-dashed border-dash-border rounded-2xl flex flex-col items-center justify-center gap-2 bg-dash-surface overflow-hidden relative ${
                    isAdmin ? "hover:border-dash-accent/30 hover:bg-dash-accent/5 cursor-pointer group" : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {branding?.favicon_url ? (
                    <div className="w-full h-full bg-dash-surface flex items-center justify-center p-4">
                      <img src={branding.favicon_url} alt="Favicon" className="max-h-10 w-10 object-contain rounded" />
                      {isAdmin && (
                        <div className="absolute inset-0 bg-dash-text/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity motion-reduce:transition-none backdrop-blur-xs">
                          <span className="text-[9px] font-bold text-white">Change</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Plus size={18} className="!text-dash-textMuted group-hover:text-dash-accent" />
                      <span className="text-[9px] font-bold !text-dash-textMuted">Upload favicon</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Theme Colors */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-dash-accent border-b border-dash-border pb-2">Custom theme colors</h4>

            {/* Primary/Sidebar Background */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold !text-dash-text">Primary background</span>
                <span className="text-[10px] !text-dash-textMuted">Sidebar & main frame layout fill</span>
              </div>
              <div className="flex items-center gap-2 w-48">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={primaryColor.startsWith('#') ? primaryColor.substring(0, 7) : '#04091a'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dash-border cursor-pointer bg-transparent disabled:opacity-60"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-lg px-2.5 py-1.5 !text-dash-text font-mono text-xs uppercase outline-none focus:border-dash-accent/50 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Button / Action color */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold !text-dash-text">Button & brand accent</span>
                <span className="text-[10px] !text-dash-textMuted">Highlights, CTAs, and active outlines</span>
              </div>
              <div className="flex items-center gap-2 w-48">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={buttonColor.startsWith('#') ? buttonColor.substring(0, 7) : '#2563eb'}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dash-border cursor-pointer bg-transparent disabled:opacity-60"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-lg px-2.5 py-1.5 !text-dash-text font-mono text-xs uppercase outline-none focus:border-dash-accent/50 disabled:opacity-60"
                />
              </div>
            </div>

            {/* General Text color */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold !text-dash-text">Global text color</span>
                <span className="text-[10px] !text-dash-textMuted">Main copy, descriptions, and labels</span>
              </div>
              <div className="flex items-center gap-2 w-48">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={textColor.startsWith('#') ? textColor.substring(0, 7) : '#eef2ff'}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dash-border cursor-pointer bg-transparent disabled:opacity-60"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-lg px-2.5 py-1.5 !text-dash-text font-mono text-xs uppercase outline-none focus:border-dash-accent/50 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Typography configuration */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-dash-accent border-b border-dash-border pb-2">Custom typography</h4>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold !text-dash-text">Font family</span>
                <span className="text-[10px] !text-dash-textMuted">Adaptive layout text rendering</span>
              </div>
              <select
                disabled={!isAdmin}
                value={typography}
                onChange={(e) => setTypography(e.target.value)}
                className="w-48 bg-white border border-dash-border rounded-lg px-2.5 py-2 !text-dash-text text-xs outline-none focus:border-dash-accent/50 disabled:opacity-60"
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
              className="w-full bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] h-11 rounded-xl transition-all motion-reduce:transition-none shadow-lg shadow-dash-accent/20"
            >
              {isSaving ? 'Saving configurations...' : 'Save theme & assets'}
            </button>
          )}

        </div>

        {/* Right Side: Custom Domain Configuration & DNS Setup */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Custom Subdomain Management */}
          <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-6 shadow-sm flex-grow">
            <div className="flex items-center gap-3 border-b border-dash-border pb-3">
              <div className="w-8 h-8 rounded-lg bg-dash-accent/15 flex items-center justify-center text-dash-accent">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold !text-dash-text">Custom DNS domain</h4>
                <p className="text-[10px] !text-dash-textMuted">White-label your customer portal</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-textMuted">Custom domain URL</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g. portal.mybusiness.co.za"
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold text-xs focus:border-dash-accent/50 outline-none placeholder:!text-dash-textMuted placeholder:font-normal"
                />
              </div>

              {/* DNS Configuration CNAME guidelines */}
              {customDomain && (
                <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-bold !text-dash-textMuted">Required DNS configuration</span>
                  <p className="text-[11px] !text-dash-textMuted leading-relaxed">
                    Access your DNS manager dashboard (GoDaddy, Cloudflare, etc.) and register the following record:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono p-2.5 bg-white rounded border border-dash-border">
                    <div>
                      <span className="block !text-dash-textMuted">Type</span>
                      <span className="text-dash-accent font-bold">CNAME</span>
                    </div>
                    <div>
                      <span className="block !text-dash-textMuted">Name / Subdomain</span>
                      <span className="!text-dash-text font-bold">{customDomain.split('.')[0]}</span>
                    </div>
                    <div>
                      <span className="block !text-dash-textMuted">Points to</span>
                      <span className="!text-dash-text font-bold break-all">cname.leadsmind.io</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SSL Propagation Status Card */}
              {customDomain && (
                <div className="flex items-center justify-between p-3.5 bg-dash-surface border border-dash-border rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold !text-dash-text block">SSL / CNAME status</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sslStatus === 'active'
                          ? 'bg-green/10 text-green border border-green/20'
                          : sslStatus === 'failed'
                            ? 'bg-red/10 text-red border border-red/20'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        {sslStatus === 'active' ? 'Active / SSL provisioned' : sslStatus === 'failed' ? 'Failed / DNS error' : 'Pending verification'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onVerifyCname}
                    disabled={isVerifyingCname}
                    className="flex items-center gap-2 bg-dash-accent/10 border border-dash-accent/20 text-dash-accent hover:bg-dash-accent/20 font-bold text-[9px] h-9 px-4 rounded-lg transition-all motion-reduce:transition-none"
                  >
                    <RefreshCw size={10} className={isVerifyingCname ? 'animate-spin motion-reduce:animate-none' : ''} />
                    {isVerifyingCname ? 'Checking...' : 'Check DNS'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Display block */}
          <div className="bg-white border border-dash-border rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 bg-dash-accent/10 rounded-2xl flex items-center justify-center mb-4 border border-dash-accent/20">
              <Monitor className="w-5 h-5 text-dash-accent" />
            </div>
            <h4 className="text-xs font-bold !text-dash-text mb-1">Live theme preview</h4>
            <p className="text-[11px] !text-dash-textMuted max-w-[220px] leading-relaxed">The portal UI automatically inherits the typography and accent configurations specified in real-time.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { getConnectedPlatforms, disconnectPlatform, getMetaAuthUrl } from '@/app/actions/messaging';
import { ConnectPlatformsModal } from '@/components/dashboard/ConnectPlatformsModal';
import { toast } from 'sonner';

export function IntegrationsList() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'facebook' | 'instagram' | 'whatsapp' | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlatforms = async () => {
    setIsLoading(true);
    try {
      const platforms = await getConnectedPlatforms();
      setConnectedPlatforms(platforms || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (process.env.NODE_ENV === 'development') {
        /* eslint-disable no-console */
        console.log('[IntegrationsList] URL params on mount:', window.location.search)
        console.log('[IntegrationsList] meta_oauth:', params.get('meta_oauth'))
        console.log('[IntegrationsList] needs_instagram:', params.get('needs_instagram'))
        console.log('[IntegrationsList] needs_whatsapp:', params.get('needs_whatsapp'))
        /* eslint-enable no-console */
      }

      if (params.get('meta_oauth') === '1') {
        const needsInstagram = params.get('needs_instagram') === 'true'
        const needsWhatsapp = params.get('needs_whatsapp') === 'true'
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[IntegrationsList] needsInstagram:', needsInstagram, 'needsWhatsapp:', needsWhatsapp)
        }

        window.history.replaceState({}, '', window.location.pathname)
        fetchPlatforms()
        
        if (needsInstagram) {
          setActivePlatform('instagram')
          setIsOpen(true)
        } else if (needsWhatsapp) {
          setActivePlatform('whatsapp')
          setIsOpen(true)
        }
      }
    }
  }, [])

  const handleConnect = async (platform: 'facebook' | 'instagram' | 'whatsapp') => {
    // If Facebook is already connected and we're connecting IG or WA,
    // open the wizard directly without OAuth
    const fbConnected = connectedPlatforms.find(p => p.platform === 'facebook' && p.status === 'connected')
    
    if (platform !== 'facebook' && fbConnected) {
      setActivePlatform(platform)
      setIsOpen(true)
      return
    }
    
    // Otherwise do OAuth (for Facebook or if no Facebook connection exists)
    try {
      const authUrl = await getMetaAuthUrl(platform)
      if (authUrl) {
        window.location.href = authUrl
      } else {
        toast.error('Failed to generate connection URL')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error initiating platform connection')
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const res = await disconnectPlatform(platform);
      if (res.success) {
        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected successfully.`);
        fetchPlatforms();
      } else {
        toast.error(res.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error disconnecting platform');
    }
  };

  const fbConn = connectedPlatforms.find((p) => p.platform === 'facebook' && p.status === 'connected');
  const igConn = connectedPlatforms.find((p) => p.platform === 'instagram' && p.status === 'connected');
  const waConn = connectedPlatforms.find((p) => p.platform === 'whatsapp' && p.status === 'connected');

  return (
    <>
      <div className="dash-account-card">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Messaging Integrations</h5>
          <p className="text-sm !text-dash-textMuted mt-1">
            Connect your customer communication channels to automatically sync and access all direct messages within your LeadsMind Unified Inbox.
          </p>
        </div>

        {isLoading && connectedPlatforms.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-dash-surface border border-dash-border rounded-2xl p-6 h-[220px] animate-pulse flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white"></div>
                  <div className="w-16 h-5 rounded-full bg-white"></div>
                </div>
                <div className="flex-1 mt-4 flex flex-col gap-2">
                  <div className="h-4 bg-white rounded w-2/3"></div>
                  <div className="h-3 bg-white rounded w-full"></div>
                  <div className="h-3 bg-dash-surface rounded w-full"></div>
                </div>
                <div className="h-9 bg-white rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Facebook Card */}
            <div className="relative group bg-dash-surface border border-dash-border hover:border-[#1877f2]/30 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between min-h-[220px]">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1877f2]/10 border border-[#1877f2]/20 flex items-center justify-center">
                    <i className="fa-brands fa-facebook-messenger text-2xl text-[#1877f2]"></i>
                  </div>
                  {fbConn ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-dash-border bg-white !text-dash-textMuted">
                      Not Connected
                    </span>
                  )}
                </div>

                <h5 className="text-base font-bold !text-dash-text tracking-tight font-space-grotesk">Facebook Messenger</h5>
                <p className="text-xs !text-dash-textMuted leading-relaxed mt-1 font-dm-sans">
                  Route DMs and customer inquiries sent to your Facebook Page directly to the CRM.
                </p>

                {fbConn && (
                  <div className="mt-4 p-2.5 rounded-lg bg-white border border-dash-border text-[11px] font-medium !text-dash-text">
                    <div className="flex items-center justify-between">
                      <span>Linked Page:</span>
                      <span className="text-[#1877f2] font-semibold">{fbConn.credentials?.page_name || 'Facebook Page'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-6">
                {fbConn ? (
                  <button
                    onClick={() => handleDisconnect('facebook')}
                    className="w-full h-9 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-all"
                  >
                    Disconnect Channel
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect('facebook')}
                    className="w-full h-9 rounded-xl bg-[#1877f2] hover:bg-[#1b6bda] text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-brands fa-facebook-f text-xs"></i>
                    Connect Facebook
                  </button>
                )}
              </div>
            </div>

            {/* Instagram Card */}
            <div className="relative group bg-dash-surface border border-dash-border hover:border-[#ec4899]/30 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between min-h-[220px]">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ec4899]/10 border border-[#ec4899]/20 flex items-center justify-center">
                    <i className="fa-brands fa-instagram text-2xl text-[#ec4899]"></i>
                  </div>
                  {igConn ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-dash-border bg-white !text-dash-textMuted">
                      Not Connected
                    </span>
                  )}
                </div>

                <h5 className="text-base font-bold !text-dash-text tracking-tight font-space-grotesk">Instagram Direct</h5>
                <p className="text-xs !text-dash-textMuted leading-relaxed mt-1 font-dm-sans">
                  Access DMs, story replies, and mentions sent to your Instagram Business profile.
                </p>

                {igConn && (
                  <div className="mt-4 p-2.5 rounded-lg bg-white border border-dash-border text-[11px] font-medium !text-dash-text">
                    <div className="flex items-center justify-between">
                      <span>Linked Account:</span>
                      <span className="text-[#ec4899] font-semibold">@{igConn.credentials?.instagram_username || 'username'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-6">
                {igConn ? (
                  <button
                    onClick={() => handleDisconnect('instagram')}
                    className="w-full h-9 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-all"
                  >
                    Disconnect Channel
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect('instagram')}
                    className="w-full h-9 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#f43f5e] hover:from-[#d93f85] hover:to-[#e11d48] text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-brands fa-instagram text-xs"></i>
                    Connect Instagram
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="relative group bg-dash-surface border border-dash-border hover:border-[#25d366]/30 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between min-h-[220px]">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#25d366]/10 border border-[#25d366]/20 flex items-center justify-center">
                    <i className="fa-brands fa-whatsapp text-2xl text-[#25d366]"></i>
                  </div>
                  {waConn ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-dash-border bg-white !text-dash-textMuted">
                      Not Connected
                    </span>
                  )}
                </div>

                <h5 className="text-base font-bold !text-dash-text tracking-tight font-space-grotesk">WhatsApp Cloud API</h5>
                <p className="text-xs !text-dash-textMuted leading-relaxed mt-1 font-dm-sans">
                  Integrate your WhatsApp Business phone line for rich customer messaging and automated chat flows.
                </p>

                {waConn && (
                  <div className="mt-4 p-2.5 rounded-lg bg-white border border-dash-border text-[11px] font-medium !text-dash-text flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span>Account Name:</span>
                      <span className="text-[#25d366] font-semibold">{waConn.credentials?.whatsapp_business_name || 'WhatsApp API'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Phone Line:</span>
                      <span className="!text-dash-textMuted">{waConn.credentials?.whatsapp_phone_number || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-6">
                {waConn ? (
                  <button
                    onClick={() => handleDisconnect('whatsapp')}
                    className="w-full h-9 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-all"
                  >
                    Disconnect Channel
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect('whatsapp')}
                    className="w-full h-9 rounded-xl bg-[#25d366] hover:bg-[#20ba59] text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-brands fa-whatsapp text-xs"></i>
                    Connect WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConnectPlatformsModal 
        open={isOpen} 
        onOpenChange={(openVal) => {
          setIsOpen(openVal);
          if (!openVal) setActivePlatform(null);
        }} 
        targetPlatform={activePlatform}
      />
    </>
  );
}

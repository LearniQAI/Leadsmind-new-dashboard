'use client';

import React, { useEffect, useState } from 'react';
import { isMetaConfigured, getMetaOAuthURL } from '@/lib/meta/config';
import { toast } from 'sonner';

export interface MetaConnection {
  platform: 'facebook' | 'instagram' | 'whatsapp';
  connected: boolean;
  accountName?: string;
  accountHandle?: string;
  phoneNumber?: string;
  error?: string;
}

export interface IntegrationsListProps {
  connections: MetaConnection[];
  onConnect: (platform: 'facebook' | 'instagram' | 'whatsapp') => void;
  onDisconnect: (platform: 'facebook' | 'instagram' | 'whatsapp') => void;
  onReconnect: () => void;
}

const FBIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const IGIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
    <path d="M12 6.865A5.135 5.135 0 1017.135 12 5.139 5.139 0 0012 6.865zm0 8.468A3.333 3.333 0 1115.333 12 3.338 3.338 0 0112 15.333z" fill="white"/>
    <circle cx="17.6" cy="6.4" r="1.2" fill="white"/>
    <defs>
      <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E1306C"/>
        <stop offset="0.5" stopColor="#C13584"/>
        <stop offset="1" stopColor="#833AB4"/>
      </linearGradient>
    </defs>
  </svg>
);

const WAIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.001 4.908A9.817 9.817 0 0012.04 2c-5.46 0-9.902 4.443-9.905 9.905 0 1.747.457 3.45 1.321 4.95L2 22l5.255-1.377a9.833 9.833 0 004.782 1.237h.004c5.46 0 9.902-4.444 9.905-9.906a9.83 9.83 0 00-2.945-6.946z" fill="#25D366"/>
    <path d="M12.04 3.655c4.548 0 8.249 3.7 8.251 8.251a8.217 8.217 0 01-2.456 5.834c-1.56 1.56-3.636 2.418-5.8 2.418h-.003a8.227 8.227 0 01-4.195-1.155l-.301-.18-3.12.817.832-3.042-.197-.315a8.232 8.232 0 01-1.218-4.275c.002-4.55 3.702-8.25 8.251-8.251z" fill="white"/>
    <path d="M15.42 13.567c-.201-.1-.1.1-.989-.44l-.794-.37c-.165-.08-.285-.12-.405.06-.12.18-.465.586-.57.705-.105.12-.21.135-.411.035a5.178 5.178 0 01-1.524-.94c-.424-.378-.71-.845-.794-.99-.084-.144-.009-.222.091-.322.09-.09.2-.234.3-.35.1-.118.134-.198.201-.33.067-.132.033-.249-.017-.35-.05-.1-.405-.989-.556-1.353-.146-.354-.294-.306-.405-.312l-.345-.006c-.12 0-.315.045-.48.225-.165.18-.63.615-.63 1.502s.645 1.741.735 1.861c.09.12 1.27 1.939 3.076 2.718a10.24 10.24 0 001.025.378c.432.138.825.118 1.136.072.347-.052 1.07-.438 1.22-.84.15-.402.15-.747.105-.82-.045-.072-.165-.112-.366-.212z" fill="#25D366"/>
  </svg>
);

export function IntegrationsList({
  connections = [],
  onConnect,
  onDisconnect,
}: IntegrationsListProps) {
  const [dbConnections, setDbConnections] = useState<MetaConnection[] | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isServerMetaConfigured, setIsServerMetaConfigured] = useState(false);
  const [showConfigWarning, setShowConfigWarning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch('/api/meta/connections');
        if (res.ok) {
          const data = await res.json();
          setDbConnections(data.connections);
          setWorkspaceId(data.workspaceId);
          setIsServerMetaConfigured(data.isMetaConfigured);
        }
      } catch (err) {
        console.error('[IntegrationsList] Failed to load connections:', err);
      }
    }
    fetchConnections();
  }, []);

  // Parse search params for redirect feedback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const successPlatform = params.get('success');
      const errorMsg = params.get('error');

      if (successPlatform) {
        toast.success(`Successfully connected to ${successPlatform.charAt(0).toUpperCase() + successPlatform.slice(1)}!`);
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url.pathname + url.search);
      }

      if (errorMsg) {
        toast.error(`Connection failed: ${errorMsg}`);
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, []);

  const activeConnections = dbConnections || connections;

  const getPlatformDetails = (conn: MetaConnection) => {
    switch (conn.platform) {
      case 'facebook':
        return {
          name: 'Facebook',
          icon: <FBIcon />,
          color: '#1877F2',
          description: 'Route DMs and customer inquiries sent to your Facebook Page directly to the CRM.',
          subline: conn.accountName ? `facebook.com/${conn.accountName.toLowerCase().replace(/\s+/g, '-')}` : 'facebook.com/page',
        };
      case 'instagram':
        return {
          name: 'Instagram',
          icon: <IGIcon />,
          color: '#E1306C',
          description: 'Access DMs, story replies, and mentions sent to your Instagram Business profile.',
          subline: conn.accountHandle ? `@${conn.accountHandle}` : '@handle',
        };
      case 'whatsapp':
        return {
          name: 'WhatsApp',
          icon: <WAIcon />,
          color: '#25D366',
          description: 'Integrate your WhatsApp Business phone line for rich customer messaging.',
          subline: conn.phoneNumber || '+phone_number',
        };
      default:
        return { name: '', icon: null, color: '#ffffff', description: '', subline: '' };
    }
  };

  const handleConnectClick = (platform: 'facebook' | 'instagram' | 'whatsapp') => {
    const configured = isMetaConfigured() || isServerMetaConfigured;
    if (configured) {
      const stateObj = JSON.stringify({ workspaceId: workspaceId || 'default' });
      const url = getMetaOAuthURL(platform, stateObj);
      window.location.href = url;
    } else {
      setShowConfigWarning(prev => ({ ...prev, [platform]: true }));
    }
  };

  const handleDisconnectClick = async (platform: 'facebook' | 'instagram' | 'whatsapp') => {
    if (dbConnections && workspaceId) {
      try {
        const res = await fetch(`/api/meta/connections?platform=${platform}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setDbConnections(prev =>
            prev ? prev.map(c => c.platform === platform ? { platform, connected: false } : c) : null
          );
          toast.success(`Successfully disconnected ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to disconnect');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error disconnecting platform');
      }
    }
    onDisconnect(platform);
  };

  return (
    <div className="flex flex-col gap-6 text-[#eef2ff]">
      {/* Section Header */}
      <div>
        <h2 className="text-[22px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Meta <span className="text-[#3b82f6]">Connections</span>
        </h2>
        <p className="text-[11.5px] uppercase tracking-wider font-semibold text-[#4a5a82] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Link your Facebook Pages, Instagram accounts, and WhatsApp lines to the Unified Inbox.
        </p>
      </div>

      {/* Platforms Grid/List */}
      <div className="flex flex-col gap-4">
        {activeConnections.map((conn) => {
          const details = getPlatformDetails(conn);
          const hasWarning = showConfigWarning[conn.platform] && !(isMetaConfigured() || isServerMetaConfigured);

          return (
            <div
              key={conn.platform}
              className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)] rounded-xl p-5 transition-all duration-200"
            >
              <div className="flex flex-row items-center justify-between gap-4">
                {/* Left side: Platform icon + name + status badge */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl bg-white/[0.04] border-t-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderTopColor: details.color }}
                  >
                    {details.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {details.name}
                      </span>
                      {conn.connected ? (
                        <span className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10.5px] font-semibold rounded-full px-2.5 py-0.5 flex-shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          ● Connected
                        </span>
                      ) : (
                        <span className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] text-[#4a5a82] text-[10.5px] font-semibold rounded-full px-2.5 py-0.5 flex-shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          ○ Not connected
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[#94a3c8] text-[11.5px] mt-0.5 leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {conn.connected ? (
                        `${conn.accountName || 'LeadsMind Account'} (${details.subline})`
                      ) : (
                        details.description
                      )}
                    </p>
                  </div>
                </div>

                {/* Right side: Action Button */}
                <div className="flex-shrink-0">
                  {conn.connected ? (
                    <button
                      onClick={() => handleDisconnectClick(conn.platform)}
                      className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors hover:bg-[rgba(239,68,68,0.15)]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectClick(conn.platform)}
                      className="text-white font-semibold rounded-lg px-5 py-2 text-[12px] transition-opacity hover:opacity-90"
                      style={{ backgroundColor: details.color, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Connect {conn.platform.charAt(0).toUpperCase() + conn.platform.slice(1)}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline warning message if clicked when not configured */}
              {hasWarning && (
                <div className="bg-[rgba(245,158,11,0.06)] border-l-2 border-[#f59e0b] rounded-r-lg px-3 py-2 mt-3">
                  <p className="text-[#94a3c8] text-[12px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Meta credentials are being configured. The connect button will work automatically once setup is complete.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IntegrationsList;

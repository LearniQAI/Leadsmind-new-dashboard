'use client';

import React from 'react';
import { Space_Grotesk, DM_Sans } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

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
        <stop stop-color="#E1306C"/>
        <stop offset="0.5" stop-color="#C13584"/>
        <stop offset="1" stop-color="#833AB4"/>
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
  onReconnect,
}: IntegrationsListProps) {
  const isAnyConnected = connections.some((c) => c.connected);

  const getPlatformDetails = (conn: MetaConnection) => {
    switch (conn.platform) {
      case 'facebook':
        return {
          name: 'Facebook Messenger',
          icon: <FBIcon />,
          accent: 'bg-[#1877F2]',
          subline: `facebook.com/${conn.accountName ? conn.accountName.toLowerCase().replace(/\s+/g, '-') : 'page'}`,
        };
      case 'instagram':
        return {
          name: 'Instagram Direct',
          icon: <IGIcon />,
          accent: 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
          subline: conn.accountHandle ? `@${conn.accountHandle}` : '@handle',
        };
      case 'whatsapp':
        return {
          name: 'WhatsApp Cloud API',
          icon: <WAIcon />,
          accent: 'bg-[#25D366]',
          subline: conn.phoneNumber || '+phone_number',
        };
      default:
        return { name: '', icon: null, accent: '', subline: '' };
    }
  };

  return (
    <div className={`${spaceGrotesk.variable} ${dmSans.variable} font-dm-sans flex flex-col gap-6 text-[#eef2ff]`}>
      {/* Section Header */}
      <div>
        <h2 className="text-[22px] font-bold font-space-grotesk text-[#eef2ff]">
          Meta <span className="text-[#3b82f6]">Connections</span>
        </h2>
        <p className="text-[11.5px] uppercase tracking-wider font-semibold text-[#4a5a82] mt-1 font-dm-sans">
          Link your Facebook Pages, Instagram accounts, and WhatsApp lines to the Unified Inbox.
        </p>
      </div>

      {/* Empty State */}
      {!isAnyConnected && (
        <div className="flex flex-col items-center justify-center text-center p-6 bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-[12px] max-w-full">
          <div className="mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a5a82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 inline-block">
              <path d="M18.8 6c.4.4.8.9 1 1.4.2.6.3 1.2.2 1.9c-.1.7-.4 1.3-.8 1.8l-2.2 2.2"/>
              <path d="M9 15l-1.5 1.5a4.8 4.8 0 0 1-6.7-6.7l1.5-1.5"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
              <path d="M15 9l1.5-1.5"/>
              <path d="M10.5 13.5L9 15"/>
            </svg>
          </div>
          <h5 className="text-[13px] font-semibold text-[#94a3c8] font-dm-sans mb-1">
            No channels connected yet
          </h5>
          <p className="text-[12px] text-[#4a5a82] font-dm-sans max-w-[280px] leading-normal">
            Connect your Meta business accounts to start managing conversations from one place.
          </p>
        </div>
      )}

      {/* Platforms Grid/List */}
      <div className="flex flex-col gap-4">
        {connections.map((conn) => {
          const details = getPlatformDetails(conn);
          return (
            <div
              key={conn.platform}
              className="relative p-[20px] sm:px-[24px] sm:py-[20px] bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(21,37,80,0.9)] rounded-[12px] transition-all duration-[180ms] flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
            >
              {/* 2px top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] w-full ${details.accent}`} />

              {/* Left Column: Platform details */}
              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-center gap-2.5">
                  {details.icon}
                  <span className="text-[14px] font-semibold font-space-grotesk text-[#eef2ff]">
                    {details.name}
                  </span>
                </div>

                {conn.connected && (
                  <div className="flex flex-col gap-0.5 pl-7">
                    <span className="text-[13px] font-medium text-[#eef2ff] font-dm-sans leading-tight">
                      {conn.accountName || 'LeadsMind Account'}
                    </span>
                    <span className="text-[11px] text-[#4a5a82] font-dm-sans leading-none">
                      {details.subline}
                    </span>
                  </div>
                )}

                {/* Token Expiry / Error Row */}
                {conn.connected && conn.error && (
                  <div className="mt-2 ml-7 bg-[rgba(245,158,11,0.08)] border-l-2 border-[#f59e0b] px-3 py-2 rounded-r-[6px] flex items-center justify-between gap-2 max-w-md">
                    <div className="flex items-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="text-[11.5px] text-[#94a3c8] font-dm-sans leading-tight">
                        {conn.error}
                      </span>
                    </div>
                    <button
                      onClick={onReconnect}
                      className="text-[#3b82f6] hover:underline text-[11.5px] font-semibold font-dm-sans shrink-0"
                    >
                      Reconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Status pill and Action Button */}
              <div className="flex items-center justify-end gap-3 shrink-0 relative z-10">
                {/* Status Badge */}
                {conn.connected ? (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] text-[#34d399] flex items-center gap-1.5 font-dm-sans">
                    ● Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.05)] text-[#4a5a82] flex items-center gap-1.5 font-dm-sans">
                    ○ Not connected
                  </span>
                )}

                {/* Action button */}
                {conn.connected ? (
                  <button
                    onClick={() => onDisconnect(conn.platform)}
                    className="h-8 px-3 rounded-[8px] bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.15)] text-[12px] font-semibold font-dm-sans transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => onConnect(conn.platform)}
                    className="h-8 px-3 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-[12px] font-semibold font-dm-sans transition-colors"
                  >
                    Connect {conn.platform.charAt(0).toUpperCase() + conn.platform.slice(1)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IntegrationsList;

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Facebook, Instagram, Linkedin, TikTok, YouTube } from '@/components/icons/BrandIcons';
import { getLinkedInAuthUrl, getTikTokAuthUrl, getYouTubeAuthUrl } from '@/app/actions/social';
import { getMetaAuthUrl, disconnectPlatform } from '@/app/actions/messaging';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

interface SocialConnectionsClientProps {
 accounts: any[];
}

const PLATFORMS = [
 { id: 'facebook', label: 'Facebook', icon: <Facebook className="w-full h-full" /> },
 { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-full h-full" /> },
 { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-full h-full" /> },
 { id: 'tiktok', label: 'TikTok', icon: <TikTok className="w-full h-full" /> },
 { id: 'youtube', label: 'YouTube', icon: <YouTube className="w-full h-full" /> },
];

export default function SocialConnectionsClient({ accounts }: SocialConnectionsClientProps) {
 const router = useRouter();
 const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);

 const handleConnect = async (platform: string) => {
  setPendingPlatform(platform);
  try {
   let url: string | undefined;
   if (platform === 'facebook' || platform === 'instagram') {
    url = await getMetaAuthUrl(platform);
   } else if (platform === 'linkedin') {
    url = await getLinkedInAuthUrl();
   } else if (platform === 'tiktok') {
    url = await getTikTokAuthUrl();
   } else if (platform === 'youtube') {
    url = await getYouTubeAuthUrl();
   }
   if (url) window.location.href = url;
  } catch (err: any) {
   toast.error(err.message || 'Failed to get connection URL');
   setPendingPlatform(null);
  }
 };

 const handleDisconnect = async (platform: string) => {
  setPendingPlatform(platform);
  const res = await disconnectPlatform(platform);
  if (res.success) {
   toast.success(`${platform} disconnected.`);
   router.refresh();
  } else {
   toast.error(res.error || 'Failed to disconnect');
  }
  setPendingPlatform(null);
 };

 return (
  <div className="space-y-6">
   <div>
    <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">connections</span></h1>
    <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
     Connect the platforms you publish to from the Composer. Each connection is real OAuth — nothing here fakes a connected state.
    </p>
   </div>

   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {PLATFORMS.map((p) => {
     const conn = accounts.find((a) => a.platform === p.id);
     const isConnected = conn?.status === 'connected';
     const accountName =
      conn?.credentials?.account_name ||
      conn?.credentials?.page_name ||
      conn?.credentials?.instagram_username;
     const isPending = pendingPlatform === p.id;

     return (
      <DashCard key={p.id} padding="default" className="flex items-center justify-between gap-4">
       <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-sm shrink-0">
         {p.icon}
        </div>
        <div className="min-w-0">
         <p className="text-sm font-bold !text-dash-text">{p.label}</p>
         {isConnected ? (
          <p className="text-[11px] text-green truncate">
           Connected{accountName ? ` — ${accountName}` : ''}
          </p>
         ) : (
          <p className="text-[11px] !text-dash-textMuted">Not connected</p>
         )}
        </div>
       </div>

       {isConnected ? (
        <DashButton
         variant="ghost"
         size="sm"
         disabled={isPending}
         onClick={() => handleDisconnect(p.id)}
         className="text-red-500 hover:text-red-500 shrink-0"
        >
         {isPending ? 'Disconnecting...' : 'Disconnect'}
        </DashButton>
       ) : (
        <DashButton
         size="sm"
         disabled={isPending}
         onClick={() => handleConnect(p.id)}
         className="shrink-0"
        >
         {isPending ? 'Connecting...' : 'Connect'}
        </DashButton>
       )}
      </DashCard>
     );
    })}
   </div>
  </div>
 );
}

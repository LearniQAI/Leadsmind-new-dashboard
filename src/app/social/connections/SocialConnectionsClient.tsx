'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Facebook, Instagram, Linkedin, TikTok, YouTube } from '@/components/icons/BrandIcons';
import { getLinkedInAuthUrl, getTikTokAuthUrl, getYouTubeAuthUrl, getSocialConnectionStatus } from '@/app/actions/social';
import { getMetaAuthUrl, disconnectPlatform } from '@/app/actions/messaging';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import {
 CONNECT_POLL_MS,
 CONNECT_TIMEOUT_MS,
 PLATFORM_LABELS,
 connectErrorMessage,
 connectSuccessMessage,
} from '@/lib/oauth/socialMessages';

interface SocialConnectionsClientProps {
 accounts: any[];
}

const PLATFORMS = [
 { id: 'facebook', label: 'Facebook', icon: <Facebook className="w-full h-full" /> },
 { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-full h-full" /> },
 { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-full h-full" /> },
 { id: 'tiktok', label: 'TikTok', icon: <TikTok className="w-full h-full" />, beta: true },
 { id: 'youtube', label: 'YouTube', icon: <YouTube className="w-full h-full" /> },
];

// Providers whose authorization opens in a new tab while this screen keeps polling.
const NEW_TAB_PLATFORMS = new Set(['facebook', 'instagram', 'linkedin']);
const CHANNEL = 'social-connect';
const START_URL_TIMEOUT_MS = 15_000;

type Phase = 'authorizing' | 'failed' | 'timeout';
interface Flow {
 phase: Phase;
 message?: string;
}
interface ResultBanner {
 platform: string;
 ok: boolean;
 message: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
 return new Promise<T>((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
 });
}

export default function SocialConnectionsClient({ accounts }: SocialConnectionsClientProps) {
 const router = useRouter();
 const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
 const [flows, setFlows] = useState<Record<string, Flow>>({});
 const [banner, setBanner] = useState<ResultBanner | null>(null);
 const watchers = useRef<Record<string, { poll: ReturnType<typeof setInterval>; stop: ReturnType<typeof setTimeout>; baseline: string | null }>>({});
 const channelRef = useRef<BroadcastChannel | null>(null);

 const setFlow = (platform: string, flow: Flow | null) =>
  setFlows((prev) => {
   const next = { ...prev };
   if (flow) next[platform] = flow; else delete next[platform];
   return next;
  });

 const stopWatching = useCallback((platform: string) => {
  const w = watchers.current[platform];
  if (!w) return;
  clearInterval(w.poll);
  clearTimeout(w.stop);
  delete watchers.current[platform];
 }, []);

 const checkOnce = useCallback(async (platform: string) => {
  const w = watchers.current[platform];
  if (!w) return;
  const status = await getSocialConnectionStatus(platform);
  // Watcher may have been stopped (timeout / failure) while the request was in flight.
  if (!watchers.current[platform]) return;
  if (status.connected && status.lastSyncAt !== w.baseline) {
   stopWatching(platform);
   setFlow(platform, null);
   toast.success(connectSuccessMessage(platform));
   router.refresh();
  }
 }, [router, stopWatching]);

 const startWatching = useCallback((platform: string, baseline: string | null) => {
  stopWatching(platform);
  const poll = setInterval(() => { void checkOnce(platform); }, CONNECT_POLL_MS);
  const stop = setTimeout(() => {
   stopWatching(platform);
   setFlow(platform, {
    phase: 'timeout',
    message: platform === 'instagram'
     ? "We didn't find an Instagram account. Make sure an Instagram professional account is linked to your Facebook Page, then retry."
     : `${PLATFORM_LABELS[platform] ?? 'The provider'} authorization didn't complete in time.`,
   });
  }, CONNECT_TIMEOUT_MS);
  watchers.current[platform] = { poll, stop, baseline };
 }, [checkOnce, stopWatching]);

 // Result tab: the provider redirected back here with ?platform=&success= / ?error=. Show the
 // outcome, tell the originating tab (so it stops waiting right away on cancel/deny/failure),
 // then clean the URL so a refresh doesn't replay the banner.
 useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const platform = params.get('platform');
  const error = params.get('error');
  const success = params.get('success');
  if (!platform || (!error && !success)) return;

  const ok = !error;
  setBanner({ platform, ok, message: ok ? connectSuccessMessage(platform) : connectErrorMessage(platform, error) });
  try {
   const ch = new BroadcastChannel(CHANNEL);
   ch.postMessage({ platform, ok, error });
   ch.close();
  } catch { /* BroadcastChannel unavailable — the originating tab falls back to polling/timeout */ }
  window.history.replaceState(null, '', window.location.pathname);
 }, []);

 // Originating tab: react to the result tab's message.
 useEffect(() => {
  let ch: BroadcastChannel;
  try {
   ch = new BroadcastChannel(CHANNEL);
  } catch {
   return;
  }
  channelRef.current = ch;
  ch.onmessage = (e: MessageEvent) => {
   const { platform, ok, error } = e.data ?? {};
   if (!platform || !watchers.current[platform]) return;
   if (ok) {
    void checkOnce(platform);
   } else {
    stopWatching(platform);
    setFlow(platform, { phase: 'failed', message: connectErrorMessage(platform, error ?? null) });
   }
  };
  return () => ch.close();
 }, [checkOnce, stopWatching]);

 useEffect(() => () => {
  Object.keys(watchers.current).forEach(stopWatching);
 }, [stopWatching]);

 const handleConnect = async (platform: string) => {
  const useNewTab = NEW_TAB_PLATFORMS.has(platform);
  // Must open synchronously inside the click handler or the browser's popup blocker eats it;
  // the real provider URL is assigned once the server action returns.
  let win: Window | null = null;
  if (useNewTab) {
   win = window.open('about:blank', '_blank');
   if (!win) {
    setFlow(platform, { phase: 'failed', message: 'Your browser blocked the new window. Allow pop-ups for this site and retry.' });
    return;
   }
  }

  setBanner(null);
  setFlow(platform, { phase: 'authorizing' });
  setPendingPlatform(platform);
  try {
   const baseline = useNewTab ? (await withTimeout(getSocialConnectionStatus(platform), START_URL_TIMEOUT_MS)).lastSyncAt : null;
   let url: string | undefined;
   if (platform === 'facebook' || platform === 'instagram') {
    url = await withTimeout(getMetaAuthUrl(platform, 'social'), START_URL_TIMEOUT_MS);
   } else if (platform === 'linkedin') {
    url = await withTimeout(getLinkedInAuthUrl(), START_URL_TIMEOUT_MS);
   } else if (platform === 'tiktok') {
    url = await withTimeout(getTikTokAuthUrl(), START_URL_TIMEOUT_MS);
   } else if (platform === 'youtube') {
    url = await withTimeout(getYouTubeAuthUrl(), START_URL_TIMEOUT_MS);
   }
   if (!url) throw new Error('no_url');
   if (win) {
    win.location.href = url;
    startWatching(platform, baseline);
   } else {
    window.location.href = url;
   }
  } catch (err: any) {
   win?.close();
   setFlow(platform, {
    phase: 'failed',
    message: err?.message === 'timeout'
     ? "Couldn't start the connection in time. Please try again."
     : "Couldn't start the connection. Please try again.",
   });
  } finally {
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

 const cancelFlow = (platform: string) => {
  stopWatching(platform);
  setFlow(platform, null);
 };

 return (
  <div className="space-y-6">
   <div>
    <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">connections</span></h1>
    <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
     Connect the platforms you publish to from the Composer. Each connection is real OAuth — nothing here fakes a connected state.
    </p>
   </div>

   {banner && (
    <div
     role="status"
     className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] font-semibold ${banner.ok ? 'border-green/30 bg-green/10 !text-green' : 'border-red-500/30 bg-red-500/10 !text-red-500'}`}
    >
     <span>
      {banner.message}
      {banner.ok && <span className="block font-medium !text-dash-textMuted mt-0.5">If you started this from another tab, you can close this one.</span>}
     </span>
     <button type="button" onClick={() => setBanner(null)} className="shrink-0 text-[12px] underline">Dismiss</button>
    </div>
   )}

   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {PLATFORMS.map((p) => {
     const conn = accounts.find((a) => a.platform === p.id);
     const isConnected = conn?.status === 'connected';
     const expiresAt = conn?.credentials?.token_expires_at;
     const needsReconnect = isConnected && (
      (expiresAt && new Date(expiresAt).getTime() < Date.now()) ||
      (conn?.credentials?.health_status && conn.credentials.health_status !== 'connected')
     );
     const accountName =
      conn?.credentials?.account_name ||
      conn?.credentials?.page_name ||
      conn?.credentials?.instagram_username;
     const isPending = pendingPlatform === p.id;
     const flow = flows[p.id];
     const authorizing = flow?.phase === 'authorizing';
     const failed = flow?.phase === 'failed' || flow?.phase === 'timeout';

     return (
      <DashCard key={p.id} padding="default" className="flex items-center justify-between gap-4">
       <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-sm shrink-0">
         {p.icon}
        </div>
        <div className="min-w-0">
         <p className="text-sm font-bold !text-dash-text">
          {p.label}
          {p.beta && <span className="ml-2 align-middle rounded-full bg-dash-accent/10 px-2 py-0.5 text-[10px] font-bold !text-dash-accent">Beta, invite only</span>}
         </p>
         {authorizing ? (
          <p className="text-[11px] !text-dash-textMuted">
           {NEW_TAB_PLATFORMS.has(p.id)
            ? 'A new window has opened. Complete authorization there, then return here.'
            : 'Redirecting to authorization…'}
          </p>
         ) : failed ? (
          <p className="text-[11px] font-semibold !text-red-500">{flow?.message}</p>
         ) : needsReconnect ? (
          <p className="text-[11px] font-semibold !text-amber-600">Needs reconnect{accountName ? ` — ${accountName}` : ''}</p>
         ) : isConnected ? (
          <p className="text-[11px] font-semibold !text-green truncate">
           Connected{accountName ? ` — ${accountName}` : ''}
          </p>
         ) : (
          <p className="text-[11px] !text-dash-textMuted">
           {p.beta ? 'Not connected — only invited TikTok accounts can authorize right now.' : 'Not connected'}
          </p>
         )}
        </div>
       </div>

       <div className="flex items-center gap-2 shrink-0">
        {authorizing && NEW_TAB_PLATFORMS.has(p.id) && (
         <DashButton variant="ghost" size="sm" onClick={() => cancelFlow(p.id)}>Cancel</DashButton>
        )}
        {isConnected && !authorizing && (
         <DashButton
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => handleDisconnect(p.id)}
          className="text-red-500 hover:text-red-500"
         >
          {isPending ? 'Disconnecting...' : 'Disconnect'}
         </DashButton>
        )}
        {(!isConnected || needsReconnect || failed) && !authorizing && (
         <DashButton size="sm" disabled={isPending} onClick={() => handleConnect(p.id)}>
          {failed ? 'Retry' : needsReconnect ? 'Reconnect' : 'Connect'}
         </DashButton>
        )}
       </div>
      </DashCard>
     );
    })}
   </div>
  </div>
 );
}

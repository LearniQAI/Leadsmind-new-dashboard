import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  onComplete: () => void;
  isAlreadyCompleted: boolean;
  lowBandwidthMode: boolean;
  onVideoRegister?: (el: HTMLVideoElement | null, isPlaying: boolean) => void;
  onProgressUpdate?: (seconds: number) => void;
}

function getEmbedUrl(url: string): string {
  if (!url) return '';
  try {
    if (url.includes('youtube.com/embed/')) return url;
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts[1]) {
        const videoId = parts[1].split(/[?#]/)[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('player.vimeo.com/video/')) return url;
    if (url.includes('vimeo.com/')) {
      const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
      if (match && match[1]) return `https://player.vimeo.com/video/${match[1]}`;
    }
    if (url.includes('fast.wistia.net/embed/iframe/')) return url;
    if (url.includes('wistia.com/') || url.includes('wi.st/')) {
      const match = url.match(/(?:medias|embed)\/(?:iframe\/)?([a-z0-9]+)/i);
      if (match && match[1]) return `https://fast.wistia.net/embed/iframe/${match[1]}`;
    }
  } catch (e) {
    console.error('[EmbedURL] Parsing error:', e);
  }
  return url;
}

function isDirectVideo(url: string): boolean {
  if (!url) return false;
  return (
    url.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) !== null ||
    (url.startsWith('http') &&
      !url.includes('youtube.com') && !url.includes('youtu.be') &&
      !url.includes('vimeo.com') &&
      !url.includes('wistia.com') && !url.includes('wi.st') && !url.includes('wistia.net'))
  );
}

type EmbedProvider = 'youtube' | 'vimeo' | 'other';

function detectEmbedProvider(embedUrl: string): EmbedProvider {
  if (embedUrl.includes('youtube.com')) return 'youtube';
  if (embedUrl.includes('vimeo.com')) return 'vimeo';
  return 'other';
}

let youtubeApiPromise: Promise<any> | null = null;
function loadYouTubeIframeApi(): Promise<any> {
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const prevReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve((window as any).YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

let vimeoApiPromise: Promise<any> | null = null;
function loadVimeoPlayerApi(): Promise<any> {
  if ((window as any).Vimeo?.Player) return Promise.resolve((window as any).Vimeo);
  if (vimeoApiPromise) return vimeoApiPromise;
  vimeoApiPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.onload = () => resolve((window as any).Vimeo);
    document.head.appendChild(script);
  });
  return vimeoApiPromise;
}

export default function VideoPlayer({
  videoUrl,
  onComplete,
  isAlreadyCompleted,
  lowBandwidthMode,
  onVideoRegister,
  onProgressUpdate
}: VideoPlayerProps) {
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [trackingMode, setTrackingMode] = useState<'real' | 'untracked' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
  const directVideo = isDirectVideo(videoUrl);
  const embedUrl = getEmbedUrl(videoUrl);
  const provider = detectEmbedProvider(embedUrl);

  // Monitor playing state for native video
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !directVideo) {
      onVideoRegister?.(null, false);
      return;
    }

    const handlePlay = () => onVideoRegister?.(el, true);
    const handlePause = () => onVideoRegister?.(el, false);

    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handlePause);

    // Initial check
    onVideoRegister?.(el, !el.paused);

    return () => {
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handlePause);
    };
  }, [videoUrl, directVideo, onVideoRegister]);

  // Real playback-percentage tracking for embedded providers with a public JS player API
  // (YouTube, Vimeo) — replaces a prior bug where any embedded video auto-completed after a
  // fixed 18-second client-side timer regardless of whether it was actually being watched.
  // Providers with no such public API (Wistia's requires its own script/queue lifecycle not
  // yet integrated here, Bunny.net/AWS are typically direct files already handled above, or
  // an unrecognized iframe) fall back to 'opened' semantics — completion fires once on a
  // real render of the block, not on a timer — rather than either faking a watch percentage
  // or leaving the lesson permanently uncompletable.
  useEffect(() => {
    if (directVideo || isAlreadyCompleted) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    if (provider === 'youtube') {
      setTrackingMode('real');
      loadYouTubeIframeApi().then((YT) => {
        if (cancelled || !iframeRef.current) return;
        const player = new YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              const poll = setInterval(() => {
                try {
                  const duration = player.getDuration?.();
                  const current = player.getCurrentTime?.();
                  if (duration && current) {
                    const pct = Math.min(100, Math.round((current / duration) * 100));
                    setWatchedPercent(pct);
                    onProgressUpdate?.(Math.floor(current));
                    if (pct >= 90) {
                      clearInterval(poll);
                      onComplete();
                    }
                  }
                } catch {
                  // Player not ready yet — ignore until next tick.
                }
              }, 1000);
              cleanup = () => clearInterval(poll);
            }
          }
        });
      });
    } else if (provider === 'vimeo') {
      setTrackingMode('real');
      loadVimeoPlayerApi().then((Vimeo) => {
        if (cancelled || !iframeRef.current) return;
        const player = new Vimeo.Player(iframeRef.current);
        const handler = (data: { seconds: number; percent: number }) => {
          const pct = Math.round(data.percent * 100);
          setWatchedPercent(pct);
          onProgressUpdate?.(Math.floor(data.seconds));
          if (pct >= 90) {
            player.off('timeupdate', handler);
            onComplete();
          }
        };
        player.on('timeupdate', handler);
        cleanup = () => player.off('timeupdate', handler);
      });
    } else {
      // No real watch-time API available for this provider — honestly downgraded to
      // 'opened' semantics (fires once, on real render) rather than faking a percentage.
      setTrackingMode('untracked');
      setWatchedPercent(100);
      onComplete();
    }

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, directVideo, isAlreadyCompleted, provider]);

  // Handle native video element progress
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isAlreadyCompleted) return;

    if (video.duration) {
      const percentage = (video.currentTime / video.duration) * 100;
      if (percentage >= 90) {
        onComplete();
      }
    }
  };

  if (!videoUrl) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden border border-white/5 relative flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertTriangle className="text-white/20 mx-auto" size={32} />
          <span className="text-xs text-white/40 block">No video URL linked to this lecture</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden border border-white/5 relative flex items-center justify-center shadow-xl">
        {directVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <iframe
            ref={iframeRef}
            id={iframeIdRef.current}
            src={provider === 'youtube'
              ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`
              : embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {!directVideo && !isAlreadyCompleted && trackingMode === 'real' && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-white/40">
            <span>Watch Progress</span>
            <span className="text-[#3b82f6]">{watchedPercent}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${watchedPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-white/30 block leading-tight">
            Marks complete automatically at 90% watched.
          </span>
        </div>
      )}

      {!directVideo && !isAlreadyCompleted && trackingMode === 'untracked' && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <span className="text-[9px] text-white/30 block leading-tight">
            This provider doesn't support real watch-time tracking yet — marked as viewed.
          </span>
        </div>
      )}
    </div>
  );
}

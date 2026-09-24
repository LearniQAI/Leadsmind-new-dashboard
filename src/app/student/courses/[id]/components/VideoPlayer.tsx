import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  /** Receives the real watched percentage that crossed the threshold — passed straight through
   *  to recordBlockCompletion, which re-checks it against the block's completion_threshold. */
  onComplete: (percentage: number) => void;
  isAlreadyCompleted: boolean;
  lowBandwidthMode: boolean;
  /** The block's completion_threshold (percent). Defaults to 90 when the block has none. */
  completionThreshold?: number | null;
  /** Play `videoUrl` in a native <video> regardless of URL shape — for same-origin proxied
   *  sources (the Google Drive stream route) that URL-sniffing can't classify. */
  forceDirect?: boolean;
  poster?: string;
  onVideoRegister?: (el: HTMLVideoElement | null, isPlaying: boolean) => void;
  onProgressUpdate?: (seconds: number) => void;
}

// The embedded providers this player supports: YouTube and Vimeo, each with a real JS player API
// for watch tracking. Google Drive video isn't classified here at all — its callers pass the gated
// stream URL with forceDirect and it plays in a native <video>. Wistia (fake completion), Bunny.net
// and AWS (no integration) were removed as providers on 2026-09-24, along with the old catch-all
// that treated any other http URL as a playable file. A URL that isn't YouTube or Vimeo is now
// unsupported: the player says so and never guesses a <video>/<iframe> or auto-completes it.
type EmbedSource = { provider: 'youtube' | 'vimeo'; embedUrl: string };

function resolveEmbed(url: string): EmbedSource | null {
  if (!url) return null;
  try {
    if (url.includes('youtube.com/embed/')) return { provider: 'youtube', embedUrl: url };
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
      if (videoId) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      if (videoId) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
    if (url.includes('player.vimeo.com/video/')) return { provider: 'vimeo', embedUrl: url };
    if (url.includes('vimeo.com/')) {
      // KNOWN LIMITATION (not fixed): only the numeric id is kept. An unlisted video's privacy hash
      // (vimeo.com/{id}/{hash}) is dropped, so the embed fails for unlisted videos. Public Vimeo
      // videos, and pasted player.vimeo.com URLs (which keep their ?h= param), work.
      const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
      if (match && match[1]) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${match[1]}` };
    }
  } catch (e) {
    console.error('[EmbedURL] Parsing error:', e);
  }
  return null;
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
  completionThreshold,
  forceDirect = false,
  poster,
  onVideoRegister,
  onProgressUpdate
}: VideoPlayerProps) {
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
  // One completion call per source: the native timeupdate handler would otherwise re-fire it on
  // every tick past the threshold until the server round-trip lands.
  const completionFiredRef = useRef(false);
  const directVideo = forceDirect;
  const embed = directVideo ? null : resolveEmbed(videoUrl);
  // Previously every tracker hardcoded 90 AND the caller always reported {percentage: 90}, so the
  // instructor's threshold slider did nothing below 90 and made the block uncompletable above it
  // (the server rejects 90 < threshold). Now the real threshold drives every tracker and the real
  // percentage is what gets reported.
  const threshold = completionThreshold ?? 90;

  useEffect(() => {
    completionFiredRef.current = false;
    setPlaybackError(false);
  }, [videoUrl]);

  const fireComplete = (percentage: number) => {
    if (completionFiredRef.current) return;
    completionFiredRef.current = true;
    onComplete(percentage);
  };
  const provider = embed?.provider ?? null;
  const embedUrl = embed?.embedUrl ?? '';

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

  // Real playback-percentage tracking through each embedded provider's public JS player API —
  // replaces a prior bug where any embedded video auto-completed after a fixed 18-second
  // client-side timer regardless of whether it was actually being watched.
  useEffect(() => {
    setIsTracking(false);
    if (directVideo || isAlreadyCompleted || !provider) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    setIsTracking(true);
    if (provider === 'youtube') {
      loadYouTubeIframeApi().then((YT) => {
        if (cancelled || !iframeRef.current) return;
        const player = new YT.Player(iframeRef.current, {
          events: {
            // Polling can miss the last second; the ENDED state is the reliable 100%.
            onStateChange: (e: { data: number }) => {
              if (e.data === YT.PlayerState?.ENDED) {
                setWatchedPercent(100);
                fireComplete(100);
              }
            },
            onReady: () => {
              const poll = setInterval(() => {
                try {
                  const duration = player.getDuration?.();
                  const current = player.getCurrentTime?.();
                  if (duration && current) {
                    const pct = Math.min(100, Math.round((current / duration) * 100));
                    setWatchedPercent(pct);
                    onProgressUpdate?.(Math.floor(current));
                    if (pct >= threshold) {
                      clearInterval(poll);
                      fireComplete(pct);
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
    } else {
      loadVimeoPlayerApi().then((Vimeo) => {
        if (cancelled || !iframeRef.current) return;
        const player = new Vimeo.Player(iframeRef.current);
        const handler = (data: { seconds: number; percent: number }) => {
          const pct = Math.round(data.percent * 100);
          setWatchedPercent(pct);
          onProgressUpdate?.(Math.floor(data.seconds));
          if (pct >= threshold) {
            player.off('timeupdate', handler);
            fireComplete(pct);
          }
        };
        const onEnded = () => {
          setWatchedPercent(100);
          fireComplete(100);
        };
        player.on('timeupdate', handler);
        player.on('ended', onEnded);
        cleanup = () => {
          player.off('timeupdate', handler);
          player.off('ended', onEnded);
        };
      });
    }

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, directVideo, isAlreadyCompleted, provider, threshold]);

  // Handle native video element progress
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isAlreadyCompleted) return;

    if (video.duration && isFinite(video.duration)) {
      const percentage = Math.min(100, Math.floor((video.currentTime / video.duration) * 100));
      if (percentage >= threshold) {
        fireComplete(percentage);
      }
    }
  };

  const handleEnded = () => {
    if (!isAlreadyCompleted) fireComplete(100);
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
            poster={poster}
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setPlaybackError(true)}
            className="w-full h-full object-contain"
            preload="metadata"
          />
        ) : embed ? (
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
        ) : (
          <div className="text-center space-y-2 px-6">
            <AlertTriangle className="text-white/30 mx-auto" size={32} />
            <span className="text-xs text-white/50 block">
              This video link isn&apos;t supported. Videos can come from YouTube, Vimeo, or Google Drive.
            </span>
          </div>
        )}
      </div>

      {!directVideo && !isAlreadyCompleted && isTracking && (
        <div className="bg-dash-surface border border-dash-border rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-dash-textMuted">
            <span>Watch Progress</span>
            <span className="text-dash-accent">{watchedPercent}%</span>
          </div>
          <div className="w-full bg-dash-border rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${watchedPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-dash-textMuted block leading-tight">
            Marks complete automatically at {threshold}% watched.
          </span>
        </div>
      )}

      {directVideo && playbackError && (
        <div className="flex items-start gap-2 bg-dash-surface border border-dash-border rounded-xl p-3.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
          <span className="text-[11px] text-dash-textMuted leading-snug">
            This video couldn&apos;t be loaded. If it keeps happening, let the course team know — the source file may have been moved or unshared.
          </span>
        </div>
      )}
    </div>
  );
}

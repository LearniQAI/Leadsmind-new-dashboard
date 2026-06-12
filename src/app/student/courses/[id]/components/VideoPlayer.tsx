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
  } catch (e) {
    console.error('[EmbedURL] Parsing error:', e);
  }
  return url;
}

function isDirectVideo(url: string): boolean {
  if (!url) return false;
  return (
    url.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) !== null ||
    (url.startsWith('http') && !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com'))
  );
}

export default function VideoPlayer({
  videoUrl,
  onComplete,
  isAlreadyCompleted,
  lowBandwidthMode,
  onVideoRegister,
  onProgressUpdate
}: VideoPlayerProps) {
  const [embedProgress, setEmbedProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const directVideo = isDirectVideo(videoUrl);

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

  // Simulated playback watcher for linked embeds
  useEffect(() => {
    if (directVideo || isAlreadyCompleted) {
      setEmbedProgress(100);
      return;
    }

    setEmbedProgress(0);

    // Increment simulated progress over time when watching embeds
    // 5% every second => reaches 90% in 18 seconds
    const interval = setInterval(() => {
      setEmbedProgress((prev) => {
        const next = prev + 5;
        // Assume baseline 180s duration: 5% corresponds to 9s increments
        const simulatedSeconds = Math.floor((next / 100) * 180);
        onProgressUpdate?.(simulatedSeconds);

        if (next >= 90) {
          clearInterval(interval);
          onComplete();
          return 90;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [videoUrl, directVideo, isAlreadyCompleted, onComplete, onProgressUpdate]);

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
            src={getEmbedUrl(videoUrl)}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {!directVideo && !isAlreadyCompleted && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-white/40">
            <span>Simulating Embed Watch Session</span>
            <span className="text-[#3b82f6]">{embedProgress}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${embedProgress}%` }}
            />
          </div>
          <span className="text-[9px] text-white/30 block leading-tight">
            Marking complete automatically at &ge;90% duration watch mark.
          </span>
        </div>
      )}
    </div>
  );
}

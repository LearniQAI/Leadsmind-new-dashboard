'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceNotePlayerProps {
  audioUrl?: string;
  duration?: number; // optional pre-calculated duration in seconds
  theme?: 'light' | 'dark'; // 'light' uses standard styles; 'dark' integrates with LeadsMind theme
  className?: string;
}

// Fixed set of heights for a beautiful, symmetrical mock waveform
const WAVEFORM_BARS = [
  12, 16, 24, 18, 14, 28, 36, 42, 30, 22, 18, 26, 32, 48, 52, 40,
  32, 24, 16, 20, 28, 36, 30, 22, 14, 18, 24, 38, 44, 30, 20, 16, 12
];

export function VoiceNotePlayer({ audioUrl, duration: initialDuration, theme = 'dark', className }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration && isFinite(initialDuration) ? initialDuration : 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const isDark = theme === 'dark';

  // Sync state with HTML5 audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Capture live duration updates if browser eventually resolves it
      if (audio.duration && isFinite(audio.duration) && duration !== audio.duration) {
        setDuration(audio.duration);
      }
    };
    
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else if (audio.duration === Infinity) {
        // Chrome WebM blob duration fix: seek to end, read duration, seek back
        audio.currentTime = 1e101;
        const getDuration = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', getDuration);
        };
        audio.addEventListener('timeupdate', getDuration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    // If audio is already loaded/cached
    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    } else if (initialDuration && isFinite(initialDuration)) {
      setDuration(initialDuration);
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl, initialDuration, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const newTime = clickPercentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Helper to format seconds to mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Safe fallback if duration is still loading or infinite
  const displayDuration = (duration && isFinite(duration)) ? duration : 30;
  const progressRatio = currentTime / displayDuration;

  // Determine dynamic container style classes
  const containerClass = isDark
    ? "bg-white/[0.02] border border-white/5 shadow-inner"
    : "bg-[#f1f5f9] border border-slate-200/60 shadow-inner";

  return (
    <div className={cn(
      "flex items-center gap-4 rounded-xl px-4 py-3 w-full min-w-[280px] max-w-full transition-all duration-300",
      containerClass,
      className
    )}>
      {/* Hidden HTML5 Audio */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 shadow-md shrink-0",
          isPlaying 
            ? "bg-[#0F6E56] hover:bg-[#0c5945] text-white" 
            : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-white" />
        ) : (
          <Play className="w-5 h-5 fill-white ml-0.5" />
        )}
      </button>

      {/* Waveform and Progress Bar Area */}
      <div className="flex-1 flex flex-col gap-1.5 select-none">
        <div 
          onClick={handleWaveformClick}
          className="relative h-14 flex items-center gap-[3px] cursor-pointer group/wave w-full"
        >
          {WAVEFORM_BARS.map((barHeight, idx) => {
            const barProgress = idx / WAVEFORM_BARS.length;
            const isActive = progressRatio >= barProgress;
            const isHovered = hoverIndex !== null && idx <= hoverIndex;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: isActive
                    ? '#0F6E56' // completed audio color
                    : isHovered 
                    ? '#3b82f6' // hovered audio seek color
                    : isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1', // inactive color
                }}
              />
            );
          })}
        </div>

        {/* Time Tracking & Volume Controls */}
        <div className={cn(
          "flex items-center justify-between text-[11px] font-medium font-dm-sans px-0.5",
          isDark ? "text-t3" : "text-slate-500"
        )}>
          <div className="flex items-center gap-1.5">
            <span className={cn("font-semibold", isDark ? "text-t1" : "text-[#1A1A1A]")}>
              {formatTime(currentTime)}
            </span>
            <span className={isDark ? "text-white/20" : "text-slate-400"}>/</span>
            <span>{formatTime(displayDuration)}</span>
          </div>

          <button 
            onClick={toggleMute}
            className={cn(
              "transition-colors p-0.5",
              isMuted ? "text-rose-500" : isDark ? "text-t3 hover:text-t1" : "text-slate-400 hover:text-slate-600"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceNotePlayer;

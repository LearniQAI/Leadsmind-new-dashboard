'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, List, PlayCircle, Sparkles } from 'lucide-react';

interface Chapter {
  title: string;
  start_time: number; // in seconds
  end_time: number;   // in seconds
  is_critical?: boolean;
}

interface HelpVideoPlayerProps {
  videoUrl: string;
  chapters?: Chapter[];
}

export default function HelpVideoPlayer({ videoUrl, chapters = [] }: HelpVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.5); // Default locked speed
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Synchronise playback speed based on critical chapter boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Find if the current time lies inside a critical chapter
    const currentChapter = chapters.find(
      (c) => currentTime >= c.start_time && currentTime <= c.end_time
    );

    if (currentChapter) {
      const targetSpeed = currentChapter.is_critical ? 1.0 : 1.5;
      if (video.playbackRate !== targetSpeed) {
        video.playbackRate = targetSpeed;
        setPlaybackSpeed(targetSpeed);
      }
    } else {
      // General setup screen speed fallback
      if (video.playbackRate !== 1.5) {
        video.playbackRate = 1.5;
        setPlaybackSpeed(1.5);
      }
    }

    // Determine active chapter index
    const activeIdx = chapters.findIndex(
      (c) => currentTime >= c.start_time && currentTime <= c.end_time
    );
    setActiveChapterIndex(activeIdx !== -1 ? activeIdx : null);

  }, [currentTime, chapters]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => console.log('Playback error:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleJumpToChapter = (startTime: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = startTime;
      setCurrentTime(startTime);
      if (!isPlaying) {
        video.play().catch(err => console.log(err));
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Convert seconds to MM:SS format
  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-[#080f28]/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5 font-dm-sans">
      
      {/* Playback Pipeline Edge Banner */}
      <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest font-black pb-2.5 border-b border-white/[0.04]">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Cloudflare CDN Johannesburg Edge (JNB)
        </span>
        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
          Low Latency Stream
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Media Screen */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#020510] border border-white/10 group">
            {videoUrl.includes('iframe') || videoUrl.includes('embed') || videoUrl.includes('youtube') || videoUrl.includes('vimeo') ? (
              <iframe
                src={videoUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="w-full h-full object-cover"
                  onClick={togglePlay}
                />

                {/* Custom overlays / control indicators */}
                <div className="absolute bottom-4 left-4 right-4 bg-[#060b1f]/95 border border-white/5 p-3.5 rounded-xl flex items-center justify-between gap-4 shadow-2xl opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={togglePlay}
                    type="button"
                    className="p-2 bg-primary hover:bg-primary/95 text-white rounded-lg transition active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  {/* Progress Slider */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/50">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleScrub}
                      className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-[10px] font-bold text-white/50">{formatTime(duration)}</span>
                  </div>

                  {/* Speed Preset indicator badge */}
                  <div className="flex items-center gap-3">
                    <button onClick={toggleMute} className="text-white/40 hover:text-white transition">
                      {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-500" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>

                    <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-white/40">Speed:</span>
                      <span className={`text-[10px] font-black tracking-wider ${playbackSpeed === 1.0 ? 'text-amber-400' : 'text-primary'}`}>
                        {playbackSpeed.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Chapters Timeline */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <List className="w-4 h-4 text-primary" />
            <span>Interactive Setup Chapters</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[220px] lg:max-h-none space-y-2 pr-1 no-scrollbar">
            {chapters.length === 0 ? (
              <div className="text-xs text-white/35 py-8 text-center border border-dashed border-white/5 rounded-2xl">
                No chapter jumps provisioned.
              </div>
            ) : (
              chapters.map((chap, idx) => {
                const isActive = activeChapterIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToChapter(chap.start_time)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                      isActive
                        ? 'bg-primary/10 border-primary/30 text-white'
                        : 'bg-white/[0.01] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-tight text-white group-hover:text-primary transition line-clamp-1">
                          {chap.title}
                        </span>
                        {chap.is_critical && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded shrink-0">
                            Critical Section
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-white/30 font-semibold uppercase tracking-widest block">
                        Start: {formatTime(chap.start_time)}
                      </span>
                    </div>
                    <PlayCircle className="w-4.5 h-4.5 text-white/20 group-hover:text-primary group-hover:scale-105 transition" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { recordAudioProgress } from '@/app/actions/audioProgress';

interface AudioDrivePlayerProps {
  assetId: string;
  contentBlockId: string;
  isAlreadyCompleted: boolean;
  onComplete: () => void;
}

// Streams via the access-gated proxy (GET /api/audio/{assetId}/stream) — the raw Drive link
// never reaches the client. A native <audio> element with Range-request scrubbing already works
// against that endpoint with zero extra code; the visual player polish (chapters/transcript
// sync, mini-player) is Phase 3.
export default function AudioDrivePlayer({ assetId, contentBlockId, isAlreadyCompleted, onComplete }: AudioDrivePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState(false);
  const lastReportedRef = useRef(0);
  const completedRef = useRef(isAlreadyCompleted);

  useEffect(() => {
    completedRef.current = isAlreadyCompleted;
  }, [isAlreadyCompleted]);

  const streamUrl = `/api/audio/${assetId}/stream`;

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;

    const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
    setPercent(pct);

    // Throttle progress writes to roughly once every 5 real seconds of playback, not every
    // timeupdate tick (which can fire several times a second).
    if (Math.abs(audio.currentTime - lastReportedRef.current) < 5 && pct < 100) return;
    lastReportedRef.current = audio.currentTime;

    recordAudioProgress(contentBlockId, {
      positionSeconds: audio.currentTime,
      durationSeconds: audio.duration,
      percentage: pct,
    }).then((res) => {
      if (!completedRef.current && res?.completed) {
        completedRef.current = true;
        onComplete();
      }
    });
  };

  if (error) {
    return (
      <div className="w-full rounded-2xl bg-dash-surface border border-dash-border p-6 flex items-center gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <span className="text-xs !text-dash-textMuted">This audio couldn't be loaded. Let your instructor know.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <audio
        ref={audioRef}
        src={streamUrl}
        controls
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onError={() => setError(true)}
        className="w-full"
      />
      {!isAlreadyCompleted && (
        <div className="bg-dash-surface border border-dash-border rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider !text-dash-textMuted">
            <span>Listen progress</span>
            <span className="text-dash-accent">{percent}%</span>
          </div>
          <div className="w-full bg-dash-border rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { recordAudioProgress } from "@/app/actions/audioProgress";

// Single source of truth for "what audio is playing right now," mounted once at the /student
// layout level (src/app/student/layout.tsx) so it survives client-side navigation between
// student pages — the actual <audio> element lives here, never inside a page component, which
// is what lets the mini player keep playing across a route change with zero restart/gap.
//
// Two different visual surfaces read from this same context: the full player (rendered inline
// in the lesson content, "registers" itself as the active full view while mounted) and the mini
// player bar (rendered once here, shown only when no matching full view is registered). Neither
// owns the <audio> element or its own playback state — that would be exactly the kind of split
// state that causes restarts/gaps on navigation.
//
// Progress/completion recording lives HERE (not in the full player) so listening still counts
// toward completion while only the mini bar is visible.

export interface AudioTrack {
  assetId: string;
  contentBlockId: string;
  courseId: string;
  lessonId: string;
  title: string;
  courseTitle?: string | null;
  artworkUrl?: string | null;
  /** The block's real completion_threshold (falls back to 90, same default used everywhere else). */
  completionThreshold?: number | null;
}

export interface AudioTimeSnapshot {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
}

interface AudioPlayerContextValue {
  track: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  /** Changes only at loadedmetadata (or on load()/close()) — safe to read in a component that
   *  should NOT re-render on every playback tick, unlike useAudioTime()'s duration field which
   *  is bundled with currentTime and therefore changes every tick regardless of which field is
   *  actually read. */
  duration: number;
  playbackRate: number;
  isFullViewActive: boolean;
  completedAssetIds: Set<string>;
  load: (track: AudioTrack, opts?: { resumeAt?: number }) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  close: () => void;
  /** Called by the full player on mount/unmount so the provider knows whether a matching full
   *  view is currently on screen (drives whether the mini bar renders). */
  registerFullView: (contentBlockId: string) => () => void;
  /** High-frequency position updates (timeupdate fires several times a second) bypass React
   *  context reactivity entirely — subscribing here does NOT re-render this provider's other
   *  consumers, only whoever calls useAudioTime() themselves. Every leaf that needs continuous
   *  position (scrubber, speaker row, transcript, chapters) subscribes independently so each is
   *  its own re-render boundary, not the whole player tree on every tick. */
  subscribeTime: (listener: (snapshot: AudioTimeSnapshot) => void) => () => void;
  getTimeSnapshot: () => AudioTimeSnapshot;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const PLAYBACK_RATE_STORAGE_KEY = "lms.audio.playbackRate";
const DEFAULT_THRESHOLD = 90;

function readStoredRate(): number {
  try {
    const raw = window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
    const rate = raw ? parseFloat(raw) : 1;
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  } catch {
    return 1;
  }
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [activeFullViewBlockId, setActiveFullViewBlockId] = useState<string | null>(null);
  const [completedAssetIds, setCompletedAssetIds] = useState<Set<string>>(new Set());

  const lastReportedRef = useRef(0);
  const pendingResumeRef = useRef<number | null>(null);
  const trackRef = useRef<AudioTrack | null>(null);
  trackRef.current = track;

  // Time subscription channel — plain refs/listeners, deliberately outside React state so
  // updating it never triggers a re-render of the provider (and therefore never of every
  // useAudioPlayer() consumer). See AudioTimeSnapshot's doc comment above.
  const timeSnapshotRef = useRef<AudioTimeSnapshot>({ currentTime: 0, duration: 0, bufferedEnd: 0 });
  const timeListenersRef = useRef<Set<(snapshot: AudioTimeSnapshot) => void>>(new Set());

  const subscribeTime = useCallback((listener: (snapshot: AudioTimeSnapshot) => void) => {
    timeListenersRef.current.add(listener);
    listener(timeSnapshotRef.current);
    return () => {
      timeListenersRef.current.delete(listener);
    };
  }, []);

  const getTimeSnapshot = useCallback(() => timeSnapshotRef.current, []);

  const publishTimeSnapshot = useCallback((next: AudioTimeSnapshot) => {
    timeSnapshotRef.current = next;
    timeListenersRef.current.forEach((listener) => listener(next));
  }, []);

  useEffect(() => {
    setPlaybackRateState(readStoredRate());
  }, []);

  const load = useCallback((next: AudioTrack, opts?: { resumeAt?: number }) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Same track already loaded (e.g. re-opening the full player after navigating back) — do
    // NOT touch audio.src, that would restart playback and cause exactly the gap this
    // architecture exists to avoid.
    if (trackRef.current?.assetId === next.assetId) {
      setTrack(next);
      return;
    }

    setTrack(next);
    setHasError(false);
    setIsLoading(true);
    setDuration(0);
    publishTimeSnapshot({ currentTime: 0, duration: 0, bufferedEnd: 0 });
    lastReportedRef.current = 0;
    pendingResumeRef.current = opts?.resumeAt && opts.resumeAt > 0 ? opts.resumeAt : null;
    audio.src = `/api/audio/${next.assetId}/stream`;
    audio.playbackRate = playbackRate;
    audio.load();
  }, [playbackRate, publishTimeSnapshot]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {
      // Autoplay/interaction restrictions — the UI's own play button click already satisfies
      // the user-gesture requirement in the normal case; a rejected play() here just means the
      // browser blocked it (e.g. programmatic resume without a fresh gesture), so isPlaying
      // stays driven by the element's own 'play'/'pause' events below, not this call.
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play();
    else pause();
  }, [play, pause]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || seconds, seconds));
  }, []);

  const skip = useCallback((deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seek(audio.currentTime + deltaSeconds);
  }, [seek]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
    try {
      window.localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
    } catch {
      // Best-effort persistence only — a rejected/unavailable localStorage (private mode, etc.)
      // just means the rate resets next session, not a functional failure.
    }
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setTrack(null);
    setIsPlaying(false);
    setDuration(0);
    publishTimeSnapshot({ currentTime: 0, duration: 0, bufferedEnd: 0 });
  }, [publishTimeSnapshot]);

  const registerFullView = useCallback((contentBlockId: string) => {
    setActiveFullViewBlockId(contentBlockId);
    return () => {
      setActiveFullViewBlockId((current) => (current === contentBlockId ? null : current));
    };
  }, []);

  // --- <audio> element event wiring ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      publishTimeSnapshot({ ...timeSnapshotRef.current, duration: audio.duration || 0 });
      setIsLoading(false);
      if (pendingResumeRef.current != null) {
        audio.currentTime = Math.min(pendingResumeRef.current, audio.duration || pendingResumeRef.current);
        pendingResumeRef.current = null;
      }
    };
    const onTimeUpdate = () => {
      publishTimeSnapshot({
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
        bufferedEnd: audio.buffered.length > 0 ? audio.buffered.end(audio.buffered.length - 1) : timeSnapshotRef.current.bufferedEnd,
      });

      const current = trackRef.current;
      if (!current || !audio.duration || !isFinite(audio.duration)) return;

      const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
      // Throttle server writes to roughly every 5 real seconds of playback (matches the
      // Phase 1 AudioDrivePlayer's original cadence), not every timeupdate tick.
      if (Math.abs(audio.currentTime - lastReportedRef.current) < 5 && pct < 100) return;
      lastReportedRef.current = audio.currentTime;

      recordAudioProgress(current.contentBlockId, {
        positionSeconds: audio.currentTime,
        durationSeconds: audio.duration,
        percentage: pct,
      }).then((res) => {
        if (res?.completed) {
          setCompletedAssetIds((prev) => {
            if (prev.has(current.assetId)) return prev;
            const next = new Set(prev);
            next.add(current.assetId);
            return next;
          });
        }
      });
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onError = () => {
      setHasError(true);
      setIsLoading(false);
    };
    const onProgress = () => {
      if (audio.buffered.length > 0) {
        publishTimeSnapshot({ ...timeSnapshotRef.current, bufferedEnd: audio.buffered.end(audio.buffered.length - 1) });
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    audio.addEventListener("progress", onProgress);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("progress", onProgress);
    };
    // Wired once — the element instance never changes, only its .src does (via load()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AudioPlayerContextValue>(() => ({
    track,
    isPlaying,
    isLoading,
    hasError,
    duration,
    playbackRate,
    isFullViewActive: !!track && activeFullViewBlockId === track.contentBlockId,
    completedAssetIds,
    load,
    play,
    pause,
    toggle,
    seek,
    skip,
    setPlaybackRate,
    close,
    registerFullView,
    subscribeTime,
    getTimeSnapshot,
  }), [
    track, isPlaying, isLoading, hasError, duration, playbackRate,
    activeFullViewBlockId, completedAssetIds, load, play, pause, toggle, seek, skip,
    setPlaybackRate, close, registerFullView, subscribeTime, getTimeSnapshot,
  ]);

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- transcript_segments IS the
          caption-equivalent surface (Phase 3 Part A), not a WebVTT track on this element. */}
      <audio ref={audioRef} className="sr-only" preload="metadata" />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

/** Subscribes to high-frequency playback position. Only the calling component re-renders on
 *  each tick — this is the isolation mechanism every time-sensitive leaf (scrubber, speaker
 *  row, transcript, chapters) should use instead of reading time off useAudioPlayer() itself. */
export function useAudioTime(): AudioTimeSnapshot {
  const { subscribeTime, getTimeSnapshot } = useAudioPlayer();
  const [snapshot, setSnapshot] = useState<AudioTimeSnapshot>(getTimeSnapshot);
  useEffect(() => subscribeTime(setSnapshot), [subscribeTime]);
  return snapshot;
}

/** DEFAULT_THRESHOLD export kept alongside the context so consumers share one constant instead
 *  of re-guessing 90 independently (mirrors block.completion_threshold ?? 90 used elsewhere). */
export { DEFAULT_THRESHOLD };

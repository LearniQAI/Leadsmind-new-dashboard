import { useEffect, useRef } from 'react';

interface UseHeartbeatOptions {
  enrolmentId: string;
  activeLessonId?: string;
  videoElement?: HTMLVideoElement | null;
  isVideoPlaying?: boolean;
}

/**
 * Low-overhead React hook to track user activity heartbeats and video progress.
 * Synchronizes with the backend PATCH /api/enrolments/:id/activity every 30 seconds.
 */
export function useHeartbeat({
  enrolmentId,
  activeLessonId,
  videoElement,
  isVideoPlaying
}: UseHeartbeatOptions) {
  const lastActiveRef = useRef<boolean>(false);
  const lastProgressSentRef = useRef<number>(-1);

  // 1. Listen for user activity
  useEffect(() => {
    if (!enrolmentId) return;

    const handleActivity = () => {
      lastActiveRef.current = true;
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [enrolmentId]);

  // 2. Periodic synchronization timer (every 30 seconds)
  useEffect(() => {
    if (!enrolmentId) return;

    const interval = setInterval(async () => {
      const wasActive = lastActiveRef.current;
      lastActiveRef.current = false; // Reset activity flag

      const payload: any = {};
      let shouldSend = wasActive;

      // Extract current playback position if playing a video
      if (activeLessonId && videoElement) {
        const currentSeconds = Math.floor(videoElement.currentTime);
        if (isVideoPlaying && currentSeconds !== lastProgressSentRef.current) {
          payload.lessonId = activeLessonId;
          payload.progressSeconds = currentSeconds;
          lastProgressSentRef.current = currentSeconds;
          shouldSend = true;
        }
      }

      if (shouldSend) {
        try {
          await fetch(`/api/enrolments/${enrolmentId}/activity`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.error('[Heartbeat Sync Hook error]:', err);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [enrolmentId, activeLessonId, videoElement, isVideoPlaying]);
}

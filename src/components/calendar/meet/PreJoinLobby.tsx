'use client';

import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui';

interface PreJoinLobbyProps {
  appointment: any;
  isMicOn: boolean;
  isCamOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onJoin: () => void;
}

export default function PreJoinLobby({
  appointment,
  isMicOn,
  isCamOn,
  onToggleMic,
  onToggleCam,
  onJoin
}: PreJoinLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Preview user's camera feed
  useEffect(() => {
    async function startPreview() {
      if (isCamOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          console.warn('[pre-join] Failed to acquire video feed:', err);
        }
      } else {
        stopPreview();
      }
    }

    startPreview();
    return () => { stopPreview(); };
  }, [isCamOn]);

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex items-center justify-center p-5 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-dash-surface to-dash-bg pointer-events-none" />

      <div className="relative max-w-[960px] w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Preview */}
        <div className="space-y-4">
          <div className="aspect-video bg-[#0a0e17] rounded-2xl border border-dash-border relative overflow-hidden flex items-center justify-center shadow-sm">
            {isCamOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl font-bold font-space">
                {appointment?.contact?.first_name?.[0] || 'U'}
              </div>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2.5 p-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
              <button
                onClick={onToggleMic}
                className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none', isMicOn ? 'bg-white text-black' : 'bg-red-500 text-white')}
              >
                {isMicOn ? <Mic size={17} /> : <MicOff size={17} />}
              </button>
              <button
                onClick={onToggleCam}
                className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none', isCamOn ? 'bg-white text-black' : 'bg-red-500 text-white')}
              >
                {isCamOn ? <Video size={17} /> : <VideoOff size={17} />}
              </button>
            </div>
          </div>
          <p className="flex items-center gap-2 text-[12px] text-dash-textMuted justify-center">
            <ShieldCheck size={14} strokeWidth={2} className="text-green" />
            Encrypted connection
          </p>
        </div>

        {/* Join */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold font-space text-dash-text">Ready to join?</h1>
            <p className="text-[15px] text-dash-textMuted">
              {appointment?.title || 'Meeting'} with{' '}
              <span className="font-semibold text-dash-text">
                {appointment?.contact?.first_name || 'the host'} {appointment?.contact?.last_name || ''}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-dash-border bg-white p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted shrink-0">
                <Users size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-dash-text">The room is ready</p>
                <p className="text-[12px] text-dash-textMuted">Join when you're set — your host will be notified.</p>
              </div>
            </div>

            <DashButton onClick={onJoin} variant="primary" size="lg" className="w-full">
              Join meeting
            </DashButton>
          </div>
        </div>
      </div>
    </div>
  );
}

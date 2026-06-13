'use client';

import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false // No audio feedback in lobby
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn('[pre-join] Failed to acquire video feed:', err);
        }
      } else {
        stopPreview();
      }
    }

    startPreview();

    return () => {
      stopPreview();
    };
  }, [isCamOn]);

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--n900)] flex items-center justify-center p-6 font-['Space_Grotesk'] text-[var(--t1)]">
      <div className="max-w-[1000px] w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Preview Area */}
        <div className="space-y-6">
          <div className="aspect-video bg-[var(--n800)] rounded-[var(--r24)] border-2 border-[var(--bdr)] relative overflow-hidden flex items-center justify-center shadow-2xl">
            {isCamOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center text-[var(--accent2)] text-3xl font-bold">
                {appointment?.contact?.first_name?.[0] || 'U'}
              </div>
            )}
            {/* Floating Camera Preview Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-[rgba(0,0,0,0.5)] backdrop-blur-md rounded-full border border-[rgba(255,255,255,0.1)]">
              <button
                onClick={onToggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white text-black' : 'bg-red-500 text-white'}`}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={onToggleCam}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white text-black' : 'bg-red-500 text-white'}`}
              >
                {isCamOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[var(--t4)] text-sm justify-center">
            <ShieldCheck size={16} className="text-[var(--green)]" />
            End-to-end encrypted connection
          </div>
        </div>

        {/* Right: Join Action Details */}
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-[var(--t1)]">Ready to join?</h1>
            <p className="text-[var(--t3)]">
              {appointment?.title || 'Meeting Session'} with{' '}
              <span className="text-[var(--accent2)] font-bold">
                {appointment?.contact?.first_name || 'Host'} {appointment?.contact?.last_name || ''}
              </span>
            </p>
          </div>

          <div className="p-6 bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r24)] shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--n900)] border border-[var(--bdr)] flex items-center justify-center text-[var(--t4)]">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--t1)]">Secure Room Active</p>
                <p className="text-xs text-[var(--t4)]">
                  Join to begin your scheduling session
                </p>
              </div>
            </div>

            <Button
              onClick={onJoin}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent2)] text-white h-14 text-lg font-bold rounded-[var(--r16)] shadow-lg shadow-[rgba(0,0,0,0.3)] transition-all hover:scale-[1.02]"
            >
              Join Meeting Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

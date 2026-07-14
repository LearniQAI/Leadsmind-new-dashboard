'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

export const VoiceRecorder: React.FC = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'failed'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time voice visualiser telemetry
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(18).fill(12));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudioContext();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cleanupAudioContext = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('recording');

      // 1. Media Recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Clear microphone tracks
        stream.getTracks().forEach(t => t.stop());
        await uploadAudioPayload();
      };

      // 2. Real-time Audio Visualiser Telemetry
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      visualiseSpeechWave();

      // 3. Start Recording & 15-Minute Limit Timer
      mediaRecorder.start(250); // Slice size
      mediaRecorderRef.current = mediaRecorder;

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 900) { // 15 mins hard ceiling stop
            stopRecording();
            return 900;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setStatus('failed');
      setErrorMessage(err.message || 'Microphone hardware access was denied or is unavailable.');
    }
  };

  const visualiseSpeechWave = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (status !== 'recording' && mediaRecorderRef.current?.state !== 'recording') return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Sample 18 vertical sticks dynamically
      const levels: number[] = [];
      const step = Math.floor(bufferLength / 18) || 1;
      for (let i = 0; i < 18; i++) {
        const val = dataArray[i * step] || 0;
        levels.push(Math.max(12, Math.min(100, (val / 255) * 100)));
      }
      setAudioLevels(levels);
    };

    draw();
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cleanupAudioContext();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudioPayload = async () => {
    setStatus('processing');
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'microphone_input.webm');

      const res = await fetch('/api/blog/voice-import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server speech transcription pipeline failure.');
      }

      setStatus('idle');
      if (data.postId) {
        router.push(`/blog/editor/${data.postId}`);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('failed');
      setErrorMessage(err.message || 'Speech-to-Text conversion failed.');
    }
  };

  return (
    <DashCard padding="default" className="text-center space-y-6 animate-in fade-in duration-300 motion-reduce:animate-none relative overflow-hidden">

      {status === 'idle' && (
        <div className="space-y-4 py-4">
          <div className="relative w-20 h-20 flex items-center justify-center mx-auto mb-2">
            {/* Sonar Pulsing Halos */}
            <div className="absolute inset-0 rounded-full bg-green/20 animate-ping motion-reduce:animate-none [animation-duration:2.5s] pointer-events-none" />
            <div className="absolute inset-2 rounded-full bg-green/10 animate-pulse motion-reduce:animate-none pointer-events-none" />

            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-green hover:bg-green/90 flex items-center justify-center relative z-10 shadow-md hover:scale-105 motion-reduce:hover:scale-100 transition-transform motion-reduce:transition-none duration-300 group"
            >
              <Mic className="w-6 h-6 text-white group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none duration-300" />
            </button>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold !text-dash-text">Record your idea</h4>
            <p className="text-[11px] !text-dash-textMuted max-w-xs mx-auto leading-relaxed">
              Click to capture spoken presentations or ideas. Speak directly into your microphone, with a 15-minute maximum limit.
            </p>
          </div>
        </div>
      )}

      {status === 'recording' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-2.5 h-2.5 bg-red rounded-full animate-ping motion-reduce:animate-none" />
            <span className="font-mono text-xl font-bold tracking-wider !text-dash-text">{formatTime(seconds)}</span>
            <span className="text-[10px] !text-dash-textMuted font-bold">/ 15:00</span>
          </div>

          {/* Symmetrical Center-Aligned Sound Sticks */}
          <div className="flex items-center justify-center gap-1.5 h-20 my-6 bg-dash-surface border border-dash-border rounded-2xl p-4">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="w-1 bg-green rounded-full transition-all duration-75 motion-reduce:transition-none animate-pulse motion-reduce:animate-none"
                style={{
                  height: `${level}%`,
                  minHeight: '6px',
                  animationDelay: `${i * 60}ms`,
                  animationDuration: '1.2s'
                }}
              />
            ))}
          </div>

          <DashButton variant="destructive" onClick={stopRecording} className="mx-auto">
            <Square className="w-3.5 h-3.5" /> Stop & transcribe
          </DashButton>
        </div>
      )}

      {status === 'processing' && (
        <div className="space-y-4 py-6">
          <Loader2 className="w-8 h-8 text-dash-accent animate-spin motion-reduce:animate-none mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-dash-accent animate-pulse motion-reduce:animate-none">Speech processing</h4>
            <p className="text-[10px] !text-dash-textMuted font-bold">Transcribing audio and cleaning filler words...</p>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="p-4 bg-red/10 border border-red/20 text-red rounded-xl text-left space-y-3 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Telemetry failure</p>
              <p className="text-xs mt-0.5 !text-dash-textMuted">{errorMessage}</p>
            </div>
          </div>
          <DashButton variant="secondary" onClick={() => setStatus('idle')} className="w-full justify-center">
            Reset recorder
          </DashButton>
        </div>
      )}
    </DashCard>
  );
};
export default VoiceRecorder;

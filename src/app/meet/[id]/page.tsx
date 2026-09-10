'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, PhoneOff, Settings, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { getAppointmentById, logParticipantJoin, logParticipantLeave } from '@/app/actions/calendar/appointments';
import PreJoinLobby from '@/components/calendar/meet/PreJoinLobby';
import { Button } from '@/components/ui/button';

export default function MeetingPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);
  
  const jitsiApiRef = useRef<any>(null);

  // 1. Initial Load of Appointment Details
  useEffect(() => {
    async function loadMeeting() {
      if (!id) return;
      const res = await getAppointmentById(id as string);
      if (res.success && res.data) {
        setAppointment(res.data);
      } else {
        toast.error('Meeting not found or has expired');
        router.push('/calendar');
      }
      setIsLoading(false);
    }
    loadMeeting();
  }, [id, router]);

  // 2. Load Jitsi Meet External API Script Dynamically
  useEffect(() => {
    const scriptId = 'jitsi-external-api';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Clean up Jitsi connection on unmount
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, []);

  // 3. Initiate Meeting Join Flow
  const handleJoin = async () => {
    setIsJoined(true);
    toast.success('Establishing secure Jitsi room connection...');

    // Log arrival to database
    const participantName = appointment?.contact
      ? `${appointment.contact.first_name} ${appointment.contact.last_name || ''}`
      : 'Workspace Attendee';
    const participantEmail = appointment?.contact?.email || 'attendee@leadsmind.com';

    const joinLog = await logParticipantJoin(id as string, participantName, participantEmail);
    if (joinLog.success && joinLog.logId) {
      setLogId(joinLog.logId);
    }

    // Initialize Jitsi Meet Iframe
    setTimeout(() => {
      const parentNode = document.getElementById('meet-iframe-container');
      if (!parentNode) return;

      const domain = 'meet.jit.si';
      const options = {
        roomName: `leadsmind-${id}`,
        width: '100%',
        height: '100%',
        parentNode,
        configOverwrite: {
          startWithAudioMuted: !isMicOn,
          startWithVideoMuted: !isCamOn,
          prejoinPageEnabled: false,
          disableWelcomePage: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0a0e17',
        },
        userInfo: {
          displayName: participantName,
          email: participantEmail,
        },
      };

      // @ts-ignore
      if (window.JitsiMeetExternalAPI) {
        // @ts-ignore
        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        // Bandwidth Throttling Interceptor
        api.addEventListener('connectionQualityChanged', (event: any) => {
          const quality = event.connectionQuality; // quality score (percentage)
          if (quality < 40) {
            console.warn('[webrtc-throttling] High packet loss detected. Minimizing video payload.');
            toast.warning('Unstable connection. Dropping resolution to favor audio.');
            api.executeCommand('setReceiverConstraints', {
              lastN: 1,
              defaultConstraints: { maxHeight: 180 }, // drop down to 180p
            });
          }
        });

        // Room Exit Callback Logger
        api.addEventListener('videoConferenceLeft', async () => {
          await handleHangup();
        });
      } else {
        toast.error('Jitsi scripts failed to load. Please refresh.');
      }
    }, 100);
  };

  const handleHangup = async () => {
    if (logId) {
      await logParticipantLeave(logId);
    }
    toast.success('Meeting session ended.');
    router.push('/calendar');
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-dash-bg flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin motion-reduce:hidden text-dash-accent" size={32} />
        <p className="text-[13px] font-medium text-dash-textMuted">Preparing your meeting room…</p>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <PreJoinLobby
        appointment={appointment}
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        onToggleMic={() => setIsMicOn(!isMicOn)}
        onToggleCam={() => setIsCamOn(!isCamOn)}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0a0e17] text-white flex flex-col overflow-hidden">
      {/* Meeting Room Header — the in-call surface stays dark (conventional for
          video rooms); only the chrome is cleaned up to match the new system. */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" /> Live
          </span>
          <h2 className="text-[14px] font-semibold text-white truncate font-space">{appointment?.title || 'Video meeting'}</h2>
        </div>
        <Button
          onClick={handleHangup}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold h-9 px-4 rounded-xl flex items-center gap-2 shrink-0"
        >
          <PhoneOff size={16} />
          Leave
        </Button>
      </header>

      <main className="flex-1 bg-[#0a0e17] relative flex items-center justify-center">
        <div id="meet-iframe-container" className="w-full h-full" />
      </main>
    </div>
  );
}

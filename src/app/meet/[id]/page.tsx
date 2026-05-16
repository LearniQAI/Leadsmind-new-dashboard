'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  MonitorUp,
  MessageSquare,
  Users,
  Settings,
  MoreVertical,
  ShieldCheck,
  LayoutGrid,
  Info,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAppointmentById } from '@/app/actions/calendar/appointments';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function MeetingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMeeting() {
      if (!id) return;
      const res = await getAppointmentById(id as string);
      if (res.success) {
        setAppointment(res.data);
      } else {
        toast.error('Meeting not found or has expired');
        router.push('/calendar');
      }
      setIsLoading(false);
    }
    loadMeeting();
  }, [id, router]);

  // Simulate joining the room
  const handleJoin = () => {
    setIsJoined(true);
    toast.success('Secure connection established');
  };

  const handleEndCall = () => {
    if (confirm('Are you sure you want to leave the meeting?')) {
      router.push('/calendar');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[var(--n900)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[var(--n900)] flex items-center justify-center p-6 font-['Space_Grotesk']">
        <div className="max-w-[1000px] w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Preview Area */}
          <div className="space-y-6">
            <div className="aspect-video bg-[var(--n800)] rounded-[var(--r24)] border-2 border-[var(--bdr)] relative overflow-hidden flex items-center justify-center shadow-2xl">
              {!isCamOn && (
                <div className="w-24 h-24 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center text-[var(--accent2)] text-3xl font-bold">
                  {appointment?.contact?.first_name?.[0] || 'U'}
                </div>
              )}
              {/* Floating Camera Preview Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-[rgba(0,0,0,0.5)] backdrop-blur-md rounded-full border border-[rgba(255,255,255,0.1)]">
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white text-black' : 'bg-red-500 text-white'}`}
                >
                  {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <button
                  onClick={() => setIsCamOn(!isCamOn)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white text-black' : 'bg-red-500 text-white'}`}
                >
                  {isCamOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[var(--t4)] text-sm justify-center">
              <ShieldCheck size={16} className="text-[var(--green)]" />
              End-to-end encrypted connection
            </div>
          </div>

          {/* Right: Join Form */}
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-[var(--t1)]">Ready to join?</h1>
              <p className="text-[var(--t3)]">{appointment?.title || 'Meeting Session'} with <span className="text-[var(--accent2)] font-bold">{appointment?.contact?.first_name} {appointment?.contact?.last_name}</span></p>
            </div>

            <div className="p-6 bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r24)] shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--n900)] border border-[var(--bdr)] flex items-center justify-center text-[var(--t4)]">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--t1)]">Secure Room Active</p>
                  <p className="text-xs text-[var(--t4)]">Join to begin your {appointment?.calendar?.name || 'discovery'} session</p>
                </div>
              </div>

              <Button
                onClick={handleJoin}
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

  return (
    <div className="h-screen bg-[var(--n900)] text-[var(--t1)] flex flex-col font-['Space_Grotesk'] overflow-hidden">
      {/* 1. Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] bg-[rgba(10,14,23,0.8)] backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] bg-opacity-10 rounded-lg border border-[var(--accent)] border-opacity-20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent2)]">Live Session</span>
          </div>
          <div className="h-4 w-px bg-[var(--bdr)]" />
          <div>
            <h2 className="text-[14px] font-bold text-[var(--t1)]">{appointment?.title}</h2>
            <p className="text-[10px] text-[var(--t4)] uppercase font-black tracking-widest">Host: {appointment?.contact?.first_name} {appointment?.contact?.last_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-[var(--t3)] hover:text-white rounded-full w-10 h-10 p-0">
            <LayoutGrid size={20} />
          </Button>
          <Button variant="ghost" className="text-[var(--t3)] hover:text-white rounded-full w-10 h-10 p-0">
            <Settings size={20} />
          </Button>
        </div>
      </header>

      {/* 2. Main Content Wrapper */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Video Grid Section */}
        <div className="flex-1 p-6 flex flex-col gap-6 relative overflow-hidden">
          {/* Primary Video Focal Point */}
          <div className="flex-1 bg-[var(--n800)] rounded-[var(--r32)] border border-[rgba(255,255,255,0.05)] relative shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Participant Label */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3 z-10">
              <div className="px-3 py-1.5 bg-[rgba(0,0,0,0.6)] backdrop-blur-md rounded-full border border-[rgba(255,255,255,0.1)] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Habeeb Shittu (You)</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-white">
                <Mic size={14} />
              </div>
            </div>

            {/* Mock Content for Camera Off */}
            {!isCamOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center text-[var(--accent2)] text-6xl font-bold shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                  HS
                </div>
              </div>
            )}
          </div>

          {/* Secondary Participant Bar (Horizontal) */}
          <div className="h-32 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-video h-full bg-[var(--n800)] rounded-[var(--r16)] border border-[rgba(255,255,255,0.05)] relative flex-shrink-0 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white px-2 py-1 bg-[rgba(0,0,0,0.4)] rounded-md">
                  Participant {i}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Sidebar */}
        {activeTab && (
          <aside className="w-[380px] bg-[var(--card)] border-l border-[rgba(255,255,255,0.05)] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <h3 className="text-[18px] font-bold font-['Space_Grotesk'] capitalize">{activeTab}</h3>
              <button onClick={() => setActiveTab(null)} className="text-[var(--t4)] hover:text-white">
                <Settings size={20} />
              </button>
            </div>
            <div className="flex-1 p-6">
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <div className="p-3 rounded-[var(--r12)] bg-[var(--n900)] max-w-[80%] self-start border border-[var(--bdr)]">
                      <p className="text-[10px] font-bold text-[var(--accent2)] uppercase mb-1">Habeeb Shittu</p>
                      <p className="text-sm text-[var(--t2)]">Welcome to the strategy call! Let's get started.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input className="bg-[var(--n900)] border-[var(--bdr)] h-11" placeholder="Type a message..." />
                    <Button size="icon" className="bg-[var(--accent)] hover:bg-[var(--accent2)] rounded-xl w-11 h-11">
                      <MonitorUp size={18} />
                    </Button>
                  </div>
                </div>
              )}
              {activeTab === 'participants' && (
                <div className="space-y-4">
                  {[1, 2, 3].map(p => (
                    <div key={p} className="flex items-center justify-between p-3 rounded-xl bg-[var(--n900)] border border-[var(--bdr)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center text-[10px] font-bold text-[var(--accent2)]">
                          P{p}
                        </div>
                        <span className="text-sm font-bold text-[var(--t1)]">Participant {p}</span>
                      </div>
                      <div className="flex gap-2">
                        <Mic size={14} className="text-[var(--t4)]" />
                        <VideoIcon size={14} className="text-[var(--t4)]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* 3. Control Bar (Floating) */}
      <div className="h-24 flex items-center justify-center pointer-events-none z-50">
        <div className="px-8 py-4 bg-[rgba(15,20,30,0.6)] backdrop-blur-2xl rounded-[var(--r32)] border border-[rgba(255,255,255,0.08)] flex items-center gap-6 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isMicOn ? 'bg-[rgba(255,255,255,0.05)] text-[var(--t1)] hover:bg-[rgba(255,255,255,0.1)]' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
          >
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
          <button
            onClick={() => setIsCamOn(!isCamOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isCamOn ? 'bg-[rgba(255,255,255,0.05)] text-[var(--t1)] hover:bg-[rgba(255,255,255,0.1)]' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
          >
            {isCamOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
          </button>

          <div className="h-8 w-px bg-[rgba(255,255,255,0.1)] mx-2" />

          <button className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.05)] text-[var(--t1)] hover:bg-[var(--accent)] hover:text-white flex items-center justify-center transition-all">
            <MonitorUp size={22} />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'chat' ? 'bg-[var(--accent)] text-white' : 'bg-[rgba(255,255,255,0.05)] text-[var(--t1)] hover:bg-[rgba(255,255,255,0.1)]'}`}
          >
            <MessageSquare size={22} />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'participants' ? null : 'participants')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'participants' ? 'bg-[var(--accent)] text-white' : 'bg-[rgba(255,255,255,0.05)] text-[var(--t1)] hover:bg-[rgba(255,255,255,0.1)]'}`}
          >
            <Users size={22} />
          </button>

          <div className="h-8 w-px bg-[rgba(255,255,255,0.1)] mx-2" />

          <button
            onClick={handleEndCall}
            className="px-6 h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            <PhoneOff size={20} />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

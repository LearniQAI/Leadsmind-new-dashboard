'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Timer, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ContactTimerModuleProps {
  contactId: string;
}

const ContactTimerModule: React.FC<ContactTimerModuleProps> = ({ contactId }) => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    setIsActive(false);
    toast.success(`Logged ${formatTime(seconds)} to client history`);
    setSeconds(0);
  };

  return (
    <div className="p-4 bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r16)] shadow-xl animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[var(--t4)]"
          )} />
          <span className="text-[10px] font-black text-[var(--t3)] uppercase tracking-widest">Active Timer</span>
        </div>
        <Clock size={14} className="text-[var(--t4)]" />
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl font-bold font-space text-[var(--t1)] tracking-tight tabular-nums">
          {formatTime(seconds)}
        </div>

        <div className="flex items-center gap-2 w-full">
          {!isActive ? (
            <button 
              onClick={() => setIsActive(true)}
              className="flex-1 h-12 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-[var(--r12)] flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-all"
            >
              <Play size={16} fill="currentColor" /> Start Session
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsActive(false)}
                className="flex-1 h-12 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-[var(--r12)] flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-all"
              >
                <Pause size={16} fill="currentColor" /> Pause
              </button>
              <button 
                onClick={handleStop}
                className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-[var(--r12)] flex items-center justify-center transition-all hover:bg-rose-500/20"
              >
                <Square size={16} fill="currentColor" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--bdr)] flex items-center justify-between text-[10px] text-[var(--t4)] font-medium">
         <span className="flex items-center gap-1"><Timer size={10} /> Billable Rate: $120/hr</span>
         <CheckCircle2 size={12} className="text-emerald-500" />
      </div>
    </div>
  );
};

export default ContactTimerModule;

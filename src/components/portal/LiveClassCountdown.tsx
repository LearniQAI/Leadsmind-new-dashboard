'use client';

import React, { useState, useEffect } from 'react';
import { Video, Clock } from 'lucide-react';

interface LiveClassCountdownProps {
  startTime: string;
  meetingUrl?: string;
  endTime?: string;
}

export default function LiveClassCountdown({ startTime, meetingUrl, endTime }: LiveClassCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLiveNow, setIsLiveNow] = useState<boolean>(false);

  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : start + 2 * 60 * 60 * 1000; // default 2 hours duration

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      
      if (now >= start && now <= end) {
        setIsLiveNow(true);
        setTimeLeft(0);
      } else if (now < start) {
        setIsLiveNow(false);
        setTimeLeft(Math.max(0, start - now));
      } else {
        setIsLiveNow(false);
        setTimeLeft(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [start, end]);

  if (Date.now() > end) {
    return null;
  }

  if (isLiveNow) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-lg shadow-red-500/55" />
          <strong className="uppercase tracking-wider">Live Class is Active Now!</strong>
        </div>
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-red-500/20 active:scale-95"
          >
            <Video size={12} /> Join Class
          </a>
        )}
      </div>
    );
  }

  // Format timeLeft in hours, minutes, seconds
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const showJoinButton = timeLeft <= 15 * 60 * 1000;

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <Clock size={14} className="shrink-0" />
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] uppercase tracking-wide">Next Live Class:</span>
          <span className="font-mono font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30 tracking-widest text-[11px]">
            {pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s
          </span>
        </div>
      </div>
      {showJoinButton && meetingUrl && (
        <a
          href={meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
        >
          <Video size={12} /> Join Early
        </a>
      )}
    </div>
  );
}

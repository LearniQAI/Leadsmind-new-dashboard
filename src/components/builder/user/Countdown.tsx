"use client";

import React, { useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';

export const Countdown = ({ endDate, title, dragRef, ...props }: any) => {
  const { connectors: { connect, drag } } = useNode();
  const [timeLeft, setTimeLeft] = useState<any>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const difference = +new Date(endDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const TimeBlock = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg border border-white/10 min-w-[70px]">
        <span className="text-2xl font-black text-primary leading-tight">{value.toString().padStart(2, '0')}</span>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{label}</span>
    </div>
  );

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
            connect(ref);
            drag(ref);
            if (dragRef) {
                if (typeof dragRef === 'function') dragRef(ref);
                else dragRef.current = ref;
            }
        }
      }}
      className="p-6 text-center space-y-4"
    >
      {title && <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>}
      <div className="flex justify-center gap-3">
        <TimeBlock value={timeLeft.days} label="Days" />
        <TimeBlock value={timeLeft.hours} label="Hours" />
        <TimeBlock value={timeLeft.minutes} label="Mins" />
        <TimeBlock value={timeLeft.seconds} label="Secs" />
      </div>
    </div>
  );
};

import { CountdownSettings } from './CountdownSettings';

Countdown.craft = {
  displayName: 'Countdown Timer',
  props: {
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days from now
    title: 'Limited Time Offer Ends In:',
  },
  related: {
    settings: CountdownSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  direction: 'inbound' | 'outbound';
  sentAt: string;
}

export function MessageBubble({ content, direction, sentAt }: MessageBubbleProps) {
  const isOutbound = direction === 'outbound';

  return (
    <div className={cn(
      "flex w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-[12px] px-[14px] py-[10px] relative transition-all group",
        isOutbound 
          ? "bg-[#2563eb]/14 border border-[#2563eb]/20 text-[#eef2ff] rounded-tr-sm" 
          : "bg-white/5 border border-white/10 text-[#eef2ff] rounded-tl-sm backdrop-blur-md"
      )}>
        <p className="text-[13.5px] leading-relaxed font-dm-sans">
          {content}
        </p>
        <div className={cn(
          "flex items-center gap-1.5 mt-2",
          isOutbound ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] font-medium text-[#4a5a82] uppercase tracking-[0.5px] font-space-grotesk">
            {format(new Date(sentAt), 'hh:mm a')}
          </span>
          {isOutbound && (
            <div className="flex items-center text-[#2563eb]">
              <Check className="w-2.5 h-2.5" />
              <Check className="w-2.5 h-2.5 -ml-1.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

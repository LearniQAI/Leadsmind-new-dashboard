'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  direction: 'inbound' | 'outbound';
  sentAt: string;
  status?: string;
  errorMessage?: string;
}

export function MessageBubble({ content, direction, sentAt, status = 'sent', errorMessage }: MessageBubbleProps) {
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
          {isOutbound && status === 'pending' && (
            <div className="flex items-center text-[#4a5a82]">
               <i className="fa-regular fa-clock text-[10px]"></i>
            </div>
          )}
          {isOutbound && status === 'sent' && (
            <div className="flex items-center text-[#2563eb]">
              <Check className="w-2.5 h-2.5" />
            </div>
          )}
          {isOutbound && status === 'delivered' && (
            <div className="flex items-center text-[#10b981]">
              <Check className="w-2.5 h-2.5" />
              <Check className="w-2.5 h-2.5 -ml-1.5" />
            </div>
          )}
          {isOutbound && status === 'failed' && (
            <div className="flex items-center text-red-500">
               <i className="fa-solid fa-circle-exclamation text-[10px]"></i>
            </div>
          )}
        </div>
        {isOutbound && status === 'failed' && errorMessage && (
           <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20 font-space-grotesk">
              Error: {errorMessage}
           </div>
        )}
      </div>
    </div>
  );
}

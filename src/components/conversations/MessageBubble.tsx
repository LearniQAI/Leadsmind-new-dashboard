'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  direction: 'inbound' | 'outbound' | 'note';
  sentAt: string;
  status?: string;
  errorMessage?: string;
  platform?: string;
  metadata?: {
    media_url?: string;
    media_type?: string;
    provider_message_id?: string;
  };
}

export function MessageBubble({ content, direction, sentAt, status = 'sent', errorMessage, platform, metadata }: MessageBubbleProps) {
  if (direction === 'note') {
    return (
      <div className="flex w-full mb-6 justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] w-full rounded-xl px-4 py-3 bg-amber-500/5 border border-amber-500/20 text-[#eef2ff] backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-amber-500/10 text-amber-400">
            <i className="fa-solid fa-lock text-[10px]"></i>
            <span className="text-[9px] font-black uppercase tracking-widest font-space-grotesk">INTERNAL NOTE</span>
            <span className="text-[9px] text-[#4a5a82] font-semibold ml-auto font-space-grotesk">
              {format(new Date(sentAt), 'hh:mm a')}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed font-dm-sans text-amber-200/90">
            {content}
          </p>
        </div>
      </div>
    );
  }

  const isOutbound = direction === 'outbound';
  const mediaUrl = metadata?.media_url;
  const mediaType = metadata?.media_type || '';

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
        {/* Media Rendering */}
        {mediaUrl && (
          <div className="mb-2 max-w-full overflow-hidden rounded-lg border border-white/10 bg-black/20">
            {mediaType.startsWith('image/') && (
              <img src={mediaUrl} alt="Received media" className="max-h-[240px] w-full object-cover" />
            )}
            {mediaType.startsWith('video/') && (
              <video src={mediaUrl} controls className="max-h-[240px] w-full" />
            )}
            {mediaType.startsWith('audio/') && (
              <audio src={mediaUrl} controls className="w-full p-2" />
            )}
            {!mediaType.startsWith('image/') && !mediaType.startsWith('video/') && !mediaType.startsWith('audio/') && (
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2.5 p-3 text-xs font-bold text-[#3b82f6] hover:underline"
              >
                <i className="fa-solid fa-file-arrow-down text-lg"></i>
                <span>Download Attachment ({mediaType.split('/')[1]?.toUpperCase() || 'File'})</span>
              </a>
            )}
          </div>
        )}

        {content && content !== '[Attachment/Media]' && (
          <p className="text-[13.5px] leading-relaxed font-dm-sans">
            {content}
          </p>
        )}
        <div className={cn(
          "flex items-center gap-2.5 mt-2",
          isOutbound ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] font-medium text-[#4a5a82] uppercase tracking-[0.5px] font-space-grotesk">
            {format(new Date(sentAt), 'hh:mm a')}
          </span>
          {platform && (
            <span className="text-[9px] font-bold text-accent2 uppercase flex items-center gap-1 shrink-0 select-none">
              {platform === 'email' && <i className="fa-solid fa-envelope text-[9px] text-[#3b82f6]"></i>}
              {platform === 'whatsapp' && <i className="fa-brands fa-whatsapp text-[10px] text-[#25d366]"></i>}
              {platform === 'sms' && <i className="fa-solid fa-comment-dots text-[9px] text-[#10b981]"></i>}
              {platform === 'facebook' && <i className="fa-brands fa-facebook-messenger text-[9px] text-[#3b82f6]"></i>}
              {platform === 'instagram' && <i className="fa-brands fa-instagram text-[10px] text-[#ec4899]"></i>}
              {platform}
            </span>
          )}
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
          {isOutbound && status === 'read' && (
            <div className="flex items-center text-[#3b82f6]">
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

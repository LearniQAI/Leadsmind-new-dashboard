'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, Lock, FileDown, Mail, MessageCircle, Clock, AlertCircle } from 'lucide-react';
import { Instagram } from '@/components/icons/BrandIcons';

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
      <div className="flex w-full mb-6 justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <div className="max-w-[85%] w-full rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 !text-dash-text">
          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-amber-200 text-amber-600">
            <Lock className="w-2.5 h-2.5" />
            <span className="text-[9px] font-bold">Internal note</span>
            <span className="text-[9px] !text-dash-textMuted font-semibold ml-auto">
              {format(new Date(sentAt), 'hh:mm a')}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-amber-700">
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
      "flex w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-[12px] px-[14px] py-[10px] relative transition-all motion-reduce:transition-none group",
        isOutbound
          ? "bg-dash-accent/10 border border-dash-accent/20 !text-dash-text rounded-tr-sm"
          : "bg-dash-surface border border-dash-border !text-dash-text rounded-tl-sm"
      )}>
        {/* Media Rendering */}
        {mediaUrl && (
          <div className="mb-2 max-w-full overflow-hidden rounded-lg border border-dash-border bg-dash-surface">
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
                className="flex items-center gap-2.5 p-3 text-xs font-bold text-dash-accent hover:underline"
              >
                <FileDown className="w-4 h-4" />
                <span>Download attachment ({mediaType.split('/')[1]?.toUpperCase() || 'File'})</span>
              </a>
            )}
          </div>
        )}

        {content && content !== '[Attachment/Media]' && (
          <p className="text-[13.5px] leading-relaxed">
            {content}
          </p>
        )}
        <div className={cn(
          "flex items-center gap-2.5 mt-2",
          isOutbound ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] font-medium !text-dash-textMuted">
            {format(new Date(sentAt), 'hh:mm a')}
          </span>
          {platform && (
            <span className="text-[9px] font-bold text-dash-accent uppercase flex items-center gap-1 shrink-0 select-none">
              {platform === 'email' && <Mail className="w-2.5 h-2.5" />}
              {platform === 'whatsapp' && <MessageCircle className="w-2.5 h-2.5 text-green" />}
              {platform === 'sms' && <MessageCircle className="w-2.5 h-2.5" />}
              {platform === 'facebook' && <MessageCircle className="w-2.5 h-2.5" />}
              {platform === 'instagram' && <Instagram className="w-2.5 h-2.5" />}
              {platform}
            </span>
          )}
          {isOutbound && status === 'pending' && (
            <div className="flex items-center !text-dash-textMuted">
               <Clock className="w-2.5 h-2.5" />
            </div>
          )}
          {isOutbound && status === 'sent' && (
            <div className="flex items-center text-dash-accent">
              <Check className="w-2.5 h-2.5" />
            </div>
          )}
          {isOutbound && status === 'delivered' && (
            <div className="flex items-center text-green">
              <Check className="w-2.5 h-2.5" />
              <Check className="w-2.5 h-2.5 -ml-1.5" />
            </div>
          )}
          {isOutbound && status === 'read' && (
            <div className="flex items-center text-dash-accent">
              <Check className="w-2.5 h-2.5" />
              <Check className="w-2.5 h-2.5 -ml-1.5" />
            </div>
          )}
          {isOutbound && status === 'failed' && (
            <div className="flex items-center text-red">
               <AlertCircle className="w-2.5 h-2.5" />
            </div>
          )}
        </div>
        {isOutbound && status === 'failed' && errorMessage && (
           <div className="mt-2 text-[10px] text-red bg-red/10 p-1.5 rounded border border-red/20">
              Error: {errorMessage}
           </div>
        )}
      </div>
    </div>
  );
}

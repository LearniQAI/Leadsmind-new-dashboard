'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, Lock, FileDown, Clock, AlertCircle } from 'lucide-react';

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
  /** Cluster position within a run of same-direction, same-platform messages sent close together. */
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

const FULL_RADIUS = 20;
const TIGHT_RADIUS = 6;

export function MessageBubble({
  content,
  direction,
  sentAt,
  status = 'sent',
  errorMessage,
  metadata,
  isFirstInGroup = true,
  isLastInGroup = true,
}: MessageBubbleProps) {
  if (direction === 'note') {
    return (
      <div className="flex w-full mb-3 justify-center animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
        <div className="max-w-[85%] w-full rounded-2xl px-4 py-3 bg-[#FFFBEA] border border-[#F5E9B8] text-black">
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[#F5E9B8] text-[#B45309]">
            <Lock className="w-2.5 h-2.5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Internal note</span>
            <span className="text-[9px] text-[#8E8E8E] font-medium ml-auto">
              {format(new Date(sentAt), 'hh:mm a')}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-black">
            {content}
          </p>
        </div>
      </div>
    );
  }

  const isOutbound = direction === 'outbound';
  const mediaUrl = metadata?.media_url;
  const mediaType = metadata?.media_type || '';

  // Cluster corner shaping — the tail-side corners (right for outbound, left
  // for inbound) collapse to a tight radius wherever this bubble connects to
  // a neighbor in the same cluster, so consecutive messages read as one
  // continuous shape (iMessage/Instagram grouping), not stacked cards.
  const tailTopRadius = isFirstInGroup ? FULL_RADIUS : TIGHT_RADIUS;
  const tailBottomRadius = isLastInGroup ? FULL_RADIUS : TIGHT_RADIUS;
  const bubbleRadius: React.CSSProperties = isOutbound
    ? {
        borderTopLeftRadius: FULL_RADIUS,
        borderBottomLeftRadius: FULL_RADIUS,
        borderTopRightRadius: tailTopRadius,
        borderBottomRightRadius: tailBottomRadius,
      }
    : {
        borderTopRightRadius: FULL_RADIUS,
        borderBottomRightRadius: FULL_RADIUS,
        borderTopLeftRadius: tailTopRadius,
        borderBottomLeftRadius: tailBottomRadius,
      };

  return (
    <div
      className={cn(
        "group flex w-full animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none",
        isOutbound ? "justify-end" : "justify-start",
        isLastInGroup ? "mb-3" : "mb-[3px]"
      )}
    >
      <div
        style={bubbleRadius}
        className={cn(
          "max-w-[70%] sm:max-w-[65%] px-4 py-[9px] relative",
          isOutbound ? "bg-[#3797F0] !text-white" : "bg-[#EFEFEF] !text-black"
        )}
      >
        {/* Media Rendering */}
        {mediaUrl && (
          <div className={cn(
            "mb-2 max-w-full overflow-hidden rounded-2xl",
            isOutbound ? "bg-white/10" : "bg-white"
          )}>
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
                className={cn(
                  "flex items-center gap-2.5 p-3 text-xs font-semibold hover:underline",
                  isOutbound ? "text-white" : "text-black"
                )}
              >
                <FileDown className="w-4 h-4" />
                <span>Download attachment ({mediaType.split('/')[1]?.toUpperCase() || 'File'})</span>
              </a>
            )}
          </div>
        )}

        {content && content !== '[Attachment/Media]' && (
          <p className={cn(
            "text-[14.5px] leading-[1.35] whitespace-pre-wrap break-words",
            isOutbound ? "!text-white" : "!text-black"
          )}>
            {content}
          </p>
        )}

        {isOutbound && status === 'failed' && errorMessage && (
          <div className="mt-2 text-[10px] text-red bg-white/95 p-1.5 rounded-lg border border-red/20">
            Error: {errorMessage}
          </div>
        )}

        {/* Timestamp — hover-only, plain small grey text directly under the
            hovered bubble, never docked permanently and never a tooltip. */}
        <div className={cn(
          "flex items-center gap-1 overflow-hidden max-h-0 opacity-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-1 transition-all motion-reduce:transition-none",
          isOutbound ? "justify-end" : "justify-start"
        )}>
          <span className={cn("text-[10.5px] whitespace-nowrap", isOutbound ? "text-white/80" : "text-[#8E8E8E]")}>
            {format(new Date(sentAt), 'hh:mm a')}
          </span>
          {isOutbound && isLastInGroup && status === 'pending' && (
            <Clock className="w-2.5 h-2.5 text-white/80" />
          )}
          {isOutbound && isLastInGroup && (status === 'sent' || status === 'delivered' || status === 'read') && (
            <span className="flex items-center text-white/80">
              <Check className="w-2.5 h-2.5" />
              {(status === 'delivered' || status === 'read') && <Check className="w-2.5 h-2.5 -ml-1.5" />}
            </span>
          )}
          {isOutbound && status === 'failed' && (
            <AlertCircle className="w-2.5 h-2.5 text-red" />
          )}
        </div>
      </div>
    </div>
  );
}

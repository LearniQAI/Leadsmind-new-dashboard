'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, Lock, FileDown, Clock, AlertCircle, Loader2, RotateCcw } from 'lucide-react';

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
    attempts?: number;
  };
  /** Cluster position within a run of same-direction, same-platform messages sent close together. */
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  /** Present only for a failed outbound message — re-dispatches the same text via the
   *  same idempotency key (no retype). */
  onRetry?: () => void;
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
  onRetry,
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

  // Outbound delivery state (Message Delivery Reliability Part 3).
  //  - in flight (queued/sending): the bubble is a lighter brand tint so the agent
  //    can see it hasn't fully left yet, with a small persistent spinner.
  //  - sent/delivered/read: solid brand, quiet — tick only on hover.
  //  - retrying: same light tint + a calm amber "Retrying…" line (NOT red — an
  //    automatic retry is in progress, nothing for the agent to do yet).
  //  - failed: red-outlined white bubble, the text stays put, the reason shows,
  //    and a one-tap Retry re-sends the same text.
  // Instagram never reaches 'delivered' (no delivery webhook) — the status value
  // itself encodes that, so no per-platform branching is needed here.
  const inFlight = isOutbound && (status === 'queued' || status === 'sending' || status === 'pending');
  const isRetrying = isOutbound && status === 'retrying';
  const isFailed = isOutbound && status === 'failed';
  const isSettled = isOutbound && (status === 'sent' || status === 'delivered' || status === 'read');

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
          "max-w-[70%] sm:max-w-[65%] px-4 py-[9px] relative transition-colors motion-reduce:transition-none",
          !isOutbound && "bg-[#EFEFEF] !text-black",
          isOutbound && isFailed && "bg-white border border-red/60 !text-black",
          isOutbound && (inFlight || isRetrying) && "bg-[#3797F0]/55 !text-white",
          isOutbound && (isSettled || (!isFailed && !inFlight && !isRetrying)) && "bg-[#3797F0] !text-white"
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

        {/* Retrying — calm amber, no call to action (the system is handling it). */}
        {isRetrying && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-medium text-white/90">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            <span>
              Retrying{typeof metadata?.attempts === 'number' && metadata.attempts > 1 ? ` (attempt ${metadata.attempts})` : ''}…
            </span>
          </div>
        )}

        {/* Failed — text stays visible above; here we show the reason + one-tap Retry. */}
        {isFailed && (
          <div className="mt-2 rounded-lg border border-red/25 bg-red/5 p-1.5">
            <div className="flex items-start gap-1.5 text-[10.5px] text-red">
              <AlertCircle className="w-2.5 h-2.5 mt-[1px] shrink-0" />
              <span className="leading-snug">{errorMessage || 'Failed to deliver'}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-red/10 hover:bg-red/20 text-red font-semibold text-[10.5px] px-2 py-[3px] transition-colors motion-reduce:transition-none"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Persistent "Sending…" affordance — the agent must see the click
            registered (PRD user story), so this is NOT hover-gated. */}
        {inFlight && (
          <div className="mt-1 flex items-center gap-1 justify-end text-[10px] text-white/85">
            <Loader2 className="w-2.5 h-2.5 animate-spin motion-reduce:animate-none" />
            <span>Sending…</span>
          </div>
        )}

        {/* Timestamp + settled ticks — hover-only, plain small text directly under
            the hovered bubble, never docked permanently and never a tooltip. */}
        <div className={cn(
          "flex items-center gap-1 overflow-hidden max-h-0 opacity-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-1 transition-all motion-reduce:transition-none",
          isOutbound ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10.5px] whitespace-nowrap",
            !isOutbound || isFailed ? "text-[#8E8E8E]" : "text-white/80"
          )}>
            {format(new Date(sentAt), 'hh:mm a')}
          </span>
          {/* Quiet delivery ticks: one check for 'sent', two for 'delivered'/'read'.
              Instagram tops out at one check ('sent') then jumps to two on 'read'. */}
          {isSettled && isLastInGroup && (
            <span className="flex items-center text-white/80">
              <Check className="w-2.5 h-2.5" />
              {(status === 'delivered' || status === 'read') && <Check className="w-2.5 h-2.5 -ml-1.5" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

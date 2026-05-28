'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, FileAudio, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarImage } from './AvatarImage';
import { VoiceNotePlayer } from './VoiceNotePlayer';

export interface VoiceNoteSender {
  id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_photo_url?: string | null;
  avatar_preset_id?: string | null;
  job_title?: string | null;
  identity_color?: string | null;
  email?: string | null;
}

interface VoiceNoteCardProps {
  sender?: VoiceNoteSender;
  createdAt: string | Date;
  deliveryChannel?: string; // 'internal' | 'whatsapp' | 'email' | 'sms' etc.
  audioUrl?: string;
  audioDuration?: number;
  caption?: string | null;
  transcript?: string | null;
  theme?: 'light' | 'dark'; // 'light' uses QA specs; 'dark' integrates with dark mode UI
  className?: string;
}

export function VoiceNoteCard({
  sender,
  createdAt,
  deliveryChannel = 'internal',
  audioUrl,
  audioDuration,
  caption,
  transcript,
  theme = 'dark',
  className
}: VoiceNoteCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  // Compute initials and background color for avatar fallback
  const firstName = sender?.first_name || '';
  const lastName = sender?.last_name || '';
  const fullName = sender?.full_name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : null) || 'LM User';
  
  const initials = firstName && lastName 
    ? `${firstName[0]}${lastName[0]}` 
    : fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'LM';

  const avatarBg = sender?.identity_color || '#3b82f6';
  
  // Format relative timestamp
  let relativeTime = '';
  try {
    relativeTime = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  } catch (e) {
    relativeTime = 'just now';
  }

  // Format delivery channel badge
  const isInternal = !deliveryChannel || deliveryChannel.toLowerCase() === 'internal';
  const isDark = theme === 'dark';

  // Render channel badge text according to spec
  const renderChannelBadge = () => {
    if (isInternal) return null;
    const channel = deliveryChannel.toLowerCase();
    if (channel === 'email') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-[#E1F5EE] text-[#0F6E56] shrink-0">
          ✉ Sent to client
        </span>
      );
    }
    if (channel === 'whatsapp') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-[#E1F5EE] text-[#0F6E56] shrink-0">
          💬 WhatsApp
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-[#E1F5EE] text-[#0F6E56] shrink-0 capitalize">
        {deliveryChannel}
      </span>
    );
  };

  // Determine styles dynamically based on light/dark theme
  const cardBgClass = isDark 
    ? "bg-[#080f28]/60 border border-white/5 backdrop-blur-xl shadow-inner text-white" 
    : "bg-white border border-slate-200/80 shadow-sm text-[#1A1A1A]";

  // Strict color requirements from the PRD
  const nameColor = isDark
    ? (isInternal ? '#a78bfa' : '#ffffff') // Light Purple vs White
    : (isInternal ? '#5C4AC7' : '#1A1A1A'); // Brand Purple vs Dark

  return (
    <div className={cn(
      "w-full rounded-2xl p-4 transition-all duration-300 flex flex-col gap-3 font-dm-sans",
      cardBgClass,
      className
    )}>
      {/* Top Section: Flex layout with Identity on Left and Player on Right */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
        
        {/* Left Side: Flex Identity Column Layout (Fixed Width Setup) */}
        <div className="vn-identity flex items-center shrink-0" style={{ width: '220px', marginRight: '12px' }}>
          {/* Custom 40x40px circle-cropped AvatarImage */}
          <AvatarImage
            src={sender?.profile_photo_url}
            emailPresetUrl={sender?.avatar_preset_id ? `/assets/presets/${sender.avatar_preset_id}.png` : null}
            initials={initials}
            bgColor={avatarBg}
            size={40}
            shape="circle"
            className="border-slate-200/50 shadow-inner"
          />

          {/* Text alignment block stacking User's Full Name & Dynamic timestamp */}
          <div className="flex flex-col min-w-0" style={{ marginLeft: '12px' }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="truncate leading-snug"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: nameColor,
                }}
              >
                {fullName}
              </span>
              
              {/* Optional Variable Indicator Badge */}
              {renderChannelBadge()}
            </div>
            
            {/* Job title rendered only on client-facing notes (12px, lighter grey) */}
            {!isInternal && sender?.job_title ? (
              <span 
                className="truncate mt-0.5"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 400,
                  fontSize: '12px',
                  color: isDark ? 'var(--t3)' : '#888888',
                }}
              >
                {sender.job_title}
              </span>
            ) : null}

            {/* Time Indicator */}
            <span 
              className="truncate mt-0.5"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontWeight: 400,
                fontSize: '11px',
                color: isDark ? 'var(--t3)' : '#AAAAAA',
              }}
            >
              {relativeTime}
            </span>
          </div>
        </div>

        {/* Right Side: Player Window Integration (Fills remaining container layout) */}
        <div className="vn-player flex-1 w-full min-w-0" style={{ marginTop: '8px' }}>
          <VoiceNotePlayer audioUrl={audioUrl} duration={audioDuration} theme={theme} />
        </div>
      </div>

      {/* Caption Section: strict left layout indentation buffer (margin-left: 52px) */}
      {caption && (
        <div className="ml-[52px]">
          <p 
            className="leading-relaxed whitespace-pre-wrap"
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '13px',
              color: isDark ? 'var(--t2)' : '#555555',
              fontStyle: 'italic',
            }}
          >
            "{caption}"
          </p>
        </div>
      )}

      {/* Whisper Transcript Block & User Controls */}
      {transcript && (
        <div className={cn(
          "ml-[52px] border-t pt-2 flex flex-col gap-2",
          isDark ? "border-white/5" : "border-slate-100"
        )}>
          {/* Toggle Controls */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-1.5 text-[11.5px] font-bold transition-colors self-start cursor-pointer focus:outline-none"
            style={{ color: isDark ? 'var(--accent2)' : '#5C4AC7' }}
          >
            <Sparkles className="w-3.5 h-3.5 fill-blue-50/50" />
            <span>{showTranscript ? 'Hide AI Transcript' : 'Show AI Transcript'}</span>
            {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Revealable Whisper Transcript Text */}
          {showTranscript && (
            <div className={cn(
              "border rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200",
              isDark 
                ? "bg-white/[0.01] border-white/5 text-t2" 
                : "bg-[#f8fafc] border-slate-100 text-[#666666]"
            )}>
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0F6E56]">
                <FileAudio className="w-3.5 h-3.5" />
                <span>Whisper Audio Transcript</span>
              </div>
              <p 
                className="leading-relaxed font-normal italic whitespace-pre-wrap"
                style={{
                  fontSize: '12px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                "{transcript}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reactions & Reply Action Blocks (Addendum Requirements) */}
      <div className={cn(
        "ml-[52px] flex items-center justify-between border-t pt-2 mt-1",
        isDark ? "border-white/5" : "border-slate-100"
      )}>
        {/* Social Interactions: 24px emoji trigger controls laid out horizontally separated by 6px margins */}
        <div className="flex items-center">
          {['👍', '❤️', '🔥', '👏'].map((emoji, index) => (
            <button
              key={index}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded transition-colors text-[14px]",
                isDark ? "hover:bg-white/5 text-t2" : "hover:bg-slate-100 text-[#1A1A1A]"
              )}
              style={{ marginRight: index < 3 ? '6px' : '0px' }}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Reply Links: 12px interactive action triggers supporting instant contextual text or audio responses */}
        <div className="flex items-center gap-3">
          <button 
            className="font-bold hover:underline bg-transparent border-none cursor-pointer"
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '12px',
              color: isDark ? 'var(--accent2)' : '#5C4AC7',
            }}
          >
            Reply with Text
          </button>
          <span className={isDark ? "text-white/20 text-[12px]" : "text-slate-300 text-[12px]"}>•</span>
          <button 
            className="font-bold hover:underline bg-transparent border-none cursor-pointer"
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '12px',
              color: isDark ? 'var(--accent2)' : '#5C4AC7',
            }}
          >
            Reply with Audio
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceNoteCard;

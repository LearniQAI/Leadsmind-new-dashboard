'use client';

import React, { useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { cn } from '@/lib/utils';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';
import { sendInternalNote } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Info, Circle, AlertTriangle, AlertCircle, Clock, Check } from 'lucide-react';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { getPlatformMeta, PlatformBadge } from './platformMeta';
import { format, isToday, isYesterday } from 'date-fns';

interface ConversationThreadProps {
  conversation: any;
  onSendMessage: (text: string, targetConvId: string, audioUrl?: string, transcript?: string, clientMessageUuid?: string) => void;
  isSending: boolean;
  onTogglePanel?: () => void;
  onBack?: () => void;
}

const GROUP_WINDOW_MS = 3 * 60 * 1000; // messages within 3 min of each other, same direction/platform, cluster together

function dateDividerLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

export function ConversationThread({ conversation, onSendMessage, isSending, onTogglePanel, onBack }: ConversationThreadProps) {
  const router = useRouter();
  const [isNoteSending, setIsNoteSending] = useState(false);
  const availablePlatforms = conversation?.availablePlatforms || [];

  // Default reply platform: the platform of the latest message, or the first available platform
  const latestMsgPlatform = conversation?.messages?.[conversation.messages.length - 1]?.platform;
  const initialPlatform = availablePlatforms.some((p: any) => p.platform === latestMsgPlatform)
    ? latestMsgPlatform
    : (availablePlatforms[0]?.platform || conversation?.platform || 'email');

  const [selectedPlatform, setSelectedPlatform] = useState<string>(initialPlatform);

  // Sync selected platform on conversation shift
  React.useEffect(() => {
    if (conversation) {
      const latest = conversation.messages?.[conversation.messages.length - 1]?.platform;
      const initial = conversation.availablePlatforms?.some((p: any) => p.platform === latest)
        ? latest
        : (conversation.availablePlatforms?.[0]?.platform || conversation.platform || 'email');
      setSelectedPlatform(initial);
    }
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white">
        <DashEmptyState
          icon={Inbox}
          title="Select a thread"
          description="Your unified communications hub. Pick a conversation on the left to view its full message history."
        />
      </div>
    );
  }

  // Compute WhatsApp 24-Hour window closed status
  const customerMsgs = conversation.messages?.filter((m: any) => m.direction === 'inbound') || [];
  const lastCustomerMsg = customerMsgs[customerMsgs.length - 1];
  const lastCustomerMsgAt = conversation.last_customer_message_at || lastCustomerMsg?.sent_at;

  let isWhatsAppWindowClosed = false;
  let windowTimeRemainingText = '';
  if (selectedPlatform === 'whatsapp') {
    if (lastCustomerMsgAt) {
      const diffMs = Date.now() - new Date(lastCustomerMsgAt).getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      isWhatsAppWindowClosed = diffMs > twentyFourHoursMs;
      if (!isWhatsAppWindowClosed) {
        const remainingMs = twentyFourHoursMs - diffMs;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        windowTimeRemainingText = `${remainingHours}h ${remainingMins}m left`;
      }
    } else {
      isWhatsAppWindowClosed = true;
    }
  }

  // Compute SLA status (15 minutes breach threshold for inbound messages)
  const sortedMsgsForSLA = conversation.messages?.slice().sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) || [];
  const latestMsgForSLA = sortedMsgsForSLA[sortedMsgsForSLA.length - 1];

  let slaStatus: 'inactive' | 'met' | 'breached' | 'pending' = 'inactive';
  let slaText = '';
  if (latestMsgForSLA) {
    if (latestMsgForSLA.direction === 'inbound') {
      const diffMins = Math.floor((Date.now() - new Date(latestMsgForSLA.sent_at).getTime()) / (1000 * 60));
      if (diffMins > 15) {
        slaStatus = 'breached';
        slaText = `Breached by ${diffMins - 15}m`;
      } else {
        slaStatus = 'pending';
        slaText = `${15 - diffMins}m left`;
      }
    } else {
      slaStatus = 'met';
      slaText = 'Met';
    }
  }

  const headerMeta = getPlatformMeta(selectedPlatform);
  const contactName = conversation.contacts ? `${conversation.contacts.first_name} ${conversation.contacts.last_name || ''}`.trim() : conversation.title;

  // Ascending-chronological pass to compute cluster/date-divider metadata, then
  // reverse for the flex-col-reverse render below (keeps the CSS auto-scroll-to-
  // bottom trick while still letting us look at "previous"/"next" message).
  const ascending = conversation.messages?.slice().sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) || [];
  const withMeta = ascending.map((msg: any, idx: number) => {
    const prev = ascending[idx - 1];
    const next = ascending[idx + 1];
    const sameClusterAsPrev = prev
      && prev.direction === msg.direction
      && (prev.platform || conversation.platform) === (msg.platform || conversation.platform)
      && new Date(msg.sent_at).getTime() - new Date(prev.sent_at).getTime() < GROUP_WINDOW_MS
      && !prev.audio_url && !msg.audio_url;
    const sameClusterAsNext = next
      && next.direction === msg.direction
      && (next.platform || conversation.platform) === (msg.platform || conversation.platform)
      && new Date(next.sent_at).getTime() - new Date(msg.sent_at).getTime() < GROUP_WINDOW_MS
      && !next.audio_url && !msg.audio_url;
    return {
      ...msg,
      isFirstInGroup: !sameClusterAsPrev,
      isLastInGroup: !sameClusterAsNext,
      showDateDivider: !prev ? true : dateDividerLabel(new Date(msg.sent_at)) !== dateDividerLabel(new Date(prev.sent_at)),
    };
  });
  const descending = withMeta.slice().reverse();

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Header — minimal, floats over the message area with a barely-visible hairline */}
      <div className="h-[60px] border-b border-[#EFEFEF] flex items-center justify-between px-4 sm:px-6 z-10 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-[#8E8E8E] hover:text-black hover:bg-[#FAFAFA] transition-colors motion-reduce:transition-none shrink-0"
              title="Back to threads"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#EFEFEF] flex items-center justify-center text-black font-semibold text-[12px] overflow-hidden">
              {conversation.contacts?.avatar_url ? (
                <img src={conversation.contacts.avatar_url} alt={contactName || 'Contact avatar'} className="w-full h-full object-cover" />
              ) : (
                (contactName?.[0] || 'U').toUpperCase()
              )}
            </div>
            <PlatformBadge platform={selectedPlatform} size={14} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-black tracking-tight truncate leading-tight">
              {contactName || 'Unknown contact'}
            </h3>
            <span className="text-[13px] text-[#8E8E8E] whitespace-nowrap">
              {headerMeta.label}
            </span>
          </div>
        </div>

        {/* Compliance and SLA Badges — muted, no alarm-red */}
        <div className="flex items-center gap-2 shrink-0">
          {/* WhatsApp compliance status */}
          {selectedPlatform === 'whatsapp' && (
            <>
              {!isWhatsAppWindowClosed ? (
                <span className="hidden sm:flex px-2 py-1 rounded-full bg-green/10 text-green text-[10.5px] font-medium items-center gap-1">
                  <Circle className="w-1 h-1 fill-current" />
                  24h open ({windowTimeRemainingText})
                </span>
              ) : (
                <span className="hidden sm:flex px-2 py-1 rounded-full bg-[#FFF4E5] text-[#B45309] text-[10.5px] font-medium items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  24h closed
                </span>
              )}
            </>
          )}

          {/* SLA display */}
          {slaStatus === 'breached' && (
            <span className="hidden sm:flex px-2 py-1 rounded-full bg-[#FFF4E5] text-[#B45309] text-[10.5px] font-medium items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              SLA overdue ({slaText})
            </span>
          )}
          {slaStatus === 'pending' && (
            <span className="hidden sm:flex px-2 py-1 rounded-full bg-[#FFF4E5] text-[#B45309] text-[10.5px] font-medium items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              SLA due ({slaText})
            </span>
          )}
          {slaStatus === 'met' && (
            <span className="hidden sm:flex px-2 py-1 rounded-full bg-green/10 text-green text-[10.5px] font-medium items-center gap-1">
              <Check className="w-2.5 h-2.5" />
              SLA met
            </span>
          )}

          {/* Toggle Panel Button — the one real, functional header action */}
          <button
            onClick={onTogglePanel}
            className="w-8 h-8 rounded-full hover:bg-[#FAFAFA] flex items-center justify-center text-[#8E8E8E] hover:text-black transition-all motion-reduce:transition-none shrink-0"
            title="Toggle contact panel"
          >
            <Info className="w-[17px] h-[17px]" />
          </button>
        </div>
      </div>

      {/* Messages List — flat white canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 z-10 common-scrollbar flex flex-col-reverse gap-0.5 bg-white">
        {descending.map((msg: any, i: number) => {
          const isVoice = msg.audio_url || msg.import_type === 'voice';
          const msgPlatform = msg.platform || conversation.platform;

          const dateDivider = msg.showDateDivider && (
            <div key={`divider-${msg.id || i}`} className="flex justify-center my-4">
              <span className="text-[12px] text-[#8E8E8E] font-normal">
                {dateDividerLabel(new Date(msg.sent_at))}
              </span>
            </div>
          );

          if (isVoice) {
            return (
              <React.Fragment key={msg.id || i}>
                <div className={cn(
                  "flex w-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none",
                  msg.direction === 'outbound' ? "justify-end" : "justify-start"
                )}>
                  <div className="max-w-[85%] w-full">
                    <VoiceNoteCard
                      sender={msg.direction === 'outbound' ? {
                        first_name: "You",
                        full_name: "You",
                        profile_photo_url: null,
                        job_title: "Workspace Member",
                        identity_color: "#2563eb"
                      } : {
                        first_name: conversation.contacts?.first_name || "Contact",
                        last_name: conversation.contacts?.last_name || "",
                        full_name: conversation.contacts ? `${conversation.contacts.first_name} ${conversation.contacts.last_name}` : "Client",
                        profile_photo_url: conversation.contacts?.profile_photo_url || null,
                        job_title: "Client / Lead",
                        identity_color: "#06b6d4"
                      }}
                      createdAt={msg.sent_at}
                      deliveryChannel={msg.delivery_channel || msgPlatform || 'whatsapp'}
                      audioUrl={msg.audio_url}
                      caption={msg.content}
                      transcript={msg.transcript || msg.original_text}
                      theme="dark"
                    />
                  </div>
                </div>
                {dateDivider}
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={msg.id || i}>
              <MessageBubble
                content={msg.content}
                direction={msg.direction}
                sentAt={msg.sent_at}
                status={msg.status}
                errorMessage={msg.metadata?.error_message || msg.error_message}
                platform={msgPlatform}
                metadata={msg.metadata}
                isFirstInGroup={msg.isFirstInGroup}
                isLastInGroup={msg.isLastInGroup}
              />
              {dateDivider}
            </React.Fragment>
          );
        })}
      </div>

      {/* Input Area */}
      <MessageInput
        onSend={async (text, isNote, audioUrl, transcript, clientMessageUuid) => {
          if (isNote) {
            setIsNoteSending(true);
            const res = await sendInternalNote(conversation.id, text, 'Agent');
            if (res.error) {
              toast.error(res.error);
            } else {
              toast.success('Internal note saved.');
              router.refresh();
            }
            setIsNoteSending(false);
          } else {
            const target = availablePlatforms.find((p: any) => p.platform === selectedPlatform) || availablePlatforms[0];
            onSendMessage(text, target?.conversationId || conversation.id, audioUrl, transcript, clientMessageUuid);
          }
        }}
        disabled={isSending || isNoteSending}
        placeholder={selectedPlatform === 'sms' ? "Reply via SMS Bridge..." : `Type your reply via ${getPlatformMeta(selectedPlatform).label}...`}
        availablePlatforms={availablePlatforms}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        isWhatsAppWindowClosed={isWhatsAppWindowClosed}
      />
    </div>
  );
}

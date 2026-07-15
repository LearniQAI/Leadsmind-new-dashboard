'use client';

import React, { useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';
import { sendInternalNote } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Inbox, MessageCircle, Mail, MessageSquare, Info, Circle, AlertTriangle, AlertCircle, Clock, Check } from 'lucide-react';
import { Instagram } from '@/components/icons/BrandIcons';

interface ConversationThreadProps {
  conversation: any;
  onSendMessage: (text: string, targetConvId: string, audioUrl?: string, transcript?: string) => void;
  isSending: boolean;
  onTogglePanel?: () => void;
}

export function ConversationThread({ conversation, onSendMessage, isSending, onTogglePanel }: ConversationThreadProps) {
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
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
        <div className="w-24 h-24 bg-dash-accent/10 rounded-[2rem] flex items-center justify-center mb-8 relative z-10 rotate-12">
          <Inbox className="w-8 h-8 text-dash-accent" />
        </div>
        <h2 className="text-3xl font-bold !text-dash-text mb-4 relative z-10 tracking-tight">
          Select a <span className="text-dash-accent">thread</span>
        </h2>
        <p className="!text-dash-textMuted max-w-sm relative z-10 leading-relaxed text-[13.5px]">
          Your unified communications command center. Select a conversation to start dominating the conversation.
        </p>
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

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Header (h-14, clean, space-saving) */}
      <div className="h-14 border-b border-dash-border flex items-center justify-between px-6 z-10 bg-dash-surface/80 backdrop-blur-xl shrink-0 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-white flex items-center justify-center border border-dash-border">
            {selectedPlatform === 'sms' && <MessageCircle className="w-[13px] h-[13px] text-green" />}
            {selectedPlatform === 'email' && <Mail className="w-[13px] h-[13px] text-dash-accent" />}
            {selectedPlatform === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 text-green" />}
            {selectedPlatform === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
            {selectedPlatform === 'facebook' && <MessageCircle className="w-3.5 h-3.5 text-dash-accent" />}
            {!['sms', 'email', 'whatsapp', 'instagram', 'facebook'].includes(selectedPlatform) && (
              <MessageSquare className="w-[13px] h-[13px] text-dash-accent" />
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-bold !text-dash-text tracking-tight whitespace-nowrap">
              {conversation.contacts ? `${conversation.contacts.first_name} ${conversation.contacts.last_name}` : conversation.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-green animate-pulse motion-reduce:animate-none shrink-0" />
              <span className="text-[8px] !text-dash-textMuted font-bold whitespace-nowrap capitalize">
                {selectedPlatform}
              </span>
            </div>
          </div>
        </div>

        {/* Compliance and SLA Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* WhatsApp compliance status */}
          {selectedPlatform === 'whatsapp' && (
            <>
              {!isWhatsAppWindowClosed ? (
                <span className="px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20 text-[8px] font-bold flex items-center gap-1">
                  <Circle className="w-1 h-1 fill-current" />
                  24h open ({windowTimeRemainingText})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-red/10 text-red border border-red/20 text-[8px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-2 h-2" />
                  24h closed
                </span>
              )}
            </>
          )}

          {/* SLA display */}
          {slaStatus === 'breached' && (
            <span className="px-2 py-0.5 rounded-full bg-red/10 text-red border border-red/20 text-[8px] font-bold flex items-center gap-1 animate-pulse motion-reduce:animate-none">
              <AlertCircle className="w-2 h-2" />
              SLA overdue ({slaText})
            </span>
          )}
          {slaStatus === 'pending' && (
            <span className="px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-[8px] font-bold flex items-center gap-1">
              <Clock className="w-2 h-2" />
              SLA due ({slaText})
            </span>
          )}
          {slaStatus === 'met' && (
            <span className="px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20 text-[8px] font-bold flex items-center gap-1">
              <Check className="w-2 h-2" />
              SLA met
            </span>
          )}

          {/* Toggle Panel Button */}
          <button
            onClick={onTogglePanel}
            className="w-8 h-8 rounded-lg bg-dash-accent/10 border border-dash-accent/20 hover:bg-dash-accent/20 flex items-center justify-center text-dash-accent hover:text-dash-accent transition-all motion-reduce:transition-none ml-2 shrink-0"
            title="Toggle contact panel"
          >
            <Info className="w-[13px] h-[13px]" />
          </button>
        </div>
      </div>

      {/* Messages List (increased padding, reduced gap) */}
      <div className="flex-1 overflow-y-auto px-6 py-4 z-10 common-scrollbar flex flex-col-reverse gap-3">
          {conversation.messages?.slice().sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()).map((msg: any, i: number) => {
            const isVoice = msg.audio_url || msg.import_type === 'voice';
            const msgPlatform = msg.platform || conversation.platform;
            if (isVoice) {
              return (
                <div key={i} className={cn(
                  "flex w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
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
              );
            }
            return (
              <MessageBubble 
                key={i}
                content={msg.content}
                direction={msg.direction}
                sentAt={msg.sent_at}
                status={msg.status}
                errorMessage={msg.metadata?.error_message || msg.error_message}
                platform={msgPlatform}
                metadata={msg.metadata}
              />
            );
          })}
      </div>

      {/* Input Area */}
      <MessageInput 
        onSend={async (text, isNote, audioUrl, transcript) => {
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
            onSendMessage(text, target?.conversationId || conversation.id, audioUrl, transcript);
          }
        }}
        disabled={isSending || isNoteSending}
        placeholder={selectedPlatform === 'sms' ? "Reply via SMS Bridge..." : `Type your reply via ${selectedPlatform.toUpperCase()}...`}
        availablePlatforms={availablePlatforms}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        isWhatsAppWindowClosed={isWhatsAppWindowClosed}
      />
    </div>
  );
}

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

interface ConversationThreadProps {
  conversation: any;
  onSendMessage: (text: string, targetConvId: string) => void;
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#04091a]">
        <div className="w-24 h-24 bg-[#2563eb]/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-[#2563eb]/10 relative z-10 rotate-12">
          <i className="fa-solid fa-inbox text-[32px] text-[#2563eb]"></i>
        </div>
        <h2 className="text-3xl font-bold text-[#eef2ff] mb-4 relative z-10 tracking-tight font-space-grotesk">
          Select a <span className="text-[#3b82f6]">Thread</span>
        </h2>
        <p className="text-[#4a5a82] max-w-sm relative z-10 font-dm-sans leading-relaxed text-[13.5px]">
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
    <div className="flex-1 flex flex-col bg-[#04091a] relative overflow-hidden">
      {/* Header (h-14, clean, space-saving) */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 z-10 bg-[#080f28]/80 backdrop-blur-xl shrink-0 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
            {selectedPlatform === 'sms' && <i className="fa-solid fa-comment-dots text-[13px] text-[#10b981]"></i>}
            {selectedPlatform === 'email' && <i className="fa-solid fa-envelope text-[13px] text-[#3b82f6]"></i>}
            {selectedPlatform === 'whatsapp' && <i className="fa-brands fa-whatsapp text-[14px] text-[#25d366]"></i>}
            {selectedPlatform === 'instagram' && <i className="fa-brands fa-instagram text-[14px] text-[#ec4899]"></i>}
            {selectedPlatform === 'facebook' && <i className="fa-brands fa-facebook-messenger text-[14px] text-[#3b82f6]"></i>}
            {!['sms', 'email', 'whatsapp', 'instagram', 'facebook'].includes(selectedPlatform) && (
              <i className="fa-solid fa-comment text-[13px] text-[#3b82f6]"></i>
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#eef2ff] font-space-grotesk tracking-tight whitespace-nowrap">
              {conversation.contacts ? `${conversation.contacts.first_name} ${conversation.contacts.last_name}` : conversation.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse shrink-0" />
              <span className="text-[8px] text-[#4a5a82] font-bold uppercase tracking-widest font-dm-sans whitespace-nowrap">
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
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <i className="fa-solid fa-circle text-[4px]"></i>
                  24h Open ({windowTimeRemainingText})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <i className="fa-solid fa-triangle-exclamation text-[8px]"></i>
                  24h Closed
                </span>
              )}
            </>
          )}

          {/* SLA display */}
          {slaStatus === 'breached' && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <i className="fa-solid fa-circle-exclamation text-[8px]"></i>
              SLA Overdue ({slaText})
            </span>
          )}
          {slaStatus === 'pending' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
              <i className="fa-regular fa-clock text-[8px]"></i>
              SLA Due ({slaText})
            </span>
          )}
          {slaStatus === 'met' && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
              <i className="fa-solid fa-check text-[8px]"></i>
              SLA Met
            </span>
          )}

          {/* Toggle Panel Button */}
          <button 
            onClick={onTogglePanel} 
            className="w-8 h-8 rounded-lg bg-[#2563eb]/20 border border-[#2563eb]/30 hover:bg-[#2563eb]/30 flex items-center justify-center text-[#3b82f6] hover:text-white transition-all ml-2 shrink-0"
            title="Toggle Contact Panel"
          >
            <i className="fa-solid fa-circle-info text-[13px]"></i>
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
        onSend={async (text, isNote) => {
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
            onSendMessage(text, target?.conversationId || conversation.id);
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

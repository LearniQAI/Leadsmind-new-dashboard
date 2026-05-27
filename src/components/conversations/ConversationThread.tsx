'use client';

import React, { useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VoiceNoteCard } from '@/components/common/VoiceNoteCard';

interface ConversationThreadProps {
  conversation: any;
  onSendMessage: (text: string, targetConvId: string) => void;
  isSending: boolean;
}

export function ConversationThread({ conversation, onSendMessage, isSending }: ConversationThreadProps) {
  const [isCopied, setIsCopied] = useState(false);
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

  return (
    <div className="flex-1 flex flex-col bg-[#04091a] relative overflow-hidden">
      {/* Header */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 z-10 bg-[#080f28]/80 backdrop-blur-xl shrink-0 overflow-x-auto common-scrollbar gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            {selectedPlatform === 'sms' && <i className="fa-solid fa-comment-dots text-[16px] text-[#10b981]"></i>}
            {selectedPlatform === 'email' && <i className="fa-solid fa-envelope text-[16px] text-[#3b82f6]"></i>}
            {selectedPlatform === 'whatsapp' && <i className="fa-brands fa-whatsapp text-[18px] text-[#25d366]"></i>}
            {selectedPlatform === 'instagram' && <i className="fa-brands fa-instagram text-[18px] text-[#ec4899]"></i>}
            {selectedPlatform === 'facebook' && <i className="fa-brands fa-facebook-messenger text-[18px] text-[#3b82f6]"></i>}
            {!['sms', 'email', 'whatsapp', 'instagram', 'facebook'].includes(selectedPlatform) && (
              <i className="fa-solid fa-comment text-[16px] text-[#3b82f6]"></i>
            )}
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#eef2ff] font-space-grotesk tracking-tight whitespace-nowrap">
              {conversation.contacts ? `${conversation.contacts.first_name} ${conversation.contacts.last_name}` : conversation.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shrink-0" />
              <span className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-widest font-dm-sans whitespace-nowrap">
                Active via {availablePlatforms.map((p: any) => p.platform.toUpperCase()).join(' & ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedPlatform === 'sms' && (
            <div className="flex items-center gap-2 mr-2">
               <div className="px-2.5 py-1.5 rounded-lg bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#3b82f6] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                  <i className="fa-solid fa-link"></i>
                  SMS Bridge Active
               </div>
               <Button 
                 variant="ghost" 
                 size="sm"
                 className="h-[28px] px-3 text-[10px] font-bold text-[#eef2ff] bg-white/5 border border-white/10 hover:bg-white/10 whitespace-nowrap"
                 onClick={() => {
                   navigator.clipboard.writeText(`${conversation.contacts?.phone || ''}@sms.leadsmind.io`);
                   setIsCopied(true);
                   setTimeout(() => setIsCopied(false), 2000);
                 }}
               >
                 {isCopied ? (
                   <><i className="fa-solid fa-check mr-1.5 text-[#10b981]"></i> Copied!</>
                 ) : (
                   <><i className="fa-regular fa-copy mr-1.5"></i> Copy Bridge Address</>
                 )}
               </Button>
             </div>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-8 z-10 common-scrollbar flex flex-col-reverse gap-4">
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
                errorMessage={msg.error_message}
                platform={msgPlatform}
              />
            );
          })}
      </div>

      {/* Input Area */}
      <MessageInput 
        onSend={(text) => {
          const target = availablePlatforms.find((p: any) => p.platform === selectedPlatform) || availablePlatforms[0];
          onSendMessage(text, target?.conversationId);
        }}
        disabled={isSending}
        placeholder={selectedPlatform === 'sms' ? "Reply via SMS Bridge..." : `Type your reply via ${selectedPlatform.toUpperCase()}...`}
        availablePlatforms={availablePlatforms}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
      />
    </div>
  );
}

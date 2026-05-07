'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Phone, Video, MoreVertical, Search, Mail, MessageSquare, Check } from 'lucide-react';
import { sendMessage } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function InboxClient({ initialConversations }: { initialConversations: any[] }) {
  const router = useRouter();
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversations[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const activeConv = initialConversations.find(c => c.id === activeConvId);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'email': return <Mail className="w-4 h-4 text-white" />;
      case 'sms': case 'whatsapp': return <MessageSquare className="w-4 h-4 text-white" />;
      case 'instagram': return <i className="fa-brands fa-instagram text-white text-[16px]" />;
      case 'facebook': return <i className="fa-brands fa-facebook text-white text-[16px]" />;
      case 'twitter': return <i className="fa-brands fa-twitter text-white text-[16px]" />;
      default: return <MessageSquare className="w-4 h-4 text-white" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'email': return 'bg-danger';
      case 'whatsapp': return 'bg-success';
      case 'sms': return 'bg-primary';
      case 'instagram': return 'bg-[#FF3CAC]';
      default: return 'bg-primary';
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeConvId) return;
    setIsSending(true);
    const res = await sendMessage(activeConvId, replyText);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Message sent!');
      setReplyText('');
      router.refresh();
    }
    setIsSending(false);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar / Conversation List */}
      <div className="w-80 border-r border-white/10 flex flex-col bg-[#0b0b1a]">
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto common-scrollbar">
          {initialConversations.map(conv => {
            const latestMessage = conv.messages?.[conv.messages.length - 1];
            return (
              <div 
                key={conv.id} 
                onClick={() => setActiveConvId(conv.id)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${activeConvId === conv.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                      {conv.contacts?.first_name?.[0] || 'U'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0b0b1a] flex items-center justify-center ${getPlatformColor(conv.platform)}`}>
                      {getPlatformIcon(conv.platform)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-white font-medium text-sm truncate">
                        {conv.contacts ? `${conv.contacts.first_name} ${conv.contacts.last_name}` : conv.title || 'Unknown'}
                      </h4>
                      <span className="text-[10px] text-white/40 whitespace-nowrap ml-2">
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 truncate">
                      {latestMessage ? latestMessage.content : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-[#0b0b1a] relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          
          {/* Chat Header */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 z-10 bg-[#0b0b1a]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-bold">
                {activeConv.contacts ? `${activeConv.contacts.first_name} ${activeConv.contacts.last_name}` : activeConv.title}
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getPlatformColor(activeConv.platform)} text-white`}>
                {activeConv.platform}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="w-10 h-10 p-0 rounded-full text-white/50 hover:text-white hover:bg-white/10"><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" className="w-10 h-10 p-0 rounded-full text-white/50 hover:text-white hover:bg-white/10"><Video className="w-4 h-4" /></Button>
              <Button variant="ghost" className="w-10 h-10 p-0 rounded-full text-white/50 hover:text-white hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 common-scrollbar">
            {activeConv.messages?.map((msg: any, i: number) => {
              const isOutbound = msg.direction === 'outbound';
              return (
                <div key={i} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-4 ${isOutbound ? 'bg-primary text-white rounded-tr-sm shadow-lg shadow-primary/20' : 'bg-white/10 border border-white/10 text-white rounded-tl-sm'}`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <div className={`text-[10px] mt-2 flex items-center gap-1 ${isOutbound ? 'text-white/60 justify-end' : 'text-white/40'}`}>
                      {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isOutbound && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#0b0b1a]/90 backdrop-blur-md border-t border-white/10 z-10">
            <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-primary/50 transition-colors">
              <textarea 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply via ${activeConv.platform}...`}
                className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-white/30 resize-none max-h-32 min-h-[44px] p-3 focus:outline-none focus:ring-0"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button 
                onClick={handleSend}
                disabled={isSending || !replyText.trim()}
                className="w-12 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white flex-shrink-0 mb-0.5"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 relative z-10">
            <MessageSquare className="w-8 h-8 text-white/30" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 relative z-10">Select a Conversation</h2>
          <p className="text-white/40 max-w-sm relative z-10">Choose an active thread from the sidebar to start dominating your communications.</p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
 Send, 
 Phone, 
 Video, 
 MoreVertical, 
 Search, 
 Mail, 
 MessageSquare, 
 Check, 
 Filter
} from 'lucide-react';
import { Instagram, Facebook, Twitter, Linkedin } from '@/components/icons/BrandIcons';
import { sendMessage } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ConversationsClient({ initialConversations }: { initialConversations: any[] }) {
 const router = useRouter();
 const supabase = createClient();
 const [activeConvId, setActiveConvId] = useState<string | null>(initialConversations[0]?.id || null);
 const [replyText, setReplyText] = useState('');
 const [isSending, setIsSending] = useState(false);
 const [filter, setFilter] = useState<string>('all');

 // Realtime Subscription
 useEffect(() => {
  const channel = supabase
   .channel('schema-db-changes')
   .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    () => {
     router.refresh();
    }
   )
   .subscribe();

  return () => {
   supabase.removeChannel(channel);
  };
 }, [supabase, router]);

 const filteredConversations = filter === 'all' 
  ? initialConversations 
  : initialConversations.filter(c => c.platform === filter);

 const activeConv = initialConversations.find(c => c.id === activeConvId);

 const getPlatformIcon = (platform: string) => {
  switch (platform) {
   case 'email': return <Mail className="w-4 h-4 text-white" />;
   case 'sms': case 'whatsapp': return <MessageSquare className="w-4 h-4 text-white" />;
   case 'instagram': return <Instagram className="w-4 h-4 text-white" />;
   case 'facebook': return <Facebook className="w-4 h-4 text-white" />;
   case 'linkedin': return <Linkedin className="w-4 h-4 text-white" />;
   case 'twitter': return <Twitter className="w-4 h-4 text-white" />;
   default: return <MessageSquare className="w-4 h-4 text-white" />;
  }
 };

 const getPlatformColor = (platform: string) => {
  switch (platform) {
   case 'email': return 'bg-danger';
   case 'whatsapp': return 'bg-success';
   case 'sms': return 'bg-primary';
   case 'instagram': return 'bg-[#FF3CAC]';
   case 'facebook': return 'bg-[#1877F2]';
   case 'linkedin': return 'bg-[#0A66C2]';
   case 'twitter': return 'bg-[#1DA1F2]';
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
  <div className="flex h-full bg-[#0b0b1a] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
   {/* Sidebar / Conversation List */}
   <div className="w-96 border-r border-white/10 flex flex-col bg-[#0b0b14]/50">
    <div className="p-6 border-b border-white/10 space-y-4">
     <div className="flex items-center justify-between">
      <h2 className="text-xl font-black uppercase tracking-tighter text-white">Inbox</h2>
      <div className="flex gap-1">
       {['all', 'whatsapp', 'email', 'instagram', 'facebook'].map(p => (
        <button 
         key={p}
         onClick={() => setFilter(p)}
         className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${filter === p ? 'bg-primary text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
         title={p.toUpperCase()}
        >
         {p === 'all' ? <Filter className="w-3.5 h-3.5" /> : getPlatformIcon(p)}
        </button>
       ))}
      </div>
     </div>
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
     {filteredConversations.length === 0 ? (
      <div className="p-12 text-center">
       <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No conversations found</p>
      </div>
     ) : (
      filteredConversations.map(conv => {
       const latestMessage = conv.messages?.[conv.messages.length - 1];
       return (
        <div 
         key={conv.id} 
         onClick={() => setActiveConvId(conv.id)}
         className={`p-5 border-b border-white/5 cursor-pointer transition-all relative group ${activeConvId === conv.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'}`}
        >
         <div className="flex items-center gap-4">
          <div className="relative">
           <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-black text-lg border border-white/10 shadow-lg">
            {conv.contacts?.first_name?.[0] || 'U'}
           </div>
           <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-[#0b0b1a] flex items-center justify-center shadow-lg ${getPlatformColor(conv.platform)}`}>
            {getPlatformIcon(conv.platform)}
           </div>
          </div>
          <div className="flex-1 min-w-0">
           <div className="flex justify-between items-start mb-1">
            <h4 className="text-white font-bold text-sm truncate">
             {conv.contacts ? `${conv.contacts.first_name} ${conv.contacts.last_name}` : conv.title || 'Unknown User'}
            </h4>
            <span className="text-[10px] text-white/30 font-black whitespace-nowrap ml-2">
             {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
           </div>
           <p className="text-xs text-white/40 truncate font-medium">
            {latestMessage ? latestMessage.content : 'New conversation started'}
           </p>
          </div>
         </div>
        </div>
       );
      })
     )}
    </div>
   </div>

   {/* Main Chat Area */}
   {activeConv ? (
    <div className="flex-1 flex flex-col bg-[#0b0b14]/30 relative">
     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
     
     {/* Chat Header */}
     <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 z-10 bg-[#0b0b14]/80 backdrop-blur-xl">
      <div className="flex items-center gap-4">
       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
        {getPlatformIcon(activeConv.platform)}
       </div>
       <div>
        <h3 className="text-white font-black tracking-tight">
         {activeConv.contacts ? `${activeConv.contacts.first_name} ${activeConv.contacts.last_name}` : activeConv.title}
        </h3>
        <div className="flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
         <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Active via {activeConv.platform}</span>
        </div>
       </div>
      </div>
      <div className="flex items-center gap-3">
       <Button variant="ghost" className="w-10 h-10 p-0 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"><Phone className="w-4 h-4" /></Button>
       <Button variant="ghost" className="w-10 h-10 p-0 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"><Video className="w-4 h-4" /></Button>
       <Button variant="ghost" className="w-10 h-10 p-0 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"><MoreVertical className="w-4 h-4" /></Button>
      </div>
     </div>

     {/* Messages */}
     <div className="flex-1 overflow-y-auto p-8 space-y-8 z-10 common-scrollbar flex flex-col-reverse">
      <div className="space-y-8">
       {activeConv.messages?.map((msg: any, i: number) => {
        const isOutbound = msg.direction === 'outbound';
        return (
         <div key={i} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
          <div className={`max-w-[65%] rounded-2xl px-5 py-4 shadow-2xl ${isOutbound ? 'bg-primary text-white rounded-tr-sm shadow-primary/20' : 'bg-white/10 border border-white/10 text-white rounded-tl-sm backdrop-blur-md'}`}>
           <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
           <div className={`text-[10px] mt-2.5 flex items-center gap-1.5 font-black uppercase tracking-widest ${isOutbound ? 'text-white/60 justify-end' : 'text-white/30'}`}>
            {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isOutbound && (
             <div className="flex items-center">
              <Check className="w-3 h-3" />
              <Check className="w-3 h-3 -ml-1.5" />
             </div>
            )}
           </div>
          </div>
         </div>
        );
       })}
      </div>
     </div>

     {/* Input Area */}
     <div className="p-6 bg-[#0b0b14]/80 backdrop-blur-xl border-t border-white/10 z-10">
      <div className="flex items-end gap-4 bg-white/5 border border-white/10 rounded-2xl p-2.5 focus-within:border-primary/50 transition-all shadow-inner">
       <textarea 
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder={`Type your reply to ${activeConv.contacts?.first_name || 'them'}...`}
        className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-white/20 resize-none max-h-32 min-h-[44px] p-3 focus:outline-none focus:ring-0 font-medium"
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
        className="w-12 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white flex-shrink-0 mb-0.5 shadow-lg shadow-primary/30 active:scale-95 transition-all"
       >
        <Send className="w-5 h-5" />
       </Button>
      </div>
     </div>
    </div>
   ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative">
     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
     <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/50 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-primary/20 relative z-10 rotate-12">
      <MessageSquare className="w-10 h-10 text-white" />
     </div>
     <h2 className="text-3xl font-black text-white mb-4 relative z-10 tracking-tight">Select a Thread</h2>
     <p className="text-white/40 max-w-sm relative z-10 font-medium leading-relaxed">
      Your unified communications command center. Select a conversation to start dominating the conversation.
     </p>
    </div>
   )}
  </div>
 );
}

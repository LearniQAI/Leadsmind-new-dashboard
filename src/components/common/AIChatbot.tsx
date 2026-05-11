'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAIChatResponse } from '@/app/actions/ai';
import { toast } from 'sonner';

export default function AIChatbot() {
 const [isOpen, setIsOpen] = useState(false);
 const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const scrollRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (scrollRef.current) {
   scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
 }, [messages]);

 const handleSend = async () => {
  if (!input.trim() || isLoading) return;

  const userMessage = input.trim();
  setInput('');
  setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
  setIsLoading(true);

  try {
   const chatMessages = messages.concat({ role: 'user', content: userMessage }).map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content
   }));

   const res = await getAIChatResponse(chatMessages as any);
   
   if (res.error) {
    toast.error(res.error);
   } else if (res.content) {
    setMessages(prev => [...prev, { role: 'assistant', content: res.content! }]);
   }
  } catch (err) {
   toast.error('Failed to get response from AI');
  } finally {
   setIsLoading(false);
  }
 };

 if (!isOpen) {
  return (
   <button
    onClick={() => setIsOpen(true)}
    className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform z-50 group"
   >
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-white animate-pulse" />
    <MessageSquare className="w-6 h-6" />
    <div className="absolute right-full mr-4 px-3 py-1.5 bg-[#0b0b1a] border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
     LeadsMind AI Support
    </div>
   </button>
  );
 }

 return (
  <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#0b0b1a] border border-white/10 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
   <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
   
   {/* Header */}
   <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between z-10">
    <div className="flex items-center gap-3">
     <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
      <Bot className="w-6 h-6" />
     </div>
     <div>
      <h3 className="text-sm font-black text-white uppercase tracking-tighter">LeadsMind AI</h3>
      <div className="flex items-center gap-1.5">
       <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Active Neural Link</span>
      </div>
     </div>
    </div>
    <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white transition-colors">
     <X size={20} />
    </button>
   </div>

   {/* Messages */}
   <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 common-scrollbar z-10">
    {messages.length === 0 && (
     <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/20">
       <Bot className="w-6 h-6" />
      </div>
      <p className="text-xs text-white/40 font-medium">Hello! I am your LeadsMind neural assistant. How can I help you dominate your workspace today?</p>
     </div>
    )}
    {messages.map((msg, i) => (
     <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
       <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-white/40 ${msg.role === 'user' ? 'bg-primary/20' : 'bg-white/5'}`}>
        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
       </div>
       <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-none'}`}>
        {msg.content}
       </div>
      </div>
     </div>
    ))}
    {isLoading && (
     <div className="flex justify-start">
      <div className="flex gap-2">
       <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
        <Bot size={14} />
       </div>
       <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
       </div>
      </div>
     </div>
    )}
   </div>

   {/* Input */}
   <div className="p-4 border-t border-white/10 bg-[#0b0b1a] z-10">
    <div className="relative flex items-center gap-2">
     <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      placeholder="Neural query..."
      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary/50 transition-all"
     />
     <button
      onClick={handleSend}
      disabled={!input.trim() || isLoading}
      className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-primary-dark transition-colors"
     >
      <Send size={16} />
     </button>
    </div>
   </div>
  </div>
 );
}

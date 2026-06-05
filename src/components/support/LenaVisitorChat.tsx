'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

interface LenaVisitorChatProps {
  workspaceId: string | null;
}

interface Config {
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  position: 'left' | 'right';
  quick_replies: string[];
}

interface Message {
  id: string;
  sender_type: 'visitor' | 'ai' | 'agent' | 'system';
  content: string;
}

export default function LenaVisitorChat({ workspaceId }: LenaVisitorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize visitorId and conversationId from localStorage
  useEffect(() => {
    if (!workspaceId) return;
    
    const storedVisitorId = localStorage.getItem(`lena_visitor_id_${workspaceId}`);
    if (storedVisitorId) {
      setVisitorId(storedVisitorId);
    } else {
      const newId = `vis_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(`lena_visitor_id_${workspaceId}`, newId);
      setVisitorId(newId);
    }

    const storedConvId = localStorage.getItem(`lena_conversation_id_${workspaceId}`);
    if (storedConvId) {
      setConversationId(storedConvId);
    }
  }, [workspaceId]);

  // Fetch Config
  useEffect(() => {
    if (!workspaceId) return;

    async function fetchConfig() {
      try {
        const res = await fetch(`/api/lena/config?workspaceId=${workspaceId}`);
        const data = await res.json();
        if (res.ok && data.config) {
          setConfig({
            bot_name: data.config.bot_name || 'LENA',
            welcome_message: data.config.welcome_message || 'Hi there! I am LENA. How can I help you today?',
            primary_color: data.config.primary_color || '#2563eb',
            position: data.config.position || 'right',
            quick_replies: data.config.quick_replies || []
          });
        }
      } catch (err) {
        console.error('Failed to load LENA config:', err);
      }
    }

    fetchConfig();
  }, [workspaceId]);

  // Fetch messages when conversationId is loaded or changes
  useEffect(() => {
    if (!conversationId) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/lena/messages?conversationId=${conversationId}`);
        const data = await res.json();
        if (res.ok) {
          if (data.messages) {
            setMessages(data.messages);
          }
          setIsAgentTyping(!!data.isAgentTyping);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    }

    fetchMessages();

    // Polling interval (1.5 seconds for real-time responsiveness)
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!workspaceId || !config) return null;

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Add temp visitor message to feed
    const tempId = `temp_${Date.now()}`;
    const newMsg: Message = { id: tempId, sender_type: 'visitor', content: text };
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/lena/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          conversationId,
          visitorMessage: text,
          visitorId
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
          localStorage.setItem(`lena_conversation_id_${workspaceId}`, data.conversationId);
        }
        // Replace or append AI message
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempId);
          return [
            ...filtered,
            { id: `vis_${Date.now()}`, sender_type: 'visitor', content: text },
            { id: `bot_${Date.now()}`, sender_type: 'ai', content: data.reply }
          ];
        });
      } else {
        console.error('LENA Chat API error:', data.error);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const positionClass = config.position === 'left' ? 'left-6' : 'right-6';

  return (
    <>
      {/* Floating Trigger Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 ${positionClass} w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 z-[1000] border border-white/10`}
          style={{ backgroundColor: config.primary_color }}
        >
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#10b981] rounded-full border-2 border-[#04091a] animate-pulse" />
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 ${positionClass} w-[360px] h-[500px] bg-[#080f28] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[1000] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 font-dm-sans`}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-[#0c1535] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[12px] uppercase"
                style={{ backgroundColor: config.primary_color }}
              >
                {config.bot_name[0]}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-space-grotesk">{config.bot_name} AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[10px] text-[#94a3c8]">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#94a3c8] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="bg-white/5 border border-white/10 text-[12.5px] text-white px-3.5 py-2.5 rounded-2xl rounded-tl-none max-w-[85%] self-start leading-relaxed">
                {config.welcome_message}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-[12.5px] leading-relaxed max-w-[85%] ${
                      msg.sender_type === 'visitor'
                        ? 'bg-[rgba(37,99,235,0.14)] border border-[rgba(37,99,235,0.2)] text-white rounded-tr-none'
                        : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {(isLoading || isAgentTyping) && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-[#94a3c8] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#94a3c8] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-[#94a3c8] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {messages.length === 0 && config.quick_replies?.length > 0 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-[#080f28] border-t border-white/5">
              {config.quick_replies.map((qr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qr)}
                  className="bg-white/5 border border-white/10 hover:border-[#2563eb] text-[#94a3c8] hover:text-white text-[11px] px-2.5 py-1 rounded-full transition-all"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-white/10 bg-[#080f28] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (handleSend(input), setInput(''))}
              placeholder="Ask me anything..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#4a5a82] outline-none focus:border-white/20 transition-all"
            />
            <button
              onClick={() => {
                handleSend(input);
                setInput('');
              }}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-colors"
              style={{ backgroundColor: config.primary_color }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

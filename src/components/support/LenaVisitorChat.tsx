'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';

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
  const [visitorSession, setVisitorSession] = useState<string | null>(null);
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
    setVisitorSession(localStorage.getItem(`lena_visitor_session_${workspaceId}`));
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
    if (!conversationId || !visitorSession) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/lena/messages?conversationId=${conversationId}`, { headers: { 'X-Lena-Visitor-Session': visitorSession } });
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
  }, [conversationId, visitorSession]);

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
        headers: { 'Content-Type': 'application/json', ...(visitorSession ? { 'X-Lena-Visitor-Session': visitorSession } : {}) },
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
        if (data.visitorSession) {
          setVisitorSession(data.visitorSession);
          localStorage.setItem(`lena_visitor_session_${workspaceId}`, data.visitorSession);
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
      {/* Floating Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open LENA AI assistant"
          className={`lena-chat-launcher fixed bottom-6 ${positionClass} w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-[1.07] active:scale-95 transition-all duration-200 z-[1000] border-[3px] bg-white`}
          style={{
            borderColor: config.primary_color,
            '--lena-launcher-brand': config.primary_color,
          } as React.CSSProperties}
        >
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green rounded-full border-2 border-white animate-pulse" />
          <img src="/icon0.svg" alt="LeadsMind" className="h-9 w-9" />
        </button>
      )}

      <style jsx>{`
        .lena-chat-launcher {
          animation: lena-launcher-breathe 3s ease-in-out infinite;
        }

        .lena-chat-launcher:hover,
        .lena-chat-launcher:focus-visible {
          animation: none;
          box-shadow: 0 0 28px color-mix(in srgb, var(--lena-launcher-brand) 42%, transparent),
            0 10px 24px rgba(15, 23, 42, 0.16);
        }

        .lena-chat-modal-logo {
          box-shadow: 0 0 12px color-mix(in srgb, var(--lena-launcher-brand) 24%, transparent);
        }

        @keyframes lena-launcher-breathe {
          0%,
          100% {
            box-shadow: 0 0 14px color-mix(in srgb, var(--lena-launcher-brand) 22%, transparent),
              0 8px 18px rgba(15, 23, 42, 0.13);
          }
          50% {
            box-shadow: 0 0 22px color-mix(in srgb, var(--lena-launcher-brand) 32%, transparent),
              0 9px 21px rgba(15, 23, 42, 0.14);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lena-chat-launcher {
            animation: none;
          }
        }
      `}</style>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 ${positionClass} w-[360px] h-[500px] bg-white border border-dash-border rounded-2xl shadow-xl flex flex-col z-[1000] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 font-dm-sans`}
        >
          {/* Header */}
          <div className="p-4 border-b border-dash-border bg-dash-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="lena-chat-modal-logo w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white"
                style={{
                  borderColor: config.primary_color,
                  '--lena-launcher-brand': config.primary_color,
                } as React.CSSProperties}
              >
                <img src="/icon0.svg" alt="LeadsMind" className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold !text-dash-text font-space-grotesk">{config.bot_name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                  <span className="text-[10px] !text-dash-textMuted font-medium">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="!text-dash-textMuted hover:!text-dash-text transition-colors p-1.5 rounded-lg hover:bg-dash-border/40"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {messages.length === 0 ? (
              <div className="bg-dash-surface border border-dash-border !text-dash-text text-[12.5px] px-3.5 py-2.5 rounded-2xl rounded-tl-none max-w-[85%] self-start leading-relaxed">
                {config.welcome_message}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender_type === 'visitor' ? (
                    <div
                      className="p-3 rounded-2xl text-[12.5px] leading-relaxed max-w-[85%] text-white rounded-tr-none"
                      style={{ backgroundColor: config.primary_color }}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl text-[12.5px] leading-relaxed max-w-[85%] bg-dash-surface border border-dash-border !text-dash-text rounded-tl-none">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))
            )}
            {(isLoading || isAgentTyping) && (
              <div className="flex justify-start">
                <div className="bg-dash-surface border border-dash-border p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-dash-textMuted/50 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-dash-textMuted/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-dash-textMuted/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {messages.length === 0 && config.quick_replies?.length > 0 && (
            <div className="px-4 py-2.5 flex flex-wrap gap-1.5 bg-white border-t border-dash-border shrink-0">
              {config.quick_replies.map((qr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qr)}
                  className="bg-dash-surface border border-dash-border hover:border-dash-accent !text-dash-textMuted hover:!text-dash-accent text-[11px] font-medium px-2.5 py-1 rounded-full transition-all"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-dash-border bg-white flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (handleSend(input), setInput(''))}
              placeholder="Ask me anything..."
              className="flex-1 bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-dash-accent transition-all"
            />
            <button
              onClick={() => {
                handleSend(input);
                setInput('');
              }}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-colors shrink-0"
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

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createSupportTicketFromLena } from '@/app/actions/help';
import LENAChatMessageList from './components/LENAChatMessageList';
import LENAChatInput from './components/LENAChatInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  lowConfidence?: boolean;
  diagnostics?: any;
}

export default function LENAChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi, I'm LENA, your LeadsMind assistant. Ask me anything — how a feature works, why something isn't behaving as expected, or I can scan your workspace for issues directly."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState<string | null>(null); // 'submitting' | 'success' | 'error'
  const [escalatedTicketId, setEscalatedTicketId] = useState<string | null>(null);

  // Touch Swipe Gesture State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  // Touch handlers for swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff > 0) {
      setTranslateX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (translateX > 120) {
      setIsOpen(false);
    }
    setTranslateX(0);
    setTouchStartX(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      
      const res = await fetch('/api/support/lena/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory
        })
      });

      if (!res.ok) throw new Error('API communication error');

      const data = await res.json();
      
      if (data.low_confidence) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          lowConfidence: true,
          diagnostics: data.diagnostics_packaged
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops! I encountered an error communicating with the chat server. Please verify your connection status and try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateTicket = async (index: number) => {
    const targetMsg = messages[index];
    if (!targetMsg || !targetMsg.diagnostics) return;

    setEscalating('submitting');
    try {
      let userQuery = 'Workspace Assistance Request';
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userQuery = messages[i].content;
          break;
        }
      }

      const history = messages.slice(0, index).map(m => ({ role: m.role, content: m.content }));
      const screenLoc = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

      const res = await createSupportTicketFromLena({
        title: userQuery,
        history,
        diagnostics: targetMsg.diagnostics,
        screenLocation: screenLoc
      });

      if (res.success && res.ticketId) {
        setEscalatedTicketId(res.ticketId);
        setEscalating('success');
        setMessages(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            content: `High-priority support ticket has been successfully registered. Ticket ID: ${res.ticketId}. Our technical team has been notified and will review your packaged workspace logs.`,
            lowConfidence: false
          };
          return updated;
        });
      } else {
        setEscalating('error');
      }
    } catch (err) {
      setEscalating('error');
    }
  };

  return (
    <>
      <style>{`
        .lena-chat-launcher {
          animation: lena-launcher-breathe 3s ease-in-out infinite;
        }
        .lena-chat-launcher:hover,
        .lena-chat-launcher:focus-visible {
          animation: none;
          box-shadow: 0 0 28px color-mix(in srgb, var(--lena-launcher-brand) 42%, transparent),
            0 10px 24px rgba(15, 23, 42, 0.16);
        }
        @keyframes lena-launcher-breathe {
          0%, 100% {
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
        .lena-chat-modal-logo {
          box-shadow: 0 0 12px color-mix(in srgb, var(--lena-launcher-brand) 24%, transparent);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Floating Toggle Button (Touch Optimized Target Size) — matches the
          white / brand-border / breathing-glow launcher used elsewhere for LENA */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ask LENA"
        className="lena-chat-launcher fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-[1.07] active:scale-95 transition-all duration-200 border-[3px] bg-white group"
        style={{ '--lena-launcher-brand': '#1359FF', borderColor: '#1359FF' } as React.CSSProperties}
        title="Ask LENA"
      >
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green rounded-full border-2 border-white animate-pulse" />
        <img src="/icon0.svg" alt="LeadsMind" className="h-9 w-9 group-hover:rotate-6 transition-transform duration-300" />
      </button>

      {/* Backdrop: dims + blurs the dashboard behind the panel and blocks
          interaction with it while open; clicking it closes the panel, same
          as the X button. Fully unmounts (no lingering blur) when closed. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1999] bg-black/20 backdrop-blur-[5px] animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer Overlay */}
      {isOpen && (
        // Anchored popover near the launcher (matches LenaVisitorChat / CourseQAWidget /
        // LiveHelpWidget's floating-panel convention) rather than a full-viewport drawer.
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: translateX > 0 ? `translateX(${translateX}px)` : undefined,
            transition: translateX === 0 ? 'transform 0.2s ease-out' : 'none'
          }}
          className="fixed bottom-24 right-6 z-[2000] w-[calc(100vw-3rem)] max-w-md h-[650px] max-h-[75vh] bg-white border border-dash-border rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 font-dm-sans"
        >

            {/* Header Block (Large touch target for close btn) */}
            <div className="p-5 border-b border-dash-border flex items-center justify-between bg-dash-surface">
              <div className="flex items-center gap-3">
                <div
                  className="lena-chat-modal-logo w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 bg-white"
                  style={{ '--lena-launcher-brand': '#1359FF', borderColor: '#1359FF' } as React.CSSProperties}
                >
                  <img src="/icon0.svg" alt="LeadsMind" className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold !text-dash-text font-space-grotesk">LENA</h3>
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Live Diagnostics</span>
                    </div>
                  </div>
                  <p className="text-[10px] !text-dash-textMuted font-medium pt-0.5">Your LeadsMind product assistant</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text bg-dash-border/30 hover:bg-dash-border/50 rounded-xl transition duration-150 min-w-[44px] min-h-[44px]"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Window */}
            <LENAChatMessageList 
              messages={messages}
              loading={loading}
              escalating={escalating}
              handleEscalateTicket={handleEscalateTicket}
              messagesEndRef={messagesEndRef}
            />

            {/* Input Bar Form */}
            <LENAChatInput
              query={query}
              setQuery={setQuery}
              handleSend={handleSend}
              loading={loading}
            />

        </div>
      )}
    </>
  );
}


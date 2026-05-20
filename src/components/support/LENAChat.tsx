'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Cpu } from 'lucide-react';
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
      content: "Hello! I'm LENA, your LeadsMind Workspace Diagnostic Assistant. Ask me anything about setting up bank feeds, email domains, custom workflows, or payment settings. I can also scan your workspace health directly!"
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.6); }
          50% { box-shadow: 0 0 20px 6px rgba(139, 92, 246, 0.3); }
        }
        .glowing-btn {
          animation: pulse-glow 2.5s infinite ease-in-out;
        }
        .custom-glass {
          background: rgba(8, 15, 40, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Floating Toggle Button (Touch Optimized Target Size) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 min-w-[48px] min-h-[48px] px-5 py-4 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-white/10 flex items-center justify-center gap-2.5 glowing-btn font-dm-sans group"
        title="Open Diagnostics AI Assistant"
      >
        <Sparkles className="w-5 h-5 text-purple-200 group-hover:rotate-12 transition-transform duration-300" />
        <span className="text-xs font-black uppercase tracking-widest">
          Diagnostics AI
        </span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] animate-fade-in flex justify-end font-dm-sans">
          {/* Drawer Body Container (Touch Swipe enabled & Safe keyboard height sizing via dvh) */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              transform: translateX > 0 ? `translateX(${translateX}px)` : undefined, 
              transition: translateX === 0 ? 'transform 0.2s ease-out' : 'none' 
            }}
            className="w-full max-w-md bg-[#050a1e] border-l border-white/10 h-[100dvh] max-h-[100dvh] flex flex-col shadow-2xl relative animate-slide-in-right overflow-hidden"
          >
            
            {/* Header Block (Large touch target for close btn) */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#080e29]/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
                  <Cpu className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-space-grotesk">LENA Assistant</h3>
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Live Diagnostics</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold pt-0.5">LeadsMind Automated Support Node</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 flex items-center justify-center text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition duration-150 min-w-[44px] min-h-[44px]"
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
        </div>
      )}
    </>
  );
}


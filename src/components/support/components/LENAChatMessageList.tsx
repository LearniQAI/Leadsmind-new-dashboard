'use client';

import React from 'react';
import { Cpu, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  lowConfidence?: boolean;
  diagnostics?: any;
}

interface LENAChatMessageListProps {
  messages: Message[];
  loading: boolean;
  escalating: string | null;
  handleEscalateTicket: (index: number) => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function LENAChatMessageList({
  messages,
  loading,
  escalating,
  handleEscalateTicket,
  messagesEndRef
}: LENAChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-radial-gradient">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        return (
          <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            
            {/* Assistant Avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 shadow-sm mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
            )}

            <div className="max-w-[80%] flex flex-col gap-1">
              {/* Message Bubble (Optimized Touch Selection Zone) */}
              <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg select-text ${
                isUser
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none border border-violet-400/20'
                  : 'bg-[#080f28]/95 border border-white/[0.06] text-white/90 rounded-tl-none'
              }`}>
                <p className="font-light whitespace-pre-wrap">{msg.content}</p>

                {/* Diagnostic Escalation Panel (Touch Optimized) */}
                {msg.lowConfidence && (
                  <div className="mt-4 p-4 bg-[#0e0a1f] border border-rose-500/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Escalation Gate (Similarity &lt; 70%)</span>
                    </div>
                    
                    <p className="text-[10px] sm:text-[11px] text-white/50 leading-relaxed font-light">
                      I will package your message history, DNS record flags, payment setup verification status, and workspace details to submit a support ticket.
                    </p>

                    <button
                      onClick={() => handleEscalateTicket(idx)}
                      disabled={escalating === 'submitting'}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/40 text-[11px] font-black uppercase tracking-wider text-white transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                      {escalating === 'submitting' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Packaging parameters...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Confirm Escalation
                        </>
                      )}
                    </button>
                    
                    {escalating === 'error' && (
                      <p className="text-[9px] text-rose-400 text-center font-bold uppercase tracking-widest pt-1">
                        Telemetry registration failed. Try again.
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Message Metadata Timestamp */}
              <span className={`text-[8px] font-bold text-white/20 uppercase tracking-wider ${isUser ? 'text-right' : 'text-left'}`}>
                {isUser ? 'You' : 'LENA'}
              </span>
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-400/20 flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-sm mt-0.5">
                ME
              </div>
            )}

          </div>
        );
      })}

      {/* Typing bounce animation */}
      {loading && (
        <div className="flex gap-3 justify-start animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <Cpu className="w-4 h-4 animate-spin" />
          </div>
          <div className="bg-[#080f28]/90 border border-white/[0.06] p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

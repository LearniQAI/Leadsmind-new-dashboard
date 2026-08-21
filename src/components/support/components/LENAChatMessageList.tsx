'use client';

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

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
    <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-white">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        return (
          <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>

            {/* Assistant Avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-white border-2 shrink-0 shadow-sm mt-0.5 flex items-center justify-center" style={{ borderColor: '#1359FF' }}>
                <img src="/icon0.svg" alt="LENA" className="h-4.5 w-4.5" />
              </div>
            )}

            <div className="max-w-[80%] flex flex-col gap-1">
              {/* Message Bubble (Optimized Touch Selection Zone) */}
              <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed select-text ${
                isUser
                  ? '!text-white rounded-tr-none'
                  : 'bg-dash-surface border border-dash-border !text-dash-text rounded-tl-none'
              }`} style={isUser ? { backgroundColor: '#1359FF' } : undefined}>
                <p className={`whitespace-pre-wrap ${isUser ? '!text-white' : ''}`}>{msg.content}</p>

                {/* Escalation Offer (Touch Optimized) — a helpful offer, not a warning:
                    no internal confidence-threshold language or packaging detail shown to the user. */}
                {msg.lowConfidence && (
                  <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
                    <p className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed">
                      I'm not fully confident in my answer for this one. Want me to loop in a human expert?
                    </p>

                    <button
                      onClick={() => handleEscalateTicket(idx)}
                      disabled={escalating === 'submitting'}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-[11px] font-black uppercase tracking-wider text-white transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      {escalating === 'submitting' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reaching out...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Talk to support
                        </>
                      )}
                    </button>

                    {escalating === 'error' && (
                      <p className="text-[9px] text-rose-500 text-center font-bold uppercase tracking-widest pt-1">
                        Couldn't reach support right now. Try again.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Message Metadata Timestamp */}
              <span className={`text-[8px] font-bold !text-dash-textMuted uppercase tracking-wider ${isUser ? 'text-right' : 'text-left'}`}>
                {isUser ? 'You' : 'LENA'}
              </span>
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-sm mt-0.5" style={{ backgroundColor: '#1359FF' }}>
                ME
              </div>
            )}

          </div>
        );
      })}

      {/* Typing bounce animation */}
      {loading && (
        <div className="flex gap-3 justify-start animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-white border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#1359FF' }}>
            <img src="/icon0.svg" alt="LENA" className="h-4.5 w-4.5" />
          </div>
          <div className="bg-dash-surface border border-dash-border p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full typing-dot animate-bounce" style={{ animationDelay: '0.1s', backgroundColor: '#1359FF' }} />
            <span className="w-1.5 h-1.5 rounded-full typing-dot animate-bounce" style={{ animationDelay: '0.2s', backgroundColor: '#1359FF' }} />
            <span className="w-1.5 h-1.5 rounded-full typing-dot animate-bounce" style={{ animationDelay: '0.3s', backgroundColor: '#1359FF' }} />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

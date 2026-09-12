'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function PortalLenaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hi! I am LENA, your LeadsMind portal virtual assistant. How can I help you with your invoices, courses, support tickets, or meetings today?',
          timestamp: new Date()
        }
      ]);
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userQuery = inputValue;
    setInputValue('');

    const userMessage: ChatMessage = {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for API
      const history = messages
        .filter(m => m.content !== '')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch('/api/portal/lena/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userQuery,
          history
        })
      });

      if (!res.ok) {
        throw new Error('Failed to get answer from LENA');
      }

      const data = await res.json();
      const answer = data.message || "I'm having trouble connecting to my knowledge base right now. Please try again shortly.";

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: answer,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I ran into an error processing that. Please try again or create a support ticket if the issue persists.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Container */}
      {isOpen && (
        <div className="mb-4 w-[380px] sm:w-[400px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[70vh] rounded-2xl border border-dash-border bg-white shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">

          {/* Header */}
          <div className="px-5 py-4 border-b border-dash-border flex items-center justify-between bg-dash-accent/5">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--btn-color,#2563eb)]">
                <img src="/icon0.svg" alt="LeadsMind" className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-dash-text text-sm tracking-wide">LENA AI</h4>
                <p className="text-[11px] text-dash-textMuted">Virtual Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-dash-textMuted hover:text-dash-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-none shadow-md'
                      : 'bg-dash-surface text-dash-text rounded-bl-none border border-dash-border'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: 'var(--btn-color, #2563eb)' } : undefined}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span className="block text-[10px] text-right mt-1 opacity-60">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-dash-surface text-dash-textMuted rounded-2xl rounded-bl-none px-4 py-3 border border-dash-border flex items-center space-x-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-dash-accent" />
                  <span>LENA is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-dash-border bg-dash-surface flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask LENA something..."
              className="flex-1 bg-white border border-dash-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dash-accent text-dash-text placeholder-dash-textMuted"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2 rounded-xl text-white transition-all disabled:opacity-50 flex items-center justify-center"
              style={{ backgroundColor: 'var(--btn-color, #2563eb)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        style={{ backgroundColor: 'var(--btn-color, #2563eb)' }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <img src="/icon0.svg" alt="Open LENA AI assistant" className="h-9 w-9" />
        )}
      </button>
    </div>
  );
}

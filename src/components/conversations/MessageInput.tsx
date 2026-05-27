'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TEMPLATES = [
  { title: "Quick Follow-up", body: "Hi there! Just following up on our previous conversation. Let me know if you have any questions." },
  { title: "Meeting Reminder", body: "Hello! This is a quick reminder about our upcoming meeting. Looking forward to speaking with you." },
  { title: "Thank You", body: "Thank you so much for your time today! I've attached the details we discussed." },
  { title: "Check-in", body: "Hi! Just checking in to see how things are going on your end. Let me know if you need anything." }
];

export function MessageInput({ onSend, placeholder, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-6 bg-[#080f28] border-t border-white/5 backdrop-blur-xl z-10">
      <div className={cn(
        "bg-white/[0.03] border border-white/5 rounded-[12px] p-2 focus-within:border-[#2563eb]/40 transition-all shadow-inner flex flex-col gap-2",
        disabled && "opacity-50 pointer-events-none"
      )}>
        <textarea 
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder || "Type your message..."}
          className="w-full bg-transparent border-none text-[#eef2ff] text-[13.5px] placeholder:text-[#4a5a82] resize-none max-h-32 min-h-[44px] p-3 focus:outline-none focus:ring-0 font-dm-sans"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        
        <div className="flex items-center justify-between px-2 pb-1 relative">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(
                "h-8 px-3 rounded-lg flex items-center justify-center gap-2 text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 transition-all text-[12px] font-bold font-dm-sans",
                showTemplates && "bg-white/5 text-[#eef2ff]"
              )}
            >
              <i className="fa-solid fa-note-sticky text-[13px]"></i>
              Templates
            </button>
            
            {showTemplates && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#080f28] border border-white/10 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in duration-200">
                <div className="px-2 py-1.5 mb-1 border-b border-white/5">
                  <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Select Template</span>
                </div>
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setText(tmpl.body);
                      setShowTemplates(false);
                      textareaRef.current?.focus();
                    }}
                    className="flex flex-col items-start px-3 py-2 rounded-lg hover:bg-white/[0.03] text-left transition-all group"
                  >
                    <span className="text-[12px] font-bold text-[#eef2ff] group-hover:text-[#3b82f6] transition-colors font-space-grotesk">{tmpl.title}</span>
                    <span className="text-[11px] text-[#4a5a82] line-clamp-1 mt-0.5 font-dm-sans">{tmpl.body}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleSend}
            disabled={!text.trim()}
            className="h-9 px-4 rounded-[8px] bg-[#2563eb] hover:bg-[#2563eb]/90 text-white flex items-center gap-2 shadow-lg shadow-[#2563eb]/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none font-dm-sans text-[13px] font-bold"
          >
            <span className="uppercase tracking-widest">Send</span>
            <i className="fa-solid fa-paper-plane text-[11px]"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

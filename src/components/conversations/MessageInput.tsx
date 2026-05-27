'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, placeholder, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        
        <div className="flex items-center justify-end px-2 pb-1">
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

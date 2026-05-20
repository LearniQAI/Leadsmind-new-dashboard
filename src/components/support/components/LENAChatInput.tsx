'use client';

import React from 'react';
import { Send } from 'lucide-react';

interface LENAChatInputProps {
  query: string;
  setQuery: (val: string) => void;
  handleSend: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function LENAChatInput({
  query,
  setQuery,
  handleSend,
  loading
}: LENAChatInputProps) {
  return (
    <div className="p-4 border-t border-white/5 bg-[#080e29]/95 backdrop-blur-md pb-safe">
      <form 
        onSubmit={handleSend} 
        className="relative flex items-center bg-[#050a1e] border border-white/10 rounded-2xl p-1.5 focus-within:border-violet-500 transition duration-200"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask LENA or troubleshoot..."
          className="flex-1 bg-transparent px-4 py-3.5 text-xs sm:text-sm text-white placeholder-white/20 outline-none min-h-[44px]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-11 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-20 disabled:scale-100 text-white rounded-xl transition duration-150 flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 min-w-[44px]"
          title="Send message"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}

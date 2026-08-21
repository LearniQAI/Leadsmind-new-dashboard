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
    <div className="p-4 border-t border-dash-border bg-white pb-safe">
      <form
        onSubmit={handleSend}
        className="relative flex items-center bg-dash-surface rounded-full p-1.5 focus-within:ring-2 transition duration-200"
        style={{ ['--tw-ring-color' as any]: '#1359FF33' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask LENA or troubleshoot..."
          className="flex-1 bg-transparent px-4 py-3.5 text-xs sm:text-sm !text-dash-text placeholder:!text-dash-textMuted outline-none min-h-[44px]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-11 h-11 text-white rounded-full transition duration-150 flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 min-w-[44px]"
          style={{ backgroundColor: '#1359FF' }}
          title="Send message"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}

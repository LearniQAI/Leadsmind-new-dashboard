'use client';

import React, { useState, useEffect } from 'react';
import { useDebounce } from 'react-use';
import { Bold, Italic, List, ListOrdered, Link, Image, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, readOnly }: RichTextEditorProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useDebounce(
    () => {
      if (localValue !== value) {
        onChange(localValue);
      }
    },
    500,
    [localValue]
  );

  return (
    <div className="flex flex-col border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden group focus-within:border-primary/40 transition-all">
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-white/[0.01]">
          <ToolbarButton icon={<Bold className="w-3.5 h-3.5" />} />
          <ToolbarButton icon={<Italic className="w-3.5 h-3.5" />} />
          <div className="w-[1px] h-4 bg-white/5 mx-1" />
          <ToolbarButton icon={<List className="w-3.5 h-3.5" />} />
          <ToolbarButton icon={<ListOrdered className="w-3.5 h-3.5" />} />
          <div className="w-[1px] h-4 bg-white/5 mx-1" />
          <ToolbarButton icon={<Link className="w-3.5 h-3.5" />} />
          <ToolbarButton icon={<Image className="w-3.5 h-3.5" alt="" />} />
          <div className="flex-1" />
          <ToolbarButton icon={<Maximize2 className="w-3.5 h-3.5" />} />
        </div>
      )}

      {/* Text Area */}
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder || "Describe the task objectives..."}
        className="min-h-[200px] p-4 bg-transparent text-[13.5px] text-white/80 placeholder:text-white/10 outline-none resize-none font-dm leading-relaxed disabled:opacity-50"
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-white/[0.01]">
        <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest">
          {localValue.length} characters
        </span>
        <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest">
          Auto-saving enabled
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={cn(
      "w-7 h-7 flex items-center justify-center rounded-md transition-all",
      active ? "bg-primary/20 text-primary" : "text-white/20 hover:text-white/60 hover:bg-white/5"
    )}>
      {icon}
    </button>
  );
}

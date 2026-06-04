'use client';

import React, { useEffect, useState } from 'react';
import { Search, Command, ArrowRight, Activity, Target, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[10vh]">
      <div className="bg-n800 border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 max-h-[90vh] overflow-y-auto">
        
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <Search className="text-t4" />
          <input 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, opportunities, commands... (Try 'crm')"
            className="flex-1 bg-transparent text-white placeholder:text-t4 focus:outline-none text-lg"
          />
          <div className="flex items-center gap-1 text-xs font-bold text-t4 bg-n900 px-2 py-1 rounded">
            ESC
          </div>
        </div>

        <div className="p-4 bg-n900/50 min-h-[300px] max-h-[500px] overflow-y-auto">
          {query.length === 0 ? (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-t4 uppercase tracking-widest mb-3 pl-2">Quick Actions</p>
                <div className="space-y-1">
                  <button onClick={() => { router.push('/leads'); setIsOpen(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left">
                    <div className="flex items-center gap-3">
                      <Target size={16} className="text-blue-400" />
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Find New Leads</span>
                    </div>
                    <ArrowRight size={14} className="text-t4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button onClick={() => { router.push('/automation'); setIsOpen(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left">
                    <div className="flex items-center gap-3">
                      <Zap size={16} className="text-accent" />
                      <span className="text-sm font-bold text-white group-hover:text-accent transition-colors">Build Automation</span>
                    </div>
                    <ArrowRight size={14} className="text-t4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-t4">
              <Search size={32} className="mx-auto mb-4 opacity-50" />
              <p>Global indexing is connecting to the search backend...</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

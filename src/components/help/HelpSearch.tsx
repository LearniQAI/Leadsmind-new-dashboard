'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ArrowRight, HelpCircle, FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { searchHelpArticles, logSearchClick } from '@/app/actions/help';

export default function HelpSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchLogId, setSearchLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchLogId(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchHelpArticles(query);
        if (res.data) {
          setResults(res.data);
          setSearchLogId(res.searchLogId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = async (articleId: string) => {
    if (searchLogId) {
      await logSearchClick(searchLogId, articleId);
    }
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto relative z-40">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search documentation (e.g. FNB bank feeds)..."
          className="w-full bg-[#080f28]/90 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xl transition duration-200"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
        ) : query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30 hover:text-white uppercase tracking-wider transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.trim().length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#060b1f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fade-in max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-white/40 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Scanning semantic vector models...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-rose-500/50 mx-auto" />
              <p className="text-xs font-bold text-white uppercase tracking-wider">No matching guides found</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Try searching for other terms like &quot;WhatsApp workflows&quot;, &quot;pipeline customisation&quot; or Absa / FNB banking.
              </p>
            </div>
          ) : (
            <div className="py-2.5 divide-y divide-white/[0.04]">
              <div className="px-4 py-2 text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Semantic Matching Results
              </div>
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  onClick={() => handleResultClick(item.id)}
                  className="block px-5 py-4 hover:bg-white/[0.02] transition duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5 group-hover:text-white transition" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-white group-hover:text-primary transition">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </div>
                      
                      {/* Highlighted Excerpt */}
                      <p className="text-xs text-white/50 leading-relaxed font-light line-clamp-2">
                        {item.excerpt}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 shrink-0 self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

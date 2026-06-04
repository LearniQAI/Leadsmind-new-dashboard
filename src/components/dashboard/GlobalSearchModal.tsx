"use client";
import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  User, 
  Target, 
  FileText, 
  CheckSquare, 
  Briefcase,
  ArrowRight,
  Command,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import useGlobalContext from '@/hooks/use-context';
import { createClient } from '@/lib/supabase/client';

const GlobalSearchModal = () => {
  const { searchOpen, setSearchOpen } = useGlobalContext();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('global_search', {
          query_text: query,
          workspace_id: workspaceId
        });

        if (!error && data) {
          setResults(data);
          setActiveIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      const result = results[activeIndex];
      window.location.href = result.link;
      setSearchOpen(false);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'fa-user': return <User size={16} />;
      case 'fa-crosshairs': return <Target size={16} />;
      case 'fa-file-invoice-dollar': return <FileText size={16} />;
      case 'fa-list-check': return <CheckSquare size={16} />;
      case 'fa-diagram-project': return <Briefcase size={16} />;
      default: return <Search size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CONTACT': return 'text-accent2 bg-accent2/10';
      case 'OPPORTUNITY': return 'text-green bg-green/10';
      case 'INVOICE': return 'text-amber bg-amber/10';
      case 'TASK': return 'text-purple bg-purple/10';
      case 'PROJECT': return 'text-cyan bg-cyan/10';
      default: return 'text-t3 bg-white/5';
    }
  };

  return (
    <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <AnimatePresence>
        {searchOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-n900/80 backdrop-blur-sm z-[9999]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 flex items-start justify-center pt-[15vh] z-[10000] px-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full max-w-xl bg-n800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto max-h-[90vh] overflow-y-auto"
                >
                  {/* Search Input Area */}
                  <div className="relative border-b border-white/5 bg-white/[0.01]">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                      {loading ? (
                        <Loader2 size={20} className="text-accent animate-spin" />
                      ) : (
                        <Search size={20} className="text-t3" />
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search across your entire workspace..."
                      className="w-full bg-transparent py-5 pl-14 pr-16 text-[15px] text-t1 placeholder:text-t3 focus:outline-none font-space font-medium"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="absolute inset-y-0 right-5 flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-t3 font-bold uppercase tracking-tighter">
                        ESC
                      </div>
                      <button 
                        onClick={() => setSearchOpen(false)}
                        className="p-1 hover:bg-white/5 rounded-full transition-colors text-t3 hover:text-t1"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Results Area */}
                  <div className="max-h-[60vh] overflow-y-auto common-scrollbar p-2">
                    {query.trim().length < 2 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4 rotate-3 text-t4">
                          <Command size={32} />
                        </div>
                        <h4 className="text-t2 font-bold text-[14px] font-space uppercase tracking-widest mb-1">Leadsmind Command Center</h4>
                        <p className="text-t3 text-[11px] max-w-[280px]">Type at least 2 characters to search for contacts, deals, invoices, and more.</p>
                        
                        <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-[400px]">
                          {['Contacts', 'Deals', 'Invoices', 'Tasks'].map(item => (
                            <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-t3 font-bold uppercase tracking-tight">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                              Search {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : results.length > 0 ? (
                      <div className="space-y-1">
                        {results.map((result, index) => (
                          <Link
                            key={result.id}
                            href={result.link}
                            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${
                              index === activeIndex ? 'bg-accent/10 border border-accent/20' : 'bg-transparent border border-transparent hover:bg-white/[0.03]'
                            }`}
                            onClick={() => setSearchOpen(false)}
                            onMouseEnter={() => setActiveIndex(index)}
                          >
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getCategoryColor(result.category)}`}>
                              {getIcon(result.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase font-space ${getCategoryColor(result.category)}`}>
                                  {result.category}
                                </span>
                                {index === activeIndex && (
                                  <span className="text-[10px] text-accent animate-pulse font-bold">↵ ENTER</span>
                                )}
                              </div>
                              <h6 className="text-[14px] font-bold text-t1 truncate">{result.title}</h6>
                              <p className="text-[12px] text-t3 truncate">{result.subtitle}</p>
                            </div>
                            <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${index === activeIndex ? 'opacity-100' : ''}`}>
                              <ArrowRight size={16} className="text-accent" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : !loading && (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-red/5 flex items-center justify-center mb-4 text-red/40">
                          <Search size={32} />
                        </div>
                        <h4 className="text-t1 font-bold text-[14px] font-space uppercase tracking-widest">No Results Found</h4>
                        <p className="text-t3 text-[12px] mt-1">We couldn't find anything matching "{query}"</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Bar */}
                  <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-t3 font-medium">
                        <span className="bg-white/5 border border-white/10 px-1 rounded">↑↓</span> Navigate
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-t3 font-medium">
                        <span className="bg-white/5 border border-white/10 px-1 rounded">↵</span> Select
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-t3 font-medium">
                        <span className="bg-white/5 border border-white/10 px-1 rounded">ESC</span> Close
                      </div>
                    </div>
                    <div className="text-[10px] text-t4 font-black uppercase tracking-widest">
                      Leadsmind v1.1
                    </div>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default GlobalSearchModal;

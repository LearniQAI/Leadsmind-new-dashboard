"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  Loader2,
  FilePlus,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import useGlobalContext from '@/hooks/use-context';
import { createClient } from '@/lib/supabase/client';

// Quick-jump shortcuts shown before the user types anything. These are plain
// navigation entry points to real, existing pages — they do not touch the
// global_search RPC or its results at all.
const QUICK_ACTIONS = [
  { key: 'contacts', label: 'Jump to Contacts', href: '/contacts', category: 'CONTACT', icon: 'fa-user' },
  { key: 'deals', label: 'Jump to Pipeline', href: '/pipelines', category: 'OPPORTUNITY', icon: 'fa-crosshairs' },
  { key: 'invoices', label: 'Jump to Invoices', href: '/invoices', category: 'INVOICE', icon: 'fa-file-invoice-dollar' },
  { key: 'tasks', label: 'Jump to Tasks', href: '/tasks', category: 'TASK', icon: 'fa-list-check' },
  { key: 'create-invoice', label: 'Create Invoice', href: '/invoices/new', category: 'INVOICE', icon: 'create' },
] as const;

// global_search (supabase/migrations/20260713000001_global_search_rpc.sql) returns
// these five categories, in this display order.
const CATEGORY_ORDER = ['CONTACT', 'OPPORTUNITY', 'INVOICE', 'TASK', 'PROJECT'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  CONTACT: 'Contacts',
  OPPORTUNITY: 'Deals',
  INVOICE: 'Invoices',
  TASK: 'Tasks',
  PROJECT: 'Projects',
};

// The RPC's `link` column points at /opportunities/:id, /tasks/:id and
// /projects/:id, none of which exist as pages in this app (opportunities/tasks/
// projects are opened from their list views, not a dedicated detail route) — so
// clicking those results would 404. This resolves each result to somewhere real
// without touching the RPC itself. Contacts and invoices do have real per-record
// pages, so those pass through unchanged.
function resolveResultLink(result: { category: string; link: string }): string {
  switch (result.category) {
    case 'OPPORTUNITY':
      return '/pipelines';
    case 'TASK':
      return '/tasks';
    case 'PROJECT':
      return '/projects';
    default:
      return result.link;
  }
}

const GlobalSearchModal = () => {
  const { searchOpen, setSearchOpen } = useGlobalContext();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id;
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const isBrowsingQuickActions = query.trim().length < 2;
  const activeList: readonly { label: string; href: string }[] = isBrowsingQuickActions ? QUICK_ACTIONS : results;

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
      setActiveIndex(0);
    }
  }, [searchOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setActiveIndex(0);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('global_search', {
          query_text: query,
          workspace_id: workspaceId
        });

        if (!error && data) {
          const sorted = [...data].sort(
            (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
          );
          setResults(sorted);
          setActiveIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workspaceId, supabase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < activeList.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && activeList[activeIndex]) {
      e.preventDefault();
      if (isBrowsingQuickActions) {
        router.push(activeList[activeIndex].href);
        setSearchOpen(false);
      } else {
        const result = results[activeIndex];
        window.location.href = resolveResultLink(result);
        setSearchOpen(false);
      }
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
      case 'create': return <FilePlus size={16} />;
      default: return <Search size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CONTACT': return '!text-dash-accent bg-dash-accent/10';
      case 'OPPORTUNITY': return 'text-emerald-600 bg-emerald-500/10';
      case 'INVOICE': return 'text-amber-600 bg-amber-500/10';
      case 'TASK': return 'text-purple-600 bg-purple-500/10';
      case 'PROJECT': return 'text-cyan-600 bg-cyan-500/10';
      default: return '!text-dash-textMuted bg-dash-surface';
    }
  };

  const motionProps = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.01 },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: -12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: -12 },
        transition: { duration: 0.18, ease: 'easeOut' as const },
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
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.15 }}
                className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-[9999]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <div className="fixed inset-0 flex items-start justify-center pt-[15vh] z-[10000] px-4 pointer-events-none">
                <Dialog.Title className="sr-only">Search LeadsMind</Dialog.Title>
                <motion.div
                  {...motionProps}
                  className="w-full max-w-xl bg-dash-bg border border-dash-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col"
                >
                  {/* Search Input Area */}
                  <div className="relative border-b border-dash-border focus-within:bg-dash-accent/[0.03] focus-within:border-dash-accent/30 transition-colors flex-shrink-0">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                      {loading ? (
                        <Loader2 size={20} className="!text-dash-accent animate-spin" />
                      ) : (
                        <Search size={20} className="!text-dash-textMuted" />
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search across your entire workspace..."
                      className="w-full bg-transparent py-5 pl-14 pr-24 text-[15px] !text-dash-text placeholder:!text-dash-textMuted focus:outline-none font-medium"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="absolute inset-y-0 right-5 flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-dash-surface border border-dash-border px-1.5 py-0.5 rounded text-[10px] !text-dash-textMuted font-bold uppercase tracking-tighter">
                        ESC
                      </div>
                      <button
                        onClick={() => setSearchOpen(false)}
                        aria-label="Close search"
                        className="p-1 hover:bg-dash-surface rounded-full transition-colors !text-dash-textMuted hover:!text-dash-text"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Results / Quick Actions Area */}
                  <div className="max-h-[60vh] overflow-y-auto common-scrollbar p-2">
                    {isBrowsingQuickActions ? (
                      <div className="py-2">
                        <p className="px-3 pt-2 pb-3 text-[10px] font-black uppercase tracking-widest !text-dash-textMuted">
                          Quick Actions
                        </p>
                        <div className="space-y-1">
                          {QUICK_ACTIONS.map((action, index) => (
                            <Link
                              key={action.key}
                              href={action.href}
                              onClick={() => setSearchOpen(false)}
                              onMouseEnter={() => setActiveIndex(index)}
                              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-150 group border ${
                                index === activeIndex
                                  ? 'bg-dash-accent/10 border-dash-accent/30'
                                  : 'bg-transparent border-transparent hover:bg-dash-surface'
                              }`}
                            >
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getCategoryColor(action.category)}`}>
                                {getIcon(action.icon)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h6 className="text-[14px] font-bold !text-dash-text truncate">{action.label}</h6>
                              </div>
                              {index === activeIndex && (
                                <span className="text-[10px] !text-dash-accent font-bold flex-shrink-0">↵ ENTER</span>
                              )}
                              <ArrowRight
                                size={16}
                                className={`!text-dash-accent flex-shrink-0 transition-opacity ${
                                  index === activeIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                              />
                            </Link>
                          ))}
                        </div>
                        <p className="px-3 pt-4 pb-1 text-[11px] !text-dash-textMuted">
                          Or type to search contacts, deals, invoices, tasks, and more.
                        </p>
                      </div>
                    ) : results.length > 0 ? (
                      <div className="space-y-1">
                        {results.map((result, index) => {
                          const isFirstOfCategory = index === 0 || results[index - 1].category !== result.category;
                          return (
                            <React.Fragment key={result.id}>
                              {isFirstOfCategory && (
                                <p className={`px-3 pb-1 text-[10px] font-black uppercase tracking-widest !text-dash-textMuted ${index === 0 ? 'pt-2' : 'pt-4'}`}>
                                  {CATEGORY_LABELS[result.category] || result.category}
                                </p>
                              )}
                              <Link
                                href={resolveResultLink(result)}
                                className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-150 group border ${
                                  index === activeIndex ? 'bg-dash-accent/10 border-dash-accent/30' : 'bg-transparent border-transparent hover:bg-dash-surface'
                                }`}
                                onClick={() => setSearchOpen(false)}
                                onMouseEnter={() => setActiveIndex(index)}
                              >
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getCategoryColor(result.category)}`}>
                                  {getIcon(result.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h6 className="text-[14px] font-bold !text-dash-text truncate">{result.title}</h6>
                                  <p className="text-[12px] !text-dash-textMuted truncate">{result.subtitle}</p>
                                </div>
                                {index === activeIndex && (
                                  <span className="text-[10px] !text-dash-accent font-bold flex-shrink-0">↵ ENTER</span>
                                )}
                                <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${index === activeIndex ? 'opacity-100' : ''}`}>
                                  <ArrowRight size={16} className="!text-dash-accent" />
                                </div>
                              </Link>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : !loading && (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/5 flex items-center justify-center mb-4 text-red-500/40">
                          <Search size={32} />
                        </div>
                        <h4 className="!text-dash-text font-bold text-[14px] uppercase tracking-widest">No results for &quot;{query}&quot;</h4>
                        <p className="!text-dash-textMuted text-[12px] mt-1">Try a different name, number, or keyword.</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Bar */}
                  <div className="px-5 py-3 bg-dash-surface border-t border-dash-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-medium">
                        <span className="bg-dash-bg border border-dash-border px-1 rounded">↑↓</span> Navigate
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-medium">
                        <span className="bg-dash-bg border border-dash-border px-1 rounded">↵</span> Select
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-medium">
                        <span className="bg-dash-bg border border-dash-border px-1 rounded">ESC</span> Close
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-black uppercase tracking-widest">
                      <Command size={11} />
                      LeadsMind
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

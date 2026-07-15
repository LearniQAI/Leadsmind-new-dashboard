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
  Loader2,
  Plus,
  Clock,
  Star,
  CornerDownLeft
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import useGlobalContext from '@/hooks/use-context';
import { createClient } from '@/lib/supabase/client';

const QUICK_ACTIONS = [
  { key: 'create-lead', label: 'Create Lead', href: '/contacts/new', icon: Plus, color: '!text-blue-500' },
  { key: 'create-contact', label: 'Create Contact', href: '/contacts/new', icon: Plus, color: '!text-emerald-500' },
  { key: 'create-deal', label: 'Create Opportunity', href: '/pipelines', icon: Plus, color: 'text-amber-500' },
  { key: 'create-invoice', label: 'Create Invoice', href: '/invoices/new', icon: Plus, color: 'text-purple-500' },
  { key: 'create-website', label: 'Create Website', href: '/websites/new', icon: Plus, color: 'text-pink-500' },
  { key: 'create-automation', label: 'Create Automation', href: '/automations/new', icon: Plus, color: 'text-indigo-500' },
];

const RECENT_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Clock },
  { key: 'contacts', label: 'Contacts', href: '/contacts', icon: Clock },
  { key: 'website-builder', label: 'Website Builder', href: '/websites', icon: Clock },
  { key: 'invoices', label: 'Invoices', href: '/invoices', icon: Clock },
];

const FAVORITES = [
  { key: 'crm', label: 'CRM', href: '/contacts', icon: Star, color: 'text-amber-400' },
  { key: 'pipeline', label: 'Pipeline', href: '/pipelines', icon: Star, color: 'text-amber-400' },
  { key: 'automation', label: 'Automation', href: '/automations', icon: Star, color: 'text-amber-400' },
  { key: 'websites', label: 'Website Builder', href: '/websites', icon: Star, color: 'text-amber-400' },
];

const CATEGORY_ORDER: ReadonlyArray<'CONTACT' | 'OPPORTUNITY' | 'INVOICE' | 'TASK' | 'PROJECT'> = ['CONTACT', 'OPPORTUNITY', 'INVOICE', 'TASK', 'PROJECT'];
const CATEGORY_LABELS: Record<string, string> = {
  CONTACT: 'CRM Contact',
  OPPORTUNITY: 'Deal',
  INVOICE: 'Invoice',
  TASK: 'Task',
  PROJECT: 'Project',
};

function resolveResultLink(result: { category: string; link: string }): string {
  switch (result.category) {
    case 'OPPORTUNITY': return '/pipelines';
    case 'TASK': return '/tasks';
    case 'PROJECT': return '/projects';
    default: return result.link;
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

  const isBrowsingDefault = query.trim().length < 2;

  const defaultList = useMemo(() => [
    ...QUICK_ACTIONS.map(a => ({ ...a, type: 'action' })),
    ...RECENT_ITEMS.map(a => ({ ...a, type: 'recent' })),
    ...FAVORITES.map(a => ({ ...a, type: 'favorite' }))
  ], []);

  const activeList: any[] = isBrowsingDefault ? defaultList : results;

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
      const item = activeList[activeIndex];
      const link = isBrowsingDefault ? item.href : resolveResultLink(item);
      if (e.metaKey || e.ctrlKey) {
        window.open(link, '_blank');
      } else {
        if (isBrowsingDefault) {
          router.push(link);
        } else {
          window.location.href = link;
        }
        setSearchOpen(false);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'fa-user': return <User size={15} />;
      case 'fa-crosshairs': return <Target size={15} />;
      case 'fa-file-invoice-dollar': return <FileText size={15} />;
      case 'fa-list-check': return <CheckSquare size={15} />;
      case 'fa-diagram-project': return <Briefcase size={15} />;
      default: return <FileText size={15} />;
    }
  };

  const overlayMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: shouldReduceMotion ? 0.01 : 0.15 }
  };

  const panelMotion = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : { initial: { opacity: 0, scale: 0.98, y: -8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.98, y: -8 }, transition: { duration: 0.15, ease: 'easeOut' } };

  return (
    <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <AnimatePresence>
        {searchOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={overlayMotion.initial}
                animate={overlayMotion.animate}
                exit={overlayMotion.exit}
                transition={overlayMotion.transition}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <div className="fixed inset-0 flex items-start justify-center pt-0 md:pt-[12vh] z-[10000] px-0 md:px-4 pointer-events-none">
                <Dialog.Title className="sr-only">Search LeadsMind</Dialog.Title>
                <motion.div
                  initial={panelMotion.initial}
                  animate={panelMotion.animate}
                  exit={panelMotion.exit}
                  transition={panelMotion.transition}
                  className="w-full h-full md:h-auto max-w-4xl bg-white border-0 md:border md:border-[#EEF2F7] rounded-none md:rounded-[20px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] overflow-hidden pointer-events-auto max-h-[100dvh] md:max-h-[85vh] flex flex-col"
                >
                  {/* Search Input Area */}
                  <div className="relative border-b border-[#EEF2F7] bg-white flex-shrink-0">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                      {loading ? (
                        <Loader2 size={22} className="!text-primary animate-spin" />
                      ) : (
                        <Search size={22} className="!text-slate-400" />
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search anything..."
                      className="w-full bg-transparent py-5 pl-14 pr-24 text-[18px] !text-slate-800 placeholder:!text-slate-400 focus:outline-none font-medium"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="absolute inset-y-0 right-5 flex items-center gap-2">
                      <button
                        onClick={() => setSearchOpen(false)}
                        aria-label="Close search"
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors !text-slate-400 hover:!text-slate-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-y-auto common-scrollbar p-3 pb-4 rounded-b-none md:rounded-b-[20px] max-h-[calc(100dvh-64px)] md:max-h-[60vh]">
                    {isBrowsingDefault ? (
                      <div className="space-y-4 pb-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Recent */}
                          <div>
                            <p className="px-3 pt-2 pb-2 text-[10px] font-bold !text-slate-400 uppercase tracking-wider">Recent</p>
                            <div className="space-y-1">
                              {RECENT_ITEMS.map((item) => {
                                const globalIndex = defaultList.findIndex(x => x.key === item.key);
                                return (
                                  <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={() => setSearchOpen(false)}
                                    onMouseEnter={() => setActiveIndex(globalIndex)}
                                    className={`flex items-center justify-between p-2 rounded-xl transition-colors ${globalIndex === activeIndex ? 'bg-slate-100 !text-slate-900' : '!text-slate-600 hover:bg-slate-50 hover:!text-slate-800'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <item.icon size={14} className="!text-slate-400" />
                                      <span className="text-[13px] font-medium">{item.label}</span>
                                    </div>
                                    {globalIndex === activeIndex && <CornerDownLeft size={14} className="!text-slate-400" />}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>

                          {/* Favorites */}
                          <div>
                            <p className="px-3 pt-2 pb-2 text-[10px] font-bold !text-slate-400 uppercase tracking-wider">Favorites</p>
                            <div className="space-y-1">
                              {FAVORITES.map((item) => {
                                const globalIndex = defaultList.findIndex(x => x.key === item.key);
                                return (
                                  <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={() => setSearchOpen(false)}
                                    onMouseEnter={() => setActiveIndex(globalIndex)}
                                    className={`flex items-center justify-between p-2 rounded-xl transition-colors ${globalIndex === activeIndex ? 'bg-slate-100 !text-slate-900' : '!text-slate-600 hover:bg-slate-50 hover:!text-slate-800'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <item.icon size={14} className={item.color} fill="currentColor" />
                                      <span className="text-[13px] font-medium">{item.label}</span>
                                    </div>
                                    {globalIndex === activeIndex && <CornerDownLeft size={14} className="!text-slate-400" />}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div>
                          <p className="px-3 pt-2 pb-2 text-[10px] font-bold !text-slate-400 uppercase tracking-wider">Quick Actions</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {QUICK_ACTIONS.map((action) => {
                              const globalIndex = defaultList.findIndex(x => x.key === action.key);
                              return (
                                <Link
                                  key={action.key}
                                  href={action.href}
                                  onClick={() => setSearchOpen(false)}
                                  onMouseEnter={() => setActiveIndex(globalIndex)}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-[12px] transition-colors group ${globalIndex === activeIndex ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                                >
                                  <div className={`w-7 h-7 rounded-lg bg-white border border-[#EEF2F7] shadow-sm flex items-center justify-center flex-shrink-0 ${action.color}`}>
                                    <action.icon size={14} />
                                  </div>
                                  <span className={`text-[13px] font-semibold truncate ${globalIndex === activeIndex ? '!text-primary' : '!text-slate-700'}`}>
                                    {action.label}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : results.length > 0 ? (
                      <div className="space-y-1 pb-2">
                        {results.map((result, index) => {
                          const isFirstOfCategory = index === 0 || results[index - 1].category !== result.category;
                          const categoryLabel = CATEGORY_LABELS[result.category] || result.category;
                          return (
                            <React.Fragment key={result.id}>
                              {isFirstOfCategory && (
                                <p className={`px-3 pb-1.5 text-[10px] font-bold !text-slate-400 uppercase tracking-wider ${index === 0 ? 'pt-1' : 'pt-4'}`}>
                                  {result.category}
                                </p>
                              )}
                              <Link
                                href={resolveResultLink(result)}
                                onClick={() => setSearchOpen(false)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`flex items-center justify-between gap-4 p-3 rounded-[12px] transition-colors border border-transparent ${index === activeIndex ? 'bg-primary/5 border-primary/20' : 'bg-transparent hover:bg-slate-50'}`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${index === activeIndex ? 'bg-primary !text-white shadow-md' : 'bg-white border border-[#EEF2F7] !text-slate-500 shadow-sm'}`}>
                                    {getIcon(result.icon)}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2">
                                      <h6 className={`text-[14px] font-semibold truncate ${index === activeIndex ? '!text-primary' : '!text-slate-800'}`}>
                                        {result.title}
                                      </h6>
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 !text-slate-500">
                                        {categoryLabel}
                                      </span>
                                    </div>
                                    <p className="text-[12px] !text-slate-500 truncate mt-0.5">{result.subtitle}</p>
                                  </div>
                                </div>
                                {index === activeIndex && (
                                  <div className="flex items-center gap-1 text-[11px] font-semibold !text-primary flex-shrink-0 bg-primary/10 px-2 py-1 rounded-md">
                                    <CornerDownLeft size={12} /> Open
                                  </div>
                                )}
                              </Link>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : !loading && (
                      <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#EEF2F7]">
                          <Search size={24} className="!text-slate-400" />
                        </div>
                        <h4 className="!text-slate-800 font-bold text-[15px]">No matches found</h4>
                        <p className="!text-slate-500 text-[13px] mt-2 mb-4">Try searching for:</p>
                        <div className="flex gap-2">
                          {['contacts', 'invoices', 'automations'].map(term => (
                            <button
                              key={term}
                              onClick={() => setQuery(term)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#EEF2F7] rounded-lg text-[12px] !text-slate-600 font-medium transition-colors"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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

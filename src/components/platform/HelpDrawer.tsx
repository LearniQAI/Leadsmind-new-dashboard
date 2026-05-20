'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, HelpCircle, BookOpen, ChevronRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { getContextualArticles } from '@/app/actions/help';

export default function HelpDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [releaseNote, setReleaseNote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleOpen = () => setIsOpen(true);

    window.addEventListener('toggle-help-drawer', handleToggle);
    window.addEventListener('open-help-drawer', handleOpen);

    return () => {
      window.removeEventListener('toggle-help-drawer', handleToggle);
      window.removeEventListener('open-help-drawer', handleOpen);
    };
  }, []);

  // Fetch articles and release notes when drawer is opened or pathname changes
  useEffect(() => {
    if (!isOpen) return;

    async function fetchHelp() {
      setLoading(true);
      try {
        const res = await getContextualArticles(pathname || '/dashboard');
        if (res.data) {
          setArticles(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchReleaseNote() {
      try {
        const res = await fetch(`/api/platform/release-notes?route=${encodeURIComponent(pathname || '/dashboard')}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setReleaseNote(json.data[0]);
          } else {
            setReleaseNote(null);
          }
        }
      } catch (err) {
        console.error("Error fetching release note:", err);
      }
    }

    fetchHelp();
    fetchReleaseNote();
  }, [isOpen, pathname]);

  const handleDismissAlert = () => {
    setReleaseNote(null);
    // Dispatch global event to clear header dot alert
    window.dispatchEvent(new CustomEvent('dismiss-help-alert'));
  };

  const getPageTitle = (path: string) => {
    if (path.includes('/contacts')) return 'Workspace Contacts & Tags';
    if (path.includes('/pipelines')) return 'Sales Pipelines & Deals';
    if (path.includes('/calendar')) return 'Booking Slots Scheduler';
    if (path.includes('/invoices')) return 'Financial Invoicing & Gateways';
    if (path.includes('/automations')) return 'Email & SMS Automations';
    if (path.includes('/websites') || path.includes('/funnels')) return 'Landing Page & Web Builder';
    if (path.includes('/campaigns')) return 'Newsletter Email Campaigns';
    if (path.includes('/support')) return 'Technical Tickets Queue';
    return 'Workspace Dashboard';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] animate-fade-in flex justify-end font-dm-sans">
      <div className="w-full max-w-md bg-[#04091a] border-l border-white/10 h-full flex flex-col shadow-2xl relative animate-slide-in-right">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#060b1f]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-space-grotesk">Contextual Assistance</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold pt-0.5">Page-specific guides & support</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Diagnostic Active Path Info */}
          <div className="p-4 bg-[#080f28]/60 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Active Platform Screen
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-space-grotesk">
              {getPageTitle(pathname || '/')}
            </h4>
            <p className="text-[10px] text-white/40 truncate">Route path: {pathname || '/dashboard'}</p>
          </div>

          {/* Operational Update Banner */}
          {releaseNote && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 relative overflow-hidden animate-fade-in">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-400 uppercase tracking-widest">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Operational Update</span>
              </div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider font-space-grotesk">
                {releaseNote.title}
              </h5>
              <p className="text-[11px] text-white/70 leading-relaxed font-light">
                {releaseNote.description}
              </p>
              <div className="pt-1.5 flex justify-end">
                <button
                  onClick={handleDismissAlert}
                  className="text-[9px] font-black text-white/40 hover:text-white hover:underline uppercase tracking-widest transition"
                >
                  Acknowledge & Clear
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Suggested Documentation</span>
            </div>

            {loading ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Matching relevant guides...</span>
              </div>
            ) : articles.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/45">
                No matching articles found for this layout route.
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((art) => (
                  <a
                    key={art.id}
                    href={`/articles/${art.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-[#080f28]/45 border border-white/5 hover:border-primary/20 rounded-xl transition duration-150 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className="inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/10">
                          {art.category}
                        </span>
                        <h5 className="text-xs font-bold text-white group-hover:text-primary transition">
                          {art.title}
                        </h5>
                        <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed font-light">
                          {art.body_plain}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 self-center group-hover:translate-x-0.5 group-hover:text-primary transition" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Support Ticket fallthrough widget */}
          <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Need Technical Support?</h5>
            <p className="text-[11px] text-white/40 leading-relaxed font-light">
              Can&apos;t find what you need in the docs? Submit an urgent diagnostic report ticket to our team directly.
            </p>
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/support';
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[10px] font-black uppercase tracking-widest text-white transition text-center shadow-lg"
            >
              Go to Support Desk
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#060b1f] text-center">
          <a
            href="/articles"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-widest flex items-center justify-center gap-1"
          >
            Open Help Center Hub <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}


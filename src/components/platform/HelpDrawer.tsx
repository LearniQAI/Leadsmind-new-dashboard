'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, HelpCircle, BookOpen, ChevronRight, Sparkles, Loader2, AlertCircle, Search, RefreshCw, Plus, Link2, CheckCircle2 } from 'lucide-react';
import { getContextualArticles } from '@/app/actions/help';

export default function HelpDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [releaseNote, setReleaseNote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  useEffect(() => {
    if (!isOpen) return;
    fetchHelp();
    fetchReleaseNote();
  }, [isOpen, pathname]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHelp(), fetchReleaseNote()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDismissAlert = () => {
    setReleaseNote(null);
    window.dispatchEvent(new CustomEvent('dismiss-help-alert'));
  };

  const getPageContext = (path: string) => {
    if (path.includes('/contacts')) return { title: 'Workspace Contacts & Tags', actions: ['Create Contact', 'Import List'] };
    if (path.includes('/pipelines')) return { title: 'Sales Pipelines & Deals', actions: ['Create Opportunity', 'Manage Pipelines'] };
    if (path.includes('/calendar')) return { title: 'Booking Slots Scheduler', actions: ['Create Event', 'Sync Calendar'] };
    if (path.includes('/invoices')) return { title: 'Financial Invoicing', actions: ['Create Invoice', 'Connect Stripe'] };
    if (path.includes('/automations')) return { title: 'Email & SMS Automations', actions: ['Create Workflow', 'View Logs'] };
    if (path.includes('/websites') || path.includes('/funnels')) return { title: 'Landing Page & Web Builder', actions: ['Create Website', 'Connect Domain'] };
    return { title: 'Dashboard Overview', actions: ['Create Lead', 'Create Opportunity', 'View Pipeline', 'Open Analytics'] };
  };

  if (!isOpen) return null;

  const contextInfo = getPageContext(pathname || '/');

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[2100] animate-in fade-in flex justify-end font-dm-sans">
      <div className="w-[420px] max-w-[460px] bg-white border-l border-[#EEF2F7] h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-200">
        
        {/* Header Search */}
        <div className="px-5 py-4 border-b border-[#EEF2F7] bg-white relative">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 !text-slate-400" />
          <input 
            type="text" 
            placeholder="Search documentation..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-[#EEF2F7] rounded-xl text-[13px] !text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:!text-slate-400"
          />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EEF2F7] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl !text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold !text-slate-800">Workspace Assistant</h3>
              <p className="text-[11px] !text-slate-500 font-medium">Dashboard Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-2 !text-slate-400 hover:!text-slate-700 hover:bg-slate-50 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 !text-slate-400 hover:!text-slate-700 hover:bg-slate-50 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar bg-white">
          
          {/* Current Context Card */}
          <div className="p-4 bg-slate-50 border border-[#EEF2F7] rounded-2xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
              <span className="text-[10px] !text-slate-400 font-medium">Last Updated: Just now</span>
            </div>
            <div>
              <span className="text-[10px] font-bold !text-slate-400 uppercase tracking-wider mb-1 block">
                Current Context
              </span>
              <h4 className="text-[14px] font-bold !text-slate-800">
                {contextInfo.title}
              </h4>
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-[11px] font-semibold !text-slate-600 block mb-2">Available Actions:</span>
              <ul className="space-y-1.5">
                {contextInfo.actions.map(action => (
                  <li key={action} className="text-[12px] !text-slate-600 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span> {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className="space-y-3">
            <span className="text-[12px] font-bold !text-slate-800 uppercase tracking-wider">Ask Anything</span>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 !text-primary" />
              <input 
                type="text" 
                placeholder="How do I create an automation?"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#EEF2F7] rounded-xl text-[13px] !text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:!text-slate-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#EEF2F7] rounded-lg text-[11px] font-medium !text-slate-600 transition-colors">
                How do I publish a website?
              </button>
              <button className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#EEF2F7] rounded-lg text-[11px] font-medium !text-slate-600 transition-colors">
                How do I connect a domain?
              </button>
              <button className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#EEF2F7] rounded-lg text-[11px] font-medium !text-slate-600 transition-colors">
                How does lead scoring work?
              </button>
            </div>
          </div>

          {/* Suggested Next Steps */}
          <div className="space-y-3">
            <span className="text-[12px] font-bold !text-slate-800 uppercase tracking-wider">Suggested Next Steps</span>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center gap-2 p-3 bg-white border border-[#EEF2F7] hover:border-slate-300 rounded-xl text-left transition-colors group">
                <div className="p-1.5 rounded-lg bg-slate-50 !text-slate-500 group-hover:!text-primary group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-semibold !text-slate-700">Create your first automation</span>
              </button>
              <button className="flex items-center gap-2 p-3 bg-white border border-[#EEF2F7] hover:border-slate-300 rounded-xl text-left transition-colors group">
                <div className="p-1.5 rounded-lg bg-slate-50 !text-slate-500 group-hover:!text-primary group-hover:bg-primary/10 transition-colors">
                  <Link2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-semibold !text-slate-700">Connect a custom domain</span>
              </button>
            </div>
          </div>

          {/* Recommended Resources */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#EEF2F7]">
              <BookOpen className="w-4 h-4 !text-slate-800" />
              <span className="text-[12px] font-bold !text-slate-800 uppercase tracking-wider">Recommended Resources</span>
            </div>

            {loading ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin !text-slate-400" />
                <span className="text-[11px] !text-slate-500 font-medium">Fetching workspace guides...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Fallback to static mock articles to ensure it looks good if empty */}
                <a
                  href="#"
                  className="block p-4 bg-[#F8FAFC] rounded-2xl transition hover:-translate-y-[1px] hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📘</span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[13px] font-bold !text-slate-800">Dashboard Analytics Guide</h5>
                        <span className="text-[10px] font-semibold !text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Guide</span>
                      </div>
                      <p className="text-[12px] !text-slate-500 leading-snug">
                        Learn how revenue, leads and conversion metrics are calculated.
                      </p>
                    </div>
                  </div>
                </a>
                <a
                  href="#"
                  className="block p-4 bg-[#F8FAFC] rounded-2xl transition hover:-translate-y-[1px] hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📘</span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[13px] font-bold !text-slate-800">Managing Opportunities</h5>
                        <span className="text-[10px] font-semibold !text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Tutorial</span>
                      </div>
                      <p className="text-[12px] !text-slate-500 leading-snug">
                        Learn pipeline stages and forecasting.
                      </p>
                    </div>
                  </div>
                </a>
                <a
                  href="#"
                  className="block p-4 bg-[#F8FAFC] rounded-2xl transition hover:-translate-y-[1px] hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📘</span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[13px] font-bold !text-slate-800">Automation Setup</h5>
                        <span className="text-[10px] font-semibold !text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Reference</span>
                      </div>
                      <p className="text-[12px] !text-slate-500 leading-snug">
                        Create workflows and triggers.
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Need Help? Block */}
          <div className="p-4 bg-slate-50 border border-[#EEF2F7] rounded-2xl space-y-3">
            <h5 className="text-[13px] font-bold !text-slate-800">Need Help?</h5>
            <p className="text-[12px] !text-slate-500 leading-relaxed">
              Can't find what you're looking for? Our support team is available.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button className="w-full py-2 bg-white border border-[#EEF2F7] hover:border-slate-300 rounded-xl text-[12px] font-semibold !text-slate-700 transition-colors shadow-sm">
                Open Help Center
              </button>
              <div className="flex gap-2">
                <button className="w-full py-2 bg-white border border-[#EEF2F7] hover:border-slate-300 rounded-xl text-[12px] font-semibold !text-slate-700 transition-colors shadow-sm">
                  Contact Support
                </button>
                <button className="w-full py-2 bg-white border border-[#EEF2F7] hover:border-slate-300 rounded-xl text-[12px] font-semibold !text-slate-700 transition-colors shadow-sm">
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EEF2F7] bg-white flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold !text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 !text-emerald-500" /> All systems operational
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold !text-slate-500">
            <a href="/docs" className="hover:!text-slate-800 transition-colors">Documentation</a>
            <a href="/api-docs" className="hover:!text-slate-800 transition-colors">API Docs</a>
          </div>
        </div>

      </div>
    </div>
  );
}


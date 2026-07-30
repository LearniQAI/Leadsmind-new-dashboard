import React from 'react';
import Link from 'next/link';
import { HelpCircle, Sparkles, BookOpen, Settings, Layers, Calendar, ChevronRight, User, HelpCircle as HelpIcon } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { seedHelpArticles } from '@/app/actions/help';
import HelpSearch from '@/components/help/HelpSearch';
import Wrapper from "@/components/layouts/DefaultWrapper";

export const dynamic = 'force-dynamic';

export default async function HelpCenterPage() {
  // Run self-healing seeding script automatically
  await seedHelpArticles();

  const supabase = await createServerClient();
  
  // Fetch seeded articles
  const { data: articles } = await supabase
    .from('help_articles')
    .select('id, slug, title, body_plain, category, last_reviewed_at')
    .order('title', { ascending: true });

  const list = articles || [];
  const gettingStarted = list.filter(a => a.category === 'Getting Started');
  const crmFoundations = list.filter(a => a.category === 'CRM Foundations');

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-surface font-dm-sans relative overflow-hidden">
      {/* Hero Banner */}
      <div className="py-20 px-4 md:px-8 border-b border-dash-border relative bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-dash-accent/10 text-dash-accent border border-dash-accent/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> LeadsMind Support Hub
          </div>
          <h1 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight !text-dash-text leading-tight">
            How can we <span className="text-dash-accent">help you today?</span>
          </h1>
          <p className="text-xs sm:text-sm !text-dash-textMuted max-w-xl mx-auto leading-relaxed">
            Search our knowledge database for step-by-step guides on configuring banking feeds, crm deal flows, or setting up automation triggers.
          </p>
          <div className="pt-2">
            <HelpSearch />
          </div>
        </div>
      </div>

      {/* Main categories listing */}
      <div className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Category: Getting Started */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-dash-border pb-4">
              <div className="p-3 bg-dash-accent/10 border border-dash-accent/20 rounded-2xl text-dash-accent">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-space-grotesk !text-dash-text">Getting Started</h2>
                <p className="text-xs !text-dash-textMuted">Workspace configuration, bank connections, and voice setups.</p>
              </div>
              <span className="ml-auto bg-dash-surface border border-dash-border text-[10px] font-bold px-2.5 py-1 rounded-md !text-dash-textMuted">
                {gettingStarted.length} Guides
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gettingStarted.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  className="p-5 bg-white border border-dash-border hover:border-dash-accent/40 hover:shadow-md rounded-2xl transition-all duration-200 motion-reduce:transition-none flex flex-col justify-between group h-40 shadow-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] !text-dash-textMuted leading-relaxed line-clamp-3">
                      {item.body_plain}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-dash-border">
                    <span className="text-[9px] !text-dash-textMuted uppercase tracking-widest font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Reviewed {new Date(item.last_reviewed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 !text-dash-textMuted group-hover:text-dash-accent group-hover:translate-x-0.5 transition-all motion-reduce:transition-none" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Category: CRM Foundations */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-dash-border pb-4">
              <div className="p-3 bg-purple/10 border border-purple/20 rounded-2xl text-purple">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-space-grotesk !text-dash-text">CRM Foundations</h2>
                <p className="text-xs !text-dash-textMuted">Pipeline configurations, tagging segments, and lead tracking.</p>
              </div>
              <span className="ml-auto bg-dash-surface border border-dash-border text-[10px] font-bold px-2.5 py-1 rounded-md !text-dash-textMuted">
                {crmFoundations.length} Guides
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {crmFoundations.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  className="p-5 bg-white border border-dash-border hover:border-purple/40 hover:shadow-md rounded-2xl transition-all duration-200 motion-reduce:transition-none flex flex-col justify-between group h-40 shadow-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold !text-dash-text group-hover:text-purple transition-colors motion-reduce:transition-none line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] !text-dash-textMuted leading-relaxed line-clamp-3">
                      {item.body_plain}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-dash-border">
                    <span className="text-[9px] !text-dash-textMuted uppercase tracking-widest font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Reviewed {new Date(item.last_reviewed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 !text-dash-textMuted group-hover:text-purple group-hover:translate-x-0.5 transition-all motion-reduce:transition-none" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  </Wrapper>
);
}

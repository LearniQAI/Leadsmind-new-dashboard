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
      <div className="min-h-screen bg-[#04091a] text-white font-dm-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10" />

      {/* Hero Banner */}
      <div className="py-20 px-4 md:px-8 border-b border-white/5 relative bg-[#060b1f]/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> LeadsMind Support Hub
          </div>
          <h1 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-tight">
            How can we <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">help you today?</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 max-w-xl mx-auto leading-relaxed">
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
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-space-grotesk text-white uppercase tracking-wider">Getting Started</h2>
                <p className="text-xs text-white/40">Workspace configuration, bank connections, and voice setups.</p>
              </div>
              <span className="ml-auto bg-white/5 border border-white/5 text-[10px] font-bold px-2.5 py-1 rounded-md text-white/50">
                {gettingStarted.length} Guides
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gettingStarted.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  className="p-5 bg-[#080f28]/60 border border-white/5 hover:border-primary/30 rounded-2xl transition duration-200 flex flex-col justify-between group h-40 shadow-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white group-hover:text-primary transition line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-white/45 leading-relaxed line-clamp-3">
                      {item.body_plain}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Reviewed {new Date(item.last_reviewed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-primary group-hover:translate-x-0.5 transition" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Category: CRM Foundations */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-space-grotesk text-white uppercase tracking-wider">CRM Foundations</h2>
                <p className="text-xs text-white/40">Pipeline configurations, tagging segments, and lead tracking.</p>
              </div>
              <span className="ml-auto bg-white/5 border border-white/5 text-[10px] font-bold px-2.5 py-1 rounded-md text-white/50">
                {crmFoundations.length} Guides
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {crmFoundations.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  className="p-5 bg-[#080f28]/60 border border-white/5 hover:border-purple-500/30 rounded-2xl transition duration-200 flex flex-col justify-between group h-40 shadow-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white group-hover:text-purple-400 transition line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-white/45 leading-relaxed line-clamp-3">
                      {item.body_plain}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Reviewed {new Date(item.last_reviewed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
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

import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { ArrowRight, Sparkles } from 'lucide-react';
import { groupArticlesByCategory, ACCENT_CLASSES } from '@/lib/help/categoryConfig';

export const dynamic = 'force-dynamic';

export default async function HelpCenterLandingPage() {
  const supabase = await createServerClient();
  const { data: articles } = await supabase
    .from('help_articles')
    .select('id, slug, title, body_plain, category, last_reviewed_at')
    .order('title', { ascending: true });

  const categories = groupArticlesByCategory(articles || []);
  const totalCount = categories.reduce((sum, c) => sum + c.articles.length, 0);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 bg-dash-accent/10 text-dash-accent border border-dash-accent/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> LeadsMind Support Hub
        </div>
        <h1 className="font-space-grotesk text-2xl sm:text-3xl font-bold tracking-tight !text-dash-text leading-tight">
          How can we <span className="text-dash-accent">help you today?</span>
        </h1>
        <p className="text-xs sm:text-sm !text-dash-textMuted max-w-md mx-auto leading-relaxed">
          Browse {totalCount} guides across {categories.length} categories in the sidebar, or search for
          a topic — every real, verified article is one click away.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((category) => {
          const accent = ACCENT_CLASSES[category.accent];
          const Icon = category.icon;
          const firstArticle = category.articles[0];
          return (
            <Link
              key={category.name}
              href={firstArticle ? `/articles/${firstArticle.slug}` : '/articles'}
              className={`group p-4 bg-white border border-dash-border ${accent.hoverBorder} hover:shadow-md rounded-2xl transition-all duration-200 motion-reduce:transition-none flex items-start gap-3 shadow-sm`}
            >
              <span className={`w-9 h-9 shrink-0 rounded-xl ${accent.iconBg} border ${accent.iconBorder} ${accent.iconText} flex items-center justify-center`}>
                <Icon className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-[13px] font-bold !text-dash-text ${accent.hoverText} transition-colors motion-reduce:transition-none truncate`}>
                    {category.name}
                  </h2>
                </div>
                <p className="text-[11px] !text-dash-textMuted leading-relaxed line-clamp-2 mt-0.5">
                  {category.description}
                </p>
                <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wider mt-1.5 inline-block">
                  {category.articles.length} Guides
                </span>
              </div>
              <ArrowRight className={`w-3.5 h-3.5 !text-dash-textMuted ${accent.hoverText} group-hover:translate-x-0.5 transition-all motion-reduce:transition-none shrink-0 mt-1`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

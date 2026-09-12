import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { seedHelpArticles } from '@/app/actions/help';
import { groupArticlesByCategory } from '@/lib/help/categoryConfig';
import ArticlesNav from '@/components/help/ArticlesNav';
import Wrapper from '@/components/layouts/DefaultWrapper';

export const dynamic = 'force-dynamic';

// Shared shell for /articles and /articles/[slug] — the persistent left nav
// tree lives here so it survives real route navigation between articles
// (Next's layout model keeps this subtree mounted across child page changes,
// giving the GitBook/Docusaurus-style "one shell, many routed pages" behavior
// natively, unlike the Privacy Policy page's single-document anchor-scroll
// pattern which can't support 94 separately-routed articles).
export default async function ArticlesLayout({ children }: { children: React.ReactNode }) {
  await seedHelpArticles();

  const supabase = await createServerClient();
  const { data: articles } = await supabase
    .from('help_articles')
    .select('id, slug, title, body_plain, category, last_reviewed_at')
    .order('title', { ascending: true });

  const categories = groupArticlesByCategory(articles || []);

  return (
    <Wrapper>
      <div className="flex min-h-[calc(100vh-70px)] bg-dash-surface font-dm-sans">
        <ArticlesNav categories={categories} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Wrapper>
  );
}

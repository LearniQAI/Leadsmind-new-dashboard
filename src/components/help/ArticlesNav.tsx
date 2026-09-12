'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { CATEGORY_CONFIG, CategoryWithArticles, ACCENT_CLASSES } from '@/lib/help/categoryConfig';
import HelpSearch from './HelpSearch';

// The `categories` prop crossing the Server -> Client boundary from
// articles/layout.tsx has its `icon` field stripped (a LucideIcon component
// reference isn't serializable across that boundary), so icons are looked up
// locally here instead, by category name, from the same shared config.
type NavCategory = Omit<CategoryWithArticles, 'icon'>;

const ICON_BY_CATEGORY = new Map(CATEGORY_CONFIG.map((c) => [c.name, c.icon]));

interface ArticlesNavProps {
  categories: NavCategory[];
}

function activeSlugFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/articles\/([^/]+)/);
  return match ? match[1] : null;
}

function NavTree({
  categories,
  activeSlug,
  onNavigate,
}: {
  categories: NavCategory[];
  activeSlug: string | null;
  onNavigate?: () => void;
}) {
  const activeCategoryName = useMemo(
    () => categories.find((c) => c.articles.some((a) => a.slug === activeSlug))?.name ?? null,
    [categories, activeSlug]
  );

  // Only the category containing the active article starts expanded — with 94
  // articles across 10 categories, expanding everything by default would just
  // be a long undifferentiated scroll, defeating the point of a persistent tree.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activeCategoryName ? [activeCategoryName] : [])
  );

  // Re-expand automatically whenever navigation (tree click, search result,
  // or browser back/forward) lands on an article whose category isn't open yet.
  useEffect(() => {
    if (activeCategoryName) {
      setExpanded((prev) => (prev.has(activeCategoryName) ? prev : new Set(prev).add(activeCategoryName)));
    }
  }, [activeCategoryName]);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <nav className="space-y-1">
      {categories.map((category) => {
        const accent = ACCENT_CLASSES[category.accent];
        const isExpanded = expanded.has(category.name);
        const Icon = ICON_BY_CATEGORY.get(category.name);
        if (!Icon) return null;
        return (
          <div key={category.name}>
            <button
              type="button"
              onClick={() => toggle(category.name)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors motion-reduce:transition-none ${
                category.name === activeCategoryName
                  ? 'bg-dash-surface'
                  : 'hover:bg-dash-surface'
              }`}
            >
              <span className={`w-6 h-6 shrink-0 rounded-md ${accent.iconBg} ${accent.iconText} flex items-center justify-center`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="flex-1 min-w-0 text-[12px] font-bold !text-dash-text truncate">{category.name}</span>
              <span className="text-[9px] font-bold !text-dash-textMuted">{category.articles.length}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 !text-dash-textMuted transition-transform motion-reduce:transition-none shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="ml-[26px] border-l border-dash-border pl-3 py-1 space-y-0.5">
                {category.articles.map((article) => {
                  const isActive = article.slug === activeSlug;
                  return (
                    <Link
                      key={article.id}
                      href={`/articles/${article.slug}`}
                      onClick={onNavigate}
                      className={`block px-2 py-1.5 rounded-md text-[12px] leading-snug transition-colors motion-reduce:transition-none ${
                        isActive
                          ? `${accent.iconText} font-bold bg-dash-surface`
                          : '!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface'
                      }`}
                    >
                      {article.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function ArticlesNav({ categories }: ArticlesNavProps) {
  const pathname = usePathname();
  const activeSlug = activeSlugFromPathname(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalCount = categories.reduce((sum, c) => sum + c.articles.length, 0);

  // Closing on every real navigation (not just an explicit close-button click)
  // keeps the mobile drawer from staying open over the newly-loaded article.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar: two persistent side-by-side panes don't fit a phone
          screen, so below lg the tree collapses into a toggleable drawer —
          matching the same drawer pattern the app's own main sidebar uses. */}
      <div className="lg:hidden sticky top-[60px] z-30 bg-white border-b border-dash-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-dash-border bg-dash-surface text-dash-textMuted"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <HelpSearch />
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-dash-text/40" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-[300px] max-w-[85vw] bg-white border-r border-dash-border overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider !text-dash-textMuted">
                {totalCount} Guides
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-dash-surface text-dash-textMuted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavTree categories={categories} activeSlug={activeSlug} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop persistent left pane */}
      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 border-r border-dash-border bg-white h-[calc(100vh-70px)] sticky top-[70px] overflow-y-auto">
        <div className="p-4 border-b border-dash-border">
          <HelpSearch />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest !text-dash-textMuted">
            {totalCount} guides across {categories.length} categories
          </p>
        </div>
        <div className="p-3 flex-1">
          <NavTree categories={categories} activeSlug={activeSlug} />
        </div>
      </aside>
    </>
  );
}

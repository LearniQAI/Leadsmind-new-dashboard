'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';
import { docCategories, getDocCategory } from '@/data/docs';

const ROYAL = '#1359FF';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

function Sidebar({ activeSlug }: { activeSlug: string }) {
  return (
    <nav className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-[104px]">
        <Link
          href="/docs"
          className="block text-xs font-bold uppercase tracking-[0.15em] !text-[#94A3B8] hover:!text-[#0F172A] transition-colors mb-4"
        >
          ← Docs Home
        </Link>
        <ul className="space-y-1">
          {docCategories.map((c) => {
            const Icon = c.icon;
            const isActive = c.slug === activeSlug;
            return (
              <li key={c.slug}>
                <Link
                  href={`/docs/${c.slug}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive ? 'bg-[#1359FF0F]' : 'hover:bg-[#0F172A]/[0.04]'
                  }`}
                  style={{ color: isActive ? ROYAL : '#334155' }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default function DocCategoryContent({ slug, user }: { slug: string; user?: any }) {
  const category = getDocCategory(slug);
  if (!category) return null;
  const Icon = category.icon;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      <div className="container mx-auto px-6 pt-[104px] pb-24">
        <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
          <Sidebar activeSlug={category.slug} />

          <main className="flex-1 min-w-0 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mb-12 pb-8 border-b border-[#E2E8F0]"
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white mb-4"
                style={{ backgroundColor: ROYAL }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <h1 className="text-[clamp(26px,3.4vw,36px)] font-extrabold !text-[#0F172A] leading-tight mb-3">
                {category.label}
              </h1>
              <p className="text-base !text-[#64748B] leading-relaxed">{category.description}</p>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-14">
              {category.articles.map((article) => (
                <motion.article key={article.title} variants={item} id={article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
                  <h2 className="text-xl font-bold !text-[#0F172A] mb-3">{article.title}</h2>
                  <p className="text-[15px] !text-[#64748B] leading-relaxed mb-4">{article.intro}</p>

                  {article.steps && (
                    <ol className="space-y-3">
                      {article.steps.map((step, i) => (
                        <li key={step} className="flex items-start gap-3">
                          <span
                            className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
                            style={{ backgroundColor: ROYAL }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[15px] !text-[#334155] leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {article.bullets && (
                    <ul className="space-y-3">
                      {article.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <Check className="w-4 h-4 mt-1 shrink-0" style={{ color: ROYAL }} />
                          <span className="text-[15px] !text-[#334155] leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {article.note && (
                    <div className="flex items-start gap-2.5 mt-4 p-4 rounded-xl bg-[#FAFBFF] border border-[#E2E8F0]">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ROYAL }} />
                      <p className="text-sm !text-[#64748B] leading-relaxed italic">{article.note}</p>
                    </div>
                  )}
                </motion.article>
              ))}
            </motion.div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

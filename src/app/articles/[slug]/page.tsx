import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowLeft, Calendar, Clock, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getHelpArticle } from '@/app/actions/help';
import HelpFeedback from '@/components/help/HelpFeedback';
import HelpFaq from '@/components/help/HelpFaq';
import HelpVideoPlayer from '@/components/help/HelpVideoPlayer';
import Wrapper from "@/components/layouts/DefaultWrapper";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

// 1. Dynamic SEO Metadata Generator
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: article } = await getHelpArticle(params.slug);
  if (!article) {
    return { title: 'Article Not Found | LeadsMind' };
  }

  const title = `${article.title} | LeadsMind Help Center`;
  const desc = article.body_plain?.substring(0, 155) || 'Official LeadsMind verified platform setup guide.';
  const canonicalUrl = `https://www.leadsmind.io/articles/${params.slug}`;

  return {
    title,
    description: desc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: desc,
      url: canonicalUrl,
      type: 'article',
      publishedTime: article.created_at,
      modifiedTime: article.last_reviewed_at || article.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    }
  };
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { data: article, error } = await getHelpArticle(params.slug);
  if (error || !article) {
    return notFound();
  }

  const supabase = await createServerClient();
  
  // Fetch screenshots for this article
  const { data: screenshots } = await supabase
    .from('help_screenshots')
    .select('*')
    .eq('article_id', article.id);

  const formattedDate = new Date(article.last_reviewed_at || article.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate dynamic reading time (assuming 200 words per minute)
  const plainText = article.body_plain || '';
  const wordCount = plainText.split(/\s+/).length || 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Construct JSON-LD Schema
  const techArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    'headline': article.title,
    'description': article.body_plain || '',
    'category': article.category,
    'datePublished': article.created_at,
    'dateModified': article.last_reviewed_at || article.updated_at,
    'inLanguage': 'en',
    'publisher': {
      '@type': 'Organization',
      'name': 'LeadsMind',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://www.leadsmind.io/assets/images/logo.png'
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `https://www.leadsmind.io/articles/${article.slug}`
    }
  };

  const hasFaqs = Array.isArray(article.faq_json) && article.faq_json.length > 0;
  const faqSchema = hasFaqs ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': (article.faq_json as any[]).map(item => ({
      '@type': 'Question',
      'name': item.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.a
      }
    }))
  } : null;

  return (
    <Wrapper>
      {/* Injecting Structured LD-JSON Semantics */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Responsive custom style injections for tables and media frames */}
      <style>{`
        .help-article-content table {
          display: block;
          width: 100% !important;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        .help-article-content table th,
        .help-article-content table td {
          min-width: 120px;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }
        .help-article-content table th {
          background-color: rgba(255, 255, 255, 0.03);
          font-weight: 600;
          color: #ffffff;
        }
        .help-article-content img {
          max-width: 100% !important;
          height: auto !important;
        }
      `}</style>

      <div className="min-h-screen bg-[#04091a] text-white font-dm-sans py-16 px-4 md:px-8 relative overflow-hidden help-article-content">
        {/* Background radial highlight */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Back Link & Navigation Breadcrumb */}
          <div className="space-y-4">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition duration-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Documentation
            </Link>

            {/* breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-white/30 font-medium">
              <Link href="/articles" className="hover:text-white transition">Documentation</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/50">{article.category}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/80 line-clamp-1">{article.title}</span>
            </div>
          </div>

          {/* 1. Header Metrics block */}
          <div className="bg-[#080f28]/60 border border-white/5 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border bg-primary/10 text-primary border-primary/20">
                {article.category}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Verified Guide
              </span>
            </div>
            
            <h1 className="font-space-grotesk text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              {article.title}
            </h1>

            <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-widest font-semibold pt-2 border-t border-white/[0.04]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Reviewed {formattedDate}
              </span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {readingTimeMinutes} min read
              </span>
            </div>
          </div>

          {/* 2. Walkthrough Video Canvas */}
          {article.video_url && (
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">
                🎬 Interactive Video Walkthrough Tutorial
              </span>
              <HelpVideoPlayer 
                videoUrl={article.video_url} 
                chapters={Array.isArray(article.video_chapters_json) ? (article.video_chapters_json as any[]) : []}
              />
            </div>
          )}

          {/* Article plain body description */}
          {article.body_plain && (
            <div className="bg-[#080f28]/20 border border-white/5 p-6 rounded-2xl">
              <div 
                className="text-xs sm:text-sm md:text-base text-white/70 leading-relaxed font-light"
                dangerouslySetInnerHTML={{ __html: article.body_plain }}
              />
            </div>
          )}

          {/* 3. Step-by-Step Layout Engine with annotations */}
          {article.content_json && article.content_json.length > 0 && (
            <div className="bg-[#080f28]/30 border border-white/5 p-6 sm:p-8 rounded-3xl space-y-6 shadow-lg">
              <div className="flex items-center gap-2 pb-3.5 border-b border-white/[0.04]">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-space-grotesk">
                  Sequential Steps
                </h3>
              </div>
              
              <div className="relative border-l border-white/10 pl-6 sm:pl-8 ml-4.5 space-y-10">
                {article.content_json.map((step: any, idx: number) => {
                  const stepScreenshot = (screenshots || []).find((s: any) => s.step_index === idx);
                  
                  return (
                    <div key={idx} className="relative group space-y-3">
                      {/* Step marker */}
                      <span className="absolute -left-11 top-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-md">
                        {step.step || idx + 1}
                      </span>
                      
                      <div className="space-y-1.5">
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors duration-200">
                          {step.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-light">
                          {step.description}
                        </p>
                      </div>

                      {/* Step screenshot annotation frame (scaled with w-full max-w-full on mobile) */}
                      {stepScreenshot && (
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-[#020510]/80 p-2 shadow-inner w-full max-w-full md:max-w-xl">
                          <img 
                            src={stepScreenshot.image_url} 
                            alt={stepScreenshot.image_alt || step.title} 
                            className="w-full h-auto object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. FAQ Accordion Block */}
          {article.faq_json && article.faq_json.length > 0 && (
            <div className="bg-[#080f28]/30 border border-white/5 p-6 sm:p-8 rounded-3xl shadow-lg">
              <HelpFaq faqItems={article.faq_json} />
            </div>
          )}

          {/* 5. Interactive Feedback Controller */}
          <HelpFeedback 
            articleId={article.id} 
            yesInitial={article.helpful_yes} 
            noInitial={article.helpful_no} 
          />

        </div>
      </div>
    </Wrapper>
  );
}


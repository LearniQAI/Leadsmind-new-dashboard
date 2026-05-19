import React from 'react';
import { getPublicBlogPost, getBlogSettings } from '@/app/actions/publicBlog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, Clock, Eye, PencilLine } from 'lucide-react';
import ReadingProgressBar from '@/components/blog/public/ReadingProgressBar';
import TableOfContents from '@/components/blog/public/TableOfContents';
import ShareButtons from '@/components/blog/public/ShareButtons';
import NewsletterCapture from '@/components/blog/public/NewsletterCapture';
import BlogTracker from '@/components/blog/public/BlogTracker';
import BlogComments from '@/components/blog/public/BlogComments';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string; };
  searchParams: { preview?: string };
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const isPreview = searchParams?.preview === '1';
  const { data: post } = await getPublicBlogPost(params.slug, isPreview);
  if (!post) return { title: 'Article Not Found' };

  const title = post.seo_title || post.title;
  const desc = post.summary || 'Discover insights and strategies from the LeadsMind team.';
  const canonical = post.canonical_url || `https://www.leadsmind.io/blog/${post.slug}`;

  return {
    title: `${title} | LeadsMind Insights`,
    description: desc,
    alternates: { canonical },
    // Prevent draft previews from being indexed
    robots: isPreview ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description: desc,
      url: `https://www.leadsmind.io/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      images: post.cover_image ? [{ url: post.cover_image, alt: post.cover_image_alt || title }] : []
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: post.cover_image ? [post.cover_image] : []
    }
  };
}

export default async function PublicBlogPostPage({ params, searchParams }: PageProps) {
  const isPreview = searchParams?.preview === '1';
  const { data: post, error } = await getPublicBlogPost(params.slug, isPreview);
  if (error || !post) return notFound();

  const { data: settings } = await getBlogSettings(post.workspace_id);
  const isDraft = post.status !== 'published';

  // Dynamic Read-Time Assessor
  const wordCount = post.body_plain?.split(/\s+/).length || 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // H2 Indexing Observer & Dynamic Anchor Generator
  let bodyHtml = post.body_html || '';
  const headings: { text: string; id: string; }[] = [];
  let headingCounter = 0;

  bodyHtml = bodyHtml.replace(/<h2>(.*?)<\/h2>/gi, (m, titleText) => {
    const id = `heading-${headingCounter++}`;
    headings.push({ text: titleText.replace(/<[^>]*>/g, ''), id });
    return `<h2 id="${id}">${titleText}</h2>`;
  });

  const articleUrl = `https://www.leadsmind.io/blog/${post.slug}`;
  const authorName = post.author ? `${post.author.first_name} ${post.author.last_name || ''}` : 'Corporate Content Director';

  // JSON-LD Semantic Schema definition (only for published posts)
  const schemaJson = !isDraft ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': post.title,
    'description': post.summary || '',
    'image': post.cover_image ? [post.cover_image] : [],
    'datePublished': post.published_at || post.created_at,
    'dateModified': post.updated_at || post.created_at,
    'author': { '@type': 'Person', 'name': authorName },
    'publisher': {
      '@type': 'Organization',
      'name': 'LeadsMind',
      'logo': { '@type': 'ImageObject', 'url': 'https://www.leadsmind.io/assets/images/logo.png' }
    },
    'mainEntityOfPage': { '@type': 'WebPage', '@id': articleUrl }
  } : null;

  return (
    <div className="min-h-screen bg-[#04091a] text-white font-dm-sans relative">
      <ReadingProgressBar />
      {/* Only fire analytics for published posts, not previews */}
      {settings?.analytics_enabled && !isDraft && !isPreview && (
        <BlogTracker postId={post.id} workspaceId={post.workspace_id} />
      )}

      {/* Inject Structured LD-JSON natively */}
      {schemaJson && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }} />
      )}

      {/* DRAFT / PREVIEW BANNER */}
      {(isDraft || isPreview) && (
        <div className="sticky top-0 z-50 w-full bg-amber-500/95 backdrop-blur-sm border-b border-amber-400/50 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-950 text-xs font-bold">
            <Eye className="w-4 h-4 shrink-0" />
            <span>
              {post.status === 'draft' ? '🔒 Draft Preview — This article is not publicly visible.' : '📅 Scheduled Preview — Not yet published.'}
            </span>
          </div>
          <Link
            href={`/blog/editor/${post.id}`}
            className="flex items-center gap-1.5 text-amber-950 hover:text-black text-xs font-bold bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition shrink-0"
          >
            <PencilLine className="w-3.5 h-3.5" />
            Edit Post
          </Link>
        </div>
      )}

      <div className="py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition duration-200">
            <ArrowLeft className="w-4 h-4" /> Back to Insights
          </Link>
          
          {/* Asymmetric 3-Column Grid Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            
            {/* Left Column (Sticky Table of Contents) */}
            <div className="lg:col-span-3">
              <TableOfContents headings={headings} />
            </div>

            {/* Center Column (Wide Rich Prose) */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-3">
                {post.category && <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border border-primary/20">{post.category.name}</span>}
                <h1 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">{post.title}</h1>
                <div className="flex items-center gap-4 text-xs text-white/40 uppercase tracking-widest font-semibold pt-1">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {readTime} min read</span>
                  {isDraft && (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">
                      {post.status}
                    </span>
                  )}
                </div>
              </div>

              {post.cover_image ? (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#080f28] shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.cover_image} alt={post.cover_image_alt || post.title} className="w-full max-h-[380px] object-cover" />
                </div>
              ) : (
                <div className="w-full h-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-full" />
              )}

              {post.summary && (
                <div className="bg-[#080f28] border-l-4 border-primary rounded-r-2xl p-5 border border-white/5 shadow-inner">
                  <p className="text-xs sm:text-sm text-white/80 font-medium italic leading-relaxed">&ldquo;{post.summary}&rdquo;</p>
                </div>
              )}

              <div
                className="prose prose-invert max-w-none text-white/80 leading-relaxed font-dm-sans text-xs sm:text-sm md:text-base
                  prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight
                  prose-h2:text-lg sm:prose-h2:text-xl prose-h3:text-base prose-h4:text-sm
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-[#080f28] prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:rounded-r-xl prose-blockquote:text-white/90 prose-blockquote:font-medium prose-blockquote:italic
                  prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-img:shadow-xl
                  prose-code:text-primary prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: bodyHtml || '<p style="color:rgba(255,255,255,0.3);font-style:italic;">No content written yet.</p>' }}
              />

              {/* Comments Engine — only for published posts */}
              {!isDraft && !isPreview && (
                <BlogComments 
                  postId={post.id} 
                  workspaceId={post.workspace_id}
                  commentsEngine={settings?.comments_engine || 'native'}
                  disqusShortname={settings?.disqus_shortname}
                />
              )}
              {(isDraft || isPreview) && (
                <div className="mt-8 border-t border-white/5 pt-6 text-center text-white/30 text-xs">
                  💬 Comments are disabled in preview mode.
                </div>
              )}
            </div>

            {/* Right Column (Sticky Engagement Sidebar) */}
            <div className="lg:col-span-3 space-y-6 sticky top-28 h-fit self-start">
              
              {/* Author Profile Layout */}
              <div className="bg-[#080f28]/60 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-lg">
                    {post.author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                    ) : (<User className="w-5 h-5 text-white/40" />)}
                  </div>
                  <div>
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold block">Written By</span>
                    <span className="text-xs font-bold text-white uppercase">{authorName}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed pt-1">
                  Corporate strategist and editorial director specializing in business conversion optimization and growth strategies.
                </p>
              </div>

              {/* Quick Share Core */}
              {!isDraft && <ShareButtons url={articleUrl} title={post.title} />}

              {/* Newsletter Capture form */}
              <NewsletterCapture workspaceId={post.workspace_id} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { getPublicBlogPost, getBlogSettings, getPublicCategories } from '@/app/actions/publicBlog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Calendar, User, ArrowLeft, Clock, Eye, PencilLine, Play, Mail, CheckCircle2 } from 'lucide-react';
import ReadingProgressBar from '@/components/blog/public/ReadingProgressBar';
import TableOfContents from '@/components/blog/public/TableOfContents';
import ShareButtons from '@/components/blog/public/ShareButtons';
import NewsletterCapture from '@/components/blog/public/NewsletterCapture';
import BlogTracker from '@/components/blog/public/BlogTracker';
import BlogComments from '@/components/blog/public/BlogComments';
import ExitIntentCapture from '@/components/blog/public/ExitIntentCapture';

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
  const { data: categoriesData } = await getPublicCategories();
  const categories = categoriesData || [];
  
  const isDraft = post.status !== 'published';

  // Resolved configurations with fallbacks
  const layout = post.layout_style || settings?.layout_style || 'minimal';
  const header = post.header_style || settings?.header_style || 'sticky-slim';
  const sidebar = post.sidebar_style || settings?.sidebar_style || 'standard';
  const leadCapture = post.lead_capture_style || settings?.lead_capture_style || 'newsletter';
  const saProvince = post.sa_province || settings?.sa_province || '';
  const saCity = post.sa_city || settings?.sa_city || '';
  const saArea = post.sa_area || settings?.sa_area || '';

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

  // LocalBusiness schema if local targets are present
  const localBusinessSchema = (saProvince || saCity) ? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': `LeadsMind ${saCity || saProvince} Hub`,
    'description': `Local business optimization and operations directory for ${saCity || saProvince}, South Africa.`,
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': saCity || 'National',
      'addressRegion': saProvince || 'National',
      'addressCountry': 'ZA'
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': '-30.5595',
      'longitude': '22.9375'
    }
  } : null;

  // Header style rendering logic
  const renderDetailHeader = () => {
    switch (header) {
      case 'transparent-hero':
        return (
          <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent py-5 px-6 md:px-8 flex items-center justify-between">
            <Link href="/blog" className="text-white hover:text-primary font-space-grotesk font-black text-sm uppercase tracking-wider">
              LeadsMind Insights
            </Link>
            <div className="text-white/60 text-xs font-bold uppercase tracking-wider hidden sm:block">
              {post.category?.name || 'Thought Leadership'}
            </div>
          </div>
        );
      case 'category-bar':
        return (
          <div className="bg-[#080f28]/90 border-b border-white/10 w-full sticky top-0 z-40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/blog" className="text-white font-space-grotesk font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>📝</span> LeadsMind
              </Link>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-white/50">
                <Link href="/blog" className="hover:text-white transition">All Topics</Link>
                {post.category && <span className="text-primary">{post.category.name}</span>}
              </div>
            </div>
          </div>
        );
      case 'centred-classic':
        return (
          <div className="text-center py-10 border-b border-white/5 space-y-2.5 bg-[#080f28]/30">
            <Link href="/blog" className="text-white font-space-grotesk font-black text-2xl sm:text-3xl uppercase tracking-wider hover:text-primary transition">
              LEADSMIND <span className="text-primary">INSIGHTS</span>
            </Link>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] block">Publishing Platform & Knowledge Repository</p>
          </div>
        );
      case 'split-banner':
        return (
          <div className="bg-[#080f28] border-b border-white/10 w-full py-3.5 px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-0 z-40">
            <Link href="/blog" className="text-white font-space-grotesk font-black text-sm uppercase tracking-wider">
              LeadsMind Insights
            </Link>
            <div className="text-[10px] text-white/40 font-mono truncate max-w-lg bg-[#04091a] border border-white/5 px-3 py-1 rounded">
              📚 Reading: <span className="text-white font-bold">{post.title}</span>
            </div>
          </div>
        );
      case 'sticky-slim':
      default:
        return (
          <div className="bg-[#080f28]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 w-full py-4 px-6 md:px-8 flex items-center justify-between">
            <Link href="/blog" className="text-white hover:text-primary font-space-grotesk font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span>📝</span> LeadsMind Insights
            </Link>
            <Link href="/blog" className="text-xs font-bold text-primary hover:text-white flex items-center gap-1 transition">
              Back to Hub <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        );
    }
  };

  // Grid layout columns configurations based on sidebar settings
  let leftColClass = "lg:col-span-3";
  let centerColClass = "lg:col-span-6";
  let rightColClass = "lg:col-span-3";

  if (sidebar === 'none') {
    leftColClass = "lg:col-span-3";
    centerColClass = "lg:col-span-9 max-w-4xl mx-auto w-full";
    rightColClass = "hidden";
  } else if (sidebar === 'floating-share') {
    leftColClass = "lg:col-span-1";
    centerColClass = "lg:col-span-11 max-w-4xl";
    rightColClass = "hidden";
  } else if (sidebar === 'sticky-toc') {
    leftColClass = "hidden";
    centerColClass = "lg:col-span-9";
    rightColClass = "lg:col-span-3";
  }

  // Sidebar widget rendering
  const renderSidebar = () => {
    switch (sidebar) {
      case 'sticky-toc':
        return headings.length > 0 ? (
          <TableOfContents headings={headings} />
        ) : (
          <p className="text-xs text-white/30 italic text-center py-4">No headings to index.</p>
        );
      case 'lead-gen':
        return (
          <div className="bg-gradient-to-br from-[#0c102b] to-primary/5 border border-primary/20 p-5 rounded-2xl space-y-4 shadow-xl">
            <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Academy Bonus</span>
            <h4 className="text-xs font-space-grotesk font-black text-white leading-tight">Scale Your Operations</h4>
            <p className="text-[10px] text-white/60 leading-relaxed">
              Sign up below to receive our exclusive blueprints and local SA marketing recipes.
            </p>
            <NewsletterCapture workspaceId={post.workspace_id} />
          </div>
        );
      case 'compact':
        return (
          <div className="space-y-4">
            <div className="bg-[#080f28]/60 border border-white/5 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow">
                  {post.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                  ) : (<User className="w-4 h-4 text-white/40" />)}
                </div>
                <div>
                  <span className="text-[9px] text-white/30 uppercase tracking-widest block">Author</span>
                  <span className="text-xs font-bold text-white uppercase">{authorName}</span>
                </div>
              </div>
            </div>
            {!isDraft && <ShareButtons url={articleUrl} title={post.title} />}
          </div>
        );
      case 'standard':
      default:
        return (
          <>
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

            {!isDraft && <ShareButtons url={articleUrl} title={post.title} />}

            {leadCapture === 'newsletter' && (
              <NewsletterCapture workspaceId={post.workspace_id} />
            )}
          </>
        );
    }
  };

  // Check if article body contains a youtube embed
  const hasYoutubeEmbed = bodyHtml.includes('youtube.com/embed') || bodyHtml.includes('youtu.be');

  // Main visual layout rendering selector
  const renderLayoutContent = () => {
    switch (layout) {
      case 'minimal':
        return (
          <div className="max-w-3xl mx-auto space-y-8 py-10">
            <div className="text-center space-y-3">
              {post.category && <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border border-primary/20">{post.category.name}</span>}
              <h1 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">{post.title}</h1>
              <div className="flex items-center justify-center gap-4 text-xs text-white/40 uppercase tracking-widest font-semibold pt-1">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {readTime} min read</span>
              </div>
            </div>

            {post.cover_image && (
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#080f28] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_image} alt={post.cover_image_alt || post.title} className="w-full max-h-[380px] object-cover animate-fade-in" />
              </div>
            )}

            {/* SA Local SEO Targets Badge */}
            {(saProvince || saCity || saArea) && (
              <div className="p-4 bg-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl flex items-center justify-between text-xs">
                <span>🇿🇦 Local Focus: {saArea ? `${saArea}, ` : ''}{saCity ? `${saCity}, ` : ''}{saProvince}</span>
                <span className="text-[10px] font-bold uppercase text-[#fbbf24]">SA SEO</span>
              </div>
            )}

            {post.summary && (
              <div className="bg-[#080f28] border-l-4 border-primary rounded-r-2xl p-5 border border-white/5 shadow-inner">
                <p className="text-xs sm:text-sm text-white/80 font-medium italic leading-relaxed">&ldquo;{post.summary}&rdquo;</p>
              </div>
            )}

            <div
              className="prose prose-invert max-w-none text-white/80 leading-relaxed font-dm-sans text-xs sm:text-sm md:text-base
                prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-white
                prose-a:text-primary prose-blockquote:border-primary prose-code:text-primary"
              dangerouslySetInnerHTML={{ __html: bodyHtml || '<p style="color:rgba(255,255,255,0.3);font-style:italic;">No content written yet.</p>' }}
            />

            {leadCapture === 'inline' && (
              <div className="bg-[#080f28]/60 border border-white/10 p-6 rounded-2xl text-center space-y-3">
                <h4 className="text-sm font-space-grotesk font-black">Subscribe to our newsletter</h4>
                <NewsletterCapture workspaceId={post.workspace_id} />
              </div>
            )}

            {!isDraft && !isPreview && (
              <BlogComments postId={post.id} workspaceId={post.workspace_id} commentsEngine={settings?.comments_engine || 'native'} disqusShortname={settings?.disqus_shortname} />
            )}
          </div>
        );

      case 'magazine':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black flex flex-col justify-end p-8 sm:p-12">
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover_image} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0d102c] to-[#04091a]"></div>
              )}
              <div className="relative z-10 max-w-4xl space-y-4 animate-fade-in">
                {post.category && <span className="inline-block bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl">{post.category.name}</span>}
                <h1 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">{post.title}</h1>
                <div className="flex items-center gap-4 text-xs text-white/60 uppercase tracking-widest font-semibold pt-1">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {readTime} min read</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              <div className={leftColClass}>
                {sidebar !== 'sticky-toc' && headings.length > 0 && <TableOfContents headings={headings} />}
              </div>

              <div className={cn(centerColClass, "space-y-8")}>
                {/* SA Local SEO Targets Badge */}
                {(saProvince || saCity || saArea) && (
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-center justify-between text-xs">
                    <span>🇿🇦 Local Focus: {saArea ? `${saArea}, ` : ''}{saCity ? `${saCity}, ` : ''}{saProvince}</span>
                    <span className="text-[10px] font-bold uppercase text-purple-400">SA SEO</span>
                  </div>
                )}

                {post.summary && (
                  <div className="bg-[#080f28] border-l-4 border-purple-500 rounded-r-2xl p-5 border border-white/5 shadow-inner">
                    <p className="text-xs sm:text-sm text-white/80 font-medium italic leading-relaxed">&ldquo;{post.summary}&rdquo;</p>
                  </div>
                )}

                <div
                  className="prose prose-invert max-w-none text-purple-100/90 leading-relaxed font-dm-sans
                    prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-purple-200
                    prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-blockquote:border-purple-500 prose-strong:text-purple-300"
                  dangerouslySetInnerHTML={{ __html: bodyHtml || '<p>No content.</p>' }}
                />

                {leadCapture === 'inline' && (
                  <div className="bg-purple-950/10 border border-purple-500/20 p-6 rounded-2xl text-center space-y-3">
                    <h4 className="text-sm font-space-grotesk font-black text-purple-300">Join our newsletter mailing list</h4>
                    <NewsletterCapture workspaceId={post.workspace_id} />
                  </div>
                )}

                {!isDraft && !isPreview && (
                  <BlogComments postId={post.id} workspaceId={post.workspace_id} commentsEngine={settings?.comments_engine || 'native'} disqusShortname={settings?.disqus_shortname} />
                )}
              </div>

              {rightColClass !== 'hidden' && (
                <div className="lg:col-span-3 space-y-6 sticky top-28 h-fit self-start">
                  {renderSidebar()}
                </div>
              )}
            </div>
          </div>
        );

      case 'editorial':
        return (
          <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
            <div className="border-y-2 border-double border-white/20 py-8 text-center space-y-4">
              {post.category && <span className="inline-block bg-[#0c1535] border border-white/15 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded">{post.category.name}</span>}
              <h1 className="font-space-grotesk text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight max-w-4xl mx-auto">{post.title}</h1>
              <div className="flex items-center justify-center gap-4 text-xs text-white/50 uppercase tracking-wider font-bold">
                <span>By {authorName}</span>
                <span>•</span>
                <span>{new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            {post.cover_image && (
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#080f28] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_image} alt={post.title} className="w-full max-h-[420px] object-cover" />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              <div className="lg:col-span-8 lg:border-r lg:border-white/10 lg:pr-8 space-y-6">
                {/* SA Local SEO Targets Badge */}
                {(saProvince || saCity || saArea) && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
                    <span>🇿🇦 Local Focus: {saArea ? `${saArea}, ` : ''}{saCity ? `${saCity}, ` : ''}{saProvince}</span>
                    <span className="text-[10px] font-bold uppercase text-primary">SA SEO</span>
                  </div>
                )}

                {post.summary && (
                  <p className="text-sm text-white/70 italic font-medium leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                    {post.summary}
                  </p>
                )}

                <div
                  className="prose prose-invert max-w-none text-[#d1d0c5] leading-relaxed font-serif
                    prose-headings:font-serif prose-headings:font-black prose-headings:text-amber-100
                    prose-a:text-amber-400 hover:prose-a:text-amber-300 prose-blockquote:border-amber-500 prose-strong:text-amber-200"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />

                {leadCapture === 'inline' && (
                  <div className="bg-[#0c1535] border border-white/10 p-6 rounded-2xl space-y-3">
                    <h4 className="text-sm font-space-grotesk font-black text-white">Join LeadsMind Academy</h4>
                    <NewsletterCapture workspaceId={post.workspace_id} />
                  </div>
                )}

                {!isDraft && !isPreview && (
                  <BlogComments postId={post.id} workspaceId={post.workspace_id} commentsEngine={settings?.comments_engine || 'native'} disqusShortname={settings?.disqus_shortname} />
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#080f28] border border-white/10 p-5 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Editorial Brief</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow">
                      {post.author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                      ) : (<User className="w-5 h-5 text-white/40" />)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-white uppercase block">{authorName}</span>
                      <span className="text-[9px] text-white/40 uppercase block">Content Director</span>
                    </div>
                  </div>
                </div>
                {!isDraft && <ShareButtons url={articleUrl} title={post.title} />}
                {leadCapture === 'newsletter' && <NewsletterCapture workspaceId={post.workspace_id} />}
              </div>
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 animate-fade-in">
            {/* Left Category List menu */}
            <div className="lg:col-span-3 bg-[#080f28]/60 border border-white/10 rounded-2xl p-4 sticky top-24 self-start h-fit space-y-3">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2 mb-2">Wiki Directory</h3>
              <div className="space-y-1">
                <Link
                  href="/blog"
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                >
                  <span>All Insights</span>
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/blog?category=${cat.id}`}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                      post.category?.id === cat.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Wiki Article content */}
            <div className="lg:col-span-9 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[9px] text-primary font-black uppercase tracking-widest block">Knowledge Base</span>
                <h1 className="font-space-grotesk text-3xl font-black text-white leading-tight mt-1">{post.title}</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-2">
                  Last updated {new Date(post.updated_at || post.created_at).toLocaleDateString()} • {readTime} min read
                </p>
              </div>

              {post.cover_image && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#080f28] shadow-md max-h-[300px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* SA Local SEO Targets Badge */}
              {(saProvince || saCity || saArea) && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
                  <span>🇿🇦 Local Focus: {saArea ? `${saArea}, ` : ''}{saCity ? `${saCity}, ` : ''}{saProvince}</span>
                  <span className="text-[10px] font-bold uppercase text-primary">SA SEO</span>
                </div>
              )}

              {post.summary && (
                <div className="bg-[#080f28] p-4 rounded-xl border border-white/5 text-xs text-white/70 italic leading-relaxed">
                  {post.summary}
                </div>
              )}

              <div
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed font-dm-sans
                  prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-cyan-200
                  prose-a:text-cyan-400 hover:prose-a:text-cyan-300 prose-blockquote:border-cyan-500 prose-strong:text-cyan-300"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />

              {leadCapture === 'inline' && (
                <div className="bg-[#080f28] border border-white/10 p-6 rounded-xl text-center space-y-2">
                  <h4 className="text-xs font-bold uppercase text-white/50">Knowledge Base Digest</h4>
                  <NewsletterCapture workspaceId={post.workspace_id} />
                </div>
              )}

              {!isDraft && !isPreview && (
                <BlogComments postId={post.id} workspaceId={post.workspace_id} commentsEngine={settings?.comments_engine || 'native'} disqusShortname={settings?.disqus_shortname} />
              )}
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-[#080f28] border border-red-500/10 p-4 rounded-3xl shadow-2xl space-y-4">
              <div className="relative w-full aspect-video md:max-h-[480px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/5">
                {hasYoutubeEmbed ? (
                  <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-mono">
                    <span className="animate-pulse">📺 Active Video Player Stream...</span>
                  </div>
                ) : post.cover_image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 hover:scale-105 transition-all duration-300 text-white flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.5)]">
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-950/20 to-[#04091a] flex items-center justify-center animate-pulse">
                    <Play className="w-12 h-12 text-red-500/40" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-white/5 pt-4 gap-4">
                <div>
                  <h1 className="font-space-grotesk text-xl sm:text-2xl font-black text-white">{post.title}</h1>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mt-1">Lesson length • {readTime} min read</span>
                </div>
                {!isDraft && <ShareButtons url={articleUrl} title={post.title} />}
              </div>
            </div>

            {/* SA Local SEO Targets Badge */}
            {(saProvince || saCity || saArea) && (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between text-xs">
                <span>🇿🇦 Local Focus: {saArea ? `${saArea}, ` : ''}{saCity ? `${saCity}, ` : ''}{saProvince}</span>
                <span className="text-[10px] font-bold uppercase text-red-400">SA SEO</span>
              </div>
            )}

            <div
              className="prose prose-invert max-w-none text-rose-100/80 leading-relaxed font-dm-sans px-4
                prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-rose-200
                prose-a:text-rose-400 hover:prose-a:text-rose-300 prose-blockquote:border-red-600 prose-strong:text-rose-300"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {leadCapture === 'inline' && (
              <div className="bg-red-950/5 border border-red-500/20 p-6 rounded-2xl text-center space-y-3">
                <h4 className="text-sm font-space-grotesk font-black text-red-400">Join our mailing list for lessons</h4>
                <NewsletterCapture workspaceId={post.workspace_id} />
              </div>
            )}

            {!isDraft && !isPreview && (
              <BlogComments postId={post.id} workspaceId={post.workspace_id} commentsEngine={settings?.comments_engine || 'native'} disqusShortname={settings?.disqus_shortname} />
            )}
          </div>
        );

      case 'newsletter':
        return (
          <div className="max-w-2xl mx-auto space-y-8 py-10 font-sans border border-white/10 rounded-2xl p-8 sm:p-12 bg-[#080f28]/40 shadow-2xl animate-fade-in">
            <div className="text-center border-b-2 border-dashed border-white/10 pb-6 space-y-2">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest block">LeadsMind Digest Blueprint</span>
              <h1 className="font-space-grotesk text-2xl sm:text-3xl font-black text-white leading-tight">{post.title}</h1>
              <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                Published By {authorName} • {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </div>
            </div>

            {post.cover_image && (
              <div className="w-full rounded-xl overflow-hidden border border-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_image} alt={post.title} className="w-full h-48 object-cover" />
              </div>
            )}

            {/* SA Local SEO Targets Badge */}
            {(saProvince || saCity || saArea) && (
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between text-xs">
                <span>🇿🇦 Local Focus: {saArea ? `${saArea}, ` : ''}{saCity ? `${saCity}, ` : ''}{saProvince}</span>
                <span className="text-[10px] font-bold uppercase text-primary">SA SEO</span>
              </div>
            )}

            <div
              className="prose prose-invert max-w-none text-[#e2e8f0] leading-relaxed font-sans
                prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-amber-200
                prose-a:text-amber-400 hover:prose-a:text-amber-300 prose-blockquote:border-dashed prose-blockquote:border-amber-500/50 prose-strong:text-amber-200"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {/* Newsletter footer lead capture card */}
            <div className="bg-gradient-to-r from-purple-950/20 to-blue-950/20 border border-white/10 rounded-xl p-6 text-center space-y-4">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Subscribe to the digest</span>
              <h3 className="text-sm font-space-grotesk font-black text-white">Loved this blueprint? Get the next one straight to your inbox.</h3>
              <NewsletterCapture workspaceId={post.workspace_id} />
            </div>

            {!isDraft && !isPreview && (
              <BlogComments postId={post.id} workspaceId={post.workspace_id} commentsEngine={settings?.comments_engine || 'native'} disqusShortname={settings?.disqus_shortname} />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getLayoutBgClass = () => {
    switch (layout) {
      case 'magazine':
        return 'bg-gradient-to-b from-[#09071c] to-[#04030d] text-white/90 font-dm-sans';
      case 'editorial':
        return 'bg-[#0b0c10] text-[#e0dfdb] font-serif';
      case 'knowledge':
        return 'bg-[#030712] text-white/90 font-dm-sans';
      case 'video':
        return 'bg-gradient-to-b from-[#120508] to-[#050102] text-white/90 font-dm-sans';
      case 'newsletter':
        return 'bg-[#05070f] text-white/90 font-sans';
      case 'minimal':
      default:
        return 'bg-[#04091a] text-white font-dm-sans';
    }
  };

  return (
    <div className={cn("min-h-screen relative transition-colors duration-500", getLayoutBgClass())}>
      <ReadingProgressBar />
      
      {!isDraft && !isPreview && settings?.analytics_enabled && (
        <BlogTracker postId={post.id} workspaceId={post.workspace_id} />
      )}

      {schemaJson && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }} />
      )}
      {localBusinessSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
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

      {/* Header style */}
      {renderDetailHeader()}

      <div className="py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {header !== 'sticky-slim' && (
            <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition duration-200">
              <ArrowLeft className="w-4 h-4" /> Back to Insights
            </Link>
          )}

          {/* Dynamic layout content area */}
          {renderLayoutContent()}

        </div>
      </div>

      {/* Exit Intent Lead Capture Popup */}
      {leadCapture === 'exit-intent' && !isDraft && !isPreview && (
        <ExitIntentCapture workspaceId={post.workspace_id} />
      )}
    </div>
  );
}

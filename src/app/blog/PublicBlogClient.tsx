'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, User, ArrowRight, BookOpen, Play, Mail, Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToNewsletter } from '@/app/actions/publicBlog';

interface Post {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  created_at: string;
  category: { id: string; name: string } | null;
  author: { first_name: string; last_name: string; avatar_url: string | null } | null;
  body_plain?: string;
  body_html?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PublicBlogClientProps {
  posts: Post[];
  categories: Category[];
  settings?: any;
}

export default function PublicBlogClient({ posts, categories, settings }: PublicBlogClientProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Newsletter subscription
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string>('');

  const layoutStyle = settings?.layout_style || 'minimal';
  const headerStyle = settings?.header_style || 'sticky-slim';

  // Read WhatsApp referral parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && ref.startsWith('wa_')) {
        const code = ref.replace('wa_', '');
        setRefCode(code);
        localStorage.setItem('wa_referral_code', code);
      } else {
        const cached = localStorage.getItem('wa_referral_code');
        if (cached) setRefCode(cached);
      }
    }
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSubscribing(true);
      setSubMsg(null);
      setSubError(null);
      const res = await subscribeToNewsletter(
        email.trim(),
        posts?.[0]?.workspace_id || settings?.workspace_id,
        refCode || undefined
      );
      if (res.error) {
        setSubError(res.error);
      } else {
        setSubMsg(res.message || 'Thank you for subscribing!');
        setEmail('');
      }
    } catch (err: any) {
      setSubError(err.message || 'Subscription failed.');
    } finally {
      setSubscribing(false);
    }
  };

  // Client-side filtering logic
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = activeCategory === 'all' || post.category?.id === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.summary && post.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = filteredPosts[0];
  const secondaryPosts = filteredPosts.slice(1);

  // Helper: Renders normal post card
  const renderNormalCard = (post: Post, borderStyle = "border-[#E2E8F0] hover:border-[#CBD5E1]") => {
    return (
      <div
        key={post.id}
        onClick={() => router.push(`/blog/${post.slug}`)}
        className={cn(
          "group bg-white border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between hover:-translate-y-1",
          borderStyle
        )}
      >
        <div>
          <div className="relative h-48 w-full overflow-hidden bg-[#F1F5F9]">
            {post.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover_image}
                alt={post.cover_image_alt || post.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0]">
                <BookOpen className="w-10 h-10 text-[#CBD5E1]" />
              </div>
            )}
            {post.category && (
              <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-lg">
                {post.category.name}
              </span>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-[9px] text-[#94A3B8] uppercase tracking-widest font-semibold">
              <Calendar className="w-3 h-3" />
              {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>

            <h3 className="font-space font-extrabold text-sm text-[#0F172A] leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>

            <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2">
              {post.summary || "No post summary abstract provided."}
            </p>
          </div>
        </div>

        <div className="p-5 pt-0 border-t border-[#F1F5F9] mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
              {post.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author.avatar_url} alt="author avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-[#94A3B8]" />
              )}
            </div>
            <span className="text-[9px] font-semibold text-[#64748B] uppercase tracking-wider">
              {post.author ? `${post.author.first_name} ${post.author.last_name || ''}` : 'Team'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform duration-300">
            Read <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Dynamic header styles based on headerStyle settings */}
        {headerStyle === 'centred-classic' ? (
          <div className="text-center space-y-3 max-w-2xl mx-auto py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-xl mb-2">📝</div>
            <h1 className="font-space text-4xl sm:text-5xl font-black uppercase tracking-tight leading-none">
              LEADSMIND <span className="text-primary">INSIGHTS</span>
            </h1>
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.3em]">
              Our Editorial Digest & Blueprint Library
            </p>
          </div>
        ) : headerStyle === 'split-banner' ? (
          <div className="flex flex-col md:flex-row items-center justify-between border-b border-[#E2E8F0] pb-6 gap-4">
            <div>
              <h1 className="font-space text-3xl font-extrabold tracking-tight uppercase leading-none">
                LeadsMind <span className="text-primary">Press</span>
              </h1>
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mt-1">
                Real-time thought leadership
              </p>
            </div>
            {featuredPost && (
              <div className="flex items-center gap-3 bg-[#F8F9FC] border border-[#E2E8F0] px-4 py-2 rounded-xl max-w-md">
                <span className="bg-red-50 text-red-600 border border-red-200 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0">LATEST</span>
                <span className="text-[11px] font-bold truncate text-[#334155]">{featuredPost.title}</span>
                <button onClick={() => router.push(`/blog/${featuredPost.slug}`)} className="text-[10px] text-primary hover:underline shrink-0 font-bold">Read</button>
              </div>
            )}
          </div>
        ) : (
          // Sticky Slim or default header
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="font-space text-5xl font-black uppercase tracking-tight leading-none text-[#0F172A]">
              Corporate <span className="text-primary">Insights</span>
            </h1>
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.3em]">
              Ideas, strategies, and blueprints to accelerate your business growth.
            </p>
          </div>
        )}

        {/* Toolbar categories navigation - Hide in knowledge hub layout since it uses left vertical nav */}
        {layoutStyle !== 'knowledge' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#F8F9FC] p-4 rounded-2xl border border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
                  activeCategory === 'all'
                    ? "bg-primary text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
                )}
              >
                All Articles
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
                    activeCategory === cat.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Contextual search input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-primary/50 transition"
              />
            </div>
          </div>
        )}

        {/* Category specific sub-header bar if headerStyle is category-bar */}
        {headerStyle === 'category-bar' && layoutStyle !== 'knowledge' && (
          <div className="border-y border-[#F1F5F9] py-2.5 flex items-center justify-center gap-6 text-[10px] uppercase font-bold tracking-widest text-[#94A3B8] overflow-x-auto no-scrollbar">
            <span className="text-[#0F172A] hover:text-primary cursor-pointer transition" onClick={() => setActiveCategory('all')}>ALL TOPICS</span>
            {categories.slice(0, 5).map(cat => (
              <span key={cat.id} className="hover:text-primary cursor-pointer transition" onClick={() => setActiveCategory(cat.id)}>{cat.name}</span>
            ))}
          </div>
        )}

        {/* Main Content Layout Container */}
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 border border-dashed border-[#E2E8F0] rounded-3xl bg-[#F8F9FC] max-w-md mx-auto text-center">
            <BookOpen className="w-10 h-10 text-[#CBD5E1] mb-4" />
            <h3 className="font-space text-sm font-bold uppercase tracking-wider text-[#0F172A]">No insights found</h3>
            <p className="text-xs text-[#64748B] leading-relaxed mt-2">
              No published articles match your active criteria. Please clear search input or filter selections.
            </p>
          </div>
        ) : (
          <div className="w-full">

            {/* 1. MAGAZINE LAYOUT */}
            {layoutStyle === 'magazine' && (
              <div className="space-y-10">
                {featuredPost && (
                  <div
                    onClick={() => router.push(`/blog/${featuredPost.slug}`)}
                    className="group bg-white border border-purple-100 hover:border-purple-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer flex flex-col lg:flex-row min-h-[400px] transition duration-300"
                  >
                    <div className="relative overflow-hidden bg-[#F1F5F9] lg:w-3/5 w-full h-64 lg:h-auto">
                      {featuredPost.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featuredPost.cover_image}
                          alt={featuredPost.cover_image_alt || featuredPost.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0]">
                          <BookOpen className="w-16 h-16 text-purple-200" />
                        </div>
                      )}
                      {featuredPost.category && (
                        <span className="absolute top-6 left-6 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-xl shadow-lg">
                          {featuredPost.category.name}
                        </span>
                      )}
                    </div>
                    <div className="p-8 flex flex-col justify-between flex-1 lg:w-2/5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-1 text-[10px] text-purple-600 uppercase tracking-widest font-black">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <h2 className="font-space font-black text-2xl sm:text-3xl lg:text-4xl text-[#0F172A] leading-tight group-hover:text-purple-600 transition duration-300">
                          {featuredPost.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed line-clamp-4">
                          {featuredPost.summary || "No post summary abstract provided."}
                        </p>
                      </div>
                      <div className="pt-6 border-t border-[#F1F5F9] mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
                            {featuredPost.author?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={featuredPost.author.avatar_url} alt="author avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-[#94A3B8]" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-[#334155] uppercase tracking-wider">
                            {featuredPost.author ? `${featuredPost.author.first_name} ${featuredPost.author.last_name || ''}` : 'Team'}
                          </span>
                        </div>
                        <span className="text-xs font-black text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition duration-300">
                          READ FEATURE <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {secondaryPosts.map(post => renderNormalCard(post, "border-purple-100 hover:border-purple-200"))}
                </div>
              </div>
            )}

            {/* 2. MINIMAL CLEAN LAYOUT */}
            {layoutStyle === 'minimal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map(post => renderNormalCard(post))}
              </div>
            )}

            {/* 3. FULL-WIDTH EDITORIAL LAYOUT */}
            {layoutStyle === 'editorial' && (
              <div className="space-y-10">
                {featuredPost && (
                  <div
                    onClick={() => router.push(`/blog/${featuredPost.slug}`)}
                    className="group relative h-[450px] w-full rounded-3xl overflow-hidden cursor-pointer shadow-md border border-[#E2E8F0]"
                  >
                    {featuredPost.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featuredPost.cover_image} alt={featuredPost.title} className="w-full h-full object-cover group-hover:scale-101 transition duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#F1F5F9] to-[#E2E8F0] flex items-center justify-center"><BookOpen className="w-16 h-16 text-[#CBD5E1]" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 sm:p-12">
                      <div className="max-w-3xl space-y-4">
                        {featuredPost.category && (
                          <span className="inline-block bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg">
                            {featuredPost.category.name}
                          </span>
                        )}
                        <h2 className="font-space font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
                          {featuredPost.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-white/80 leading-relaxed line-clamp-2">
                          {featuredPost.summary}
                        </p>
                        <div className="flex items-center gap-3 pt-2 text-[10px] text-white/70 uppercase tracking-wider font-bold">
                          <span>{featuredPost.author ? `${featuredPost.author.first_name} ${featuredPost.author.last_name || ''}` : 'Team'}</span>
                          <span className="w-1 h-1 bg-white/40 rounded-full" />
                          <span>{new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left split - secondary posts grid */}
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {secondaryPosts.slice(0, 4).map(post => renderNormalCard(post))}
                  </div>

                  {/* Right split - side column text feed */}
                  <div className="lg:col-span-4 bg-[#F8F9FC] border border-[#E2E8F0] rounded-2xl p-6 space-y-6">
                    <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#E2E8F0] pb-3">More Stories</h3>
                    <div className="divide-y divide-[#E2E8F0] space-y-5">
                      {secondaryPosts.slice(4).map(post => (
                        <div key={post.id} onClick={() => router.push(`/blog/${post.slug}`)} className="pt-5 first:pt-0 cursor-pointer group space-y-2">
                          <span className="text-[9px] text-primary font-bold uppercase tracking-widest block">{post.category?.name || 'Insight'}</span>
                          <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-primary transition leading-snug">{post.title}</h4>
                          <span className="text-[9px] text-[#94A3B8] block uppercase tracking-wider">{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {secondaryPosts.slice(4).length === 0 && (
                        <p className="text-xs text-[#94A3B8] italic">No additional articles found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. KNOWLEDGE HUB LAYOUT */}
            {layoutStyle === 'knowledge' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Categories vertical nav */}
                <div className="lg:col-span-3 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4 sticky top-24 self-start h-fit space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest px-2 mb-3">Topic Directories</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                          activeCategory === 'all'
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FC] border border-transparent"
                        )}
                      >
                        <span>All Knowledge Hub</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#94A3B8]">{posts.length}</span>
                      </button>
                      {categories.map((cat) => {
                        const count = posts.filter(p => p.category?.id === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                              activeCategory === cat.id
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FC] border border-transparent"
                            )}
                          >
                            <span>{cat.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#94A3B8]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search input inside topic hub */}
                  <div className="pt-4 border-t border-[#F1F5F9]">
                    <label className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest px-2 mb-2 block">Quick Index Search</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search wiki..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F8F9FC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-[#0F172A] outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Right content list */}
                <div className="lg:col-span-9 space-y-6">
                  <div className="bg-[#F8F9FC] border border-[#E2E8F0] rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#0F172A] uppercase tracking-tight">
                        {activeCategory === 'all' ? 'Core Hub Directory' : categories.find(c => c.id === activeCategory)?.name}
                      </h2>
                      <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mt-1">
                        Showing {filteredPosts.length} resources resolved
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPosts.map(post => renderNormalCard(post, "border-[#E2E8F0] bg-white hover:border-primary/30"))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. VIDEO-FIRST LAYOUT */}
            {layoutStyle === 'video' && (
              <div className="space-y-10">
                {featuredPost && (
                  <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm space-y-6">
                    <div
                      onClick={() => router.push(`/blog/${featuredPost.slug}`)}
                      className="group relative h-[380px] w-full rounded-2xl overflow-hidden cursor-pointer bg-black flex items-center justify-center"
                    >
                      {featuredPost.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={featuredPost.cover_image} alt={featuredPost.title} className="w-full h-full object-cover opacity-60 group-hover:scale-101 transition duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-950/20 to-black"></div>
                      )}

                      {/* Video Hero Overlays */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-600/90 group-hover:bg-red-500 hover:scale-105 transition-all duration-300 text-white flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.5)]">
                          <Play className="w-6 h-6 fill-current ml-1" />
                        </div>
                      </div>

                      <div className="absolute bottom-4 right-4 bg-black/60 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white/80">
                        12:34
                      </div>

                      <span className="absolute top-4 left-4 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg">
                        VIDEO LESSON
                      </span>
                    </div>

                    <div className="max-w-4xl space-y-3">
                      <h2
                        onClick={() => router.push(`/blog/${featuredPost.slug}`)}
                        className="font-space font-black text-xl sm:text-2xl text-[#0F172A] hover:text-red-600 cursor-pointer transition leading-snug"
                      >
                        {featuredPost.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                        {featuredPost.summary || "Click play to details this video insights guide."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {secondaryPosts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/blog/${post.slug}`)}
                      className="group bg-white border border-red-100 hover:border-red-200 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md shadow-sm transition duration-300"
                    >
                      <div className="relative h-44 w-full bg-black overflow-hidden">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-red-950/10 flex items-center justify-center"><Play className="w-8 h-8 text-white/20" /></div>
                        )}
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">
                          <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-3 right-3 bg-black/60 border border-white/10 px-2 py-0.5 rounded text-[8px] font-mono text-white/80">08:15</span>
                      </div>

                      <div className="p-4 space-y-2">
                        <h4 className="font-space font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-red-600 transition leading-snug line-clamp-2">{post.title}</h4>
                        <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-black">{post.category?.name || 'Class'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. NEWSLETTER LAYOUT */}
            {layoutStyle === 'newsletter' && (
              <div className="space-y-10 max-w-4xl mx-auto">
                {/* Premium newsletter subscription banner */}
                <div className="bg-gradient-to-r from-[#EEF2FF] via-white to-[#EFF6FF] border border-[#E2E8F0] rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="space-y-2 md:max-w-md">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block">JOIN THE DIGEST</span>
                    <h2 className="text-xl sm:text-2xl font-space font-black leading-tight text-[#0F172A]">Get strategies straight to your inbox.</h2>
                    <p className="text-xs text-[#64748B] leading-relaxed">We break down complex funnel optimization, automation blueprints, and SA local market updates weekly.</p>
                  </div>
                  <form onSubmit={handleSubscribe} className="w-full md:w-80 space-y-2 shrink-0">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="business-email@co.za"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-primary/50"
                        required
                        disabled={subscribing}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={subscribing}
                      className="w-full bg-primary hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition disabled:opacity-50"
                    >
                      {subscribing ? 'Subscribing...' : 'Enroll in Digest'}
                    </button>
                    {subMsg && <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1.5"><Check className="w-3.5 h-3.5" />{subMsg}</div>}
                    {subError && <div className="text-[10px] text-red-600 font-bold mt-1.5">{subError}</div>}
                  </form>
                </div>

                {/* Digest List style feed */}
                <div className="divide-y divide-[#E2E8F0] divide-dashed space-y-8">
                  {filteredPosts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/blog/${post.slug}`)}
                      className="group pt-8 first:pt-0 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:opacity-90 transition duration-200"
                    >
                      <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden bg-[#F1F5F9] shrink-0">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#EEF2FF] flex items-center justify-center"><BookOpen className="w-8 h-8 text-[#CBD5E1]" /></div>
                        )}
                        {post.category && (
                          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[#0F172A] text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#E2E8F0]">
                            {post.category.name}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest font-semibold block">
                          {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <h3 className="font-space font-extrabold text-sm sm:text-base text-[#0F172A] group-hover:text-primary transition leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">
                          {post.summary || "No post summary abstract provided."}
                        </p>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#E2E8F0] group-hover:border-primary group-hover:bg-primary/5 transition text-[#94A3B8] group-hover:text-primary">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

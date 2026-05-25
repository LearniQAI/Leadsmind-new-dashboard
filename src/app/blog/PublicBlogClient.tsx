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
  const renderNormalCard = (post: Post, borderStyle = "border-white/10 hover:border-white/20") => {
    return (
      <div
        key={post.id}
        onClick={() => router.push(`/blog/${post.slug}`)}
        className={cn(
          "group bg-[#080f28]/60 border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl backdrop-blur-sm",
          borderStyle
        )}
      >
        <div>
          <div className="relative h-48 w-full overflow-hidden bg-black/40">
            {post.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover_image}
                alt={post.cover_image_alt || post.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c1535] to-[#04091a]">
                <BookOpen className="w-10 h-10 text-white/10" />
              </div>
            )}
            {post.category && (
              <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border border-white/10 shadow-lg backdrop-blur-md">
                {post.category.name}
              </span>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-[9px] text-white/40 uppercase tracking-widest font-semibold">
              <Calendar className="w-3 h-3" />
              {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>

            <h3 className="font-space-grotesk font-extrabold text-sm text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>

            <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
              {post.summary || "No post summary abstract provided."}
            </p>
          </div>
        </div>

        <div className="p-5 pt-0 border-t border-white/5 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
              {post.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author.avatar_url} alt="author avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-white/40" />
              )}
            </div>
            <span className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">
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
    <div className="min-h-screen bg-[#04091a] text-white font-dm-sans py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Dynamic header styles based on headerStyle settings */}
        {headerStyle === 'centred-classic' ? (
          <div className="text-center space-y-3 max-w-2xl mx-auto py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-xl mb-2">📝</div>
            <h1 className="font-space-grotesk text-4xl sm:text-5xl font-black uppercase tracking-tight leading-none">
              LEADSMIND <span className="text-primary">INSIGHTS</span>
            </h1>
            <p className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
              Our Editorial Digest & Blueprint Library
            </p>
          </div>
        ) : headerStyle === 'split-banner' ? (
          <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/15 pb-6 gap-4">
            <div>
              <h1 className="font-space-grotesk text-3xl font-extrabold tracking-tight uppercase leading-none">
                LeadsMind <span className="text-cyan-400">Press</span>
              </h1>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                Real-time thought leadership
              </p>
            </div>
            {featuredPost && (
              <div className="flex items-center gap-3 bg-[#080f28]/80 border border-white/10 px-4 py-2 rounded-xl max-w-md animate-pulse">
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0">LATEST</span>
                <span className="text-[11px] font-bold truncate text-white/80">{featuredPost.title}</span>
                <button onClick={() => router.push(`/blog/${featuredPost.slug}`)} className="text-[10px] text-cyan-400 hover:underline shrink-0 font-bold">Read</button>
              </div>
            )}
          </div>
        ) : (
          // Sticky Slim or default header
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tight leading-none bg-gradient-to-r from-white via-white to-primary/80 bg-clip-text text-transparent">
              Corporate <span className="text-primary">Insights</span>
            </h1>
            <p className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
              Ideas, strategies, and blueprints to accelerate your business growth.
            </p>
          </div>
        )}

        {/* Toolbar categories navigation - Hide in knowledge hub layout since it uses left vertical nav */}
        {layoutStyle !== 'knowledge' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#080f28]/80 p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
                  activeCategory === 'all'
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
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
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Contextual search input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#04091a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 transition"
              />
            </div>
          </div>
        )}

        {/* Category specific sub-header bar if headerStyle is category-bar */}
        {headerStyle === 'category-bar' && layoutStyle !== 'knowledge' && (
          <div className="border-y border-white/5 py-2.5 flex items-center justify-center gap-6 text-[10px] uppercase font-bold tracking-widest text-white/40 overflow-x-auto no-scrollbar">
            <span className="text-white hover:text-primary cursor-pointer transition" onClick={() => setActiveCategory('all')}>ALL TOPICS</span>
            {categories.slice(0, 5).map(cat => (
              <span key={cat.id} className="hover:text-primary cursor-pointer transition" onClick={() => setActiveCategory(cat.id)}>{cat.name}</span>
            ))}
          </div>
        )}

        {/* Main Content Layout Container */}
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/10 rounded-3xl bg-[#080f28]/30 max-w-md mx-auto text-center">
            <BookOpen className="w-10 h-10 text-white/20 mb-4 animate-pulse" />
            <h3 className="font-space-grotesk text-sm font-bold uppercase tracking-wider text-white">No insights found</h3>
            <p className="text-xs text-white/40 leading-relaxed mt-2">
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
                    className="group bg-gradient-to-br from-[#0c102b] to-[#080f28] border border-purple-500/20 hover:border-purple-500/40 rounded-3xl overflow-hidden shadow-2xl cursor-pointer flex flex-col lg:flex-row min-h-[400px] hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition duration-300"
                  >
                    <div className="relative overflow-hidden bg-black/40 lg:w-3/5 w-full h-64 lg:h-auto">
                      {featuredPost.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featuredPost.cover_image}
                          alt={featuredPost.cover_image_alt || featuredPost.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c1535] to-[#04091a]">
                          <BookOpen className="w-16 h-16 text-purple-400/20" />
                        </div>
                      )}
                      {featuredPost.category && (
                        <span className="absolute top-6 left-6 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-xl border border-white/10 shadow-xl">
                          {featuredPost.category.name}
                        </span>
                      )}
                    </div>
                    <div className="p-8 flex flex-col justify-between flex-1 lg:w-2/5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-1 text-[10px] text-purple-400 uppercase tracking-widest font-black">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <h2 className="font-space-grotesk font-black text-2xl sm:text-3xl lg:text-4xl text-white leading-tight group-hover:text-purple-400 transition duration-300">
                          {featuredPost.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-white/50 leading-relaxed line-clamp-4">
                          {featuredPost.summary || "No post summary abstract provided."}
                        </p>
                      </div>
                      <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                            {featuredPost.author?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={featuredPost.author.avatar_url} alt="author avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-white/40" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                            {featuredPost.author ? `${featuredPost.author.first_name} ${featuredPost.author.last_name || ''}` : 'Team'}
                          </span>
                        </div>
                        <span className="text-xs font-black text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition duration-300">
                          READ FEATURE <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {secondaryPosts.map(post => renderNormalCard(post, "border-purple-500/10 hover:border-purple-500/30 hover:shadow-purple-500/5"))}
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
                    className="group relative h-[450px] w-full rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-white/10"
                  >
                    {featuredPost.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featuredPost.cover_image} alt={featuredPost.title} className="w-full h-full object-cover group-hover:scale-101 transition duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#080d22] to-[#040817] flex items-center justify-center"><BookOpen className="w-16 h-16 text-white/10" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 sm:p-12">
                      <div className="max-w-3xl space-y-4">
                        {featuredPost.category && (
                          <span className="inline-block bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border border-white/10">
                            {featuredPost.category.name}
                          </span>
                        )}
                        <h2 className="font-space-grotesk font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
                          {featuredPost.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-2">
                          {featuredPost.summary}
                        </p>
                        <div className="flex items-center gap-3 pt-2 text-[10px] text-white/50 uppercase tracking-wider font-bold">
                          <span>{featuredPost.author ? `${featuredPost.author.first_name} ${featuredPost.author.last_name || ''}` : 'Team'}</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full" />
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
                  <div className="lg:col-span-4 bg-[#080f28]/40 border border-white/5 rounded-2xl p-6 space-y-6">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-3">More Stories</h3>
                    <div className="divide-y divide-white/5 space-y-5">
                      {secondaryPosts.slice(4).map(post => (
                        <div key={post.id} onClick={() => router.push(`/blog/${post.slug}`)} className="pt-5 first:pt-0 cursor-pointer group space-y-2">
                          <span className="text-[9px] text-primary font-bold uppercase tracking-widest block">{post.category?.name || 'Insight'}</span>
                          <h4 className="text-xs font-bold text-white group-hover:text-primary transition leading-snug">{post.title}</h4>
                          <span className="text-[9px] text-white/30 block uppercase tracking-wider">{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {secondaryPosts.slice(4).length === 0 && (
                        <p className="text-xs text-white/30 italic">No additional articles found.</p>
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
                <div className="lg:col-span-3 bg-[#080f28]/60 border border-white/15 rounded-2xl p-4 sticky top-24 self-start h-fit space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mb-3">Topic Directories</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                          activeCategory === 'all'
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                        )}
                      >
                        <span>All Knowledge Hub</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40">{posts.length}</span>
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
                                : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <span>{cat.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search input inside topic hub */}
                  <div className="pt-4 border-t border-white/5">
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2 mb-2 block">Quick Index Search</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search wiki..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#04091a]/85 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Right content list */}
                <div className="lg:col-span-9 space-y-6">
                  <div className="bg-[#080f28]/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                        {activeCategory === 'all' ? 'Core Hub Directory' : categories.find(c => c.id === activeCategory)?.name}
                      </h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                        Showing {filteredPosts.length} resources resolved
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPosts.map(post => renderNormalCard(post, "border-white/5 bg-[#080f28]/30 hover:border-primary/20"))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. VIDEO-FIRST LAYOUT */}
            {layoutStyle === 'video' && (
              <div className="space-y-10 animate-fade-in">
                {featuredPost && (
                  <div className="bg-[#080f28] border border-red-500/10 rounded-3xl p-6 shadow-2xl space-y-6">
                    <div
                      onClick={() => router.push(`/blog/${featuredPost.slug}`)}
                      className="group relative h-[380px] w-full rounded-2xl overflow-hidden cursor-pointer bg-black/60 border border-white/10 flex items-center justify-center"
                    >
                      {featuredPost.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={featuredPost.cover_image} alt={featuredPost.title} className="w-full h-full object-cover opacity-60 group-hover:scale-101 transition duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-950/20 to-[#04091a]"></div>
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
                        className="font-space-grotesk font-black text-xl sm:text-2xl text-white hover:text-red-500 cursor-pointer transition leading-snug"
                      >
                        {featuredPost.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
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
                      className="group bg-[#080f28]/60 border border-red-500/5 hover:border-red-500/20 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl transition duration-300"
                    >
                      <div className="relative h-44 w-full bg-black/40 overflow-hidden">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-red-950/10 flex items-center justify-center"><Play className="w-8 h-8 text-white/10" /></div>
                        )}
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">
                          <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-3 right-3 bg-black/60 border border-white/5 px-2 py-0.5 rounded text-[8px] font-mono text-white/70">08:15</span>
                      </div>
                      
                      <div className="p-4 space-y-2">
                        <h4 className="font-space-grotesk font-bold text-xs sm:text-sm text-white group-hover:text-red-400 transition leading-snug line-clamp-2">{post.title}</h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">{post.category?.name || 'Class'}</p>
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
                <div className="bg-gradient-to-r from-purple-950/40 via-[#0c1535]/80 to-blue-950/40 border border-white/10 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div className="space-y-2 md:max-w-md">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block">JOIN THE DIGEST</span>
                    <h2 className="text-xl sm:text-2xl font-space-grotesk font-black leading-tight text-white">Get strategies straight to your inbox.</h2>
                    <p className="text-xs text-white/50 leading-relaxed">We break down complex funnel optimization, automation blueprints, and SA local market updates weekly.</p>
                  </div>
                  <form onSubmit={handleSubscribe} className="w-full md:w-80 space-y-2 shrink-0">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="business-email@co.za"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-[#04091a] border border-white/15 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-primary/50"
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
                    {subMsg && <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1.5"><Check className="w-3.5 h-3.5" />{subMsg}</div>}
                    {subError && <div className="text-[10px] text-red-400 font-bold mt-1.5">{subError}</div>}
                  </form>
                </div>

                {/* Digest List style feed */}
                <div className="divide-y divide-white/10 divide-dashed space-y-8">
                  {filteredPosts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/blog/${post.slug}`)}
                      className="group pt-8 first:pt-0 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:opacity-90 transition duration-200"
                    >
                      <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden bg-black/40 shrink-0">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#0c1535] flex items-center justify-center"><BookOpen className="w-8 h-8 text-white/15" /></div>
                        )}
                        {post.category && (
                          <span className="absolute top-3 left-3 bg-white/15 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/5">
                            {post.category.name}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold block">
                          {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <h3 className="font-space-grotesk font-extrabold text-sm sm:text-base text-white group-hover:text-primary transition leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
                          {post.summary || "No post summary abstract provided."}
                        </p>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/10 group-hover:border-primary group-hover:bg-primary/5 transition text-white/30 group-hover:text-primary">
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

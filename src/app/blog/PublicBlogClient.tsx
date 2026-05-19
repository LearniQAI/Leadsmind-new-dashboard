'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, User, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  created_at: string;
  category: { id: string; name: string } | null;
  author: { first_name: string; last_name: string; avatar_url: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PublicBlogClientProps {
  posts: Post[];
  categories: Category[];
}

export default function PublicBlogClient({ posts, categories }: PublicBlogClientProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filtering logic
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = activeCategory === 'all' || post.category?.id === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.summary && post.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#04091a] text-white font-dm-sans py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tight leading-none">
            Corporate <span className="text-primary">Insights</span>
          </h1>
          <p className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
            Ideas, strategies, and blueprints to accelerate your business growth.
          </p>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#080f28] p-4 rounded-2xl border border-white/10 shadow-2xl">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
                activeCategory === 'all'
                  ? "bg-primary text-white shadow-lg"
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
                    ? "bg-primary text-white shadow-lg"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Contextual Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#04091a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition"
            />
          </div>
        </div>

        {/* Articles Grid (Asymmetric Layout) */}
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/10 rounded-3xl bg-[#080f28]/30 max-w-md mx-auto text-center">
            <BookOpen className="w-10 h-10 text-white/20 mb-4 animate-bounce" />
            <h3 className="font-space-grotesk text-sm font-bold uppercase tracking-wider text-white">No insights found</h3>
            <p className="text-xs text-white/40 leading-relaxed mt-2">
              No published articles match your active criteria. Please clear search input or filter selections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, idx) => {
              const isFeatured = idx === 0 && activeCategory === 'all' && !searchQuery;
              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/blog/${post.slug}`)}
                  className={cn(
                    "group bg-[#080f28] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 shadow-2xl cursor-pointer flex flex-col justify-between hover:-translate-y-1",
                    isFeatured ? "lg:col-span-3 lg:flex-row min-h-[380px]" : "min-h-[420px]"
                  )}
                >
                  {/* Article Thumbnail */}
                  <div className={cn("relative overflow-hidden bg-black/40", isFeatured ? "lg:w-3/5 w-full h-64 lg:h-auto" : "h-48 w-full")}>
                    {post.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.cover_image}
                        alt={post.cover_image_alt || post.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c1535] to-[#04091a]">
                        <BookOpen className="w-12 h-12 text-white/10" />
                      </div>
                    )}
                    {post.category && (
                      <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border border-white/10 shadow-lg backdrop-blur-md">
                        {post.category.name}
                      </span>
                    )}
                  </div>

                  {/* Article Contents */}
                  <div className={cn("p-6 flex flex-col justify-between flex-1", isFeatured ? "lg:w-2/5" : "")}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h2 className={cn("font-space-grotesk font-extrabold text-white leading-tight group-hover:text-primary transition-colors duration-300", isFeatured ? "text-2xl" : "text-base")}>
                        {post.title}
                      </h2>

                      <p className="text-xs text-white/50 leading-relaxed line-clamp-3">
                        {post.summary || "No post summary abstract provided. Click read details below to discover the complete editorial essay."}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between">
                      {/* Author snapshot */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                          {post.author?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.author.avatar_url} alt="author avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-white/40" />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                          {post.author ? `${post.author.first_name} ${post.author.last_name || ''}` : 'Corporate Team'}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-300">
                        Read Story <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

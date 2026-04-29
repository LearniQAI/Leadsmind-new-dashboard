"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Calendar, User, ArrowRight, Loader2 } from 'lucide-react';
import { BlogFeedSettings } from './BlogFeedSettings';
import { useBuilder } from '../BuilderContext';
import { useEditor } from '@craftjs/core';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export interface BlogFeedProps {
  columns: number;
  postCount: number;
  backgroundColor: string;
  textColor: string;
  queryLogic: 'recent' | 'category';
  category: string;
  showFeaturedImage: boolean;
  showAuthor: boolean;
  showReadTime: boolean;
  paginationType: 'none' | 'load_more' | 'numbers';
}

export const BlogFeed = ({ 
    columns, 
    postCount, 
    backgroundColor, 
    textColor, 
    queryLogic,
    category,
    showFeaturedImage,
    showAuthor,
    showReadTime,
    paginationType,
    dragRef,
    ...props 
}: BlogFeedProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const { websiteData } = useBuilder();
  const { workspaceSlug } = useParams();
  
  const [posts, setPosts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(!enabled);

  // Mock data for the builder preview
  const mockPosts = [
      {
          title: '10 Tips for High-Converting Landing Pages',
          excerpt: 'Discover the secrets to building pages that actually scale your revenue in 2024.',
          date: 'Oct 12, 2024',
          author: 'Alex Rivera',
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop',
          category: 'Marketing',
          readTime: '5 min read'
      },
      {
          title: 'Mastering Sales Funnel Automation',
          excerpt: 'How to put your sales processes on autopilot without losing the human touch.',
          date: 'Sep 28, 2024',
          author: 'Jordan Smith',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2340&auto=format&fit=crop',
          category: 'Automation',
          readTime: '4 min read'
      },
      {
          title: 'The Future of AI in SaaS Growth',
          excerpt: 'Exploring how artificial intelligence is reshaping the landscape of software sales.',
          date: 'Sep 15, 2024',
          author: 'Taylor Chen',
          image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2532&auto=format&fit=crop',
          category: 'Technology',
          readTime: '6 min read'
      }
  ];

  React.useEffect(() => {
    if (enabled) {
        setPosts(mockPosts.slice(0, postCount));
        setLoading(false);
        return;
    }

    async function fetchRealPosts() {
        const workspaceId = websiteData?.workspace_id;
        if (!workspaceId) return;

        const supabase = createClient();
        let query = supabase
            .from('pages')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('type', 'blog_post')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(postCount);

        if (queryLogic === 'category' && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        
        if (data) {
            setPosts(data.map(p => ({
                title: p.name,
                excerpt: p.excerpt || p.seo_description || 'Click to read more...',
                date: new Date(p.created_at).toLocaleDateString(),
                author: p.author || 'Author',
                image: p.og_image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426',
                category: p.category || 'General',
                readTime: p.read_time ? `${p.read_time} min read` : '5 min read',
                slug: p.id // Future: use path_name
            })));
        }
        setLoading(false);
    }

    fetchRealPosts();
  }, [enabled, postCount, queryLogic, category, websiteData?.workspace_id]);

  const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  if (loading) {
      return (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Fetching Latest Insights...</span>
          </div>
      );
  }

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
            connect(ref);
            drag(ref);
            if (dragRef) {
                if (typeof dragRef === 'function') dragRef(ref);
                else dragRef.current = ref;
            }
        }
      }}
      className="w-full py-8 transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50"
      style={{ backgroundColor: backgroundColor, color: textColor }}
    >
      <div className={`grid gap-8 ${gridCols[columns as keyof typeof gridCols]}`}>
        {posts.length > 0 ? posts.map((post, i) => (
          <div key={i} className="group bg-white/5 rounded-3xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2">
            {showFeaturedImage && (
                <div className="aspect-video overflow-hidden">
                <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                </div>
            )}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
                {showReadTime && <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{post.readTime}</span>}
              </div>
              <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">{post.title}</h3>
              <p className="text-sm opacity-60 leading-relaxed mb-6 line-clamp-2">{post.excerpt}</p>
              
              <div className="flex items-center justify-between">
                {showAuthor && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 p-0.5">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold">
                                {post.author[0]}
                            </div>
                        </div>
                        <span className="text-xs font-bold opacity-80">{post.author}</span>
                    </div>
                )}
                <button 
                    onClick={() => {
                        if (!enabled && post.slug) {
                            window.location.href = `/p/${workspaceSlug}/${post.slug}`;
                        }
                    }}
                    className="text-xs font-black uppercase tracking-widest text-primary hover:underline group-hover:translate-x-2 transition-transform"
                >
                    Read More →
                </button>
              </div>
            </div>
          </div>
        )) : (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                <div className="mb-4 opacity-20 flex justify-center">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M8 15h8"/></svg>
                </div>
                <h3 className="text-lg font-bold mb-2">No blog posts found</h3>
                <p className="text-sm opacity-50 max-w-xs mx-auto">Start writing in the Blog Manager to see your content appear here automatically.</p>
            </div>
        )}
      </div>


      {(paginationType === 'load_more' && posts.length > 0) && (
          <div className="mt-16 flex justify-center">
              <button 
                className="px-12 py-4 rounded-full border border-white/10 font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all"
              >
                  Load More Posts
              </button>
          </div>
      )}
    </div>
  );
};

BlogFeed.craft = {
  displayName: 'Dynamic Blog Feed',
  props: {
    columns: 3,
    postCount: 3,
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    queryLogic: 'recent',
    category: 'all',
    showFeaturedImage: true,
    showAuthor: true,
    showReadTime: true,
    paginationType: 'none',
  },
  related: {
    settings: BlogFeedSettings,
  },
};

// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  Clock,
  Heart,
  Share2,
  MessageCircle,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ForumsClient({ initialPosts }: { initialPosts: any[] }) {
  const [posts, setPosts] = useState(initialPosts);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Community Hub</h2>
          <p className="text-white/40 text-sm font-medium">Join the neural network of LeadsMind entrepreneurs and builders.</p>
        </div>
        <Button 
          onClick={() => {
            const title = window.prompt("Enter Discussion Topic:");
            if (title) toast.success("Discussion node initialized!");
          }}
          className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <MessageSquare size={16} /> New Discussion
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Search className="w-4 h-4 text-white/20 mr-2" />
              <input 
                type="text" 
                placeholder="Search discussions, topics, or members..." 
                className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full font-bold"
              />
            </div>
            <div className="flex gap-2">
              <Badge className="bg-primary text-white border-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer">Trending</Badge>
              <Badge className="bg-white/5 border-white/10 text-white/40 hover:text-white cursor-pointer px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Newest</Badge>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="py-20 bg-[#0b0b1a] border border-white/10 rounded-[40px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <MessageSquare className="text-white/20" size={24} />
              </div>
              <h4 className="text-white font-black uppercase tracking-widest text-lg">No Discussions Found</h4>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Start a conversation to activate this node.</p>
            </div>
          ) : (
            posts.map((post) => (
              <ForumPostCard key={post.id} post={post} />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
            <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
              <TrendingUp className="text-primary" size={18} /> 
              Hot Nodes
            </h4>
            <div className="space-y-6">
              <TrendingTopic title="Neural Automation Strategies" participants="1.2k" />
              <TrendingTopic title="Funnel Velocity Tuning" participants="842" />
              <TrendingTopic title="LeadsMind v1.2 Launch" participants="2.4k" />
              <TrendingTopic title="High-Ticket Conversion" participants="631" />
            </div>
            <Button className="w-full mt-8 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] h-10 rounded-xl hover:bg-white/10 transition-all">
              View All Topics
            </Button>
          </div>

          <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
              <Users className="text-primary" size={18} /> 
              Elite Builders
            </h4>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-0.5 group-hover:scale-110 transition-transform">
                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary to-purple-500" />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">Builder_{i * 42}</h5>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic-none">Top Contributor</span>
                    </div>
                  </div>
                  <Badge className="bg-success/10 text-success border-none text-[8px] font-black uppercase tracking-widest">Online</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumPostCard({ post }: any) {
  return (
    <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-8 group hover:border-primary/50 transition-all duration-500 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-0.5 overflow-hidden">
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary to-blue-400" />
        </div>
        <div>
          <h5 className="text-sm font-black text-white uppercase tracking-tighter mb-0.5 group-hover:text-primary transition-colors italic-none">
            {post.author?.email || 'Anonymous Builder'}
          </h5>
          <div className="flex items-center gap-2 text-white/30 text-[9px] font-black uppercase tracking-widest italic-none">
            <Clock size={10} className="text-primary" />
            {new Date(post.created_at).toLocaleDateString()} • {post.category || 'General Discussion'}
          </div>
        </div>
      </div>

      <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-4 leading-tight italic-none">
        {post.title}
      </h4>
      <p className="text-white/40 text-xs font-medium line-clamp-3 mb-6 italic-none">
        {post.content}
      </p>

      <div className="flex items-center justify-between pt-6 border-t border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white/20 group-hover:text-primary transition-colors cursor-pointer">
            <Heart size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">24 Likes</span>
          </div>
          <div className="flex items-center gap-2 text-white/20 group-hover:text-white transition-colors cursor-pointer">
            <MessageCircle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">12 Replies</span>
          </div>
        </div>
        <Button className="h-10 bg-white/5 border border-white/10 text-white rounded-xl px-5 text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2">
          Enter Node <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function TrendingTopic({ title, participants }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer italic-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary transition-colors">
          <Hash size={14} className="text-white/30 group-hover:text-white" />
        </div>
        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest group-hover:text-white transition-colors">
          {title}
        </span>
      </div>
      <span className="text-[9px] font-black text-primary uppercase tracking-widest">{participants}</span>
    </div>
  );
}

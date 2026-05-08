'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Plus, 
  Calendar, 
  Image as ImageIcon, 
  Send,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { createSocialPost } from '@/app/actions/social';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SocialPlannerClient({ 
  initialPosts, 
  accounts 
}: { 
  initialPosts: any[], 
  accounts: any[] 
}) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const platforms = [
    { id: 'facebook', icon: <Facebook className="w-4 h-4" />, color: 'bg-[#1877F2]' },
    { id: 'instagram', icon: <Instagram className="w-4 h-4" />, color: 'bg-[#E4405F]' },
    { id: 'twitter', icon: <Twitter className="w-4 h-4" />, color: 'bg-[#1DA1F2]' },
    { id: 'linkedin', icon: <Linkedin className="w-4 h-4" />, color: 'bg-[#0A66C2]' },
  ];

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handlePost = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      toast.error('Please add content and select at least one platform');
      return;
    }

    setIsSubmitting(true);
    const res = await createSocialPost({
      platforms: selectedPlatforms,
      content,
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Post created successfully!');
      setContent('');
      setSelectedPlatforms([]);
      setIsComposerOpen(false);
      router.refresh();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Social <span className="text-primary">Planner</span></h1>
          <p className="text-white/40 text-sm font-medium mt-1">Schedule and manage your social presence with absolute precision.</p>
        </div>
        <Button 
          onClick={() => setIsComposerOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Composer / Queue */}
        <div className="lg:col-span-8 space-y-6">
          {isComposerOpen && (
            <div className="bg-[#0b0b1a] border border-primary/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-white/40">Select Platforms</span>
                  <div className="flex gap-2">
                    {platforms.map(p => (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedPlatforms.includes(p.id) ? `${p.color} text-white scale-110 shadow-lg` : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'}`}
                      >
                        {p.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening? Dominating your industry starts with a post..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors resize-none h-40"
                />

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl"><ImageIcon className="w-4 h-4 mr-2" /> Media</Button>
                    <Button variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl"><Calendar className="w-4 h-4 mr-2" /> Schedule</Button>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setIsComposerOpen(false)} className="text-white/40 hover:text-white">Cancel</Button>
                    <Button 
                      onClick={handlePost}
                      disabled={isSubmitting}
                      className="bg-primary text-white px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                    >
                      {isSubmitting ? 'Publishing...' : 'Publish Now'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Recent Posts
            </h2>
            <div className="space-y-4">
              {initialPosts.length === 0 ? (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <Send className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/40 font-medium">No posts scheduled yet. Start building your influence.</p>
                </div>
              ) : (
                initialPosts.map(post => (
                  <div key={post.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-1">
                        {post.platforms?.map((p: string) => (
                          <div key={p} className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white/60">
                            {platforms.find(pl => pl.id === p)?.icon}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${post.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {post.status}
                        </span>
                        <button className="text-white/20 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-white/30 font-medium pt-3 border-t border-white/5">
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        {post.status === 'published' ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Clock className="w-3 h-3" />}
                        {post.status === 'published' ? 'Published' : 'Scheduled'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Analytics / Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">Account Health</h3>
            <div className="space-y-4">
              {platforms.map(p => {
                const isConnected = accounts.some(a => a.platform === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${p.color}`}>
                        {p.icon}
                      </div>
                      <span className="text-xs font-bold text-white capitalize">{p.id}</span>
                    </div>
                    {isConnected ? (
                      <span className="text-[10px] font-black text-success uppercase tracking-widest">Active</span>
                    ) : (
                      <button className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors">Connect</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4 text-warning">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Pro Tip</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Posts with media assets typically receive <span className="text-white font-bold">4.5x more engagement</span>. Use the media composer to upload high-quality images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

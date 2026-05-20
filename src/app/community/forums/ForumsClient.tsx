'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Sparkles, Send, Plus, 
  HelpCircle, Megaphone, ShieldAlert, Award, 
  Bookmark, ChevronRight, X, Loader2, User, Search, Clock
} from 'lucide-react';
import { createForumPost, getForumPosts, getPostDetails, addCommentToPost } from '@/app/actions/forum';

const BOARDS = [
  { id: 'Ask a Question', icon: HelpCircle, desc: 'Technical & setup queries' },
  { id: 'Show and Tell Showcase', icon: Award, desc: 'Demonstrate custom solutions' },
  { id: 'SA Business Tax & Continuity Strategy', icon: ShieldAlert, desc: 'SARS & local business compliance' },
  { id: 'Feature Request Voting', icon: Megaphone, desc: 'Upvote future development targets' },
  { id: 'Verified Automation Recipes', icon: Bookmark, desc: 'Tested CRM workflow setups' }
];

export default function ForumsClient({ initialPosts }: { initialPosts: any[] }) {
  const [activeBoard, setActiveBoard] = useState('Ask a Question');
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Post Details Drawer
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetails, setPostDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // New Post Modal
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Load posts for active board
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await getForumPosts(activeBoard);
      if (res.data) setPosts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeBoard]);

  // Load post details
  const fetchPostDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await getPostDetails(id);
      if (res.data) setPostDetails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedPostId) {
      fetchPostDetails(selectedPostId);
    } else {
      setPostDetails(null);
    }
  }, [selectedPostId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    setSubmittingPost(true);
    try {
      const res = await createForumPost(activeBoard, newPostTitle, newPostContent);
      if (res.success) {
        setNewPostTitle('');
        setNewPostContent('');
        setIsCreatingPost(false);
        await fetchPosts();
        if (res.post?.id) {
          setSelectedPostId(res.post.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPostId) return;

    setSubmittingComment(true);
    try {
      const res = await addCommentToPost(selectedPostId, newComment);
      if (res.success) {
        setNewComment('');
        await fetchPostDetails(selectedPostId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Filter posts locally by search query
  const filteredPosts = posts.filter(post => {
    const titleMatch = post.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const authorMatch = post.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || contentMatch || authorMatch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto py-4">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#080f28]/60 border border-white/5 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Peer-To-Peer Discussion Hub
          </span>
          <h2 className="font-space-grotesk text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
            Community Forums
          </h2>
          <p className="text-white/40 text-xs font-light max-w-2xl">
            Join the neural network of LeadsMind builders. Share workflows, solve local SA compliance queries, and get automated vector help moderator replies.
          </p>
        </div>
        
        <button
          onClick={() => setIsCreatingPost(true)}
          className="bg-primary hover:bg-primary/95 text-white font-bold uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition duration-150 active:scale-95 self-start md:self-center"
        >
          <Plus size={16} /> New Discussion
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Filter Boards / Categories */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#080f28]/30 border border-white/5 rounded-3xl p-5 shadow-lg space-y-4">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">
              Channels Index
            </span>
            <div className="space-y-1.5">
              {BOARDS.map((board) => {
                const Icon = board.icon;
                const isActive = activeBoard === board.id;
                return (
                  <button
                    key={board.id}
                    onClick={() => {
                      setActiveBoard(board.id);
                      setSelectedPostId(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 group ${
                      isActive
                        ? 'bg-primary/10 border-primary/20 text-white shadow-sm'
                        : 'bg-white/[0.01] border-white/5 text-white/50 hover:bg-white/[0.03] hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-white/30 group-hover:text-white/60'}`} />
                    <div className="space-y-0.5">
                      <span className="text-[11px] sm:text-xs font-bold block leading-tight">{board.id}</span>
                      <span className="text-[9px] text-white/30 block font-light leading-tight">{board.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Active Board Stream */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search bar & statistics banner */}
          <div className="bg-[#080f28]/45 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 flex items-center bg-[#020510] border border-white/10 rounded-xl px-4 py-2 w-full">
              <Search className="w-4 h-4 text-white/20 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search topics, author, or keyword..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full font-bold focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                {filteredPosts.length} Threads
              </span>
            </div>
          </div>

          {/* Posts List container */}
          {loadingPosts ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-white/40 uppercase tracking-widest font-black">Syncing discussion stream...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 bg-[#080f28]/10 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                <MessageSquare className="text-white/20" size={20} />
              </div>
              <h4 className="text-white font-bold uppercase tracking-wider text-sm">No Conversations Found</h4>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1 max-w-xs font-light">
                Start the dialogue by clicking &ldquo;New Discussion&rdquo; above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="bg-[#080f28]/35 border border-white/5 rounded-3xl p-6 hover:border-primary/45 transition-all duration-300 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-xs uppercase text-primary font-mono shrink-0">
                        {post.author_name?.substring(0, 2)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-tight">
                          @{post.author_name || 'Member'}
                        </h5>
                        <div className="flex items-center gap-2 text-white/30 text-[9px] font-semibold uppercase tracking-widest">
                          <Clock size={10} className="text-primary" />
                          <span>
                            {new Date(post.created_at).toLocaleDateString('en-ZA', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md self-start">
                      {post.board}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight mb-3">
                    {post.title}
                  </h4>
                  <p className="text-white/45 text-xs font-light line-clamp-3 mb-5 leading-relaxed">
                    {post.content}
                  </p>

                  <div className="flex items-center justify-end pt-4 border-t border-white/[0.04]">
                    <button
                      onClick={() => setSelectedPostId(post.id)}
                      className="h-10 bg-white/5 border border-white/10 hover:bg-primary hover:border-primary text-white rounded-xl px-5 text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1.5"
                    >
                      <span>Enter Discussion</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* MODAL overlay: Create Post */}
      {isCreatingPost && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[2050] flex items-center justify-center p-4 animate-fade-in font-dm-sans">
          <div className="w-full max-w-lg bg-[#060b1f] border border-white/15 rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#080f28]/60">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">Create New Discussion</h4>
              </div>
              <button
                onClick={() => setIsCreatingPost(false)}
                className="p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Target Channel Board</label>
                <select
                  value={activeBoard}
                  onChange={(e) => setActiveBoard(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#020510] border border-white/10 focus:border-primary/40 rounded-xl text-xs text-white focus:outline-none transition-colors"
                >
                  {BOARDS.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#060b1f]">{b.id}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Discussion Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I configure FNB statement mapping rules?"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#020510] border border-white/10 focus:border-primary/40 rounded-xl text-xs text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Details & Context</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Explain your technical query, workflow configuration, or compliance case here. LENA Moderator will auto-respond if a verified guide matches."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#020510] border border-white/10 focus:border-primary/40 rounded-xl text-xs text-white focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingPost(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="py-2.5 px-5 rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5"
                >
                  {submittingPost && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Thread</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER details: Post Comments & Moderator Response Stream */}
      {selectedPostId && postDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] animate-fade-in flex justify-end font-dm-sans">
          <div className="w-full max-w-2xl bg-[#04091a] border-l border-white/10 h-full flex flex-col shadow-2xl animate-slide-in-right relative">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#060b1f]">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-primary uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 border border-primary/25">
                  {postDetails.post.board}
                </span>
                <h4 className="text-sm font-bold text-white tracking-tight leading-tight line-clamp-1">
                  {postDetails.post.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedPostId(null)}
                className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable details & responses flow */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              {/* Original Post */}
              <div className="p-5 bg-[#080f28]/45 border border-white/5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-[9px] text-white/45 border-b border-white/[0.04] pb-2">
                  <span className="font-bold">@{postDetails.post.author_name}</span>
                  <span>{new Date(postDetails.post.created_at).toLocaleString('en-ZA')}</span>
                </div>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light whitespace-pre-wrap">
                  {postDetails.post.content}
                </p>
              </div>

              {/* Replies Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Replies Stream</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              {/* Comments Flow list */}
              <div className="space-y-4">
                {postDetails.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`p-5 rounded-2xl border transition leading-relaxed ${
                      comment.is_lena
                        ? 'bg-purple-500/5 border-purple-500/20 text-white/95 shadow-lg shadow-purple-500/5'
                        : 'bg-white/[0.01] border-white/5 text-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] border-b border-white/[0.03] pb-2 mb-3">
                      {comment.is_lena ? (
                        <span className="font-black text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          🤖 LENA AI Moderator
                        </span>
                      ) : (
                        <span className="font-bold text-white/45">@{comment.author_name}</span>
                      )}
                      <span className="text-white/30">
                        {new Date(comment.created_at).toLocaleString('en-ZA')}
                      </span>
                    </div>
                    <p className="text-xs font-light whitespace-pre-wrap leading-relaxed text-white/85">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>

            </div>

            {/* Quick reply footer input */}
            <form onSubmit={handleAddComment} className="p-4 border-t border-white/5 bg-[#060b1f] flex gap-3">
              <input
                type="text"
                required
                placeholder="Type your reply to this thread..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 py-3 px-4 bg-[#020510] border border-white/10 focus:border-primary/45 rounded-xl text-xs text-white focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="p-3 bg-primary hover:bg-primary/95 text-white rounded-xl transition duration-150 flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                {submittingComment ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost, deletePost, createCategory } from '@/app/actions/blog';
import { clonePost } from '@/app/actions/blogStudio';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Plus, Search, Calendar, FileText, ArrowRight, Trash2, Clock, Youtube, Sparkles, Copy, BarChart3, MessageSquare, ExternalLink, Globe } from 'lucide-react';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: 'draft' | 'published' | 'scheduled';
  cover_image: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  category: { id: string; name: string } | null;
}

interface Category { id: string; name: string; slug: string; }

interface BlogAdminClientProps {
  initialPosts: Post[];
  categories: Category[];
}

export default function BlogManagementClient({ initialPosts, categories }: BlogAdminClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [categoriesList, setCategoriesList] = useState<Category[]>(categories);
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Custom delete modal states
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await createPost({ title: newTitle.trim(), category_id: newCatId || undefined });
      if (res.data) router.push(`/blog/editor/${res.data.id}`);
    } catch (err) { console.error(err); } finally {
      setIsSubmitting(false);
      setShowCreateModal(false);
    }
  };

  const handleAddCategorySubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setIsCreatingCat(true);
      const res = await createCategory(newCatName.trim());
      if (res.data) {
        const created = res.data as Category;
        setCategoriesList(prev => [...prev, created]);
        setNewCatId(created.id);
        setNewCatName('');
        setShowAddCat(false);
      }
    } catch (err) { console.error(err); } finally { setIsCreatingCat(false); }
  };

  const handleCloneClick = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to clone this article as a fresh draft?')) return;
    try {
      const res = await clonePost(postId);
      if (res.error) alert(`Cloning failed: ${res.error}`);
      else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(`Error cloning post: ${err.message}`);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPostToDelete(id);
  };

  const filteredPosts = posts.filter(post => {
    const matchesFilter = activeFilter === 'all' || post.status === activeFilter;
    return matchesFilter && (post.title.toLowerCase().includes(searchQuery.toLowerCase()) || (post.summary && post.summary.toLowerCase().includes(searchQuery.toLowerCase())));
  });

  const getStatusBadge = (s: string) => s === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : s === 'scheduled' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20';

  return (
    <MetaData pageTitle="Blog Creator">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a] text-white">
          <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center justify-between gap-6 px-6 pt-8 pb-4 border-b border-white/5 bg-[#050b21]/30">
            <div>
              <h1 className="font-space-grotesk text-3xl font-extrabold tracking-tight text-white uppercase leading-none mb-2">
                Blog <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Creator</span>
              </h1>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] font-space-grotesk">
                Content Orchestration & Publication Command Center
              </p>
            </div>
            
            {/* Action Control Hub Panel Container */}
            <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto w-full sm:w-auto max-w-full">
              {/* Secondary Actions Panel */}
              <div className="bg-[#080f28]/60 border border-white/5 p-2 rounded-xl flex flex-wrap items-center gap-2 shadow-2xl backdrop-blur-md w-full sm:w-auto max-w-full">
                <button 
                  onClick={() => router.push('/blog/new/ai')} 
                  className="bg-[#0c1535]/80 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-300 text-white/80 hover:text-white flex items-center gap-1.5 group shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:animate-pulse" />
                  <span>AI Brief Writer</span>
                </button>
                
                <button 
                  onClick={() => router.push('/blog/new/social')} 
                  className="bg-[#0c1535]/80 border border-white/5 hover:border-primary/30 hover:bg-primary/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-300 text-white/80 hover:text-white flex items-center gap-1.5 group shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary group-hover:animate-pulse" />
                  <span>Expander Studio</span>
                </button>
                
                <button 
                  onClick={() => router.push('/blog/new/youtube')} 
                  className="bg-[#0c1535]/80 border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-300 text-white/80 hover:text-white flex items-center gap-1.5 group shrink-0"
                >
                  <Youtube className="w-3.5 h-3.5 text-red-500 group-hover:animate-pulse" />
                  <span>Import YouTube</span>
                </button>

                <button 
                  onClick={() => router.push('/blog/new/web')} 
                  className="bg-[#0c1535]/80 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-300 text-white/80 hover:text-white flex items-center gap-1.5 group shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400 group-hover:animate-pulse" />
                  <span>Import Web Page</span>
                </button>

                <div className="h-6 w-[1px] bg-white/10 hidden xl:block mx-1 shrink-0" />

                <button 
                  onClick={() => router.push('/blog/analytics')} 
                  className="bg-[#0c1535]/80 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-300 text-white/80 hover:text-white flex items-center gap-1.5 group shrink-0"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500 group-hover:animate-pulse" />
                  <span>Analytics</span>
                </button>

                <button 
                  onClick={() => router.push('/blog/comments')} 
                  className="bg-[#0c1535]/80 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-300 text-white/80 hover:text-white flex items-center gap-1.5 group shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500 group-hover:animate-pulse" />
                  <span>Moderation</span>
                </button>
              </div>

              {/* Primary Action Button */}
              <button 
                onClick={() => { setShowCreateModal(true); setShowAddCat(false); }} 
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 text-xs font-extrabold rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5 shrink-0 hover:scale-[1.02] w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Article</span>
              </button>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 my-6 border-b border-white/5 pb-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
              {(['all', 'published', 'scheduled', 'draft'] as const).map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeFilter === f ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>{f}</button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search articles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition" />
            </div>
          </div>

          <div className="flex-1 px-6 pb-12">
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-12 max-w-md mx-auto text-center my-12 bg-[#080f28]/40">
                <FileText className="w-12 h-12 text-primary mb-4" />
                <h3 className="font-space-grotesk text-base font-bold mb-1.5">No articles created yet</h3>
                <p className="text-xs text-white/50 leading-relaxed mb-6">Compose your first blog post to engage your audience, boost search engine discovery, and drive organic conversions.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => router.push('/blog/new/ai')} className="bg-[#0c1535] border border-white/10 hover:bg-white/5 px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-400 fill-current" /> AI Brief Writer</button>
                  <button onClick={() => router.push('/blog/new/social')} className="bg-[#0c1535] border border-white/10 hover:bg-white/5 px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary fill-current" /> Expander Studio</button>
                  <button onClick={() => router.push('/blog/new/youtube')} className="bg-[#0c1535] border border-white/10 hover:bg-white/5 px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"><Youtube className="w-4 h-4 text-red-500 fill-current" /> Convert Video</button>
                  <button onClick={() => router.push('/blog/new/web')} className="bg-[#0c1535] border border-white/10 hover:bg-white/5 px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"><Globe className="w-4 h-4 text-emerald-400 fill-current" /> Web Importer</button>
                  <button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-blue-600 px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"><Plus className="w-4 h-4" /> Create First Article</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div onClick={() => { setShowCreateModal(true); setShowAddCat(false); }} className="border-2 border-dashed border-white/15 hover:border-primary/40 hover:bg-primary/[0.04] rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-3 cursor-pointer group transition duration-300">
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition duration-300 text-white/50"><Plus className="w-5 h-5" /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/40 group-hover:text-white transition">Write New Article</span>
                </div>

                {filteredPosts.map(post => (
                  <div key={post.id} onClick={() => router.push(`/blog/editor/${post.id}`)} className="group bg-[#080f28] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-white/20 transition duration-300 flex flex-col min-h-[250px] justify-between shadow-xl relative">
                    <div>
                      <div className="w-full h-32 bg-[#04091a] relative overflow-hidden">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.cover_image_alt || post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c1535] to-[#04091a]"><FileText className="w-8 h-8 text-white/15" /></div>
                        )}
                        <span className={`absolute top-3 left-3 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusBadge(post.status)}`}>{post.status}</span>
                        {post.category && <span className="absolute bottom-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10">{post.category.name}</span>}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-space-grotesk text-sm font-bold text-white leading-snug group-hover:text-primary transition line-clamp-2">{post.title}</h3>
                        <p className="text-xs text-white/50 font-dm-sans leading-normal line-clamp-2">{post.summary || 'No abstract preview written for this article yet.'}</p>
                      </div>
                    </div>
                    <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/10">
                      <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider flex items-center gap-1">
                        {post.status === 'scheduled' && post.scheduled_at ? <><Clock className="w-3 h-3 text-amber-400" /> {new Date(post.scheduled_at).toLocaleDateString()}</> : <><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</>}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/blog/${post.slug}${post.status !== 'published' ? '?preview=1' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={post.status === 'published' ? 'View Live Post' : 'Preview Draft'}
                          className={`p-1 rounded transition flex items-center ${
                            post.status === 'published'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={(e) => handleCloneClick(post.id, e)} className="p-1 rounded bg-white/5 hover:bg-primary/10 text-white/40 hover:text-primary transition" title="Clone Article"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleDeleteClick(post.id, e)} className="p-1 rounded bg-white/5 hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition" title="Delete Post"><Trash2 className="w-3.5 h-3.5" /></button>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showCreateModal && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#04091a]/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-[#080f28] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-space-grotesk text-sm font-bold text-white uppercase tracking-wider">Compose <span className="text-primary">New Article</span></h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-white">✕</button>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-4 font-dm-sans">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Article Title</label>
                    <input type="text" value={newTitle} placeholder="e.g. 5 Strategies to Accelerate Funnel Conversions" onChange={e => setNewTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition" required />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Initial Category</label>
                      <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="text-[9.5px] text-primary hover:text-white flex items-center gap-0.5 font-bold transition"><Plus className="w-3 h-3" /> {showAddCat ? 'Cancel' : 'New Category'}</button>
                    </div>
                    {showAddCat ? (
                      <div className="flex gap-1.5 items-center">
                        <input type="text" value={newCatName} placeholder="e.g. Technology" onChange={e => setNewCatName(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary" disabled={isCreatingCat} />
                        <button type="button" onClick={handleAddCategorySubmit} className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 font-bold transition disabled:opacity-50" disabled={isCreatingCat || !newCatName.trim()}>{isCreatingCat ? '...' : 'Add'}</button>
                      </div>
                    ) : (
                      <select value={newCatId} onChange={e => setNewCatId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition">
                        <option value="" className="bg-[#080f28]">Choose category (Optional)...</option>
                        {categoriesList.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#080f28]">{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 border-t border-white/5 pt-3">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white/70 transition">Cancel</button>
                    <button type="submit" disabled={isSubmitting || !newTitle.trim()} className="px-4 py-2 bg-primary hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition disabled:opacity-50">{isSubmitting ? 'Composing...' : 'Initialize Workspace'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CUSTOM CONFIRMATION DIALOG */}
          {postToDelete && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#04091a]/85 backdrop-blur-sm p-4 animate-fade-in">
              <div className="w-full max-w-sm bg-[#080f28] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-space-grotesk text-sm font-bold text-white uppercase tracking-wider">Confirm Destruction</h3>
                  <p className="text-xs text-white/50 leading-relaxed font-dm-sans">
                    Are you absolutely sure you want to permanently delete this article? This action is atomic, irreversible, and will detach all related assets.
                  </p>
                </div>
                <div className="flex gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setPostToDelete(null)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white/70 transition"
                    disabled={isDeleting}
                  >
                    Keep Article
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsDeleting(true);
                        const res = await deletePost(postToDelete);
                        if (res.success) {
                          setPosts(posts.filter(p => p.id !== postToDelete));
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsDeleting(false);
                        setPostToDelete(null);
                      }
                    }}
                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Wrapper>
    </MetaData>
  );
}

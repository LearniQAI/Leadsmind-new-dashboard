'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost, deletePost, createCategory } from '@/app/actions/blog';
import { clonePost } from '@/app/actions/blogStudio';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Plus, Search, Calendar, FileText, ArrowRight, Trash2, Clock, Youtube, Sparkles, Copy, BarChart3, MessageSquare, ExternalLink, Globe } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';

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

  // Delete modal state
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

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
    setConfirmConfig({
      isOpen: true,
      title: 'Clone article?',
      description: 'Are you sure you want to clone this article as a fresh draft?',
      confirmLabel: 'Clone',
      onConfirm: async () => {
        try {
          const res = await clonePost(postId);
          if (res.error) {
            toast.error(`Cloning failed: ${res.error}`);
          } else {
            toast.success('Article cloned successfully!');
            window.location.reload();
          }
        } catch (err: any) {
          toast.error(`Error cloning post: ${err.message}`);
        }
      }
    });
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPostToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
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
  };

  const filteredPosts = posts.filter(post => {
    const matchesFilter = activeFilter === 'all' || post.status === activeFilter;
    return matchesFilter && (post.title.toLowerCase().includes(searchQuery.toLowerCase()) || (post.summary && post.summary.toLowerCase().includes(searchQuery.toLowerCase())));
  });

  const statusVariant = (s: string) => s === 'published' ? 'success' : s === 'scheduled' ? 'warning' : 'accent';

  return (
    <MetaData pageTitle="Blog Creator">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center justify-between gap-6 px-6 pt-8 pb-4 border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text mb-2">
                Blog <span className="text-dash-accent">creator</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted font-medium">
                Content orchestration & publication command center
              </p>
            </div>

            {/* Action Control Hub Panel Container */}
            <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto w-full sm:w-auto max-w-full">
              {/* Secondary Actions Panel */}
              <div className="bg-dash-surface border border-dash-border p-2 rounded-xl flex flex-wrap items-center gap-2 w-full sm:w-auto max-w-full">
                <button
                  onClick={() => router.push('/blog/new/ai')}
                  className="bg-white border border-dash-border hover:border-dash-accent/30 hover:bg-dash-accent/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5 group shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-dash-accent group-hover:animate-pulse motion-reduce:group-hover:animate-none" />
                  <span>AI brief writer</span>
                </button>

                <button
                  onClick={() => router.push('/blog/new/social')}
                  className="bg-white border border-dash-border hover:border-dash-accent/30 hover:bg-dash-accent/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5 group shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-dash-accent group-hover:animate-pulse motion-reduce:group-hover:animate-none" />
                  <span>Expander studio</span>
                </button>

                <button
                  onClick={() => router.push('/blog/new/youtube')}
                  className="bg-white border border-dash-border hover:border-red/30 hover:bg-red/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5 group shrink-0"
                >
                  <Youtube className="w-3.5 h-3.5 text-red group-hover:animate-pulse motion-reduce:group-hover:animate-none" />
                  <span>Import YouTube</span>
                </button>

                <button
                  onClick={() => router.push('/blog/new/web')}
                  className="bg-white border border-dash-border hover:border-green/30 hover:bg-green/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5 group shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-green group-hover:animate-pulse motion-reduce:group-hover:animate-none" />
                  <span>Import web page</span>
                </button>

                <div className="h-6 w-[1px] bg-dash-border hidden xl:block mx-1 shrink-0" />

                <button
                  onClick={() => router.push('/blog/analytics')}
                  className="bg-white border border-dash-border hover:border-green/30 hover:bg-green/5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5 group shrink-0"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-green group-hover:animate-pulse motion-reduce:group-hover:animate-none" />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => router.push('/blog/comments')}
                  className="bg-white border border-dash-border hover:border-purple-300 hover:bg-purple-50 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5 group shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600 group-hover:animate-pulse motion-reduce:group-hover:animate-none" />
                  <span>Moderation</span>
                </button>
              </div>

              {/* Primary Action Button */}
              <DashButton
                onClick={() => { setShowCreateModal(true); setShowAddCat(false); }}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New article</span>
              </DashButton>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 my-6 border-b border-dash-border pb-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-dash-surface p-1 rounded-xl border border-dash-border">
              {(['all', 'published', 'scheduled', 'draft'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors motion-reduce:transition-none",
                    activeFilter === f ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 !text-dash-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
              <DashInput
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 px-6 pb-12">
            {filteredPosts.length === 0 ? (
              <div className="max-w-md mx-auto my-12">
                <DashEmptyState
                  icon={FileText}
                  title="No articles created yet"
                  description="Compose your first blog post to engage your audience, boost search engine discovery, and drive organic conversions."
                />
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <DashButton variant="secondary" size="sm" onClick={() => router.push('/blog/new/ai')}><Sparkles className="w-4 h-4 text-dash-accent" /> AI brief writer</DashButton>
                  <DashButton variant="secondary" size="sm" onClick={() => router.push('/blog/new/social')}><Sparkles className="w-4 h-4 text-dash-accent" /> Expander studio</DashButton>
                  <DashButton variant="secondary" size="sm" onClick={() => router.push('/blog/new/youtube')}><Youtube className="w-4 h-4 text-red" /> Convert video</DashButton>
                  <DashButton variant="secondary" size="sm" onClick={() => router.push('/blog/new/web')}><Globe className="w-4 h-4 text-green" /> Web importer</DashButton>
                  <DashButton size="sm" onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4" /> Create first article</DashButton>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div onClick={() => { setShowCreateModal(true); setShowAddCat(false); }} className="border-2 border-dashed border-dash-border hover:border-dash-accent/40 hover:bg-dash-accent/5 rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-3 cursor-pointer group transition-colors motion-reduce:transition-none">
                  <div className="w-10 h-10 rounded-full border border-dash-border bg-white flex items-center justify-center group-hover:bg-dash-accent group-hover:text-white transition-colors motion-reduce:transition-none !text-dash-textMuted"><Plus className="w-5 h-5" /></div>
                  <span className="text-xs font-bold !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">Write new article</span>
                </div>

                {filteredPosts.map(post => (
                  <DashCard key={post.id} padding="none" onClick={() => router.push(`/blog/editor/${post.id}`)} className="group cursor-pointer flex flex-col min-h-[250px] justify-between relative overflow-hidden">
                    <div>
                      <div className="w-full h-32 bg-dash-surface relative overflow-hidden">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.cover_image_alt || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-dash-surface"><FileText className="w-8 h-8 !text-dash-textMuted opacity-40" /></div>
                        )}
                        <div className="absolute top-3 left-3">
                          <DashStatusPill variant={statusVariant(post.status)}>{post.status}</DashStatusPill>
                        </div>
                        {post.category && <span className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm !text-dash-text border border-dash-border">{post.category.name}</span>}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-bold !text-dash-text leading-snug group-hover:text-dash-accent transition-colors motion-reduce:transition-none line-clamp-2">{post.title}</h3>
                        <p className="text-xs !text-dash-textMuted leading-normal line-clamp-2">{post.summary || 'No abstract preview written for this article yet.'}</p>
                      </div>
                    </div>
                    <div className="p-4 border-t border-dash-border flex items-center justify-between">
                      <span className="text-[10px] !text-dash-textMuted font-semibold flex items-center gap-1">
                        {post.status === 'scheduled' && post.scheduled_at ? <><Clock className="w-3 h-3 text-amber-600" /> {new Date(post.scheduled_at).toLocaleDateString()}</> : <><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</>}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/blog/${post.slug}${post.status !== 'published' ? '?preview=1' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={post.status === 'published' ? 'View Live Post' : 'Preview Draft'}
                          className={cn(
                            "p-1 rounded transition-colors motion-reduce:transition-none flex items-center",
                            post.status === 'published'
                              ? 'bg-green/10 hover:bg-green/20 text-green'
                              : 'bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text'
                          )}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={(e) => handleCloneClick(post.id, e)} className="p-1 rounded bg-dash-surface hover:bg-dash-accent/10 !text-dash-textMuted hover:text-dash-accent transition-colors motion-reduce:transition-none" title="Clone Article"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleDeleteClick(post.id, e)} className="p-1 rounded bg-dash-surface hover:bg-red/10 !text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none" title="Delete Post"><Trash2 className="w-3.5 h-3.5" /></button>
                        <ArrowRight className="w-4 h-4 !text-dash-textMuted group-hover:text-dash-accent group-hover:translate-x-0.5 transition-all motion-reduce:transition-none" />
                      </div>
                    </div>
                  </DashCard>
                ))}
              </div>
            )}
          </div>

          <DashModal open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DashModalContent className="max-w-md">
              <DashModalHeader>
                <DashModalTitle>Compose <span className="text-dash-accent">new article</span></DashModalTitle>
              </DashModalHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <DashFormField label="Article title" required>
                  <DashInput
                    type="text"
                    value={newTitle}
                    placeholder="e.g. 5 Strategies to Accelerate Funnel Conversions"
                    onChange={e => setNewTitle(e.target.value)}
                    required
                  />
                </DashFormField>
                <DashFormField label="Initial category">
                  <div className="flex items-center justify-end mb-1.5">
                    <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="text-[10px] text-dash-accent hover:text-dash-accent/80 flex items-center gap-0.5 font-bold transition-colors motion-reduce:transition-none"><Plus className="w-3 h-3" /> {showAddCat ? 'Cancel' : 'New category'}</button>
                  </div>
                  {showAddCat ? (
                    <div className="flex gap-1.5 items-center">
                      <DashInput type="text" value={newCatName} placeholder="e.g. Technology" onChange={e => setNewCatName(e.target.value)} disabled={isCreatingCat} className="h-9" />
                      <DashButton type="button" size="sm" onClick={handleAddCategorySubmit} disabled={isCreatingCat || !newCatName.trim()}>{isCreatingCat ? '...' : 'Add'}</DashButton>
                    </div>
                  ) : (
                    <select value={newCatId} onChange={e => setNewCatId(e.target.value)} className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent">
                      <option value="">Choose category (Optional)...</option>
                      {categoriesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </DashFormField>
                <DashModalFooter>
                  <DashButton type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</DashButton>
                  <DashButton type="submit" disabled={isSubmitting || !newTitle.trim()}>{isSubmitting ? 'Composing...' : 'Initialize workspace'}</DashButton>
                </DashModalFooter>
              </form>
            </DashModalContent>
          </DashModal>

          <ConfirmDialog
            isOpen={!!postToDelete}
            onClose={() => setPostToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Delete article?"
            description="Are you sure you want to permanently delete this article? This action is irreversible and will detach all related assets."
            confirmLabel={isDeleting ? 'Deleting...' : 'Yes, delete'}
            variant="danger"
          />

          {confirmConfig && (
            <ConfirmDialog
              isOpen={confirmConfig.isOpen}
              onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
              onConfirm={confirmConfig.onConfirm}
              title={confirmConfig.title}
              description={confirmConfig.description}
              confirmLabel={confirmConfig.confirmLabel}
              variant="info"
            />
          )}
        </div>
      </Wrapper>
    </MetaData>
  );
}

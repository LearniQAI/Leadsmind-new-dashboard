'use client';

import React, { useState, useEffect } from 'react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string | null;
  always_include: boolean;
  active: boolean;
}

interface KnowledgeBaseTabProps {
  workspaceId: string;
}

export default function KnowledgeBaseTab({ workspaceId }: KnowledgeBaseTabProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [alwaysInclude, setAlwaysInclude] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchArticles = async () => {
    try {
      const res = await fetch(`/api/lena/knowledge?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (res.ok) {
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [workspaceId]);

  const openAddModal = () => {
    setEditingArticle(null);
    setTitle('');
    setCategory('');
    setContent('');
    setAlwaysInclude(false);
    setModalOpen(true);
  };

  const openEditModal = (art: Article) => {
    setEditingArticle(art);
    setTitle(art.title);
    setCategory(art.category || '');
    setContent(art.content);
    setAlwaysInclude(art.always_include);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);

    try {
      const url = editingArticle
        ? `/api/lena/knowledge?id=${editingArticle.id}`
        : '/api/lena/knowledge';
      const method = editingArticle ? 'PATCH' : 'POST';

      const payload = {
        workspaceId,
        title,
        content,
        category: category || null,
        always_include: alwaysInclude,
        active: editingArticle ? editingArticle.active : true
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchArticles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save article.');
      }
    } catch {
      alert('Network error saving article.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? LENA will no longer be able to reference it.')) return;
    try {
      const res = await fetch(`/api/lena/knowledge?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchArticles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete article.');
      }
    } catch {
      alert('Network error deleting article.');
    }
  };

  const toggleActive = async (art: Article) => {
    try {
      const res = await fetch(`/api/lena/knowledge?id=${art.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !art.active })
      });
      if (res.ok) {
        fetchArticles();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  if (loading) {
    return <div className="h-40 bg-white/[0.02] animate-pulse rounded-xl" />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header toolbar */}
      <div className="flex justify-between items-center bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl">
        <div>
          <span className="text-[14px] font-semibold text-[#eef2ff] block font-space-grotesk">
            Articles & Sources
          </span>
          <span className="text-[11.5px] text-[#4a5a82] font-dm-sans">
            Add information below that LENA can use to answer visitor queries.
          </span>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add Article
        </button>
      </div>

      {/* Articles list */}
      <div className="space-y-3">
        {articles.length === 0 ? (
          <div className="bg-[rgba(12,21,53,0.85)] border border-dashed border-[rgba(255,255,255,0.1)] p-8 rounded-xl text-center flex flex-col items-center gap-3">
            <span className="text-[28px] text-[#4a5a82] opacity-55">📝</span>
            <span className="text-[13px] font-semibold text-[#94a3c8]">No Articles Added Yet</span>
            <p className="text-[12px] text-[#4a5a82] max-w-[280px]">
              LENA has no information to learn from. Add articles containing details about your services or FAQs.
            </p>
            <button
              onClick={openAddModal}
              className="bg-[#2563eb] text-white text-[12px] font-semibold rounded-lg px-4 py-1.5 mt-2 hover:bg-[#1d4ed8]"
            >
              + Create First Article
            </button>
          </div>
        ) : (
          articles.map((art) => (
            <div
              key={art.id}
              className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[#eef2ff] font-semibold text-[13.5px] font-space-grotesk truncate">
                    {art.title}
                  </span>
                  {art.category && (
                    <span className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/35 text-[#a78bfa] text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      {art.category}
                    </span>
                  )}
                  {art.always_include && (
                    <span className="bg-[#f59e0b]/10 border border-[#f59e0b]/35 text-[#fbbf24] text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Proactive
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#94a3c8] line-clamp-2 mt-1.5 font-dm-sans max-w-2xl">
                  {art.content}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Active Toggle */}
                <button
                  onClick={() => toggleActive(art)}
                  className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border ${
                    art.active
                      ? 'bg-[#10b981]/10 text-[#34d399] border-[#10b981]/30'
                      : 'bg-white/5 text-[#94a3c8] border-white/10'
                  }`}
                >
                  {art.active ? 'Active' : 'Paused'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(art)}
                    className="bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(art.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#04091a]/75 backdrop-blur-[4px] z-[500] flex items-center justify-center p-4">
          <div className="bg-[#080f28] border border-[rgba(255,255,255,0.13)] rounded-2xl w-full max-w-[560px] p-6 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <span className="text-[15px] font-semibold text-white font-space-grotesk">
                {editingArticle ? 'Edit Article' : 'Add Knowledge Source'}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#94a3c8] hover:text-white text-[16px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operating Hours, Return Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales, Support, FAQs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Content (LENA's Context Source)
                </label>
                <textarea
                  placeholder="Provide precise details. LENA will read this to answer visitor queries."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={8}
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-3.5 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                <input
                  type="checkbox"
                  id="alwaysInclude"
                  checked={alwaysInclude}
                  onChange={(e) => setAlwaysInclude(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-transparent text-[#2563eb] focus:ring-0"
                />
                <label htmlFor="alwaysInclude" className="text-[12px] text-[#94a3c8] cursor-pointer">
                  <strong>Proactive mention</strong>: LENA reads this automatically for every visitor conversation.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-white text-[12.5px] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12.5px] font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

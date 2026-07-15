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
    return <div className="h-40 bg-dash-surface animate-pulse motion-reduce:animate-none rounded-xl" />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header toolbar */}
      <div className="flex justify-between items-center bg-white border border-dash-border p-4 rounded-xl shadow-sm">
        <div>
          <span className="text-[14px] font-semibold !text-dash-text block">
            Articles & sources
          </span>
          <span className="text-[11.5px] !text-dash-textMuted">
            Add information below that LENA can use to answer visitor queries.
          </span>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="bg-dash-accent hover:bg-dash-accent/90 text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors motion-reduce:transition-none"
        >
          + Add article
        </button>
      </div>

      {/* Articles list */}
      <div className="space-y-3">
        {articles.length === 0 ? (
          <div className="bg-white border border-dashed border-dash-border p-8 rounded-xl text-center flex flex-col items-center gap-3">
            <span className="text-[28px] opacity-55">📝</span>
            <span className="text-[13px] font-semibold !text-dash-text">No articles added yet</span>
            <p className="text-[12px] !text-dash-textMuted max-w-[280px]">
              LENA has no information to learn from. Add articles containing details about your services or FAQs.
            </p>
            <button
              onClick={openAddModal}
              className="bg-dash-accent text-white text-[12px] font-semibold rounded-lg px-4 py-1.5 mt-2 hover:bg-dash-accent/90 transition-colors motion-reduce:transition-none"
            >
              + Create first article
            </button>
          </div>
        ) : (
          articles.map((art) => (
            <div
              key={art.id}
              className="bg-white border border-dash-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="!text-dash-text font-semibold text-[13.5px] truncate">
                    {art.title}
                  </span>
                  {art.category && (
                    <span className="bg-purple-50 border border-purple-200 text-purple-600 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      {art.category}
                    </span>
                  )}
                  {art.always_include && (
                    <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Proactive
                    </span>
                  )}
                </div>
                <p className="text-[12px] !text-dash-textMuted line-clamp-2 mt-1.5 max-w-2xl">
                  {art.content}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Active Toggle */}
                <button
                  onClick={() => toggleActive(art)}
                  className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border ${
                    art.active
                      ? 'bg-green/10 text-green border-green/30'
                      : 'bg-dash-surface !text-dash-textMuted border-dash-border'
                  }`}
                >
                  {art.active ? 'Active' : 'Paused'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(art)}
                    className="bg-dash-surface hover:bg-dash-border/60 !text-dash-text text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(art.id)}
                    className="bg-red/10 hover:bg-red/20 text-red text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none"
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
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white border border-dash-border rounded-2xl w-full max-w-[560px] p-6 max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
            <div className="flex items-center justify-between border-b border-dash-border pb-3 mb-4">
              <span className="text-[15px] font-semibold !text-dash-text">
                {editingArticle ? 'Edit article' : 'Add knowledge source'}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="!text-dash-textMuted hover:!text-dash-text text-[16px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operating Hours, Return Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-white border border-dash-border rounded-lg px-4 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales, Support, FAQs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-white border border-dash-border rounded-lg px-4 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
                  Content (LENA's context source)
                </label>
                <textarea
                  placeholder="Provide precise details. LENA will read this to answer visitor queries."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={8}
                  className="bg-white border border-dash-border rounded-lg px-4 py-3.5 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent w-full resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 bg-dash-surface p-3 rounded-lg border border-dash-border">
                <input
                  type="checkbox"
                  id="alwaysInclude"
                  checked={alwaysInclude}
                  onChange={(e) => setAlwaysInclude(e.target.checked)}
                  className="w-4 h-4 rounded border-dash-border bg-transparent text-dash-accent focus:ring-0"
                />
                <label htmlFor="alwaysInclude" className="text-[12px] !text-dash-textMuted cursor-pointer">
                  <strong>Proactive mention</strong>: LENA reads this automatically for every visitor conversation.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dash-border mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-dash-surface hover:bg-dash-border/60 !text-dash-text text-[12.5px] font-semibold px-4 py-2 rounded-lg transition-colors motion-reduce:transition-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-dash-accent hover:bg-dash-accent/90 text-white text-[12.5px] font-semibold px-5 py-2 rounded-lg transition-colors motion-reduce:transition-none disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

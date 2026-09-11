'use client';

import React, { useState, useEffect } from 'react';
import { getPostComments, submitComment } from '@/app/actions/publicBlog';
import { User, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface BlogCommentsProps {
  postId: string;
  workspaceId: string;
  commentsEngine: 'none' | 'native' | 'disqus';
  disqusShortname?: string;
}

export default function BlogComments({ postId, workspaceId, commentsEngine, disqusShortname }: BlogCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', content: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  useEffect(() => {
    if (commentsEngine === 'native') {
      const fetchComments = async () => {
        const { data } = await getPostComments(postId);
        if (data) setComments(data);
        setLoading(false);
      };
      fetchComments();
    }
  }, [postId, commentsEngine]);

  if (commentsEngine === 'none') return null;

  if (commentsEngine === 'disqus' && disqusShortname) {
    return (
      <div className="mt-16 border-t border-[#E2E8F0] pt-12">
        <h3 className="text-2xl font-bold text-[#0F172A] mb-6">Discussion</h3>
        {/* Placeholder for actual Disqus embed */}
        <div className="bg-[#F8F9FC] p-8 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B]">
          Disqus comments loaded for {disqusShortname}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.content) return;
    
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    const result = await submitComment({
      postId,
      workspaceId,
      authorName: form.name,
      authorEmail: form.email,
      content: form.content
    });

    setSubmitting(false);

    if (result.success) {
      setStatus({ type: 'success', message: 'Comment submitted successfully! It will appear once approved.' });
      setForm({ name: '', email: '', content: '' });
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to submit comment.' });
    }
  };

  return (
    <div className="mt-16 border-t border-[#E2E8F0] pt-12">
      <div className="flex items-center gap-2 mb-8">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h3 className="text-2xl font-bold text-[#0F172A]">Join the Conversation</h3>
        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full ml-2">
          {comments.length}
        </span>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="bg-[#F8F9FC] p-6 rounded-2xl border border-[#E2E8F0] mb-10">
        <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider mb-4">Leave a Comment</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            required
            placeholder="Your Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-primary/50 transition-colors"
          />
          <input
            type="email"
            placeholder="Email Address (optional, won't be published)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <textarea
          required
          rows={4}
          placeholder="Share your thoughts..."
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-primary/50 transition-colors mb-4 resize-none"
        />

        <div className="flex justify-between items-center">
          <div>
            {status.type === 'success' && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> {status.message}
              </div>
            )}
            {status.type === 'error' && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertCircle className="w-4 h-4" /> {status.message}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center text-[#94A3B8] text-sm py-4">Loading discussion...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-[#94A3B8] text-sm py-8 bg-[#F8F9FC] rounded-2xl border border-[#E2E8F0] border-dashed">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">{comment.author_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 bg-[#F8F9FC] rounded-2xl rounded-tl-none p-5 border border-[#E2E8F0]">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-bold text-[#0F172A] text-sm">{comment.author_name}</span>
                  <span className="text-xs text-[#94A3B8]">
                    {new Date(comment.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

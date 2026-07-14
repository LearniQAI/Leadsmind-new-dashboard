'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updatePost, createCategory } from '@/app/actions/blog';
import { BlogEditorContent } from '@/components/blog/editor/BlogEditorContent';
import { BlogEditorSettings } from '@/components/blog/editor/BlogEditorSettings';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { uploadBlogMedia } from '@/lib/mediaUpload';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, Link as LinkIcon, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import AIAssistantSidebar from '@/components/content-studio/AIAssistantSidebar';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';

interface BlogEditorClientProps {
  post: any;
  categories: any[];
}

export default function BlogEditorClient({ post: initialPost, categories: initialCategories }: BlogEditorClientProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [categories, setCategories] = useState(initialCategories);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  // Image modal state fields
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgAlt, setImgAlt] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  // Embed modal state fields
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedType, setEmbedType] = useState('youtube');

  // Ref to the Tiptap editor instance
  const editorRef = useRef<any>(null);

  // 1. NATIVE DRAFT CACHING & INITIAL RECOVERY
  useEffect(() => {
    const cached = localStorage.getItem(`draft_blog_post_${post.id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.updated_at > post.updated_at) {
          setPost((prev: any) => ({ ...prev, ...parsed }));
          setHasChanges(true);
        }
      } catch (e) {
        console.error('Failed to restore draft cache', e);
      }
    }
  }, [post.id, post.updated_at]);

  // 2. 30-SECOND AUTOSAVE ENGINE BACKGROUND WORKER
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasChanges) {
        setSaveStatus('Saving draft...');
        try {
          const updates = {
            title: post.title,
            slug: post.slug,
            summary: post.summary,
            body_html: post.body_html,
            body_plain: post.body_plain,
            cover_image: post.cover_image,
            cover_image_alt: post.cover_image_alt,
            status: post.status,
            scheduled_at: post.scheduled_at,
            category_id: post.category_id,
            seo_title: post.seo_title,
            canonical_url: post.canonical_url,
            target_keyword: post.target_keyword,
            layout_style: post.layout_style,
            header_style: post.header_style,
            sidebar_style: post.sidebar_style,
            lead_capture_style: post.lead_capture_style,
            sa_province: post.sa_province,
            sa_city: post.sa_city,
            sa_area: post.sa_area
          };

          const res = await updatePost(post.id, updates);
          if (res.error) {
            setSaveStatus(`Autosave failed: ${res.error}`);
          } else {
            setHasChanges(false);
            const now = new Date().toLocaleTimeString();
            setSaveStatus(`Saved at ${now}`);
            // Update local storage backup
            localStorage.setItem(
              `draft_blog_post_${post.id}`,
              JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
            );
          }
        } catch (error) {
          setSaveStatus('Autosave failed');
        }
      }
    }, 30000); // Trigger every 30 seconds

    return () => clearInterval(interval);
  }, [hasChanges, post]);

  // Manual save trigger
  const handleManualSave = async () => {
    setIsSaving(true);
    setSaveStatus('Saving...');
    try {
      const res = await updatePost(post.id, post);
      if (res.error) {
        setSaveStatus(`Error: ${res.error}`);
      } else {
        setHasChanges(false);
        const now = new Date().toLocaleTimeString();
        setSaveStatus(`Manual save at ${now}`);
        localStorage.removeItem(`draft_blog_post_${post.id}`);
      }
    } catch (e: any) {
      setSaveStatus('Manual save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = (updates: any) => {
    setPost((prev: any) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleCreateCategory = async (name: string) => {
    const res = await createCategory(name);
    if (res.data) {
      setCategories((prev) => [...prev, res.data]);
    }
    return res;
  };

  // Image Upload Action (from within Modal)
  const handleInsertImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imgFile) return;

    if (!imgAlt.trim()) {
      setImgError('Accessibility requires description text before upload.');
      return;
    }

    try {
      setImgUploading(true);
      setImgError(null);
      const res = await uploadBlogMedia({
        file: imgFile,
        altText: imgAlt,
        workspaceId: post.workspace_id
      });

      if (res.error) {
        setImgError(res.error);
        return;
      }

      if (editorRef.current) {
        editorRef.current
          .chain()
          .focus()
          .setImage({ src: res.publicUrl, alt: imgAlt })
          .run();
      }

      setShowImageModal(false);
      setImgFile(null);
      setImgAlt('');
    } catch (err: any) {
      setImgError(err.message || 'Image processing failed.');
    } finally {
      setImgUploading(false);
    }
  };

  // Video Embed Insertion
  const handleEmbedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!embedUrl) return;

    if (editorRef.current) {
      editorRef.current
        .chain()
        .focus()
        .insertContent({
          type: 'iframeEmbed',
          attrs: { src: embedUrl, type: embedType, title: 'Embedded Widget' }
        })
        .run();
    }

    setShowEmbedModal(false);
    setEmbedUrl('');
  };

  return (
    <MetaData pageTitle="Post Editor">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          {/* Header */}
          {!isZenMode && (
            <div className="border-b border-dash-border bg-dash-surface">
              <div className="max-w-7xl mx-auto w-full px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                <div className="flex items-center gap-3">
                  <button onClick={() => router.push('/blog/manage')} className="p-2 rounded-lg bg-white hover:bg-dash-border/40 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold !text-dash-text">
                      Post <span className="text-dash-accent">writer</span>
                    </h1>
                    <p className="text-[10px] !text-dash-textMuted font-semibold mt-0.5">
                      Content orchestration & SEO delivery
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {saveStatus && (
                    <span className="text-xs !text-dash-textMuted bg-white border border-dash-border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse motion-reduce:animate-none" />
                      {saveStatus}
                    </span>
                  )}

                  <a
                    href={`/blog/${post.slug}${post.status !== 'published' ? '?preview=1' : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-dash-border !text-dash-textMuted hover:!text-dash-text text-xs font-bold px-4 py-2 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {post.status === 'published' ? 'View post' : 'Preview draft'}
                  </a>
                  <button
                    onClick={() => setShowAiAssistant(!showAiAssistant)}
                    className={cn(
                      "text-xs font-bold px-4 py-2 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2",
                      showAiAssistant
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-white border border-dash-border !text-dash-textMuted hover:!text-dash-text'
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showAiAssistant ? 'Hide AI assistant' : 'AI assistant'}
                  </button>
                  <DashButton onClick={handleManualSave} disabled={isSaving} size="sm">
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="w-3.5 h-3.5" />}
                    Save changes
                  </DashButton>
                </div>

              </div>
            </div>
          )}

          {/* Main workspace */}
          <div className={cn("flex-1 flex flex-col lg:flex-row gap-6 p-6 w-full", isZenMode ? 'max-w-4xl mx-auto' : 'max-w-7xl mx-auto')}>
            <div className="flex-1 space-y-4">
              {!isZenMode ? (
                <>
                  <input
                    type="text"
                    value={post.title || ''}
                    placeholder="Post Title (e.g. Master the LeadsMind Marketing Suite)"
                    onChange={(e) => handleUpdate({ title: e.target.value })}
                    className="w-full bg-transparent !text-dash-text font-bold text-2xl outline-none placeholder:text-dash-textMuted border-b border-dash-border pb-2 focus:border-dash-accent transition-colors motion-reduce:transition-none"
                  />

                  <div className="text-[11px] !text-dash-textMuted font-semibold flex items-center gap-2">
                    <span>URL slug:</span>
                    <span className="text-dash-accent font-normal">
                      /blog/{post.slug || 'slug-placeholder'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="max-w-2xl mx-auto w-full pt-8 pb-4">
                  <input
                    type="text"
                    value={post.title || ''}
                    placeholder="Untitled Post"
                    onChange={(e) => handleUpdate({ title: e.target.value })}
                    className="w-full bg-transparent !text-dash-text font-bold text-3xl text-center outline-none placeholder:text-dash-border border-none focus:outline-none transition-colors motion-reduce:transition-none"
                  />
                </div>
              )}

              <BlogEditorContent
                content={post.body_html}
                onChange={(html, plain) => handleUpdate({ body_html: html, body_plain: plain })}
                onOpenImageModal={() => setShowImageModal(true)}
                onOpenEmbedModal={() => setShowEmbedModal(true)}
                editorRef={editorRef}
                isZenMode={isZenMode}
                onToggleZenMode={() => setIsZenMode(!isZenMode)}
                workspaceId={post.workspace_id}
              />
            </div>

            {!isZenMode && (
              <div className="w-full lg:w-[350px] shrink-0">
                {showAiAssistant ? (
                  <AIAssistantSidebar
                    editor={editorRef.current}
                    title={post.title}
                    workspaceId={post.workspace_id}
                    docId={post.id}
                    contentType="blog"
                  />
                ) : (
                  <BlogEditorSettings
                    post={post}
                    categories={categories}
                    workspaceId={post.workspace_id}
                    onUpdate={handleUpdate}
                    onCreateCategory={handleCreateCategory}
                  />
                )}
              </div>
            )}
          </div>

          {/* MODALS */}
          <DashModal open={showImageModal} onOpenChange={setShowImageModal}>
            <DashModalContent className="max-w-md">
              <DashModalHeader>
                <DashModalTitle className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-dash-accent" /> Insert media
                </DashModalTitle>
              </DashModalHeader>

              <form onSubmit={handleInsertImageSubmit} className="space-y-4">
                <DashFormField label="Description / alt text" hint="Accessibility requirements require a text fallback for visually impaired users.">
                  <DashInput
                    type="text"
                    value={imgAlt}
                    placeholder="e.g. Dashboard view with financial metrics graph"
                    onChange={(e) => setImgAlt(e.target.value)}
                    required
                  />
                </DashFormField>

                <DashFormField label="Select media file">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImgFile(e.target.files?.[0] || null)}
                    className="w-full text-xs !text-dash-textMuted bg-white border border-dash-border rounded-xl px-3 py-2.5 outline-none focus:border-dash-accent"
                    required
                  />
                </DashFormField>

                {imgError && (
                  <div className="p-2.5 bg-red/10 border border-red/20 text-red rounded-lg text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{imgError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-dash-border pt-3">
                  <DashButton type="button" variant="secondary" onClick={() => setShowImageModal(false)}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" disabled={imgUploading || !imgFile}>
                    {imgUploading ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : null}
                    Optimize & insert
                  </DashButton>
                </div>
              </form>
            </DashModalContent>
          </DashModal>

          <DashModal open={showEmbedModal} onOpenChange={setShowEmbedModal}>
            <DashModalContent className="max-w-md">
              <DashModalHeader>
                <DashModalTitle className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-dash-accent" /> Insert responsive embed
                </DashModalTitle>
              </DashModalHeader>

              <form onSubmit={handleEmbedSubmit} className="space-y-4">
                <DashFormField label="Embed type">
                  <select
                    value={embedType}
                    onChange={(e) => setEmbedType(e.target.value)}
                    className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                  >
                    <option value="youtube">YouTube Video Embed</option>
                    <option value="vimeo">Vimeo Video Embed</option>
                    <option value="twitter">Twitter / X Post Embed</option>
                    <option value="instagram">Instagram Post Embed</option>
                    <option value="generic">Generic Iframe Source</option>
                  </select>
                </DashFormField>

                <DashFormField label="Direct iframe / post URL">
                  <DashInput
                    type="url"
                    value={embedUrl}
                    placeholder="https://..."
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    required
                  />
                </DashFormField>

                <div className="flex justify-end gap-3 border-t border-dash-border pt-3">
                  <DashButton type="button" variant="secondary" onClick={() => setShowEmbedModal(false)}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" disabled={!embedUrl}>
                    Insert widget
                  </DashButton>
                </div>
              </form>
            </DashModalContent>
          </DashModal>
        </div>
      </Wrapper>
    </MetaData>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Sparkles, Image, User, Layout, Eye, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateCourseLandingSettings, updateCourseSlug } from '@/app/actions/courseLanding';
import { sanitizeSlug } from '@/lib/slug';
import { createClient } from '@/lib/supabase/client';
import LandingOutcomesEditor from './LandingOutcomesEditor';
import LandingFaqEditor from './LandingFaqEditor';
import LandingReviewsEditor from './LandingReviewsEditor';

interface CourseLandingFormProps {
  course: any;
  onSaved: (updatedCourse: any) => void;
}

export default function CourseLandingForm({ course, onSaved }: CourseLandingFormProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form States
  const [title, setTitle] = useState(course.title || '');
  const [slug, setSlug] = useState(course.slug || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || '');
  const [useCustomLandingPage, setUseCustomLandingPage] = useState(course.use_custom_landing_page || false);

  const settings = course.landing_page_settings || {};
  const [template, setTemplate] = useState(settings.template || 'clean_minimal');
  const [tagline, setTagline] = useState(settings.tagline || '');
  const [outcomes, setOutcomes] = useState<string[]>(settings.outcomes || []);
  const [faq, setFaq] = useState<any[]>(settings.faq || []);
  const [reviews, setReviews] = useState<any[]>(settings.reviews || []);

  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    hero: true, outcomes: true, curriculum: true, instructor: true, reviews: true, pricing: true, faq: true,
    ...(settings.visible_sections || {})
  });

  const [instructor, setInstructor] = useState({
    name: settings.instructor?.name || '',
    bio: settings.instructor?.bio || '',
    avatar_url: settings.instructor?.avatar_url || ''
  });

  // Automatically slugify title if slug is empty
  useEffect(() => {
    if (!slug && title) {
      setSlug(sanitizeSlug(title));
    }
  }, [title]);

  // Sync state updates with iframe preview via postMessage
  const syncPreview = () => {
    const previewData = {
      title,
      slug,
      thumbnail_url: thumbnailUrl,
      template,
      tagline,
      outcomes,
      faq,
      reviews,
      visible_sections: visibleSections,
      instructor
    };

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'lms-preview-update', data: previewData },
        '*'
      );
    }
  };

  useEffect(() => {
    syncPreview();
  }, [title, slug, thumbnailUrl, template, tagline, outcomes, faq, reviews, visibleSections, instructor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAvatar: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isAvatar) setIsUploadingAvatar(true);
    else setIsUploading(true);

    try {
      const supabase = createClient();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${course.id}/${Date.now()}-${cleanName}`;

      const { data, error } = await supabase.storage
        .from('course_landing_assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('course_landing_assets')
        .getPublicUrl(filePath);

      if (isAvatar) {
        setInstructor(prev => ({ ...prev, avatar_url: publicUrl }));
        toast.success('Instructor avatar uploaded!');
      } else {
        setThumbnailUrl(publicUrl);
        toast.success('Course banner uploaded!');
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save Slug first
      if (slug !== course.slug) {
        const slugRes = await updateCourseSlug(course.id, slug);
        if (slugRes.error) {
          toast.error(slugRes.error);
          setIsSaving(false);
          return;
        }
      }

      // 2. Save settings & metadata
      const settingsRes = await updateCourseLandingSettings(course.id, {
        template,
        tagline,
        outcomes,
        faq,
        reviews,
        visible_sections: visibleSections,
        instructor
      });

      if (settingsRes.error) {
        toast.error(settingsRes.error);
        return;
      }

      // 3. Save thumbnail/title directly if modified
      const supabase = createClient();
      const { error: directErr } = await supabase
        .from('courses')
        .update({
          title,
          thumbnail_url: thumbnailUrl,
          use_custom_landing_page: useCustomLandingPage
        })
        .eq('id', course.id);

      if (directErr) throw directErr;

      toast.success('Course landing configurations saved!');
      onSaved({
        ...course,
        title,
        slug,
        thumbnail_url: thumbnailUrl,
        use_custom_landing_page: useCustomLandingPage,
        landing_page_settings: settingsRes.settings
      });
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)]">
      {/* Left Column: Form Controls */}
      <div className="space-y-6 bg-white border border-dash-border p-6 rounded-2xl max-h-[85vh] overflow-y-auto shadow-sm">
        <div className="flex items-center justify-between border-b border-dash-border pb-4">
          <h2 className="text-sm font-bold !text-dash-text flex items-center gap-1.5">
            <Layout size={16} className="text-dash-accent" /> Landing config
          </h2>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-[9px] font-bold h-9 px-4 shadow-lg shadow-dash-accent/20 flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <Save size={12} />} Save Setup
          </Button>
        </div>

        {/* Template Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Active Layout Style</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'clean_minimal', label: 'Clean / Mini' },
              { id: 'bold_feature_rich', label: 'Bold / Gradient' },
              { id: 'community_coaching', label: 'Cohort / Coach' }
            ].map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setTemplate(tmpl.id)}
                className={`p-3 rounded-xl border text-center text-[10px] font-bold transition-all motion-reduce:transition-none ${template === tmpl.id ? 'border-dash-accent bg-dash-accent/10 !text-dash-text' : 'border-dash-border bg-dash-surface hover:bg-dash-border/40 !text-dash-textMuted'}`}
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slug Editor */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold !text-dash-textMuted block">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-xs !text-dash-textMuted select-none font-mono">/courses/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
              placeholder="url-slug-string"
              className="flex-1 bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-dash-accent transition-all motion-reduce:transition-none font-mono"
            />
          </div>
        </div>

        {/* Course Core Details */}
        <div className="space-y-3 pt-3 border-t border-dash-border">
          <div className="space-y-2">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Display Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-dash-accent transition-all motion-reduce:transition-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Display Tagline / Subtitle</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Brief course core outcome..."
              className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-dash-accent transition-all motion-reduce:transition-none"
            />
          </div>
        </div>

        {/* Upload Thumbnail Banner */}
        <div className="space-y-2 pt-3 border-t border-dash-border">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Course Banner / Thumbnail Image</label>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 rounded-xl font-bold text-[9px] h-10 px-4 flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <Image size={13} />} Upload Banner
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, false)}
            />
            {thumbnailUrl && (
              <span className="text-[9px] !text-dash-textMuted truncate max-w-xs">{thumbnailUrl}</span>
            )}
          </div>
        </div>

        {/* Global Landing Page Custom Override Toggle */}
        <div className="space-y-3 pt-3 border-t border-dash-border">
          <div className="bg-dash-surface border border-dash-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <label className="text-[10px] font-bold !text-dash-text block">Enable Custom Landing Page</label>
              <p className="text-[9px] !text-dash-textMuted mt-0.5">
                Override default layout to render the selected layout style
              </p>
            </div>
            <input
              type="checkbox"
              checked={useCustomLandingPage}
              onChange={(e) => setUseCustomLandingPage(e.target.checked)}
              className="rounded border-dash-border bg-white text-dash-accent focus:ring-0 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Section Visibility Toggles */}
        <div className="space-y-3 pt-3 border-t border-dash-border">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Visible Landing Blocks</label>
          <div className="grid grid-cols-2 gap-2 bg-dash-surface p-3 rounded-xl border border-dash-border">
            {Object.keys(visibleSections).map((sec) => (
              <label key={sec} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleSections[sec]}
                  onChange={(e) => setVisibleSections(prev => ({ ...prev, [sec]: e.target.checked }))}
                  className="rounded border-dash-border bg-white text-dash-accent focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[10px] font-bold !text-dash-textMuted capitalize">{sec} block</span>
              </label>
            ))}
          </div>
        </div>

        {/* Instructor Profile Details */}
        <div className="space-y-3 pt-3 border-t border-dash-border">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Instructor Bio Info</label>
          <div className="space-y-3 bg-dash-surface p-3 rounded-xl border border-dash-border">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="bg-white border border-dash-border !text-dash-text hover:bg-dash-border/60 rounded-xl font-bold text-[9px] h-9 px-3 flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
              >
                {isUploadingAvatar ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <User size={12} />} Upload Avatar
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, true)}
              />
              {instructor.avatar_url && (
                <span className="text-[9px] !text-dash-textMuted truncate max-w-xs">{instructor.avatar_url}</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={instructor.name}
                onChange={(e) => setInstructor(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Instructor Name"
                className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-all motion-reduce:transition-none"
              />
              <textarea
                value={instructor.bio}
                onChange={(e) => setInstructor(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Instructor short biography and credentials..."
                rows={2}
                className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-all motion-reduce:transition-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Outcomes Checklist Editor */}
        <div className="pt-3 border-t border-dash-border">
          <LandingOutcomesEditor outcomes={outcomes} onChange={setOutcomes} />
        </div>

        {/* Custom FAQ List Editor */}
        <div className="pt-3 border-t border-dash-border">
          <LandingFaqEditor faq={faq} onChange={setFaq} />
        </div>

        {/* Student Reviews List Editor */}
        <div className="pt-3 border-t border-dash-border">
          <LandingReviewsEditor reviews={reviews} onChange={setReviews} />
        </div>
      </div>

      {/* Right Column: Real-time Live Preview Engine */}
      <div className="bg-white border border-dash-border rounded-2xl overflow-hidden flex flex-col relative h-[85vh] shadow-sm">
        <div className="bg-dash-surface border-b border-dash-border p-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-1.5">
            <Eye size={15} className="text-green animate-pulse motion-reduce:animate-none" />
            <h3 className="text-xs font-bold !text-dash-text">
              Live Preview
            </h3>
          </div>
          <span className="text-[9px] font-bold bg-white border border-dash-border !text-dash-textMuted px-2 py-0.5 rounded font-mono">
            Synced
          </span>
        </div>

        {/* Preview Iframe Container — the iframe below renders the actual published course landing page (a separate, out-of-scope surface), intentionally left untouched */}
        <div className="flex-1 w-full relative">
          <iframe
            ref={iframeRef}
            src={`/unauthenticated/courses/${course.id}?preview=true`}
            className="w-full h-full border-none"
            onLoad={syncPreview}
          />
        </div>
      </div>
    </div>
  );
}

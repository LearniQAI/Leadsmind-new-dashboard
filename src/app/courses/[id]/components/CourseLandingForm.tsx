"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Save, ImagePlus, UserRound, Eye } from "lucide-react";
import { updateCourseLandingSettings, updateCourseSlug } from "@/app/actions/courseLanding";
import { sanitizeSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";
import LandingOutcomesEditor from "./LandingOutcomesEditor";
import LandingFaqEditor from "./LandingFaqEditor";
import LandingReviewsEditor from "./LandingReviewsEditor";
import {
  SettingsPanel,
  SectionLabel,
  TextInput,
  TextArea,
  OptionCard,
  Toggle,
  PrimaryButton,
  GhostButton,
} from "./settings/primitives";
import { cn } from "@/lib/utils";

interface CourseLandingFormProps {
  course: any;
  onSaved: (updatedCourse: any) => void;
}

const TEMPLATES = [
  { id: "clean_minimal", label: "Clean", desc: "Minimal, lots of whitespace" },
  { id: "bold_feature_rich", label: "Bold", desc: "Gradient, feature-forward" },
  { id: "community_coaching", label: "Cohort", desc: "Coaching & community" },
];

/** Stacked label + control, used inside the narrow config column. */
function LField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-dash-text">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-dash-textMuted">{hint}</p>}
    </div>
  );
}

function LGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 border-t border-dash-border pt-6 first:border-t-0 first:pt-0">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

export default function CourseLandingForm({ course, onSaved }: CourseLandingFormProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [title, setTitle] = useState(course.title || "");
  const [slug, setSlug] = useState(course.slug || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [useCustomLandingPage, setUseCustomLandingPage] = useState(
    course.use_custom_landing_page || false
  );

  const settings = course.landing_page_settings || {};
  const [template, setTemplate] = useState(settings.template || "clean_minimal");
  const [tagline, setTagline] = useState(settings.tagline || "");
  const [outcomes, setOutcomes] = useState<string[]>(settings.outcomes || []);
  const [faq, setFaq] = useState<any[]>(settings.faq || []);
  const [reviews, setReviews] = useState<any[]>(settings.reviews || []);

  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    hero: true,
    outcomes: true,
    curriculum: true,
    instructor: true,
    reviews: true,
    pricing: true,
    faq: true,
    ...(settings.visible_sections || {}),
  });

  const [instructor, setInstructor] = useState({
    name: settings.instructor?.name || "",
    bio: settings.instructor?.bio || "",
    avatar_url: settings.instructor?.avatar_url || "",
  });

  useEffect(() => {
    if (!slug && title) setSlug(sanitizeSlug(title));
  }, [title]);

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
      instructor,
    };
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "lms-preview-update", data: previewData },
        "*"
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
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const filePath = `${course.id}/${Date.now()}-${cleanName}`;

      const { error } = await supabase.storage
        .from("course_landing_assets")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course_landing_assets").getPublicUrl(filePath);

      if (isAvatar) {
        setInstructor((prev) => ({ ...prev, avatar_url: publicUrl }));
        toast.success("Instructor avatar uploaded!");
      } else {
        setThumbnailUrl(publicUrl);
        toast.success("Course banner uploaded!");
      }
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (slug !== course.slug) {
        const slugRes = await updateCourseSlug(course.id, slug);
        if (slugRes.error) {
          toast.error(slugRes.error);
          setIsSaving(false);
          return;
        }
      }

      const settingsRes = await updateCourseLandingSettings(course.id, {
        template,
        tagline,
        outcomes,
        faq,
        reviews,
        visible_sections: visibleSections,
        instructor,
      });
      if (settingsRes.error) {
        toast.error(settingsRes.error);
        return;
      }

      const supabase = createClient();
      const { error: directErr } = await supabase
        .from("courses")
        .update({ title, thumbnail_url: thumbnailUrl, use_custom_landing_page: useCustomLandingPage })
        .eq("id", course.id);
      if (directErr) throw directErr;

      toast.success("Landing page saved.");
      onSaved({
        ...course,
        title,
        slug,
        thumbnail_url: thumbnailUrl,
        use_custom_landing_page: useCustomLandingPage,
        landing_page_settings: settingsRes.settings,
      });
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            Landing page
          </div>
          <h2 className="text-[15px] font-semibold text-dash-text">Design & content</h2>
          <p className="text-[13px] text-dash-textMuted">
            Edit on the left, watch it update live on the right.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg border border-dash-border bg-dash-surface px-3 py-2 font-mono text-[11px] text-dash-textMuted sm:inline-block">
            {slug ? `/courses/${slug}` : "no slug yet"}
          </span>
          <PrimaryButton type="button" onClick={handleSave} loading={isSaving}>
            {isSaving ? "Saving…" : (
              <>
                <Save /> Save
              </>
            )}
          </PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* Config column */}
        <SettingsPanel className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-6 p-6">
            <LGroup title="Layout">
              <div className="grid grid-cols-3 gap-2.5">
                {TEMPLATES.map((t) => (
                  <OptionCard
                    key={t.id}
                    selected={template === t.id}
                    onClick={() => setTemplate(t.id)}
                    title={t.label}
                    description={t.desc}
                  />
                ))}
              </div>
              <Toggle
                checked={useCustomLandingPage}
                onChange={setUseCustomLandingPage}
                label="Use custom landing page"
                description="Render the selected layout instead of the default page."
              />
            </LGroup>

            <LGroup title="Basics">
              <LField label="URL slug" htmlFor="lp-slug" hint="Lowercase, dashes only.">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-dash-textMuted">/courses/</span>
                  <TextInput
                    id="lp-slug"
                    value={slug}
                    onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                    placeholder="url-slug"
                    className="font-mono text-[12px]"
                  />
                </div>
              </LField>
              <LField label="Display title" htmlFor="lp-title">
                <TextInput id="lp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </LField>
              <LField label="Tagline" htmlFor="lp-tagline" hint="One line under the title.">
                <TextInput
                  id="lp-tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Brief course outcome…"
                />
              </LField>
              <LField label="Banner image">
                <div className="flex items-center gap-3">
                  <GhostButton
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-9 px-3 text-[12px]"
                  >
                    {isUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload
                  </GhostButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, false)}
                  />
                  {thumbnailUrl && (
                    <span className="truncate text-[11px] text-dash-textMuted">{thumbnailUrl}</span>
                  )}
                </div>
              </LField>
            </LGroup>

            <LGroup title="Visible sections">
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(visibleSections).map((sec) => {
                  const on = visibleSections[sec];
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() =>
                        setVisibleSections((prev) => ({ ...prev, [sec]: !prev[sec] }))
                      }
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-medium capitalize transition-colors",
                        on
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-dash-border bg-white text-dash-textMuted hover:border-slate-300"
                      )}
                    >
                      {sec}
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          on ? "bg-sky-500" : "bg-slate-300"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </LGroup>

            <LGroup title="Instructor">
              <div className="flex items-center gap-3">
                <GhostButton
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="h-9 px-3 text-[12px]"
                >
                  {isUploadingAvatar ? <Loader2 className="animate-spin" /> : <UserRound />} Avatar
                </GhostButton>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, true)}
                />
                {instructor.avatar_url && (
                  <span className="truncate text-[11px] text-dash-textMuted">
                    {instructor.avatar_url}
                  </span>
                )}
              </div>
              <TextInput
                value={instructor.name}
                onChange={(e) => setInstructor((p) => ({ ...p, name: e.target.value }))}
                placeholder="Instructor name"
              />
              <TextArea
                value={instructor.bio}
                onChange={(e) => setInstructor((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Short bio and credentials…"
                rows={3}
              />
            </LGroup>

            <LGroup title="Outcomes">
              <LandingOutcomesEditor outcomes={outcomes} onChange={setOutcomes} />
            </LGroup>
            <LGroup title="FAQ">
              <LandingFaqEditor faq={faq} onChange={setFaq} />
            </LGroup>
            <LGroup title="Reviews">
              <LandingReviewsEditor reviews={reviews} onChange={setReviews} />
            </LGroup>
          </div>
        </SettingsPanel>

        {/* Live preview */}
        <SettingsPanel className="flex h-[80vh] flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-4 py-3">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-dash-text">
              <Eye className="size-3.5 text-sky-500" /> Live preview
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Synced
            </span>
          </div>
          <div className="relative flex-1">
            <iframe
              ref={iframeRef}
              src={`/unauthenticated/courses/${course.id}?preview=true`}
              className="h-full w-full border-none"
              onLoad={syncPreview}
            />
          </div>
        </SettingsPanel>
      </div>
    </div>
  );
}

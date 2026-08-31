"use client";

import React, { useState } from "react";
import { Loader2, ImagePlus, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  SettingsFooter,
  FieldGroup,
  Field,
  TextInput,
  TextArea,
  Select,
  InputAffix,
  PrimaryButton,
  GhostButton,
} from "./settings/primitives";

interface CourseSettingsFormProps {
  course: any;
  onSaved: (updatedCourse: any) => void;
}

export default function CourseSettingsForm({ course, onSaved }: CourseSettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const initial = {
    title: course.title || "",
    desc: course.description || "",
    price: course.price || "0.00",
    status: course.status || (course.published ? "published" : "draft"),
    thumbnail: course.thumbnail_url || "",
  };

  const [editTitle, setEditTitle] = useState(initial.title);
  const [editDesc, setEditDesc] = useState(initial.desc);
  const [editPrice, setEditPrice] = useState(initial.price);
  const [editStatus, setEditStatus] = useState(initial.status);
  const [editThumbnail, setEditThumbnail] = useState(initial.thumbnail);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const dirty =
    editTitle !== initial.title ||
    editDesc !== initial.desc ||
    String(editPrice) !== String(initial.price) ||
    editStatus !== initial.status ||
    editThumbnail !== initial.thumbnail;

  const resetForm = () => {
    setEditTitle(initial.title);
    setEditDesc(initial.desc);
    setEditPrice(initial.price);
    setEditStatus(initial.status);
    setEditThumbnail(initial.thumbnail);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!workspaceId) {
      toast.error("No active workspace found for upload.");
      return;
    }

    setIsUploading(true);
    const filePath = `${workspaceId}/courses/${course.id}/${Date.now()}_${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;

    try {
      const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      // Register in the workspace-wide Media Center (public.media_files) so this
      // cover image is visible alongside every other workspace asset. A failure
      // here shouldn't block the upload — the image is already stored.
      const { error: registerError } = await supabase.from("media_files").insert({
        workspace_id: workspaceId,
        name: file.name,
        path: filePath,
        type: "file",
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        metadata: {
          uploaded_via: `Course cover image — ${course.title || editTitle || "Untitled course"}`,
          source_feature: "course_cover_image",
          course_id: course.id,
        },
      });
      if (registerError) {
        console.error("media_files register failed", registerError);
      }

      setEditThumbnail(publicUrl);
      toast.success("Cover image uploaded successfully!");
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCourse(true);
    try {
      const res = await fetch(`/api/lms/course?id=${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          price: editPrice,
          status: editStatus,
          thumbnail_url: editThumbnail,
        }),
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success("Course settings updated successfully!");
        onSaved(dataJson.data);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update course details");
    } finally {
      setIsSavingCourse(false);
    }
  };

  return (
    <form onSubmit={handleUpdateCourse}>
      <SettingsPanel>
        <SettingsHeader
          eyebrow="General"
          title="Course settings"
          description="Manage the title, description, price and launch state for this course."
        />

        <SettingsBody>
          <FieldGroup>
            <Field label="Course title" htmlFor="cs-title" required hint="Shown to students and on the landing page.">
              <TextInput
                id="cs-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Masterclass in JavaScript"
                required
              />
            </Field>

            <Field label="Price" htmlFor="cs-price" hint="Set 0 for a free course. Advanced models live in Pricing.">
              <InputAffix affix="$">
                <TextInput
                  id="cs-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 font-mono"
                  required
                />
              </InputAffix>
            </Field>

            <Field label="Launch status" htmlFor="cs-status" hint="Draft courses are hidden from students.">
              <Select
                id="cs-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="max-w-[220px]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>

            <Field
              label="Cover image"
              align="start"
              hint="A wide banner or square image. JPEG or PNG, up to 5MB."
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <button
                  type="button"
                  onClick={() => document.getElementById("thumbnail-file-input")?.click()}
                  className="group relative flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-dash-border bg-dash-surface text-center transition-colors hover:border-sky-400"
                >
                  {editThumbnail ? (
                    <>
                      <img
                        src={editThumbnail}
                        alt="Cover preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Replace
                      </div>
                    </>
                  ) : isUploading ? (
                    <Loader2 className="size-4 animate-spin text-sky-500" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-dash-textMuted">
                      <ImagePlus className="size-5" />
                      <span className="text-[11px] font-semibold">Upload cover</span>
                    </span>
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    id="thumbnail-file-input"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleImageUpload}
                  />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-dash-textMuted">
                    Or paste an image URL
                  </div>
                  <InputAffix affix={<Link2 className="size-3.5" />}>
                    <TextInput
                      type="url"
                      value={editThumbnail}
                      onChange={(e) => setEditThumbnail(e.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      className="pl-8 font-mono text-[12px]"
                    />
                  </InputAffix>
                </div>
              </div>
            </Field>

            <Field
              label="Description"
              htmlFor="cs-desc"
              align="start"
              hint="A short summary of what students will learn."
            >
              <TextArea
                id="cs-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Describe what students will learn in this course..."
                rows={5}
              />
            </Field>
          </FieldGroup>
        </SettingsBody>

        <SettingsFooter hint={dirty ? "You have unsaved changes" : undefined}>
          <GhostButton type="button" onClick={resetForm} disabled={!dirty || isSavingCourse}>
            Discard
          </GhostButton>
          <PrimaryButton type="submit" loading={isSavingCourse} disabled={!dirty}>
            {isSavingCourse ? "Saving…" : "Save changes"}
          </PrimaryButton>
        </SettingsFooter>
      </SettingsPanel>
    </form>
  );
}

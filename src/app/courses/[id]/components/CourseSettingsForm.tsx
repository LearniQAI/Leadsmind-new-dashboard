"use client";

import React, { useState } from "react";
import { DashButton } from "@/components/dashboard-ui/Button";
import { DashFormField, DashInput, DashTextarea } from "@/components/dashboard-ui/FormField";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";

interface CourseSettingsFormProps {
  course: any;
  onSaved: (updatedCourse: any) => void;
}

export default function CourseSettingsForm({
  course,
  onSaved
}: CourseSettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [editTitle, setEditTitle] = useState(course.title || "");
  const [editDesc, setEditDesc] = useState(course.description || "");
  const [editPrice, setEditPrice] = useState(course.price || "0.00");
  const [editStatus, setEditStatus] = useState(course.status || (course.published ? "published" : "draft"));
  const [editThumbnail, setEditThumbnail] = useState(course.thumbnail_url || "");
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!workspaceId) {
      toast.error("No active workspace found for upload.");
      return;
    }

    setIsUploading(true);
    const filePath = `${workspaceId}/courses/${course.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

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
          thumbnail_url: editThumbnail
        })
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
    <form onSubmit={handleUpdateCourse} className="bg-white border border-dash-border rounded-2xl p-6 space-y-6">
      <div className="border-b border-dash-border pb-4">
        <h2 className="text-lg font-bold !text-dash-text">Course settings</h2>
        <p className="text-xs !text-dash-textMuted mt-1">Manage title, pricing, layout and launch state</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <DashFormField label="Course title">
          <DashInput
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="e.g. Masterclass in JavaScript"
            className="font-bold"
            required
          />
        </DashFormField>

        {/* Price */}
        <DashFormField label="Course price (USD)">
          <DashInput
            type="number"
            step="0.01"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            placeholder="0.00"
            className="font-mono"
            required
          />
        </DashFormField>

        {/* Launch Status */}
        <DashFormField label="Launch status">
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent transition-colors motion-reduce:transition-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </DashFormField>

        {/* Cover Image / Thumbnail Upload */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[13px] font-semibold !text-dash-text block">Course cover image</label>
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-center bg-dash-surface border border-dash-border p-4 rounded-xl">
            {/* Thumbnail Preview / Upload Zone */}
            <div className="relative aspect-video md:aspect-square bg-white border border-dashed border-dash-border rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-3 group hover:border-dash-accent/40 transition-all motion-reduce:transition-none cursor-pointer" onClick={() => document.getElementById("thumbnail-file-input")?.click()}>
              {editThumbnail ? (
                <>
                  <img src={editThumbnail} alt="Thumbnail Preview" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                  <div className="absolute inset-0 bg-dash-text/60 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center text-xs font-bold text-white">
                    Replace cover
                  </div>
                </>
              ) : isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin motion-reduce:animate-none text-dash-accent" size={20} />
                  <span className="text-xs !text-dash-textMuted">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">
                  <span className="text-xl">📸</span>
                  <span className="text-xs font-bold">Upload cover</span>
                  <span className="text-[11px] !text-dash-textMuted">JPEG/PNG up to 5MB</span>
                </div>
              )}
            </div>

            <div className="space-y-3 w-full">
              <div>
                <span className="text-[13px] font-bold !text-dash-text block">Upload from your device</span>
                <span className="text-xs !text-dash-textMuted block mt-0.5 leading-normal">
                  Upload a high-resolution banner or square cover image.
                </span>
              </div>
              <input
                type="file"
                id="thumbnail-file-input"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleImageUpload}
              />
              <div className="space-y-1">
                <span className="text-xs font-semibold !text-dash-textMuted block">Or paste an image URL</span>
                <DashInput
                  type="url"
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="h-10 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <DashFormField label="Course description" className="md:col-span-2">
          <DashTextarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Describe what students will learn in this course..."
            rows={4}
            className="leading-relaxed"
          />
        </DashFormField>
      </div>

      <div className="flex items-center justify-end border-t border-dash-border pt-4">
        <DashButton type="submit" disabled={isSavingCourse}>
          {isSavingCourse ? (
            <>
              <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Saving changes...
            </>
          ) : (
            "Save course settings"
          )}
        </DashButton>
      </div>
    </form>
  );
}

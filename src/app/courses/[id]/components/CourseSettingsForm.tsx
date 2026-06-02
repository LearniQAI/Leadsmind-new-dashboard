"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={handleUpdateCourse} className="bg-[#080f28] border border-white/5 rounded-2xl p-6 space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-base font-black font-space-grotesk uppercase tracking-wider text-white">Course Settings</h2>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Manage title, pricing, layout and launch state</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Course Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="e.g. Masterclass in JavaScript"
            className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body font-bold"
            required
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Course Price (USD)</label>
          <input
            type="number"
            step="0.01"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-mono"
            required
          />
        </div>

        {/* Launch Status */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Launch Status</label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all"
          >
            <option value="draft">Draft Mode</option>
            <option value="published">Published / Live Node</option>
          </select>
        </div>

        {/* Cover Image / Thumbnail Upload */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Course Cover Image</label>
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-center bg-[#111d47]/20 border border-white/5 p-4 rounded-xl">
            {/* Thumbnail Preview / Upload Zone */}
            <div className="relative aspect-video md:aspect-square bg-[#111d47] border border-dashed border-white/10 rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-3 group hover:border-primary/40 transition-all cursor-pointer" onClick={() => document.getElementById("thumbnail-file-input")?.click()}>
              {editThumbnail ? (
                <>
                  <img src={editThumbnail} alt="Thumbnail Preview" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-white">
                    Replace Cover
                  </div>
                </>
              ) : isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-primary" size={20} />
                  <span className="text-[9px] uppercase tracking-wider text-white/40">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/30 group-hover:text-white/60 transition-colors">
                  <span className="text-xl">📸</span>
                  <span className="text-[9px] font-black uppercase tracking-wider">Upload Cover</span>
                  <span className="text-[8px] text-white/20">JPEG/PNG up to 5MB</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3 w-full">
              <div>
                <span className="text-[11px] font-bold text-white block">File Storage Upload</span>
                <span className="text-[9px] text-white/40 block mt-0.5 leading-normal">
                  Upload a high-resolution banner or square cover. Assets are deployed to the Supabase `media` node storage bucket.
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
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 block">Or Paste External Image URL</span>
                <input
                  type="url"
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Course Description</label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Describe what students will learn in this course..."
            rows={4}
            className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body leading-relaxed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-white/5 pt-4">
        <Button
          type="submit"
          disabled={isSavingCourse}
          className="bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-wider text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all"
        >
          {isSavingCourse ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Saving Changes...
            </>
          ) : (
            "Save Course Settings"
          )}
        </Button>
      </div>
    </form>
  );
}

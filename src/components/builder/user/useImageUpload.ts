"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getActiveWorkspaceId } from '@/lib/workspace/activeWorkspaceClient';
import { useLessonBuilder } from '../LessonBuilderContext';

// Shared by the Image element's settings panel and its empty-state placeholder, so both
// upload paths behave identically.
//
// Lesson Builder: goes through /api/lms/upload like every other LMS upload (speaker photos,
// audio artwork) — same MIME/extension allowlist, size cap and workspace-scoped public `media`
// bucket, and the `lms/image` prefix registers the file in the Media Center as lesson content.
// Website/Funnel Builder: unchanged — its original direct `builder-media` upload.

export const LESSON_IMAGE_PATH_PREFIX = 'lms/image';
export const LESSON_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

// Mirrors the image subset of /api/lms/upload's allowlist and its general 25 MB cap. The server
// stays the authority; this only gives an instant, specific error before the round-trip (and
// stops a PDF from being "uploaded" as an image, which the shared route would otherwise accept).
const LESSON_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const LESSON_IMAGE_MAX_BYTES = 25 * 1024 * 1024;

export function lessonImageFileProblem(file: File): string | null {
  const i = file.name.lastIndexOf('.');
  const ext = i < 0 ? '' : file.name.slice(i + 1).toLowerCase();
  if (!LESSON_IMAGE_EXTS.has(ext)) return 'Please choose a PNG, JPG, WebP or GIF image.';
  if (file.size > LESSON_IMAGE_MAX_BYTES) return 'Image is too large (max 25 MB).';
  return null;
}

export function useBuilderImageUpload(onUploaded: (url: string) => void) {
  const { lessonId, courseId } = useLessonBuilder();
  const isLesson = !!(lessonId || courseId);
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File) => {
    if (isLesson) {
      const problem = lessonImageFileProblem(file);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    try {
      setIsUploading(true);
      if (isLesson) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pathPrefix', LESSON_IMAGE_PATH_PREFIX);
        const res = await fetch('/api/lms/upload', { method: 'POST', body: formData }).then((r) => r.json());
        if (res.error || !res.url) {
          toast.error(res.error || 'Failed to upload image. Please try again.');
          return;
        }
        onUploaded(res.url);
        return;
      }
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `${getActiveWorkspaceId()}/builder/${fileName}`;
      const { error } = await supabase.storage.from('builder-media').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('builder-media').getPublicUrl(filePath);
      onUploaded(publicUrl);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, accept: isLesson ? LESSON_IMAGE_ACCEPT : 'image/*' };
}

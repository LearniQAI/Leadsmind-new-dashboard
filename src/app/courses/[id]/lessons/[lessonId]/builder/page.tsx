"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BuilderEditor } from "@/components/builder/BuilderEditor";
import { createClient } from "@/lib/supabase/client";
import { BLANK_LESSON_CANVAS as BLANK_CANVAS } from "@/lib/builder/lessonTemplates";

// Lesson Builder route (Systeme-parity Master Prompt, Part 1, Step 2/3). Resolves the real
// `pages` row linked to this lesson via the new course_lesson_id column, creating one
// lazily if a pre-existing lesson (created before this feature) doesn't have one yet —
// this is the "click a lesson's name" entry point.
export default function LessonBuilderPage() {
  const { id: courseId, lessonId } = useParams();
  const [pageId, setPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolvePage() {
      const supabase = createClient();
      const { data: existing, error: lookupErr } = await supabase
        .from("pages")
        .select("id")
        .eq("course_lesson_id", lessonId as string)
        .maybeSingle();

      if (lookupErr) {
        if (!cancelled) setError("Failed to load lesson builder.");
        return;
      }

      if (existing) {
        if (!cancelled) setPageId(existing.id);
        return;
      }

      // Lazy backfill: a lesson created before this feature (or via the old modal flow)
      // has no linked pages row yet — create one on first open rather than erroring.
      const { data: lessonRow, error: lessonErr } = await supabase
        .from("course_lessons")
        .select("id, title, workspace_id")
        .eq("id", lessonId as string)
        .single();

      if (lessonErr || !lessonRow) {
        if (!cancelled) setError("Lesson not found.");
        return;
      }

      const { data: newPage, error: insertErr } = await supabase
        .from("pages")
        .insert({
          workspace_id: lessonRow.workspace_id,
          course_lesson_id: lessonRow.id,
          name: lessonRow.title,
          content: JSON.parse(BLANK_CANVAS),
        })
        .select("id")
        .single();

      if (insertErr || !newPage) {
        if (!cancelled) setError("Failed to initialize lesson builder.");
        return;
      }

      if (!cancelled) setPageId(newPage.id);
    }
    resolvePage();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-[13px] !text-dash-textMuted">
        {error}
      </div>
    );
  }

  if (!pageId) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-dash-accent" />
      </div>
    );
  }

  return (
    <BuilderEditor
      type="lesson"
      pageIdOverride={pageId}
      exitHref={`/courses/${courseId}`}
      key={pageId}
    />
  );
}

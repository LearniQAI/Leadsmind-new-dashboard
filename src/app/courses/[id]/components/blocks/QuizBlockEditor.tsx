"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentBlock } from "../ContentBlockList";

interface QuizBlockEditorProps {
  block: ContentBlock;
  courseId: string;
}

// quiz_questions/quiz_settings/quiz_attempts (the tables the live student quiz flow at
// /student/courses/[id]/quiz/[quizId] actually reads — confirmed by re-auditing the real
// route, not the older lms_quizzes/getLessonQuiz path some admin code still calls) are keyed
// directly by lesson_id, not by a separate quiz block id. So this editor just opens the
// existing Quiz Workbench for the block's own lesson — the same real questions/settings a
// legacy single-lesson_type quiz would use, reused rather than duplicated.
export default function QuizBlockEditor({ block, courseId }: QuizBlockEditorProps) {
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState<number | null>(null);

  useEffect(() => {
    // Real question count summary (Phase E) — from the same live table the Quiz
    // Workbench and the student quiz page both read, not a placeholder.
    fetch(`/api/lms/quiz/questions?lessonId=${block.lesson_id}`)
      .then((res) => res.json())
      .then((data) => setQuestionCount(Array.isArray(data.data) ? data.data.length : 0))
      .catch(() => setQuestionCount(null));
  }, [block.lesson_id]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Question summary</label>
        {questionCount === null ? (
          <div className="text-[10px] !text-dash-textMuted py-2">Loading question count...</div>
        ) : questionCount > 0 ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} className="shrink-0" /> {questionCount} question{questionCount === 1 ? "" : "s"} configured
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="shrink-0" /> No questions yet — build them in the Quiz Workbench
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={() => router.push(`/courses/${courseId}/quiz/${block.lesson_id}`)}
        className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold h-10 px-5 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 transition-colors motion-reduce:transition-none"
      >
        <Settings size={12} /> Open Quiz Workbench
      </Button>
    </div>
  );
}

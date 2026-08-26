"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
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

  return (
    <div className="py-6 px-4 text-center bg-white border border-dashed border-dash-border rounded-xl space-y-4">
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold !text-dash-text">Quiz Ready to Configure</h4>
        <p className="text-[10px] !text-dash-textMuted max-w-sm mx-auto leading-relaxed">
          Build evaluation questions, configure passing scores, time limits, and write LENA AI explanation rationales in the dedicated Quiz Workbench.
        </p>
      </div>
      <Button
        type="button"
        onClick={() => router.push(`/courses/${courseId}/quiz/${block.lesson_id}`)}
        className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold h-10 px-5 shadow-lg shadow-primary/20 flex items-center gap-1.5 mx-auto transition-colors motion-reduce:transition-none"
      >
        <Settings size={12} /> Open Quiz Workbench
      </Button>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, HelpCircle, Loader2,
  Sparkles, AlertTriangle, Save,
  Sliders, Layout, Eye,
  ListChecks, GripVertical, Check, CircleDot, ToggleLeft, Type, ArrowLeftRight, ArrowDownUp,
  TextCursorInput, Code2, Upload, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DashTooltipContent } from "@/components/dashboard-ui/Tooltip";
import ConfirmationModal from "@/components/calendar/modals/ConfirmationModal";
import { ORANGE_ACTION } from "@/lib/lms/brandOrange";
import {
  generateExplanationWithLena
} from "@/app/actions/quizzes";
import Editor from "@monaco-editor/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QuizAnalyticsConsole from "./QuizAnalyticsConsole";
import { updateModuleQuiz } from "@/app/actions/moduleQuizzes";
import Link from "next/link";
import { PropertyGroup, SliderWithInput, PropertySelect } from "@/components/builder/inspector/primitives";

// Real db question_type values -> a short, readable badge label for the question-list sidebar.
const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  true_false: "True/False",
  short_answer: "Short answer",
  matching: "Matching",
  ordering: "Ordering",
  fill_blank: "Fill blank",
  code: "Code",
  file_upload: "File upload",
};

// Icon + colour per question type so the list reads at a glance (label comes from QUESTION_TYPE_LABELS).
const QUESTION_TYPE_META: Record<string, { icon: LucideIcon; tone: string }> = {
  mcq: { icon: CircleDot, tone: "bg-sky-50 text-sky-700 ring-sky-500/20" },
  true_false: { icon: ToggleLeft, tone: "bg-violet-50 text-violet-700 ring-violet-500/20" },
  short_answer: { icon: Type, tone: "bg-emerald-50 text-emerald-700 ring-emerald-500/20" },
  matching: { icon: ArrowLeftRight, tone: "bg-amber-50 text-amber-700 ring-amber-500/20" },
  ordering: { icon: ArrowDownUp, tone: "bg-indigo-50 text-indigo-700 ring-indigo-500/20" },
  fill_blank: { icon: TextCursorInput, tone: "bg-rose-50 text-rose-700 ring-rose-500/20" },
  code: { icon: Code2, tone: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  file_upload: { icon: Upload, tone: "bg-orange-50 text-orange-700 ring-orange-500/20" },
};

// Batch 3 (G6b) — opt-in AI-assisted acceptance toggle, shared by the short_answer and
// fill_blank editors. Default off; writes metadata.ai_grading.
function AiGradingToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/60 p-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-sky-600"
      />
      <span className="text-[10px] leading-relaxed text-sky-800">
        <strong className="font-semibold">AI-assisted acceptance (opt-in)</strong> — if a
        student answer isn&apos;t matched by the accepted list or typo tolerance, ask the AI
        whether it&apos;s an acceptable synonym / paraphrase. Costs AI credits per graded
        answer and its verdict can vary between attempts. Off by default.
      </span>
    </label>
  );
}

interface QuizWorkbenchClientProps {
  course: any;
  quiz: any;
  /** Module-Level Quiz pass — when set, this same Workbench authors a module quiz
   *  (module_quiz_questions/module_quiz_settings) instead of a lesson quiz. `quiz.id` is
   *  then that module quiz's own id (module_quizzes — a module can hold several), and every
   *  module-scope call below is addressed by it. The question-authoring UI is unchanged
   *  either way; only which API endpoints/payload keys get hit differs, isolated to the few
   *  call sites below rather than a second, parallel component (Step 2's explicit ask). */
  moduleId?: string;
}

export default function QuizWorkbenchClient({ course, quiz, moduleId }: QuizWorkbenchClientProps) {
  const isModuleScope = !!moduleId;
  const router = useRouter();
  const searchParams = useSearchParams();
  // Batch 8 (G12) — real deep-link support: the workspace-wide "Needs grading" queue links
  // straight to a pending attempt's Results tab (?tab=analytics) rather than dropping the
  // instructor on Questions and making them find it themselves.
  const initialTab = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState<"questions" | "settings" | "analytics">(
    initialTab === "analytics" || (initialTab === "settings" && !isModuleScope) ? initialTab : "questions"
  );

  // Quiz settings state
  const [quizTitle, setQuizTitle] = useState(quiz.title || "");
  const [quizDesc, setQuizDesc] = useState(quiz.description || "");
  const [passingScore, setPassingScore] = useState(quiz.passing_score ?? 80);
  const [timeLimit, setTimeLimit] = useState(quiz.time_limit_minutes ?? 0);
  const [maxRetakes, setMaxRetakes] = useState(quiz.max_retakes ?? -1);
  const [isRequired, setIsRequired] = useState(quiz.is_required ?? true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  // Module quizzes only: module_quizzes.status. Students see a module quiz only once it is
  // published (and has questions).
  const [moduleQuizStatus, setModuleQuizStatus] = useState<string>(quiz.status || "draft");
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

  // Global configuration overrides states
  const initialSettings = quiz.settings || {};
  const [exceededBehavior, setExceededBehavior] = useState<"lock" | "remedial">(initialSettings.exceeded_behavior || "lock");
  const [feedbackTrigger, setFeedbackTrigger] = useState<"immediate" | "post-submission" | "hidden">(initialSettings.feedback_trigger || "immediate");
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(!!initialSettings.shuffle_options);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(!!initialSettings.shuffle_questions);
  const [poolCount, setPoolCount] = useState<number>(initialSettings.pool_count ?? 0);
  const [requirePass, setRequirePass] = useState<boolean>(!!initialSettings.require_pass_to_unlock);
  const [isConfigPaneOpen, setIsConfigPaneOpen] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<any | null>(null);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  
  // Question form state
  const [type, setType] = useState<string>("multiple_choice");
  const [questionText, setQuestionText] = useState("");
  const [points, setPoints] = useState(1);
  const [position, setPosition] = useState(0);
  
  // MCQ/TrueFalse options state
  const [optionsList, setOptionsList] = useState<{ id?: string; text: string; is_correct: boolean }[]>([
    { text: "Option A", is_correct: true },
    { text: "Option B", is_correct: false }
  ]);
  
  // Type-specific payloads (stored inside metadata or correct_answer JSONB fields)
  const [synonyms, setSynonyms] = useState<string>("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  // Batch 3 (G6b): opt-in AI-assisted acceptance for short_answer / fill_blank. Default OFF.
  // Stored at metadata.ai_grading; used only as a fallback for answers the deterministic
  // fuzzy matcher rejects, and only when a real OpenAI key is configured.
  const [aiGrading, setAiGrading] = useState(false);
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([{ left: "", right: "" }]);
  const [orderingItems, setOrderingItems] = useState<string[]>(["", ""]);
  const [blankText, setBlankText] = useState("JavaScript is a [blank] scripting language.");
  // One comma-separated accepted-answers list per [blank], in order. Graded with the SAME
  // rule short_answer uses (case-insensitive exact match against the list).
  const [blankAnswers, setBlankAnswers] = useState<string[]>([""]);
  const [blankCaseSensitive, setBlankCaseSensitive] = useState(false);
  const [starterCode, setStarterCode] = useState("// Write starter challenge template here\n");
  // Batch 2 scope decision: code questions are graded by NORMALIZED-TEXT match against these
  // accepted solutions — the student's code is NOT executed. Real execution is a separate,
  // much larger project.
  const [acceptedSolutions, setAcceptedSolutions] = useState<string[]>([""]);
  const [rubrics, setRubrics] = useState<{ criteria: string; max_points: number }[]>([{ criteria: "Correctness", max_points: 5 }]);
  
  // Explanation state
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // ---- Unsaved-change tracking -------------------------------------------------------------
  // Nothing in this editor autosaves: a question's fields live in component state until "Save Question
  // Node", and title/settings until the Advanced-settings Save. So "dirty" = the form differs from a
  // baseline snapshot taken when the question was loaded / last saved (and likewise for settings).
  const questionSnap = useMemo(
    () =>
      JSON.stringify({
        type, questionText, points, explanation,
        options: optionsList.map((o) => [o.text, o.is_correct]),
        synonyms, caseSensitive, aiGrading, matchingPairs, orderingItems,
        blankText, blankAnswers, blankCaseSensitive, starterCode, acceptedSolutions, rubrics,
      }),
    [type, questionText, points, explanation, optionsList, synonyms, caseSensitive, aiGrading, matchingPairs, orderingItems, blankText, blankAnswers, blankCaseSensitive, starterCode, acceptedSolutions, rubrics]
  );
  const [questionBaseline, setQuestionBaseline] = useState<string | null>(null);
  const [baselineVersion, setBaselineVersion] = useState(0);
  // Runs in the render that follows a select / new / save, so the snapshot already reflects the new form.
  useEffect(() => { setQuestionBaseline(questionSnap); }, [baselineVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only the settings handleSaveSettings actually persists count toward "unsaved".
  const settingsSnap = useMemo(
    () => JSON.stringify({ quizTitle, quizDesc: isModuleScope ? null : quizDesc, passingScore, timeLimit, maxRetakes, feedbackTrigger, shuffleQuestions }),
    [quizTitle, quizDesc, isModuleScope, passingScore, timeLimit, maxRetakes, feedbackTrigger, shuffleQuestions]
  );
  const [settingsBaseline, setSettingsBaseline] = useState<string | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  useEffect(() => { if (settingsVersion > 0) setSettingsBaseline(settingsSnap); }, [settingsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const questionDirty = questionBaseline !== null && questionSnap !== questionBaseline;
  const settingsDirty = settingsBaseline !== null && settingsSnap !== settingsBaseline;
  const isDirty = questionDirty || settingsDirty;

  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  // Question-list drag & drop (handle-initiated, like the curriculum module list).
  const [dragQId, setDragQId] = useState<string | null>(null);
  const [dragOverQId, setDragOverQId] = useState<string | null>(null);
  const [handleHeldQId, setHandleHeldQId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
    loadSettings();
  }, [quiz.id]);

  const loadSettings = async () => {
    // A module quiz has no settings of its own — the module's rules apply (Module quiz settings).
    if (isModuleScope) {
      setSettingsVersion((v) => v + 1);
      return;
    }
    try {
      const res = await fetch(`/api/lms/quiz/settings?lessonId=${quiz.id}`);
      const dataJson = await res.json();
      if (dataJson.data) {
        const s = dataJson.data;
        setTimeLimit(s.time_limit_minutes ?? 0);
        setMaxRetakes(s.max_attempts ?? 3);
        setPassingScore(s.pass_percentage ?? 70);
        if (s.show_answers_after) {
          setFeedbackTrigger(s.show_answers_after === 'submission' ? 'post-submission' : 'hidden');
        }
        setShuffleQuestions(!!s.randomize_questions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsVersion((v) => v + 1); // baseline = whatever loaded (or the defaults)
    }
  };

  const loadQuestions = async (selectId?: string) => {
    try {
      const res = await fetch(
        isModuleScope
          ? `/api/lms/module-quiz/questions?quizId=${quiz.id}`
          : `/api/lms/quiz/questions?lessonId=${quiz.id}`
      );
      const dataJson = await res.json();
      if (dataJson.data) {
        setQuestions(dataJson.data);
        if (dataJson.data.length > 0) {
          // After a save, stay on the question that was saved instead of jumping back to the first.
          selectQuestion(dataJson.data.find((q: any) => q.id === selectId) ?? dataJson.data[0]);
        } else {
          handleNewQuestion();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectQuestion = (q: any) => {
    setActiveQuestion(q);
    setType(q.question_type === 'mcq' ? 'multiple_choice' : q.question_type === 'true_false' ? 'true_false' : q.question_type === 'short_answer' ? 'short_answer' : q.question_type === 'matching' ? 'matching' : q.question_type === 'ordering' ? 'ordering' : q.question_type === 'fill_blank' ? 'fill_in_blank' : q.question_type === 'code' ? 'code_challenge' : 'file_upload');
    setQuestionText(q.question_text);
    setPoints(q.points || 1);
    setPosition(q.position || 0);
    setExplanation(q.explanation || "");

    const meta = q.metadata || {};
    const correct = q.correct_answer || {};

    if (q.question_type === "mcq" || q.question_type === "true_false") {
      setOptionsList(q.options || []);
    } else if (q.question_type === "short_answer") {
      setSynonyms((correct.synonyms || []).join(", "));
      setCaseSensitive(meta.case_sensitive || false);
      setAiGrading(meta.ai_grading === true);
    } else if (q.question_type === "matching") {
      setMatchingPairs(meta.pairs || [{ left: "", right: "" }]);
    } else if (q.question_type === "ordering") {
      setOrderingItems(meta.items || ["", ""]);
    } else if (q.question_type === "fill_blank") {
      setBlankText(meta.text_with_blanks || "");
      setBlankAnswers((meta.blanks || []).map((b: any) => (b.accepted || []).join(", ")));
      setBlankCaseSensitive(!!meta.case_sensitive);
      setAiGrading(meta.ai_grading === true);
    } else if (q.question_type === "code") {
      setStarterCode(meta.starter_template || "");
      setAcceptedSolutions(meta.accepted_solutions?.length ? meta.accepted_solutions : [""]);
    } else if (q.question_type === "file_upload") {
      setRubrics(meta.rubric_criteria || [{ criteria: "Correctness", max_points: 5 }]);
    }
    setBaselineVersion((v) => v + 1);
  };

  const handleNewQuestion = () => {
    setActiveQuestion(null);
    setType("multiple_choice");
    setQuestionText("");
    setPoints(1);
    setExplanation("");
    setOptionsList([
      { text: "Option A", is_correct: true },
      { text: "Option B", is_correct: false }
    ]);
    setSynonyms("");
    setCaseSensitive(false);
    setAiGrading(false);
    setMatchingPairs([{ left: "", right: "" }]);
    setOrderingItems(["", ""]);
    setBlankText("Write sentence using [blank] placeholder.");
    setBlankAnswers([""]);
    setBlankCaseSensitive(false);
    setStarterCode("// Code challenge starter template\n");
    setAcceptedSolutions([""]);
    setRubrics([{ criteria: "Completeness", max_points: 10 }]);
    setPosition(questions.length); // a new question goes at the end of the list
    setBaselineVersion((v) => v + 1);
  };

  // Leaving a question / the page with unsaved edits asks first (reused by the list, the back arrow and links).
  const guardQuestionChange = (action: () => void) => (questionDirty ? setPendingLeave(() => action) : action());
  const guardLeave = (action: () => void) => (isDirty ? setPendingLeave(() => action) : action());
  const requestSelectQuestion = (q: any) => {
    if (q.id === activeQuestion?.id) return;
    guardQuestionChange(() => selectQuestion(q));
  };
  const requestNewQuestion = () => guardQuestionChange(handleNewQuestion);

  const handleLenaGenerate = async () => {
    if (!questionText || questionText.trim() === "") {
      toast.error("Please enter the question text first!");
      return;
    }
    setIsGenerating(true);
    try {
      const correctAnswers = type === "multiple_choice" || type === "true_false" 
        ? optionsList.filter(o => o.is_correct).map(o => o.text)
        : [synonyms];
      const options = optionsList.map(o => o.text);

      const res = await generateExplanationWithLena(questionText, correctAnswers, options);
      if (res.error) {
        toast.error(res.error);
      } else if (res.text) {
        setExplanation(res.text);
        toast.success("Pedagogical explanation generated with LENA!");
      }
    } catch {
      toast.error("Failed to generate explanation");
    } finally {
      setIsGenerating(false);
    }
  };

  const persistQuestion = async (opts?: { silent?: boolean }): Promise<boolean> => {
    if (!questionText.trim()) {
      toast.error("Question text is required");
      return false;
    }

    const metadata: any = {};
    let correct_answer: any = {};

    if (type === "multiple_choice" || type === "true_false") {
      const hasCorrect = optionsList.some(o => o.is_correct);
      if (!hasCorrect) {
        toast.error("Please mark at least one answer as correct");
        return false;
      }
    } else if (type === "short_answer") {
      const synList = synonyms.split(",").map(s => s.trim()).filter(Boolean);
      if (synList.length === 0) {
        toast.error("Short answer requires at least one synonym");
        return false;
      }
      correct_answer.synonyms = synList;
      metadata.case_sensitive = caseSensitive;
      metadata.ai_grading = aiGrading;
    } else if (type === "matching") {
      metadata.pairs = matchingPairs.filter(p => p.left && p.right);
    } else if (type === "ordering") {
      metadata.items = orderingItems.filter(Boolean);
    } else if (type === "fill_in_blank") {
      const blankCount = (blankText.match(/\[blank\]/g) || []).length;
      if (blankCount === 0) {
        toast.error("Sentence must contain at least one '[blank]' placeholder");
        return false;
      }
      const blanks = Array.from({ length: blankCount }, (_, i) => ({
        accepted: (blankAnswers[i] || "").split(",").map(s => s.trim()).filter(Boolean),
      }));
      if (blanks.some(b => b.accepted.length === 0)) {
        toast.error("Every blank needs at least one accepted answer");
        return false;
      }
      metadata.text_with_blanks = blankText;
      metadata.blanks = blanks;
      metadata.case_sensitive = blankCaseSensitive;
      metadata.ai_grading = aiGrading;
    } else if (type === "code_challenge") {
      const solutions = acceptedSolutions.map(s => s.trim()).filter(Boolean);
      if (solutions.length === 0) {
        toast.error("Add at least one accepted solution — code is graded by matching against these, not by running it");
        return false;
      }
      metadata.starter_template = starterCode;
      metadata.accepted_solutions = solutions;
      metadata.match_mode = "normalized";
    } else if (type === "file_upload") {
      metadata.rubric_criteria = rubrics.filter(r => r.criteria.trim());
    }

    const qTypeMap: Record<string, string> = {
      multiple_choice: 'mcq',
      true_false: 'true_false',
      short_answer: 'short_answer',
      matching: 'matching',
      ordering: 'ordering',
      fill_in_blank: 'fill_blank',
      code_challenge: 'code',
      file_upload: 'file_upload'
    };

    try {
      const base = isModuleScope ? '/api/lms/module-quiz/questions' : '/api/lms/quiz/questions';
      const url = activeQuestion?.id ? `${base}?id=${activeQuestion.id}` : base;
      const method = activeQuestion?.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: quiz.id,
          workspace_id: course.workspace_id || quiz.workspace_id,
          question_type: qTypeMap[type] || 'mcq',
          question_text: questionText,
          options: type === "multiple_choice" || type === "true_false" ? optionsList : [],
          correct_answer: type === "multiple_choice" || type === "true_false" ? { correct_option_index: optionsList.findIndex(o => o.is_correct) } : correct_answer,
          metadata,
          explanation,
          points,
          position
        })
      });

      const resData = await res.json();
      if (resData.error) {
        toast.error(resData.error);
        return false;
      }
      if (!opts?.silent) toast.success("Question saved successfully!");
      await loadQuestions(resData.data?.id ?? activeQuestion?.id);
      return true;
    } catch {
      toast.error("Failed to save question");
      return false;
    }
  };

  // The per-question button keeps its own transition so its spinner state is unchanged.
  const handleSaveQuestion = () => {
    startTransition(async () => {
      await persistQuestion();
    });
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      const base = isModuleScope ? '/api/lms/module-quiz/questions' : '/api/lms/quiz/questions';
      const res = await fetch(`${base}?id=${qId}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (resData.error) toast.error(resData.error);
      else {
        toast.success("Question deleted.");
        loadQuestions();
      }
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const persistSettings = async (opts?: { silent?: boolean }): Promise<boolean> => {
    if (!quizTitle.trim()) {
      toast.error("Quiz title is required");
      return false;
    }
    setIsSavingSettings(true);
    try {
      // Lesson quizzes only: a module quiz has no Advanced settings (its rules are the module's,
      // and it is renamed from the quiz list), so this is never reached for one.
      {
        // 1. Update course_lessons title and description
        const lessonRes = await fetch(`/api/lms/lessons?id=${quiz.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: quizTitle,
            content: {
              ...(quiz.content || {}),
              text: quizDesc
            }
          })
        });
        const lessonJson = await lessonRes.json();
        if (lessonJson.error) throw new Error(lessonJson.error);

        // A real, pre-existing bug was found and fixed here during the Module-Level Quiz
        // pass: this used to also call the legacy upsertQuiz() server action, writing a
        // corresponding row into lms_quizzes on every save — dead weight nothing ever read.
        // The whole legacy lms_quizzes/lms_questions/lms_quiz_submissions cluster (and
        // getQuizById, its lookup here) was later removed entirely (Three Deferred Items,
        // Item 3: confirmed dead, zero real callers, zero real rows) — QuizWorkbenchPage now
        // resolves this page's `quiz` shape directly from course_lessons, no legacy lookup
        // involved at all.
      }

      const settingsRes = await fetch('/api/lms/quiz/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isModuleScope ? { quiz_id: quiz.id } : { lesson_id: quiz.id }),
          time_limit_minutes: timeLimit,
          max_attempts: maxRetakes,
          pass_percentage: passingScore,
          show_answers_after: feedbackTrigger === 'post-submission' ? 'submission' : 'never',
          randomize_questions: shuffleQuestions,
          publish_status: 'active'
        })
      });
      const settingsJson = await settingsRes.json();
      if (settingsJson.error) throw new Error(settingsJson.error);

      if (!opts?.silent) toast.success("Quiz settings saved successfully!");
      setSettingsVersion((v) => v + 1); // saved values become the new baseline
      router.refresh();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
      return false;
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveSettings = () => {
    void persistSettings();
  };

  // Saves whatever is unsaved — settings/title and/or the open question — and never touches publish status.
  const handleSaveQuiz = async () => {
    if (!isDirty || isSavingQuiz) return;
    setIsSavingQuiz(true);
    try {
      if (settingsDirty && !(await persistSettings({ silent: true }))) return;
      if (questionDirty && !(await persistQuestion({ silent: true }))) return;
      toast.success("Quiz saved.");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    } catch {
      toast.error("Failed to save the quiz");
    } finally {
      setIsSavingQuiz(false);
    }
  };
  const saveQuizRef = useRef(handleSaveQuiz);
  saveQuizRef.current = handleSaveQuiz;

  // Cmd/Ctrl+S saves (and suppresses the browser's own save dialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveQuizRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before losing edits by closing/reloading the tab, or by following any in-app link.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingLeave(() => () => router.push(url.pathname + url.search + url.hash));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty, router]);

  // Reorder questions: optimistic, then one atomic server call; revert on failure. Local positions are kept
  // in step so a later "Save question" doesn't write a stale position back.
  const moveQuestion = (fromId: string, toId: string) => {
    const from = questions.findIndex((q) => q.id === fromId);
    const to = questions.findIndex((q) => q.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const previous = questions;
    const next = [...questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const withPositions = next.map((q, i) => ({ ...q, position: i }));
    setQuestions(withPositions);
    const activeIdx = withPositions.findIndex((q) => q.id === activeQuestion?.id);
    if (activeIdx >= 0) setPosition(activeIdx);
    void (async () => {
      try {
        const res = await fetch(isModuleScope ? "/api/lms/module-quiz/questions/reorder" : "/api/lms/quiz/questions/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isModuleScope ? { quizId: quiz.id, ids: withPositions.map((q) => q.id) } : { lessonId: quiz.id, ids: withPositions.map((q) => q.id) }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || "Could not save the new order");
        toast.success("Question order saved.");
      } catch (err: any) {
        setQuestions(previous);
        const prevIdx = previous.findIndex((q) => q.id === activeQuestion?.id);
        if (prevIdx >= 0) setPosition(prevIdx);
        toast.error(err.message || "Could not save the new order");
      }
    })();
  };

  const handleToggleModuleQuizPublish = async () => {
    const next = moduleQuizStatus === "published" ? "draft" : "published";
    setIsTogglingPublish(true);
    try {
      const res = await updateModuleQuiz(quiz.id, { status: next });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setModuleQuizStatus(next);
      toast.success(next === "published" ? "Quiz published — students can now take it." : "Quiz moved back to draft.");
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleGenerateAiQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isModuleScope ? { quiz_id: quiz.id } : { lesson_id: quiz.id }),
          workspace_id: course.workspace_id || quiz.workspace_id
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success("Successfully generated 5 MCQ questions!");
        loadQuestions();
      }
    } catch {
      toast.error("Failed to generate questions");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dash-border pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => guardLeave(() => router.push(isModuleScope ? `/courses/${course.id}/module-quiz/${moduleId}` : `/courses/${course.id}`))}
            className="w-10 h-10 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:bg-dash-border/60 hover:!text-dash-text transition-all motion-reduce:transition-none active:scale-95 shrink-0"
            title={isModuleScope ? "Back to the module's quizzes" : "Back to course builder"}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dash-accent">Quiz editor</span>
            <h1 className="font-display text-[26px] md:text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] !text-dash-text mt-1">
              {quizTitle || "Untitled quiz"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isModuleScope && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                    moduleQuizStatus === "published"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                      : "bg-slate-100 text-slate-600 ring-slate-500/20"
                  }`}
                >
                  {moduleQuizStatus === "published" ? "Published" : "Draft — students can't see this quiz"}
                </span>
              )}
              {isDirty && !isSavingQuiz && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium !text-amber-700" role="status">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden /> Unsaved changes
                </span>
              )}
              {/* Secondary action: saves the open question and/or title & settings; never changes publish status. */}
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={!isDirty || isSavingQuiz}
                title="Save quiz (Ctrl/⌘ + S)"
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors motion-reduce:transition-none [&_svg]:size-3.5",
                  justSaved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-dash-border bg-white !text-dash-text shadow-sm hover:bg-dash-surface disabled:cursor-not-allowed disabled:bg-dash-surface disabled:!text-dash-textMuted disabled:opacity-60 disabled:shadow-none"
                )}
              >
                {isSavingQuiz ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : justSaved ? <Check /> : <Save />}
                {isSavingQuiz ? "Saving…" : justSaved ? "Saved" : "Save Quiz"}
              </button>
              {isModuleScope && (
                <button
                  onClick={handleToggleModuleQuizPublish}
                  disabled={isTogglingPublish}
                  className={cn(
                    "h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors motion-reduce:transition-none disabled:opacity-60",
                    moduleQuizStatus === "published"
                      ? "border border-dash-border bg-white !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface"
                      : ORANGE_ACTION
                  )}
                >
                  {moduleQuizStatus === "published" ? "Unpublish" : "Publish"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs switcher — same premium segmented-pill pattern established across the
            settings-panel/curriculum redesign work: bg-dash-surface track, active tab a real
            white card with a shadow, not a flat accent fill. */}
        <div className="flex items-center bg-dash-surface border border-dash-border rounded-xl p-1 shrink-0 gap-0.5">
          {([
            { id: "questions", label: `Questions (${questions.length})`, icon: Layout },
            // Module quizzes have no per-quiz settings: the module's rules apply (link below).
            ...(isModuleScope ? [] : [{ id: "settings", label: "Advanced settings", icon: Sliders }]),
            { id: "analytics", label: "Analytics & attempts", icon: Eye },
          ] as { id: "questions" | "settings" | "analytics"; label: string; icon: LucideIcon }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 h-9 rounded-lg text-[11px] font-semibold transition-all motion-reduce:transition-none flex items-center gap-1.5 ${
                activeTab === id
                  ? "bg-white !text-dash-text shadow-sm border border-dash-border"
                  : "!text-dash-textMuted hover:!text-dash-text"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
          {isModuleScope && (
            <Link
              href={`/courses/${course.id}/module-quiz/${moduleId}/settings`}
              className="px-4 h-9 rounded-lg text-[11px] font-semibold transition-colors motion-reduce:transition-none flex items-center gap-1.5 !text-dash-textMuted hover:!text-dash-text"
              title="Pass mark, time limit, attempts, shuffle and completion are set once for the whole module"
            >
              <Sliders size={13} /> Module quiz settings
            </Link>
          )}
        </div>
      </div>

      {/* Main Body */}
      {activeTab === "questions" ? (
        /* Questions Composer Panel */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          
          {/* Question List Sidebar — a question navigator: numbered, typed, draggable cards in an independently
              scrolling panel that stays in view while the editor on the right scrolls. */}
          <TooltipProvider delayDuration={350}>
          <aside
            aria-label="Question list"
            className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="font-display text-[16px] font-semibold tracking-[-0.01em] !text-dash-text">Questions</h2>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-50 px-2 text-[11px] font-bold tabular-nums text-sky-700 ring-1 ring-inset ring-sky-500/15">
                  {questions.length}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {questions.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={isBulkSelectMode ? "Exit selection mode" : "Select questions"}
                        aria-pressed={isBulkSelectMode}
                        onClick={() => {
                          setIsBulkSelectMode(!isBulkSelectMode);
                          setSelectedQuestionIds([]);
                        }}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
                          isBulkSelectMode
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-dash-border bg-white text-dash-textMuted hover:bg-dash-surface hover:text-dash-text"
                        )}
                      >
                        <ListChecks size={16} />
                      </button>
                    </TooltipTrigger>
                    <DashTooltipContent>{isBulkSelectMode ? "Exit selection" : "Select multiple"}</DashTooltipContent>
                  </Tooltip>
                )}
                <button
                  type="button"
                  onClick={requestNewQuestion}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-[12px] font-semibold text-white shadow-sm shadow-sky-500/25 transition-all hover:bg-sky-600 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {isBulkSelectMode && questions.length > 0 && (
              <div className="mx-5 mb-3 flex items-center justify-between rounded-xl border border-dash-border bg-dash-surface p-2.5 text-[11px]">
                <label className="flex cursor-pointer select-none items-center gap-2 font-medium !text-dash-textMuted hover:!text-dash-text">
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.length === questions.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedQuestionIds(questions.map(q => q.id));
                      } else {
                        setSelectedQuestionIds([]);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded accent-sky-600"
                  />
                  Select all ({questions.length})
                </label>
                {selectedQuestionIds.length > 0 && (
                  <button
                    onClick={() => setIsBulkDeleteConfirmOpen(true)}
                    className="rounded-lg border border-red-200 bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-600 hover:text-red-700"
                  >
                    Delete ({selectedQuestionIds.length})
                  </button>
                )}
              </div>
            )}

            {/* AI action: a quiet outlined card in the brand blue (dash-accent, the LeadsMind logo blue).
                Hover is one soft tint of that same hue — no gradients. Same handler as before. */}
            <div className="px-5 pb-3">
              <button
                type="button"
                onClick={handleGenerateAiQuestions}
                disabled={isGeneratingQuestions}
                className="group w-full rounded-xl border border-dash-border bg-white shadow-sm transition-colors hover:border-dash-accent/40 hover:bg-dash-accent/[0.06] disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent/50 focus-visible:ring-offset-2"
              >
                <span className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dash-accent text-white shadow-sm">
                    {isGeneratingQuestions ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> : <Sparkles size={15} />}
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block text-[12px] font-semibold !text-dash-text">
                      {isGeneratingQuestions ? "Generating questions…" : "Generate with AI"}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] !text-dash-textMuted">
                      Draft questions from {isModuleScope ? "this module's lessons" : "this lesson"}
                    </span>
                  </span>
                </span>
              </button>
            </div>

            {/* Cards — this region scrolls on its own */}
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto border-t border-dash-border bg-dash-surface/40 px-4 pb-4 pt-3.5 [scrollbar-width:thin]">
              {questions.map((q, idx) => {
                const typeLabel = QUESTION_TYPE_LABELS[q.question_type] || q.question_type;
                const meta = QUESTION_TYPE_META[q.question_type] || { icon: HelpCircle, tone: "bg-slate-100 text-slate-700 ring-slate-500/20" };
                const TypeIcon = meta.icon;
                const isActive = !isBulkSelectMode && activeQuestion?.id === q.id;
                const isChecked = isBulkSelectMode && selectedQuestionIds.includes(q.id);
                const selected = isActive || isChecked;
                const pts = q.points ?? 1;
                const canDrag = !isBulkSelectMode && questions.length > 1;
                return (
                  <div
                    key={q.id}
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? "true" : undefined}
                    draggable={canDrag && handleHeldQId === q.id}
                    onDragStart={(e) => {
                      if (!canDrag || handleHeldQId !== q.id) return;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", q.id);
                      setDragQId(q.id);
                    }}
                    onDragEnter={() => canDrag && dragQId && setDragOverQId(q.id)}
                    onDragOver={(e) => { if (canDrag && dragQId) e.preventDefault(); }}
                    onDrop={(e) => {
                      if (!canDrag || !dragQId) return;
                      e.preventDefault();
                      moveQuestion(dragQId, q.id);
                      setDragQId(null); setDragOverQId(null); setHandleHeldQId(null);
                    }}
                    onDragEnd={() => { setDragQId(null); setDragOverQId(null); setHandleHeldQId(null); }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.altKey && canDrag && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                        e.preventDefault();
                        const target = questions[idx + (e.key === "ArrowUp" ? -1 : 1)];
                        if (target) moveQuestion(q.id, target.id);
                        return;
                      }
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                      }
                    }}
                    onClick={() => {
                      if (isBulkSelectMode) {
                        setSelectedQuestionIds((ids) => (ids.includes(q.id) ? ids.filter((id) => id !== q.id) : [...ids, q.id]));
                      } else {
                        requestSelectQuestion(q);
                      }
                    }}
                    className={cn(
                      "group relative cursor-pointer select-none overflow-hidden rounded-xl border p-3.5 pl-4 outline-none transition-all duration-150 motion-reduce:transition-none",
                      "focus-visible:ring-2 focus-visible:ring-sky-500/50",
                      selected
                        ? "border-sky-300 bg-sky-50/80 shadow-sm ring-1 ring-sky-200"
                        : "border-dash-border bg-white hover:-translate-y-px hover:border-slate-300 hover:shadow-md motion-reduce:hover:translate-y-0",
                      dragQId === q.id && "opacity-50",
                      dragOverQId === q.id && dragQId !== q.id && "border-sky-400 ring-2 ring-sky-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 top-0 w-1 transition-colors motion-reduce:transition-none",
                        selected ? "bg-sky-500" : "bg-transparent group-hover:bg-slate-200"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      {isBulkSelectMode ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // toggled by the card click
                          aria-label={`Select question ${idx + 1}`}
                          className="h-3.5 w-3.5 shrink-0 rounded accent-sky-600"
                        />
                      ) : canDrag ? (
                        <span
                          role="img"
                          aria-label="Drag to reorder (or Alt + arrow keys)"
                          title="Drag to reorder"
                          onMouseDown={() => setHandleHeldQId(q.id)}
                          onMouseUp={() => setHandleHeldQId(null)}
                          className="-ml-1 flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing group-hover:text-slate-400"
                        >
                          <GripVertical size={14} />
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                          selected ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span className={cn("inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset [&_svg]:size-3", meta.tone)}>
                        <TypeIcon />
                        <span className="truncate">{typeLabel}</span>
                      </span>
                      <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200">
                        {pts} pt{pts === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="mb-0 mt-2.5 line-clamp-2 pr-6 text-[12.5px] font-semibold leading-snug !text-dash-text">
                          {q.question_text || "Untitled question"}
                        </p>
                      </TooltipTrigger>
                      <DashTooltipContent side="right" className="max-w-xs whitespace-pre-wrap">
                        {q.question_text || "Untitled question"}
                      </DashTooltipContent>
                    </Tooltip>
                    {!isBulkSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuestionToDelete(q);
                        }}
                        className="absolute bottom-2 right-2 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
                        title="Delete question"
                        aria-label={`Delete question ${idx + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
              {questions.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
                    <HelpCircle size={22} />
                  </span>
                  <p className="mb-0 text-[13px] font-semibold !text-dash-text">No questions yet</p>
                  <p className="mb-0 mt-1 max-w-[200px] text-[11.5px] leading-relaxed !text-dash-textMuted">
                    Write your first question on the right, or let AI draft a set for you.
                  </p>
                </div>
              )}
            </div>
          </aside>
          </TooltipProvider>

          {/* Editor Workbench */}
          <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <PropertySelect
                label="Question type"
                value={type}
                onChange={setType}
                options={[
                  { value: "multiple_choice", label: "Multiple choice (MCQ)" },
                  { value: "true_false", label: "True / False" },
                  { value: "short_answer", label: "Short answer" },
                  { value: "matching", label: "Matching pairs" },
                  { value: "ordering", label: "Ordering lists" },
                  { value: "fill_in_blank", label: "Fill in the blank" },
                  { value: "code_challenge", label: "Code challenge" },
                  { value: "file_upload", label: "File upload rubric" },
                ]}
              />
              <SliderWithInput
                label="Points value"
                value={points}
                onChange={(val) => setPoints(Number(val))}
                min={1}
                max={20}
                unit=""
                numeric
              />
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold !text-dash-textMuted block">Question title / prompt</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={2}
                placeholder="e.g. Which keyword is used to define block-scoped variables in JS?"
                className="w-full bg-white border border-dash-border rounded-xl px-3.5 py-3 text-xs !text-dash-text placeholder:!text-dash-textMuted/60 outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none leading-relaxed"
              />
            </div>

            {/* Dynamic Options Render Block */}
            <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted block">Answer configuration</span>

              {/* MCQ / TrueFalse — both use a real radio (single-correct-answer), not a
                  checkbox: the actual save/grade pipeline (handleSaveQuestion below,
                  gradeQuizAttempt/gradeModuleQuizAttempt) only ever persists ONE
                  correct_option_index regardless of how many boxes were checked, so a
                  checkbox previously implied multi-select support that never functioned —
                  this is a real correctness fix, not a behavior change (the same single
                  correct-answer semantics already existed, just mislabeled). */}
              {(type === "multiple_choice" || type === "true_false") && (
                <div className="space-y-2.5">
                  {optionsList.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all motion-reduce:transition-none ${
                        opt.is_correct
                          ? "bg-green/10 border-green/30"
                          : "bg-white border-dash-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="correct-option"
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = optionsList.map((o, i) => ({ ...o, is_correct: i === idx }));
                          setOptionsList(updated);
                        }}
                        className="h-4 w-4 accent-green shrink-0"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        disabled={type === "true_false"}
                        onChange={(e) => {
                          const updated = [...optionsList];
                          updated[idx].text = e.target.value;
                          setOptionsList(updated);
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-xs !text-dash-text disabled:!text-dash-textMuted"
                      />
                      <span
                        className={`text-[9.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${
                          opt.is_correct
                            ? "bg-green/15 text-green"
                            : "bg-dash-surface !text-dash-textMuted border border-dash-border"
                        }`}
                      >
                        {opt.is_correct ? "Correct" : "Incorrect"}
                      </span>
                      {type === "multiple_choice" && (
                        <button
                          onClick={() => setOptionsList(optionsList.filter((_, i) => i !== idx))}
                          className="text-dash-textMuted hover:text-red hover:bg-red/10 p-1.5 rounded-md shrink-0 transition-colors motion-reduce:transition-none"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {type === "multiple_choice" && (
                    <button
                      type="button"
                      onClick={() => setOptionsList([...optionsList, { text: `New Option`, is_correct: false }])}
                      className="h-9 w-full bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-[10.5px] font-bold transition-colors motion-reduce:transition-none flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Add Option Choice
                    </button>
                  )}
                </div>
              )}

              {/* Short Answer synonyms */}
              {type === "short_answer" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={synonyms}
                    onChange={(e) => setSynonyms(e.target.value)}
                    placeholder="Comma separated accepted synonyms (e.g. const, let, const/let)"
                    className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                      id="case_sens"
                      className="accent-primary"
                    />
                    <label htmlFor="case_sens" className="text-[10px] !text-dash-textMuted">Case-sensitive matches</label>
                  </div>
                  <AiGradingToggle checked={aiGrading} onChange={setAiGrading} />
                </div>
              )}

              {/* Matching */}
              {type === "matching" && (
                <div className="space-y-3">
                  {matchingPairs.map((pair, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={pair.left}
                        onChange={(e) => {
                          const updated = [...matchingPairs];
                          updated[idx].left = e.target.value;
                          setMatchingPairs(updated);
                        }}
                        placeholder="Left Item"
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text"
                      />
                      <input 
                        type="text"
                        value={pair.right}
                        onChange={(e) => {
                          const updated = [...matchingPairs];
                          updated[idx].right = e.target.value;
                          setMatchingPairs(updated);
                        }}
                        placeholder="Right Item Match"
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text"
                      />
                      <button onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))} className="text-red shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <Button onClick={() => setMatchingPairs([...matchingPairs, { left: "", right: "" }])} className="h-9 bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-[10.5px] font-bold transition-colors motion-reduce:transition-none">+ Add Pair</Button>
                </div>
              )}

              {/* Ordering */}
              {type === "ordering" && (
                <div className="space-y-3">
                  {orderingItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-[10px] !text-dash-textMuted py-1 font-mono shrink-0">{idx + 1}.</span>
                      <input 
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const updated = [...orderingItems];
                          updated[idx] = e.target.value;
                          setOrderingItems(updated);
                        }}
                        placeholder="Sequence Item"
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text"
                      />
                      <button onClick={() => setOrderingItems(orderingItems.filter((_, i) => i !== idx))} className="text-red shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <Button onClick={() => setOrderingItems([...orderingItems, ""])} className="h-9 bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-[10.5px] font-bold transition-colors motion-reduce:transition-none">+ Add Item</Button>
                </div>
              )}

              {/* Fill-in-the-blank */}
              {type === "fill_in_blank" && (() => {
                const blankCount = (blankText.match(/\[blank\]/g) || []).length;
                return (
                  <div className="space-y-3">
                    <label className="text-[10px] !text-dash-textMuted block">Sentence — put <code className="font-mono">[blank]</code> where each answer goes:</label>
                    <textarea
                      value={blankText}
                      onChange={(e) => setBlankText(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text"
                    />
                    {blankCount === 0 ? (
                      <p className="text-[10px] text-amber-600">Add at least one <code className="font-mono">[blank]</code> placeholder.</p>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] !text-dash-textMuted block font-bold">Accepted answers per blank (comma-separated — matched case-insensitively):</span>
                        {Array.from({ length: blankCount }, (_, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[10px] !text-dash-textMuted font-mono shrink-0 w-14">Blank {idx + 1}</span>
                            <input
                              type="text"
                              value={blankAnswers[idx] || ""}
                              onChange={(e) => {
                                const updated = [...blankAnswers];
                                updated[idx] = e.target.value;
                                setBlankAnswers(updated);
                              }}
                              placeholder="e.g. dynamic, interpreted"
                              className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text"
                            />
                          </div>
                        ))}
                        <label className="flex items-center gap-2 text-[10px] !text-dash-textMuted">
                          <input type="checkbox" checked={blankCaseSensitive} onChange={(e) => setBlankCaseSensitive(e.target.checked)} className="accent-primary" />
                          Case-sensitive matches
                        </label>
                        <AiGradingToggle checked={aiGrading} onChange={setAiGrading} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Code Challenge — graded by normalized-text match, NOT execution */}
              {type === "code_challenge" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[10px] leading-relaxed text-amber-800">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>Graded by comparing the student&apos;s code against your accepted solution(s) with whitespace and indentation ignored — the code is <strong>not run</strong>. For anything requiring real execution, use an assignment instead.</span>
                  </div>
                  <label className="text-[10px] !text-dash-textMuted block">Starter template shown to the student:</label>
                  <textarea
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    rows={4}
                    placeholder="// Starter challenge code..."
                    className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text font-mono"
                  />
                  <span className="text-[10px] !text-dash-textMuted block font-bold">Accepted solution(s) — a submission matching any one (ignoring formatting) is correct:</span>
                  {acceptedSolutions.map((sol, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <textarea
                        value={sol}
                        onChange={(e) => {
                          const updated = [...acceptedSolutions];
                          updated[idx] = e.target.value;
                          setAcceptedSolutions(updated);
                        }}
                        rows={3}
                        placeholder={"function add(a, b) {\n  return a + b;\n}"}
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text font-mono"
                      />
                      <button onClick={() => setAcceptedSolutions(acceptedSolutions.filter((_, i) => i !== idx))} className="text-red shrink-0 pt-1.5"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <Button onClick={() => setAcceptedSolutions([...acceptedSolutions, ""])} className="h-9 bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-[10.5px] font-bold transition-colors motion-reduce:transition-none">+ Add accepted solution</Button>
                </div>
              )}

              {/* File Upload Rubrics */}
              {type === "file_upload" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[10px] leading-relaxed text-amber-800">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>The student uploads a file and <strong>you grade it by hand</strong> from the Results tab. Any quiz containing this question type is no longer scored instantly — the student&apos;s attempt waits in &ldquo;pending review&rdquo; until you assign points.</span>
                  </div>
                  <span className="text-[10px] !text-dash-textMuted block font-bold">Grading criteria rubric (shown to the student):</span>
                  {rubrics.map((rubric, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={rubric.criteria}
                        onChange={(e) => {
                          const updated = [...rubrics];
                          updated[idx].criteria = e.target.value;
                          setRubrics(updated);
                        }}
                        placeholder="Criteria"
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text"
                      />
                      <input 
                        type="number"
                        value={rubric.max_points}
                        onChange={(e) => {
                          const updated = [...rubrics];
                          updated[idx].max_points = parseInt(e.target.value) || 1;
                          setRubrics(updated);
                        }}
                        placeholder="Max Points"
                        className="w-24 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text"
                      />
                      <button onClick={() => setRubrics(rubrics.filter((_, i) => i !== idx))} className="text-red shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <Button onClick={() => setRubrics([...rubrics, { criteria: "", max_points: 5 }])} className="h-9 bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-[10.5px] font-bold transition-colors motion-reduce:transition-none">+ Add Rubric Item</Button>
                </div>
              )}
            </div>

            {/* Explanation Block with LENA — same sky-blue AI-action treatment as
                "Generate with AI" (Step 2): both are the same family of AI-assist control. */}
            <div className="space-y-2 border-t border-dash-border pt-5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold !text-dash-textMuted block">Pedagogical Explanation</label>
                <button
                  type="button"
                  onClick={handleLenaGenerate}
                  disabled={isGenerating}
                  className="h-7 px-2.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 text-[10.5px] font-semibold flex items-center gap-1.5 transition-colors motion-reduce:transition-none disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> Customising context...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> Generate with LENA
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="Pedagogical rationale displayed to student after answering..."
                className="w-full bg-white border border-dash-border rounded-xl px-3.5 py-3 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none leading-relaxed"
              />
            </div>

            {/* Action button */}
            <div className="flex items-center justify-end gap-3 border-t border-dash-border pt-5 shrink-0">
              <Button
                onClick={handleSaveQuestion}
                disabled={isPending}
                className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-[11px] font-bold px-6 shadow-lg shadow-primary/20 transition-colors motion-reduce:transition-none"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin motion-reduce:animate-none mr-2" /> Saving...
                  </>
                ) : (
                  "Save Question Node"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : activeTab === "settings" ? (
        /* Advanced Settings Panel — same premium primitives/section-header language as the
           Questions tab (PropertyGroup section headers, SliderWithInput numeric steppers)
           instead of a plain form. */
        <div className="bg-white border border-dash-border rounded-2xl p-6 md:p-7 max-w-2xl mx-auto space-y-1 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-dash-border pb-5 mb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dash-accent">Configuration</span>
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em] !text-dash-text mt-1.5">Advanced settings</h2>
              <p className="text-[12px] leading-relaxed !text-dash-textMuted mt-1">Grading, pacing and completion rules for this quiz.</p>
            </div>
            <button
              onClick={() => setIsConfigPaneOpen(true)}
              className="h-9 px-3.5 shrink-0 rounded-lg bg-white hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text text-[11px] font-semibold border border-dash-border flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
            >
              <Sliders size={12} /> Global overrides
            </button>
          </div>

          <PropertyGroup title="Identity">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold !text-dash-textMuted block">Quiz title</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold !text-dash-textMuted block">Description (optional)</label>
              <textarea
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                rows={3}
                placeholder="Provide additional guidelines for this quiz..."
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none leading-relaxed"
              />
            </div>
          </PropertyGroup>

          <PropertyGroup title="Grading & pacing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SliderWithInput
                label="Passing score"
                value={passingScore}
                onChange={(val) => setPassingScore(Number(val))}
                min={0}
                max={100}
                unit="%"
                numeric
              />
              <SliderWithInput
                label="Time limit"
                value={timeLimit}
                onChange={(val) => setTimeLimit(Number(val))}
                min={0}
                max={180}
                unit=" min"
                numeric
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SliderWithInput
                label="Max retakes"
                value={maxRetakes}
                onChange={(val) => setMaxRetakes(Number(val))}
                min={-1}
                max={20}
                unit=""
                numeric
              />

              <div className="flex items-center justify-between gap-3 bg-dash-surface border border-dash-border rounded-xl p-4">
                <div className="min-w-0">
                  <span className="text-[12.5px] font-semibold !text-dash-text block">Required for completion</span>
                  <span className="text-[11px] leading-relaxed !text-dash-textMuted block mt-0.5">Students must pass to continue</span>
                </div>
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                  className="shrink-0 data-[state=checked]:bg-dash-accent data-[state=unchecked]:bg-dash-border"
                />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed !text-dash-textMuted/90 -mt-1">Max retakes: <span className="font-medium">-1</span> = unlimited. Time limit: <span className="font-medium">0</span> = no limit.</p>
          </PropertyGroup>

          <div className="flex items-center justify-end border-t border-dash-border pt-5 mt-3">
            <Button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[11px] font-bold h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> Saving settings...
                </>
              ) : (
                <>
                  <Save size={14} /> Save advanced settings
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <QuizAnalyticsConsole quiz={quiz} course={course} questions={questions} moduleId={moduleId} />
      )}

      {/* Global overrides sheet — lesson quizzes only (module quizzes have no per-quiz settings). */}
      {!isModuleScope && (
      <Sheet open={isConfigPaneOpen} onOpenChange={setIsConfigPaneOpen}>
        <SheetContent className="w-[420px] bg-white border-l border-dash-border p-0 overflow-y-auto max-h-screen">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b border-dash-border">
              <div className="w-11 h-11 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent mb-3">
                <Sliders size={18} />
              </div>
              <SheetTitle className="font-display text-[17px] font-semibold tracking-[-0.01em] !text-dash-text">
                Global overrides
              </SheetTitle>
              <SheetDescription className="text-[11px] !text-dash-textMuted mt-0.5">
                Fine-grained behavior rules for this quiz.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 px-6 py-2">
              <PropertyGroup title="Grading">
                <SliderWithInput
                  label="Passing score threshold"
                  value={passingScore}
                  onChange={(val) => setPassingScore(Number(val))}
                  min={0}
                  max={100}
                  unit="%"
                  numeric
                />

                <SliderWithInput
                  label="Attempt limit (max retakes)"
                  value={maxRetakes}
                  onChange={(val) => setMaxRetakes(Number(val))}
                  min={-1}
                  max={20}
                  unit=""
                  numeric
                />
                <p className="text-[10px] !text-dash-textMuted -mt-2">-1 represents unlimited attempts.</p>

                <PropertySelect
                  label="Exceeded-threshold behavior"
                  value={exceededBehavior}
                  onChange={(val) => setExceededBehavior(val as any)}
                  options={[
                    { value: "lock", label: "Lock (instructor manual unlock)" },
                    { value: "remedial", label: "Trigger remedial lesson path" },
                  ]}
                />
              </PropertyGroup>

              <PropertyGroup title="Feedback & timing">
                <PropertySelect
                  label="Feedback execution trigger"
                  value={feedbackTrigger}
                  onChange={(val) => setFeedbackTrigger(val as any)}
                  options={[
                    { value: "immediate", label: "Immediate rationale" },
                    { value: "post-submission", label: "Post-submission details" },
                    { value: "hidden", label: "Exam mode (permanently hidden)" },
                  ]}
                />

                <SliderWithInput
                  label="Count-down timer"
                  value={timeLimit}
                  onChange={(val) => setTimeLimit(Number(val))}
                  min={0}
                  max={180}
                  unit=" min"
                  numeric
                />
                <p className="text-[10px] !text-dash-textMuted -mt-2">0 = no limit. Triggers a 5-minute warning before submission.</p>
              </PropertyGroup>

              <PropertyGroup title="Randomization">
                <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                  <div>
                    <span className="text-xs font-bold !text-dash-text block">Shuffle questions</span>
                    <span className="text-[10px] !text-dash-textMuted block mt-0.5">Randomize question order</span>
                  </div>
                  <Switch
                    checked={shuffleQuestions}
                    onCheckedChange={setShuffleQuestions}
                    className="shrink-0 data-[state=checked]:bg-dash-accent data-[state=unchecked]:bg-dash-border"
                  />
                </div>
                <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                  <div>
                    <span className="text-xs font-bold !text-dash-text block">Shuffle options</span>
                    <span className="text-[10px] !text-dash-textMuted block mt-0.5">Randomize option ordering</span>
                  </div>
                  <Switch
                    checked={shuffleOptions}
                    onCheckedChange={setShuffleOptions}
                    className="shrink-0 data-[state=checked]:bg-dash-accent data-[state=unchecked]:bg-dash-border"
                  />
                </div>

                <SliderWithInput
                  label="Question drawing pool"
                  value={poolCount}
                  onChange={(val) => setPoolCount(Number(val))}
                  min={0}
                  max={100}
                  unit=""
                  numeric
                />
                <p className="text-[10px] !text-dash-textMuted -mt-2">0 = draw all questions; otherwise draws a random subset.</p>
              </PropertyGroup>

              <PropertyGroup title="Progression" defaultOpen={true}>
                <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                  <div>
                    <span className="text-xs font-bold !text-dash-text block">Require pass to unlock next lesson</span>
                    <span className="text-[10px] !text-dash-textMuted block mt-0.5">Blocks progression unless passing grade is met</span>
                  </div>
                  <Switch
                    checked={requirePass}
                    onCheckedChange={setRequirePass}
                    className="shrink-0 data-[state=checked]:bg-dash-accent data-[state=unchecked]:bg-dash-border"
                  />
                </div>
              </PropertyGroup>
            </div>

            <div className="p-6 border-t border-dash-border bg-dash-surface grid grid-cols-2 gap-3 shrink-0">
              <button
                onClick={() => setIsConfigPaneOpen(false)}
                className="h-11 rounded-xl bg-white border border-dash-border !text-dash-text hover:bg-dash-border/60 text-xs font-bold transition-colors motion-reduce:transition-none"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSaveSettings();
                  setIsConfigPaneOpen(false);
                }}
                className="h-11 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold transition-colors motion-reduce:transition-none shadow-lg shadow-primary/20"
              >
                Save & apply
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      )}

      {/* Delete Question Confirmation Dialog */}
      <Dialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <DialogContent className="bg-white border border-dash-border !text-dash-text max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold !text-dash-text flex items-center gap-2">
              <AlertTriangle className="text-red" size={20} /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs !text-dash-textMuted mt-2">
              Are you sure you want to delete the question:
              <strong className="block !text-dash-text mt-1.5 italic font-normal text-sm bg-dash-surface p-3 rounded-xl border border-dash-border">
                "{questionToDelete?.question_text || "Untitled question"}"?
              </strong>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0 flex justify-end">
            <Button
              onClick={() => setQuestionToDelete(null)}
              className="bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 rounded-xl px-4 py-2.5 text-xs font-bold h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (questionToDelete) {
                  handleDeleteQuestion(questionToDelete.id);
                  setQuestionToDelete(null);
                }
              }}
              className="bg-red hover:bg-red/90 text-white rounded-xl px-4 py-2.5 text-xs font-bold h-11 transition-colors motion-reduce:transition-none"
            >
              Delete Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Questions Confirmation Dialog */}
      <Dialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <DialogContent className="bg-white border border-dash-border !text-dash-text max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold !text-dash-text flex items-center gap-2">
              <AlertTriangle className="text-red" size={20} /> Confirm Bulk Deletion
            </DialogTitle>
            <DialogDescription className="text-xs !text-dash-textMuted mt-2">
              Are you sure you want to delete the <strong className="!text-dash-text">{selectedQuestionIds.length}</strong> selected questions?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0 flex justify-end">
            <Button
              onClick={() => setIsBulkDeleteConfirmOpen(false)}
              className="bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 rounded-xl px-4 py-2.5 text-xs font-bold h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsBulkDeleteConfirmOpen(false);
                try {
                  // Real bug found and fixed during the premium redesign pass: this always
                  // hit the lesson-quiz delete endpoint regardless of scope — bulk-deleting
                  // questions from a module quiz would silently no-op (deleting nonexistent
                  // rows from the wrong table) rather than actually removing them.
                  const ids = selectedQuestionIds.join(',');
                  const base = isModuleScope ? '/api/lms/module-quiz/questions' : '/api/lms/quiz/questions';
                  const res = await fetch(`${base}?id=${ids}`, {
                    method: 'DELETE'
                  });
                  const resData = await res.json();
                  if (resData.error) toast.error(resData.error);
                  else {
                    toast.success(`${selectedQuestionIds.length} questions deleted.`);
                    setSelectedQuestionIds([]);
                    setIsBulkSelectMode(false);
                    loadQuestions();
                  }
                } catch {
                  toast.error("Failed to delete selected questions");
                }
              }}
              className="bg-red hover:bg-red/90 text-white rounded-xl px-4 py-2.5 text-xs font-bold h-11 transition-colors motion-reduce:transition-none"
            >
              Delete Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationModal
        isOpen={pendingLeave !== null}
        onClose={() => setPendingLeave(null)}
        onConfirm={() => {
          const go = pendingLeave;
          setPendingLeave(null);
          go?.();
        }}
        title="Discard unsaved changes?"
        description="You have changes in this quiz that haven't been saved. If you continue they will be lost."
        confirmText="Discard changes"
        cancelText="Keep editing"
        isDestructive
      />
    </div>
  );
}

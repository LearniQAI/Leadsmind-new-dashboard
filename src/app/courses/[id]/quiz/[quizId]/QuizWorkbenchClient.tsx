"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, HelpCircle, Loader2,
  Sparkles, AlertTriangle, Save,
  Sliders, Layout, Eye
} from "lucide-react";
import {
  generateExplanationWithLena
} from "@/app/actions/quizzes";
import Editor from "@monaco-editor/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QuizAnalyticsConsole from "./QuizAnalyticsConsole";
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

interface QuizWorkbenchClientProps {
  course: any;
  quiz: any;
  /** Module-Level Quiz pass — when set, this same Workbench authors a quiz scoped to an
   *  entire module (module_quiz_questions/module_quiz_settings, Step 1's schema decision)
   *  instead of the lesson `quiz.id` — the real question-authoring UI below is unchanged
   *  either way; only which API endpoints/payload keys get hit differs, isolated to the few
   *  call sites below rather than a second, parallel component (Step 2's explicit ask). */
  moduleId?: string;
}

export default function QuizWorkbenchClient({ course, quiz, moduleId }: QuizWorkbenchClientProps) {
  const isModuleScope = !!moduleId;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"questions" | "settings" | "analytics">("questions");

  // Quiz settings state
  const [quizTitle, setQuizTitle] = useState(quiz.title || "");
  const [quizDesc, setQuizDesc] = useState(quiz.description || "");
  const [passingScore, setPassingScore] = useState(quiz.passing_score ?? 80);
  const [timeLimit, setTimeLimit] = useState(quiz.time_limit_minutes ?? 0);
  const [maxRetakes, setMaxRetakes] = useState(quiz.max_retakes ?? -1);
  const [isRequired, setIsRequired] = useState(quiz.is_required ?? true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([{ left: "", right: "" }]);
  const [orderingItems, setOrderingItems] = useState<string[]>(["", ""]);
  const [blankText, setBlankText] = useState("JavaScript is a [blank] scripting language.");
  const [starterCode, setStarterCode] = useState("// Write starter challenge template here\n");
  const [codeAssertions, setCodeAssertions] = useState<{ input: string; expected: string }[]>([{ input: "", expected: "" }]);
  const [rubrics, setRubrics] = useState<{ criteria: string; max_points: number }[]>([{ criteria: "Correctness", max_points: 5 }]);
  
  // Explanation state
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadSettings();
  }, [quiz.id]);

  const loadSettings = async () => {
    try {
      const res = await fetch(
        isModuleScope
          ? `/api/lms/module-quiz/settings?moduleId=${moduleId}`
          : `/api/lms/quiz/settings?lessonId=${quiz.id}`
      );
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
    }
  };

  const loadQuestions = async () => {
    try {
      const res = await fetch(
        isModuleScope
          ? `/api/lms/module-quiz/questions?moduleId=${moduleId}`
          : `/api/lms/quiz/questions?lessonId=${quiz.id}`
      );
      const dataJson = await res.json();
      if (dataJson.data) {
        setQuestions(dataJson.data);
        if (dataJson.data.length > 0) {
          selectQuestion(dataJson.data[0]);
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
    } else if (q.question_type === "matching") {
      setMatchingPairs(meta.pairs || [{ left: "", right: "" }]);
    } else if (q.question_type === "ordering") {
      setOrderingItems(meta.items || ["", ""]);
    } else if (q.question_type === "fill_blank") {
      setBlankText(meta.text_with_blanks || "");
    } else if (q.question_type === "code") {
      setStarterCode(meta.starter_template || "");
      setCodeAssertions(meta.assertions || [{ input: "", expected: "" }]);
    } else if (q.question_type === "file_upload") {
      setRubrics(meta.rubric_criteria || [{ criteria: "Correctness", max_points: 5 }]);
    }
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
    setMatchingPairs([{ left: "", right: "" }]);
    setOrderingItems(["", ""]);
    setBlankText("Write sentence using [blank] placeholder.");
    setStarterCode("// Code challenge starter template\n");
    setCodeAssertions([{ input: "", expected: "" }]);
    setRubrics([{ criteria: "Completeness", max_points: 10 }]);
  };

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

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    const metadata: any = {};
    let correct_answer: any = {};

    if (type === "multiple_choice" || type === "true_false") {
      const hasCorrect = optionsList.some(o => o.is_correct);
      if (!hasCorrect) {
        toast.error("Please mark at least one answer as correct");
        return;
      }
    } else if (type === "short_answer") {
      const synList = synonyms.split(",").map(s => s.trim()).filter(Boolean);
      if (synList.length === 0) {
        toast.error("Short answer requires at least one synonym");
        return;
      }
      correct_answer.synonyms = synList;
      metadata.case_sensitive = caseSensitive;
    } else if (type === "matching") {
      metadata.pairs = matchingPairs.filter(p => p.left && p.right);
    } else if (type === "ordering") {
      metadata.items = orderingItems.filter(Boolean);
    } else if (type === "fill_in_blank") {
      if (!blankText.includes("[blank]")) {
        toast.error("Sentence must contain at least one '[blank]' placeholder");
        return;
      }
      metadata.text_with_blanks = blankText;
    } else if (type === "code_challenge") {
      metadata.starter_template = starterCode;
      metadata.assertions = codeAssertions.filter(a => a.input && a.expected);
    } else if (type === "file_upload") {
      metadata.rubric_criteria = rubrics;
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

    startTransition(async () => {
      try {
        const base = isModuleScope ? '/api/lms/module-quiz/questions' : '/api/lms/quiz/questions';
        const url = activeQuestion?.id ? `${base}?id=${activeQuestion.id}` : base;
        const method = activeQuestion?.id ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isModuleScope ? { module_id: moduleId } : { lesson_id: quiz.id }),
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
        } else {
          toast.success("Question saved successfully!");
          loadQuestions();
        }
      } catch {
        toast.error("Failed to save question");
      }
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

  const handleSaveSettings = async () => {
    if (!isModuleScope && !quizTitle.trim()) {
      toast.error("Quiz title is required");
      return;
    }
    setIsSavingSettings(true);
    try {
      // Module-Level Quiz pass: a module quiz has no title/description of its own (it's an
      // assessment FOR the module, shown as "{Module title} Quiz" everywhere rather than a
      // separately-named entity) — so, unlike the lesson-quiz path, there is no
      // course_lessons row to update here, and deliberately no equivalent of the legacy
      // upsertQuiz()/lms_quizzes write either (see below).
      if (!isModuleScope) {
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

      // Update settings (quiz_settings for a lesson quiz, module_quiz_settings for a module
      // quiz — same shape, different table per the Step 1 schema decision).
      const settingsRes = await fetch(isModuleScope ? '/api/lms/module-quiz/settings' : '/api/lms/quiz/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isModuleScope ? { module_id: moduleId } : { lesson_id: quiz.id }),
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

      toast.success("Quiz settings saved successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleGenerateAiQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isModuleScope ? { module_id: moduleId } : { lesson_id: quiz.id }),
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
            onClick={() => router.push(`/courses/${course.id}`)}
            className="w-10 h-10 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:bg-dash-border/60 hover:!text-dash-text transition-all motion-reduce:transition-none active:scale-95 shrink-0"
            title="Back to course builder"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] font-bold text-dash-accent uppercase tracking-wide">Quiz editor</span>
            <h1 className="font-display text-2xl font-bold !text-dash-text mt-0.5 tracking-tight">
              {isModuleScope ? (quiz.title ? `${quiz.title} Quiz` : "Module Quiz") : (quizTitle || "Untitled quiz")}
            </h1>
          </div>
        </div>

        {/* Tabs switcher — same premium segmented-pill pattern established across the
            settings-panel/curriculum redesign work: bg-dash-surface track, active tab a real
            white card with a shadow, not a flat accent fill. */}
        <div className="flex items-center bg-dash-surface border border-dash-border rounded-xl p-1 shrink-0 gap-0.5">
          {([
            { id: "questions", label: `Questions (${questions.length})`, icon: Layout },
            { id: "settings", label: "Advanced settings", icon: Sliders },
            { id: "analytics", label: "Analytics & attempts", icon: Eye },
          ] as const).map(({ id, label, icon: Icon }) => (
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
        </div>
      </div>

      {/* Main Body */}
      {activeTab === "questions" ? (
        /* Questions Composer Panel */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          
          {/* Question List Sidebar */}
          <div className="bg-white border border-dash-border p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-dash-border pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">Question list</span>
              <div className="flex items-center gap-3">
                {questions.length > 0 && (
                  <button
                    onClick={() => {
                      setIsBulkSelectMode(!isBulkSelectMode);
                      setSelectedQuestionIds([]);
                    }}
                    className="text-[10.5px] font-semibold !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
                  >
                    {isBulkSelectMode ? "Cancel" : "Select"}
                  </button>
                )}
                <button
                  onClick={handleNewQuestion}
                  className="text-[10.5px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-0.5 transition-colors motion-reduce:transition-none"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {isBulkSelectMode && questions.length > 0 && (
              <div className="flex items-center justify-between bg-dash-surface border border-dash-border p-2 rounded-xl text-[10.5px]">
                <label className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:!text-dash-text select-none font-medium">
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
                    className="accent-dash-accent h-3.5 w-3.5 rounded"
                  />
                  Select all ({questions.length})
                </label>
                {selectedQuestionIds.length > 0 && (
                  <button
                    onClick={() => setIsBulkDeleteConfirmOpen(true)}
                    className="text-red-600 hover:text-red-700 font-bold text-[9px] bg-red-100 border border-red-200 px-2 py-1 rounded-lg"
                  >
                    Delete ({selectedQuestionIds.length})
                  </button>
                )}
              </div>
            )}

            {/* Three Deferred Items, Item 2 — /api/ai/generate-questions now accepts module_id
                too (combined content of every lesson in the module as its real context), so
                this button is real for both scopes. Sky-blue LENA/AI treatment, matching the
                established brand pattern for AI actions elsewhere (ModuleCreatorModal's
                "Generate with LENA" card) — not an arbitrary new lavender tone. */}
            <button
              type="button"
              onClick={handleGenerateAiQuestions}
              disabled={isGeneratingQuestions}
              className="w-full h-10 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors motion-reduce:transition-none disabled:opacity-50"
            >
              {isGeneratingQuestions ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Sparkles size={13} />}
              Generate with AI
            </button>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const typeLabel = QUESTION_TYPE_LABELS[q.question_type] || q.question_type;
                return (
                <div
                  key={q.id}
                  onClick={() => {
                    if (isBulkSelectMode) {
                      if (selectedQuestionIds.includes(q.id)) {
                        setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== q.id));
                      } else {
                        setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                      }
                    } else {
                      selectQuestion(q);
                    }
                  }}
                  className={`p-3.5 rounded-xl text-xs cursor-pointer select-none border transition-all motion-reduce:transition-none space-y-2 ${
                    !isBulkSelectMode && activeQuestion?.id === q.id
                      ? "bg-dash-accent/10 border-dash-accent !text-dash-text"
                      : isBulkSelectMode && selectedQuestionIds.includes(q.id)
                        ? "bg-dash-accent/10 border-dash-accent !text-dash-text"
                        : "bg-dash-surface border-transparent !text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate flex-1">
                      {isBulkSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(q.id)}
                          onChange={() => {}} // toggled on container div click
                          className="accent-dash-accent h-3.5 w-3.5 rounded shrink-0"
                        />
                      )}
                      <span className="truncate pr-2 font-semibold">Q{idx + 1}: {q.question_text || "Untitled question"}</span>
                    </div>
                    {!isBulkSelectMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuestionToDelete(q);
                        }}
                        className="text-dash-textMuted hover:text-red hover:bg-red/10 p-1 rounded-md shrink-0 transition-colors motion-reduce:transition-none"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white border border-dash-border !text-dash-textMuted">
                      {typeLabel}
                    </span>
                    <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white border border-dash-border !text-dash-textMuted">
                      {q.points ?? 1} pt{(q.points ?? 1) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                );
              })}
              {questions.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-8 bg-dash-surface rounded-xl border border-dash-border">
                  <div className="w-10 h-10 rounded-full bg-white border border-dash-border flex items-center justify-center mb-2.5">
                    <HelpCircle size={16} className="!text-dash-textMuted" />
                  </div>
                  <p className="text-[11.5px] font-semibold !text-dash-text">No questions yet</p>
                  <p className="text-[10.5px] !text-dash-textMuted mt-0.5 max-w-[180px]">
                    Add one manually or generate a set with AI.
                  </p>
                </div>
              )}
            </div>
          </div>

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
              <label className="text-[10px] font-bold !text-dash-textMuted block">Question title / prompt</label>
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
              <span className="text-[10.5px] font-bold uppercase tracking-wide !text-dash-textMuted block">Answer configuration</span>

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
              {type === "fill_in_blank" && (
                <div className="space-y-3">
                  <label className="text-[10px] !text-dash-textMuted block">Sentence with [blank] spots:</label>
                  <textarea
                    value={blankText}
                    onChange={(e) => setBlankText(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text"
                  />
                </div>
              )}

              {/* Code Challenge */}
              {type === "code_challenge" && (
                <div className="space-y-3">
                  <textarea
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    rows={4}
                    placeholder="// Starter challenge code..."
                    className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text font-mono"
                  />
                  <span className="text-[10px] !text-dash-textMuted block font-bold">Assertions test suite</span>
                  {codeAssertions.map((assert, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={assert.input}
                        onChange={(e) => {
                          const updated = [...codeAssertions];
                          updated[idx].input = e.target.value;
                          setCodeAssertions(updated);
                        }}
                        placeholder="Inputs parameter"
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text font-mono"
                      />
                      <input 
                        type="text"
                        value={assert.expected}
                        onChange={(e) => {
                          const updated = [...codeAssertions];
                          updated[idx].expected = e.target.value;
                          setCodeAssertions(updated);
                        }}
                        placeholder="Expected outcome"
                        className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1.5 text-xs !text-dash-text font-mono"
                      />
                      <button onClick={() => setCodeAssertions(codeAssertions.filter((_, i) => i !== idx))} className="text-red shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <Button onClick={() => setCodeAssertions([...codeAssertions, { input: "", expected: "" }])} className="h-9 bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-[10.5px] font-bold transition-colors motion-reduce:transition-none">+ Add Assertion</Button>
                </div>
              )}

              {/* File Upload Rubrics */}
              {type === "file_upload" && (
                <div className="space-y-3">
                  <span className="text-[10px] !text-dash-textMuted block font-bold">Grading criteria rubric:</span>
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
                <label className="text-[10px] font-bold !text-dash-textMuted block">Pedagogical Explanation</label>
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
        <div className="bg-white border border-dash-border rounded-2xl p-6 max-w-2xl mx-auto space-y-1 shadow-sm">
          <div className="flex items-center justify-between border-b border-dash-border pb-4 mb-2">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wide !text-dash-textMuted">Configuration</span>
              <h3 className="font-display text-lg font-bold !text-dash-text mt-0.5">Advanced settings</h3>
            </div>
            <button
              onClick={() => setIsConfigPaneOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-dash-surface hover:bg-dash-border/60 !text-dash-text text-[10.5px] font-bold border border-dash-border flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
            >
              <Sliders size={12} className="text-dash-accent" /> Global overrides
            </button>
          </div>

          {/* Module-Level Quiz pass: a module quiz has no title/description of its own
              (see handleSaveSettings) — shown as a read-only label instead of an editable
              field a save would silently discard. */}
          <PropertyGroup title="Identity">
            {isModuleScope ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Quiz title</label>
                <div className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text">
                  {quiz.title ? `${quiz.title} Quiz` : "Module Quiz"}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold !text-dash-textMuted block">Quiz title</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold !text-dash-textMuted block">Description (optional)</label>
                  <textarea
                    value={quizDesc}
                    onChange={(e) => setQuizDesc(e.target.value)}
                    rows={3}
                    placeholder="Provide additional guidelines for this quiz..."
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none leading-relaxed"
                  />
                </div>
              </>
            )}
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

              <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                <div>
                  <span className="text-xs font-bold !text-dash-text block">Required for completion</span>
                  <span className="text-[10px] !text-dash-textMuted block mt-0.5">Students must pass to continue</span>
                </div>
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                  className="data-[state=checked]:bg-dash-accent"
                />
              </div>
            </div>
            <p className="text-[10px] !text-dash-textMuted -mt-1">Max retakes: -1 = unlimited. Time limit: 0 = no limit.</p>
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

      {/* Global Overrides configurations Sheet overlay */}
      <Sheet open={isConfigPaneOpen} onOpenChange={setIsConfigPaneOpen}>
        <SheetContent className="w-[420px] bg-white border-l border-dash-border p-0 overflow-y-auto max-h-screen">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b border-dash-border">
              <div className="w-11 h-11 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent mb-3">
                <Sliders size={18} />
              </div>
              <SheetTitle className="font-display text-lg font-bold !text-dash-text">
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
                    className="data-[state=checked]:bg-dash-accent"
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
                    className="data-[state=checked]:bg-dash-accent"
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
                    className="data-[state=checked]:bg-dash-accent"
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
    </div>
  );
}

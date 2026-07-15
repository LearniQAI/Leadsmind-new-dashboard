"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, Trash2, HelpCircle, Loader2, 
  Sparkles, CheckSquare, Settings, AlertTriangle, Save,
  Sliders, Layout, Eye
} from "lucide-react";
import { 
  getQuizQuestions, upsertQuestion, deleteQuestion, 
  generateExplanationWithLena, upsertQuiz 
} from "@/app/actions/quizzes";
import Editor from "@monaco-editor/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QuizAnalyticsConsole from "./QuizAnalyticsConsole";

interface QuizWorkbenchClientProps {
  course: any;
  quiz: any;
}

export default function QuizWorkbenchClient({ course, quiz }: QuizWorkbenchClientProps) {
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
    }
  };

  const loadQuestions = async () => {
    try {
      const res = await fetch(`/api/lms/quiz/questions?lessonId=${quiz.id}`);
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
        const url = activeQuestion?.id ? `/api/lms/quiz/questions?id=${activeQuestion.id}` : '/api/lms/quiz/questions';
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
      const res = await fetch(`/api/lms/quiz/questions?id=${qId}`, {
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
    if (!quizTitle.trim()) {
      toast.error("Quiz title is required");
      return;
    }
    setIsSavingSettings(true);
    try {
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

      // 2. Update/insert lms_quizzes using the upsertQuiz server action
      const upsertRes = await upsertQuiz({
        id: quiz.id,
        course_id: course.id,
        module_id: quiz.module_id,
        title: quizTitle,
        description: quizDesc,
        passing_score: passingScore,
        time_limit_minutes: timeLimit,
        max_retakes: maxRetakes,
        is_required: isRequired,
        settings: {
          exceeded_behavior: exceededBehavior,
          feedback_trigger: feedbackTrigger,
          shuffle_options: shuffleOptions,
          shuffle_questions: shuffleQuestions,
          pool_count: poolCount,
          require_pass_to_unlock: requirePass
        }
      });
      if (upsertRes.error) throw new Error(upsertRes.error);

      // 3. Update quiz_settings via POST
      const settingsRes = await fetch('/api/lms/quiz/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: quiz.id,
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
          lesson_id: quiz.id,
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-dash-accent">Quiz editor</span>
            </div>
            <h1 className="text-xl font-bold !text-dash-text mt-1">
              {quizTitle || "Untitled quiz"}
            </h1>
          </div>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center bg-dash-surface border border-dash-border rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all motion-reduce:transition-none flex items-center gap-1.5 ${
              activeTab === "questions"
                ? "bg-dash-accent text-white"
                : "!text-dash-textMuted hover:!text-dash-text"
            }`}
          >
            <Layout size={12} /> Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all motion-reduce:transition-none flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-dash-accent text-white"
                : "!text-dash-textMuted hover:!text-dash-text"
            }`}
          >
            <Sliders size={12} /> Advanced settings
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all motion-reduce:transition-none flex items-center gap-1.5 ${
              activeTab === "analytics"
                ? "bg-dash-accent text-white"
                : "!text-dash-textMuted hover:!text-dash-text"
            }`}
          >
            <Eye size={12} /> Analytics & attempts
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === "questions" ? (
        /* Questions Composer Panel */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          
          {/* Question List Sidebar */}
          <div className="bg-white border border-dash-border p-4 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-dash-border pb-2">
              <span className="text-[10px] font-bold !text-dash-text">Question list</span>
              <div className="flex items-center gap-3">
                {questions.length > 0 && (
                  <button
                    onClick={() => {
                      setIsBulkSelectMode(!isBulkSelectMode);
                      setSelectedQuestionIds([]);
                    }}
                    className="text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text"
                  >
                    {isBulkSelectMode ? "Cancel" : "Select"}
                  </button>
                )}
                <button
                  onClick={handleNewQuestion}
                  className="text-[10px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-0.5"
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

            <button
              type="button"
              onClick={handleGenerateAiQuestions}
              disabled={isGeneratingQuestions}
              className="w-full bg-dash-accent/10 border border-dash-accent/20 hover:bg-dash-accent/20 text-dash-accent rounded-xl py-2 px-3 text-[10px] font-bold flex items-center justify-center gap-1 transition-all motion-reduce:transition-none disabled:opacity-50"
            >
              {isGeneratingQuestions ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <Sparkles size={12} />}
              Generate with AI
            </button>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
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
                  className={`p-3.5 rounded-xl text-xs cursor-pointer select-none border transition-all motion-reduce:transition-none flex items-center justify-between gap-3 ${
                    !isBulkSelectMode && activeQuestion?.id === q.id
                      ? "bg-dash-accent/10 border-dash-accent !text-dash-text"
                      : isBulkSelectMode && selectedQuestionIds.includes(q.id)
                        ? "bg-dash-accent/10 border-dash-accent !text-dash-text"
                        : "bg-dash-surface border-transparent !text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    {isBulkSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={() => {}} // toggled on container div click
                        className="accent-dash-accent h-3.5 w-3.5 rounded shrink-0"
                      />
                    )}
                    <span className="truncate pr-2 font-medium">Q{idx + 1}: {q.question_text || "Untitled question"}</span>
                  </div>
                  {!isBulkSelectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuestionToDelete(q);
                      }}
                      className="text-red-600 hover:text-red-700 p-0.5 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {questions.length === 0 && (
                <span className="text-[10.5px] italic !text-dash-textMuted block text-center py-6 bg-dash-surface rounded-xl border border-dashed border-dash-border">
                  No questions created yet.
                </span>
              )}
            </div>
          </div>

          {/* Editor Workbench */}
          <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold !text-dash-textMuted block">Question type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text focus:border-dash-accent outline-none"
                >
                  <option value="multiple_choice">Multiple choice (MCQ)</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short answer</option>
                  <option value="matching">Matching pairs</option>
                  <option value="ordering">Ordering lists</option>
                  <option value="fill_in_blank">Fill in the blank</option>
                  <option value="code_challenge">Code challenge</option>
                  <option value="file_upload">File upload rubric</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold !text-dash-textMuted block">Points value</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text outline-none"
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold !text-dash-textMuted block">Question title / prompt</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={2}
                placeholder="e.g. Which keyword is used to define block-scoped variables in JS?"
                className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text placeholder:!text-dash-textMuted/60 outline-none focus:border-dash-accent"
              />
            </div>

            {/* Dynamic Options Render Block */}
            <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-4">
              <span className="text-[10px] font-bold text-dash-accent block">Answer configuration</span>

              {/* MCQ / TrueFalse */}
              {(type === "multiple_choice" || type === "true_false") && (
                <div className="space-y-3">
                  {optionsList.map((opt, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                        opt.is_correct 
                          ? "bg-green/10 border-green/30 text-green"
                          : "bg-dash-surface border-dash-border !text-dash-textMuted"
                      }`}
                    >
                      <input 
                        type={type === "true_false" ? "radio" : "checkbox"}
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = optionsList.map((o, i) => ({
                            ...o,
                            is_correct: type === "true_false" ? i === idx : (i === idx ? !o.is_correct : o.is_correct)
                          }));
                          setOptionsList(updated);
                        }}
                        className="h-4 w-4 accent-emerald-500"
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
                        className="flex-1 bg-transparent border-none outline-none text-xs !text-dash-text"
                      />
                      <span className="text-[9px] font-mono shrink-0">
                        {opt.is_correct ? "✓ Correct" : "Incorrect"}
                      </span>
                      {type === "multiple_choice" && (
                        <button
                          onClick={() => setOptionsList(optionsList.filter((_, i) => i !== idx))}
                          className="text-red hover:text-red/80 p-0.5 shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {type === "multiple_choice" && (
                    <Button
                      onClick={() => setOptionsList([...optionsList, { text: `New Option`, is_correct: false }])}
                      className="h-8 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text rounded-lg text-[10px] font-bold"
                    >
                      + Add Option Choice
                    </Button>
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
                  <Button onClick={() => setMatchingPairs([...matchingPairs, { left: "", right: "" }])} className="h-8 bg-dash-surface !text-dash-text rounded-lg text-[10px] font-bold">+ Add Pair</Button>
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
                  <Button onClick={() => setOrderingItems([...orderingItems, ""])} className="h-8 bg-dash-surface !text-dash-text rounded-lg text-[10px] font-bold">+ Add Item</Button>
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
                  <Button onClick={() => setCodeAssertions([...codeAssertions, { input: "", expected: "" }])} className="h-8 bg-dash-surface !text-dash-text rounded-lg text-[10px] font-bold">+ Add Assertion</Button>
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
                  <Button onClick={() => setRubrics([...rubrics, { criteria: "", max_points: 5 }])} className="h-8 bg-dash-surface !text-dash-text rounded-lg text-[10px] font-bold">+ Add Rubric Item</Button>
                </div>
              )}
            </div>

            {/* Explanation Block with LENA */}
            <div className="space-y-2 border-t border-dash-border pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold !text-dash-textMuted block">Pedagogical Explanation</label>
                <button
                  type="button"
                  onClick={handleLenaGenerate}
                  disabled={isGenerating}
                  className="text-[10px] font-bold text-primary flex items-center gap-1 hover:opacity-80 transition-all motion-reduce:transition-none disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> Customising Context...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> Generate explanation with LENA
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="Pedagogical rationale displayed to student after answering..."
                className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono leading-relaxed"
              />
            </div>

            {/* Action button */}
            <div className="flex items-center justify-end gap-3 border-t border-dash-border pt-4 shrink-0">
              <Button
                onClick={handleSaveQuestion}
                disabled={isPending}
                className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold px-6 shadow-lg shadow-primary/20 transition-colors motion-reduce:transition-none"
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
        /* Advanced Settings Panel */
        <div className="bg-white border border-dash-border rounded-2xl p-6 max-w-2xl mx-auto space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-dash-border pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="text-primary" size={18} />
              <h3 className="text-sm font-bold !text-dash-text">Advanced Configuration Settings</h3>
            </div>
            <Button
              onClick={() => setIsConfigPaneOpen(true)}
              className="bg-dash-surface hover:bg-dash-border/60 !text-dash-text rounded-lg text-[9px] font-bold h-8 px-3 border border-dash-border flex items-center gap-1 transition-colors motion-reduce:transition-none"
            >
              <Sliders size={12} className="text-primary" /> Global Overrides Pane
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold !text-dash-textMuted block">Quiz Title</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary transition-all motion-reduce:transition-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold !text-dash-textMuted block">Description (Optional)</label>
              <textarea
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                rows={3}
                placeholder="Provide additional guidelines for this quiz..."
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary transition-all motion-reduce:transition-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Passing Score (%)</label>
                <input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value) || 80)}
                  min={0}
                  max={100}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Time Limit (Minutes)</label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                  min={0}
                  placeholder="0 = No limit"
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Max Retakes</label>
                <input
                  type="number"
                  value={maxRetakes}
                  onChange={(e) => setMaxRetakes(parseInt(e.target.value) || -1)}
                  min={-1}
                  placeholder="-1 = Unlimited"
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4 mt-2">
                <div>
                  <span className="text-xs font-bold !text-dash-text block">Required for Course Completion</span>
                  <span className="text-[10px] !text-dash-textMuted block mt-0.5">Students must pass this quiz to continue</span>
                </div>
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-dash-border pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> Saving Settings...
                </>
              ) : (
                <>
                  <Save size={14} /> Save Advanced Settings
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <QuizAnalyticsConsole quiz={quiz} course={course} questions={questions} />
      )}

      {/* Global Overrides configurations Sheet overlay */}
      <Sheet open={isConfigPaneOpen} onOpenChange={setIsConfigPaneOpen}>
        <SheetContent className="w-[400px] bg-white border-l border-dash-border p-0 overflow-y-auto max-h-screen">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-8 border-b border-dash-border bg-dash-surface">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Sliders size={20} />
              </div>
              <SheetTitle className="text-[20px] font-bold !text-dash-text">
                Global <span className="text-primary">Overrides</span>
              </SheetTitle>
              <SheetDescription className="text-[10px] !text-dash-textMuted font-mono mt-1">
                LMS Engine Behavioral Rules
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 p-8 space-y-6">
              {/* Pass grade threshold slider percentage */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold !text-dash-textMuted block">Passing Score Threshold</label>
                  <span className="text-xs font-mono font-bold text-primary">{passingScore}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-dash-surface rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Attempt limits selector numeric counters */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Attempt Limits (Max Retakes)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMaxRetakes(Math.max(-1, maxRetakes - 1))}
                    className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:bg-dash-border/60 hover:!text-dash-text"
                  >
                    -
                  </button>
                  <span className="text-xs font-mono font-bold !text-dash-text min-w-[40px] text-center">
                    {maxRetakes === -1 ? "∞" : maxRetakes}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaxRetakes(maxRetakes === -1 ? 1 : maxRetakes + 1)}
                    className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:bg-dash-border/60 hover:!text-dash-text"
                  >
                    +
                  </button>
                </div>
                <span className="text-[9px] !text-dash-textMuted block mt-1">-1 represents unlimited attempts.</span>
              </div>

              {/* Exceeded threshold event behaviors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Exceeded Threshold Behavior</label>
                <select
                  value={exceededBehavior}
                  onChange={(e) => setExceededBehavior(e.target.value as any)}
                  className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text outline-none focus:border-primary"
                >
                  <option value="lock">Lock (Require instructor manual unlock)</option>
                  <option value="remedial">Trigger Remedial Lesson Path</option>
                </select>
              </div>

              {/* Feedback execution triggers */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Feedback Execution Trigger</label>
                <select
                  value={feedbackTrigger}
                  onChange={(e) => setFeedbackTrigger(e.target.value as any)}
                  className="w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text outline-none focus:border-primary"
                >
                  <option value="immediate">Immediate Rationale</option>
                  <option value="post-submission">Post-submission Details</option>
                  <option value="hidden">Exam Mode (Permanently Hidden)</option>
                </select>
              </div>

              {/* Shuffle toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                  <div>
                    <span className="text-xs font-bold !text-dash-text block">Shuffle Questions</span>
                    <span className="text-[10px] !text-dash-textMuted block mt-0.5">Randomize question order</span>
                  </div>
                  <Switch
                    checked={shuffleQuestions}
                    onCheckedChange={setShuffleQuestions}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                  <div>
                    <span className="text-xs font-bold !text-dash-text block">Shuffle Options</span>
                    <span className="text-[10px] !text-dash-textMuted block mt-0.5">Randomize option ordering</span>
                  </div>
                  <Switch
                    checked={shuffleOptions}
                    onCheckedChange={setShuffleOptions}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              {/* Question Pool Drawing counts */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Question Drawing Pool Count</label>
                <input
                  type="number"
                  value={poolCount}
                  onChange={(e) => setPoolCount(parseInt(e.target.value) || 0)}
                  min={0}
                  placeholder="0 = Draw all questions"
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary"
                />
                <span className="text-[9px] !text-dash-textMuted block mt-1">If non-zero, draws a random subset of questions.</span>
              </div>

              {/* Count-down timers */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block">Count-down Timer (Minutes)</label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                  min={0}
                  placeholder="0 = No limit"
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary"
                />
                <span className="text-[9px] !text-dash-textMuted block mt-1">Triggers a flashing 5-minute warning prompt before submission.</span>
              </div>

              {/* Require pass to unlock next lesson */}
              <div className="flex items-center justify-between bg-dash-surface border border-dash-border rounded-xl p-4">
                <div>
                  <span className="text-xs font-bold !text-dash-text block">Require Pass to Unlock Next Lesson</span>
                  <span className="text-[10px] !text-dash-textMuted block mt-0.5">Blocks progression unless passing grade is met</span>
                </div>
                <Switch
                  checked={requirePass}
                  onCheckedChange={setRequirePass}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            <div className="p-8 border-t border-dash-border bg-dash-surface grid grid-cols-2 gap-4 shrink-0">
              <button
                onClick={() => setIsConfigPaneOpen(false)}
                className="h-11 rounded-xl bg-white border border-dash-border !text-dash-text hover:bg-dash-border/60 text-xs font-bold transition-all motion-reduce:transition-none"
              >
                Close Overrides
              </button>
              <button
                onClick={() => {
                  handleSaveSettings();
                  setIsConfigPaneOpen(false);
                }}
                className="h-11 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold transition-all motion-reduce:transition-none shadow-lg shadow-primary/20"
              >
                Save & Apply
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
                  const ids = selectedQuestionIds.join(',');
                  const res = await fetch(`/api/lms/quiz/questions?id=${ids}`, {
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

"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Plus, Trash2, HelpCircle, Loader2, 
  Sparkles, CheckSquare, Settings, AlertTriangle, Play 
} from "lucide-react";
import { 
  getQuizQuestions, upsertQuestion, deleteQuestion, 
  generateExplanationWithLena, upsertQuiz 
} from "@/app/actions/quizzes";

interface QuizBuilderProps {
  quizId: string;
}

export default function QuizBuilder({ quizId }: QuizBuilderProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  
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

  useEffect(() => {
    loadQuestions();
  }, [quizId]);

  const loadQuestions = async () => {
    const res = await getQuizQuestions(quizId);
    if (res.data) {
      setQuestions(res.data);
      if (res.data.length > 0) {
        selectQuestion(res.data[0]);
      } else {
        handleNewQuestion();
      }
    }
  };

  const selectQuestion = (q: any) => {
    setActiveQuestion(q);
    setType(q.type);
    setQuestionText(q.question_text);
    setPoints(q.points || 1);
    setPosition(q.position || 0);
    setExplanation(q.explanation || "");

    // Deconstruct metadata/options
    const meta = q.metadata || {};
    const correct = q.correct_answer || {};

    if (q.type === "multiple_choice" || q.type === "true_false") {
      setOptionsList(q.options || []);
    } else if (q.type === "short_answer") {
      setSynonyms((correct.synonyms || []).join(", "));
      setCaseSensitive(meta.case_sensitive || false);
    } else if (q.type === "matching") {
      setMatchingPairs(meta.pairs || [{ left: "", right: "" }]);
    } else if (q.type === "ordering") {
      setOrderingItems(meta.items || ["", ""]);
    } else if (q.type === "fill_in_blank") {
      setBlankText(meta.text_with_blanks || "");
    } else if (q.type === "code_challenge") {
      setStarterCode(meta.starter_template || "");
      setCodeAssertions(meta.assertions || [{ input: "", expected: "" }]);
    } else if (q.type === "file_upload") {
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
      // Validate at least one correct answer
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

    startTransition(async () => {
      const res = await upsertQuestion({
        id: activeQuestion?.id,
        quiz_id: quizId,
        type,
        question_text: questionText,
        points,
        options: type === "multiple_choice" || type === "true_false" ? optionsList : null,
        correct_answer,
        metadata,
        explanation,
        position
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Question saved successfully!");
        loadQuestions();
      }
    });
  };

  const handleDelete = async (qId: string) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      const res = await deleteQuestion(qId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Question deleted.");
        loadQuestions();
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 items-start">
      {/* Question Sidebar */}
      <div className="bg-white border border-dash-border shadow-sm p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-dash-border pb-2">
          <span className="text-xs font-bold !text-dash-text">Question list</span>
          <button
            onClick={handleNewQuestion}
            className="text-xs font-bold text-dash-accent hover:opacity-80 flex items-center gap-0.5 transition-opacity motion-reduce:transition-none"
          >
            <Plus size={12} /> Add
          </button>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              onClick={() => selectQuestion(q)}
              className={`p-3 rounded-lg text-xs cursor-pointer select-none border transition-all motion-reduce:transition-none flex items-center justify-between ${
                activeQuestion?.id === q.id
                  ? "bg-dash-accent/10 border-dash-accent !text-dash-text"
                  : "bg-dash-surface border-transparent !text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text"
              }`}
            >
              <span className="truncate pr-2 font-medium">Q{idx + 1}: {q.question_text}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(q.id);
                }}
                className="text-red-600 hover:text-red-700 p-0.5 shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {questions.length === 0 && (
            <span className="text-xs italic !text-dash-textMuted block text-center py-4">No questions created yet.</span>
          )}
        </div>
      </div>

      {/* Editor Workbench */}
      <div className="bg-white border border-dash-border shadow-sm rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Question type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text focus:border-dash-accent outline-none"
            >
              <option value="multiple_choice">Multiple Choice (MCQ)</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer</option>
              <option value="matching">Matching Pairs</option>
              <option value="ordering">Ordering Lists</option>
              <option value="fill_in_blank">Fill-in-the-blank</option>
              <option value="code_challenge">Code Challenge</option>
              <option value="file_upload">File Upload Rubric</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Points value</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
              className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent"
            />
          </div>
        </div>

        {/* Question Text */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Question title / prompt</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={2}
            placeholder="e.g. Which keyword is used to define block-scoped variables in JS?"
            className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-dash-accent"
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
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all motion-reduce:transition-none duration-300 ${
                    opt.is_correct
                      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                      : "bg-white border-dash-border !text-dash-textMuted"
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
                    className="h-4 w-4 accent-emerald-600"
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
                  <span className="text-[9px] shrink-0">
                    {opt.is_correct ? "Correct" : "Incorrect"}
                  </span>
                  {type === "multiple_choice" && (
                    <button
                      onClick={() => setOptionsList(optionsList.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 p-0.5 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {type === "multiple_choice" && (
                <Button
                  onClick={() => setOptionsList([...optionsList, { text: `New Option`, is_correct: false }])}
                  className="h-8 bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg text-xs font-bold"
                >
                  + Add option choice
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
                className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  id="case_sens"
                  className="accent-dash-accent"
                />
                <label htmlFor="case_sens" className="text-xs !text-dash-textMuted">Case-sensitive matches</label>
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
                    placeholder="Left item"
                    className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1 text-xs !text-dash-text"
                  />
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      const updated = [...matchingPairs];
                      updated[idx].right = e.target.value;
                      setMatchingPairs(updated);
                    }}
                    placeholder="Right item match"
                    className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1 text-xs !text-dash-text"
                  />
                  <button onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))} className="text-red-600 shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}
              <Button onClick={() => setMatchingPairs([...matchingPairs, { left: "", right: "" }])} className="h-8 bg-white border border-dash-border !text-dash-text rounded-lg text-xs font-bold">+ Add pair</Button>
            </div>
          )}

          {/* Ordering */}
          {type === "ordering" && (
            <div className="space-y-3">
              {orderingItems.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-[10px] !text-dash-textMuted py-1 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...orderingItems];
                      updated[idx] = e.target.value;
                      setOrderingItems(updated);
                    }}
                    placeholder="Sequence item"
                    className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1 text-xs !text-dash-text"
                  />
                  <button onClick={() => setOrderingItems(orderingItems.filter((_, i) => i !== idx))} className="text-red-600 shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}
              <Button onClick={() => setOrderingItems([...orderingItems, ""])} className="h-8 bg-white border border-dash-border !text-dash-text rounded-lg text-xs font-bold">+ Add item</Button>
            </div>
          )}

          {/* Fill-in-the-blank */}
          {type === "fill_in_blank" && (
            <div className="space-y-3">
              <label className="text-xs !text-dash-textMuted block">Sentence with [blank] spots:</label>
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
                rows={3}
                placeholder="// Starter challenge code..."
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-white/50 block font-bold">Assertions test suite</span>
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
                    className="flex-1 bg-[#111d47] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
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
                    className="flex-1 bg-[#111d47] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                  <button onClick={() => setCodeAssertions(codeAssertions.filter((_, i) => i !== idx))} className="text-red-400 shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}
              <Button onClick={() => setCodeAssertions([...codeAssertions, { input: "", expected: "" }])} className="h-8 bg-white/5 text-white rounded-lg text-[10px] font-bold">+ Add Assertion</Button>
            </div>
          )}

          {/* File Upload Rubrics */}
          {type === "file_upload" && (
            <div className="space-y-3">
              <span className="text-[10px] text-white/50 block font-bold">Grading criteria rubric:</span>
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
                    className="flex-1 bg-[#111d47] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
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
                    className="w-24 bg-[#111d47] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                  />
                  <button onClick={() => setRubrics(rubrics.filter((_, i) => i !== idx))} className="text-red-400 shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}
              <Button onClick={() => setRubrics([...rubrics, { criteria: "", max_points: 5 }])} className="h-8 bg-white/5 text-white rounded-lg text-[10px] font-bold">+ Add Rubric Item</Button>
            </div>
          )}
        </div>

        {/* Explanation Block with LENA */}
        <div className="space-y-2 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Pedagogical Explanation</label>
            <button
              type="button"
              onClick={handleLenaGenerate}
              disabled={isGenerating}
              className="text-[10px] font-bold text-primary flex items-center gap-1 hover:text-primary-light transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Customising Context...
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
            className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary font-mono leading-relaxed"
          />
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 shrink-0">
          <Button
            onClick={handleSaveQuestion}
            disabled={isPending}
            className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black px-6 shadow-lg shadow-primary/20"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" /> Saving...
              </>
            ) : (
              "Save Question Node"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

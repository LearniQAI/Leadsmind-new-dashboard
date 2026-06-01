"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  CheckCircle, AlertCircle, RefreshCw, ArrowRight, 
  ShieldCheck, Sparkles, Clock, AlertTriangle, Eye, ShieldAlert 
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { getQuizQuestions } from "@/app/actions/quizzes";

interface QuizPlayerProps {
  lesson: any;
  onComplete: () => Promise<void>;
  isCompleting: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const evaluateQuestion = (q: any, ansVal: any): boolean => {
  if (!q) return false;
  const meta = q.metadata || {};
  const correctAns = q.correct_answer || {};

  if (q.type === "multiple_choice") {
    const selected = Array.isArray(ansVal) ? ansVal : [];
    const correctIndices = (q.options || [])
      .map((o: any, idx: number) => o.is_correct ? idx : -1)
      .filter((idx: number) => idx !== -1);
    return selected.length === correctIndices.length &&
      selected.every(idx => correctIndices.includes(idx));
  }
  
  if (q.type === "true_false") {
    if (ansVal === null || ansVal === undefined) return false;
    const correctOpt = (q.options || []).find((o: any) => o.is_correct);
    const studentOpt = (q.options || [])[ansVal ? 0 : 1];
    return correctOpt?.text === studentOpt?.text;
  }
  
  if (q.type === "short_answer") {
    const trimmed = (ansVal || "").trim();
    if (!trimmed) return false;
    const synonyms = (correctAns.synonyms || []).map((s: string) => meta.case_sensitive ? s : s.toLowerCase());
    const testVal = meta.case_sensitive ? trimmed : trimmed.toLowerCase();
    return synonyms.includes(testVal);
  }
  
  if (q.type === "matching") {
    const pairs = meta.pairs || [];
    const selections = ansVal || {};
    return pairs.length > 0 && pairs.every((p: any) => selections[p.left] === p.right);
  }
  
  if (q.type === "ordering") {
    const correctOrder = meta.items || [];
    const list = Array.isArray(ansVal) ? ansVal : [];
    return correctOrder.length > 0 && list.length === correctOrder.length &&
      list.every((val, idx) => val === correctOrder[idx]);
  }
  
  if (q.type === "fill_in_blank") {
    const list = Array.isArray(ansVal) ? ansVal : [];
    return list.length > 0 && list.every(val => val && val.trim().length > 0);
  }
  
  if (q.type === "code_challenge") {
    return !!ansVal;
  }
  
  if (q.type === "file_upload") {
    return !!ansVal;
  }

  return false;
};

export default function QuizPlayer({ lesson, onComplete, isCompleting }: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Student answer states
  const [selectedMcq, setSelectedMcq] = useState<number[]>([]);
  const [selectedTf, setSelectedTf] = useState<boolean | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [orderingList, setOrderingList] = useState<string[]>([]);
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Evaluation state
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Relational details & settings
  const [startedAt, setStartedAt] = useState<string>("");
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalStatus, setFinalStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);

  useEffect(() => {
    loadQuizData();
  }, [lesson.id]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || !isTimerActive) return;
    
    if (timeLeft <= 0) {
      toast.warning("Time limit exceeded! Automatic submission triggered.");
      handleCompleteQuiz(true);
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeLeft, isTimerActive]);

  const loadQuizData = async () => {
    setLoading(true);
    setBlockedMessage(null);
    setQuizCompleted(false);
    setStudentAnswers({});
    
    try {
      const { getLessonQuiz, getStudentQuizSubmissionsAction, saveQuizSubmissionAction } = await import("@/app/actions/quizzes");
      
      const quizRes = await getLessonQuiz(lesson.id);
      if (quizRes.error || !quizRes.data) {
        setLoading(false);
        return;
      }

      const quizData = quizRes.data;
      setQuiz(quizData);

      // Load previous attempts
      const attemptsRes = await getStudentQuizSubmissionsAction(quizData.id);
      const attempts = attemptsRes.data || [];
      setPreviousAttempts(attempts);

      const settings = quizData.settings || {};
      const limit = quizData.max_retakes ?? -1;

      // Check limit
      if (limit !== -1 && attempts.length >= limit) {
        const behavior = settings.exceeded_behavior || "lock";
        if (behavior === "lock") {
          setBlockedMessage("Attempts Exceeded. Your access to this quiz is locked. Please contact your instructor for a manual unlock.");
          setLoading(false);
          return;
        } else {
          setBlockedMessage("Attempts Exceeded. Please review the remedial material before attempting again.");
          setLoading(false);
          return;
        }
      }

      // Load questions
      const questionsRes = await getQuizQuestions(quizData.id);
      if (questionsRes.error || !questionsRes.data) {
        setLoading(false);
        return;
      }

      let loadedQuestions = questionsRes.data;

      // Handle pooling
      const poolCount = settings.pool_count ?? 0;
      if (settings.shuffle_questions) {
        loadedQuestions = shuffleArray(loadedQuestions);
      }
      if (poolCount > 0 && poolCount < loadedQuestions.length) {
        loadedQuestions = loadedQuestions.slice(0, poolCount);
      }

      // Handle shuffle options
      if (settings.shuffle_options) {
        loadedQuestions = loadedQuestions.map((q: any) => {
          if ((q.type === "multiple_choice" || q.type === "true_false") && q.options) {
            return {
              ...q,
              options: shuffleArray(q.options)
            };
          }
          return q;
        });
      }

      setQuestions(loadedQuestions);
      
      // Initialize states
      if (loadedQuestions.length > 0) {
        initializeQuestionState(loadedQuestions[0]);
      }

      // Start timer if configured
      const timeLimitMinutes = quizData.time_limit_minutes ?? 0;
      if (timeLimitMinutes > 0) {
        setTimeLeft(timeLimitMinutes * 60);
        setIsTimerActive(true);
      }

      // Record started timestamp
      const startIso = new Date().toISOString();
      setStartedAt(startIso);

      // Log attempt start
      await saveQuizSubmissionAction(
        quizData.id,
        {},
        0,
        "started",
        startIso,
        startIso,
        {
          total_duration_seconds: 0,
          variations_shown: loadedQuestions.map((q: any) => q.id)
        }
      );

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const initializeQuestionState = (q: any) => {
    if (!q) return;
    setChecked(false);
    setIsCorrect(false);
    setSelectedMcq([]);
    setSelectedTf(null);
    setShortAnswerText("");
    setMatchingSelections({});
    setUploadedFile(null);
    setCodeOutput("");

    const meta = q.metadata || {};
    
    if (q.type === "ordering") {
      const items = [...(meta.items || [])];
      setOrderingList(items.sort(() => Math.random() - 0.5));
    } else if (q.type === "fill_in_blank") {
      const blanksCount = (meta.text_with_blanks?.match(/\[blank\]/g) || []).length;
      setBlankAnswers(new Array(blanksCount).fill(""));
    } else if (q.type === "code_challenge") {
      setCodeAnswer(meta.starter_template || "");
    }
  };

  const getCurrentAnswerValue = () => {
    if (!activeQuestion) return null;
    if (activeQuestion.type === "multiple_choice") return selectedMcq;
    if (activeQuestion.type === "true_false") return selectedTf;
    if (activeQuestion.type === "short_answer") return shortAnswerText;
    if (activeQuestion.type === "matching") return matchingSelections;
    if (activeQuestion.type === "ordering") return orderingList;
    if (activeQuestion.type === "fill_in_blank") return blankAnswers;
    if (activeQuestion.type === "code_challenge") return codeAnswer;
    if (activeQuestion.type === "file_upload") return uploadedFile ? uploadedFile.name : null;
    return null;
  };

  const handleCheckAnswer = () => {
    if (!activeQuestion) return;

    const currentAns = getCurrentAnswerValue();
    const correct = evaluateQuestion(activeQuestion, currentAns);

    setStudentAnswers(prev => ({
      ...prev,
      [activeQuestion.id]: currentAns
    }));

    setIsCorrect(correct);
    setChecked(true);
    if (correct) {
      toast.success("Correct answer!");
    } else {
      toast.error("Incorrect. Review LENA's explanation below!");
    }
  };

  const handleNextQuestion = () => {
    const currentAns = getCurrentAnswerValue();
    setStudentAnswers(prev => ({
      ...prev,
      [activeQuestion.id]: currentAns
    }));

    if (activeIdx < questions.length - 1) {
      setActiveIdx(activeIdx + 1);
      initializeQuestionState(questions[activeIdx + 1]);
    } else {
      handleCompleteQuiz();
    }
  };

  const handleCompleteQuiz = async (forceSubmit = false) => {
    setIsTimerActive(false);
    
    // Calculate score
    const finalAnswers = { ...studentAnswers };
    if (!forceSubmit && activeQuestion) {
      finalAnswers[activeQuestion.id] = getCurrentAnswerValue();
    }

    let correctCount = 0;
    questions.forEach((q) => {
      const ans = finalAnswers[q.id];
      if (evaluateQuestion(q, ans)) {
        correctCount++;
      }
    });

    const scorePercentage = questions.length > 0 
      ? Math.round((correctCount / questions.length) * 100)
      : 0;

    const passingThreshold = quiz.passing_score ?? 80;
    const passed = scorePercentage >= passingThreshold;
    const status = passed ? "passed" : "failed";

    const submittedIso = new Date().toISOString();
    const startMs = new Date(startedAt || submittedIso).getTime();
    const endMs = new Date(submittedIso).getTime();
    const durationSecs = Math.round((endMs - startMs) / 1000);

    // Build snapshots of inputted metrics
    const snapshots: Record<string, any> = {};
    questions.forEach((q) => {
      snapshots[q.id] = {
        type: q.type,
        question_text: q.question_text,
        student_answer: finalAnswers[q.id],
        is_correct: evaluateQuestion(q, finalAnswers[q.id])
      };
    });

    const metadata = {
      total_duration_seconds: durationSecs,
      variations_shown: questions.map((q: any) => q.id),
      response_snapshots: snapshots,
      browser_user_agent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown"
    };

    try {
      const { saveQuizSubmissionAction } = await import("@/app/actions/quizzes");
      const res = await saveQuizSubmissionAction(
        quiz.id,
        finalAnswers,
        scorePercentage,
        status,
        startedAt,
        submittedIso,
        metadata
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Quiz attempt submitted! Score: ${scorePercentage}%`);
      }
    } catch (e) {
      console.error(e);
    }

    setFinalScore(scorePercentage);
    setFinalStatus(status);
    setQuizCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-[#080f28] border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw size={24} className="animate-spin text-primary mb-3" />
        <span className="text-xs text-white/40 uppercase tracking-widest font-black">Loading Quiz Engine...</span>
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <div className="bg-[#080f28] border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] max-w-xl mx-auto space-y-4 shadow-2xl">
        <ShieldAlert size={40} className="text-red animate-pulse" />
        <h4 className="text-sm font-space-grotesk font-black uppercase text-white tracking-widest">Tactical Locking Activated</h4>
        <p className="text-[11px] text-white/50 leading-relaxed uppercase tracking-wider">{blockedMessage}</p>
        <Button
          onClick={() => onComplete()}
          className="bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider h-10 px-4 border border-white/5 mt-4"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (quizCompleted) {
    const passingThreshold = quiz?.passing_score ?? 80;
    const isPassed = finalStatus === "passed";
    const feedbackTriggerSetting = quiz?.settings?.feedback_trigger || "immediate";

    return (
      <div className="bg-[#080f28] border border-white/5 rounded-2xl p-8 max-w-2xl mx-auto space-y-6 text-white shadow-2xl">
        <div className="text-center space-y-3 pb-6 border-b border-white/5">
          {isPassed ? (
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <ShieldCheck size={36} />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red/10 border border-red/25 rounded-full flex items-center justify-center text-red mx-auto animate-pulse">
              <AlertTriangle size={36} />
            </div>
          )}
          
          <h2 className="text-lg font-space-grotesk font-black uppercase tracking-tight">
            {isPassed ? "Tactical Evaluation Complete" : "Performance Threshold Not Met"}
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            {quiz?.title || "LMS Quiz Evaluation"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111d47]/20 border border-white/5 p-4 rounded-xl text-center space-y-1">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Your Score</span>
            <span className={`text-2xl font-space-grotesk font-black block ${isPassed ? "text-emerald-400" : "text-red"}`}>
              {finalScore}%
            </span>
          </div>
          <div className="bg-[#111d47]/20 border border-white/5 p-4 rounded-xl text-center space-y-1">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Result Status</span>
            <span className={`text-xs font-black uppercase tracking-wider block mt-1.5 ${isPassed ? "text-emerald-400" : "text-red"}`}>
              {isPassed ? "COMPETENT" : "NOT YET COMPETENT"}
            </span>
          </div>
        </div>

        <div className="bg-[#111d47]/10 border border-white/5 p-4 rounded-xl text-xs space-y-2 leading-relaxed text-white/60">
          <div className="flex justify-between">
            <span>Passing Grade Threshold:</span>
            <span className="font-mono text-white font-bold">{passingThreshold}%</span>
          </div>
          <div className="flex justify-between">
            <span>Attempts Recorded:</span>
            <span className="font-mono text-white font-bold">{previousAttempts.length + 1}</span>
          </div>
        </div>

        {/* Detailed Question Review List */}
        {feedbackTriggerSetting !== "hidden" ? (
          <div className="space-y-4 pt-4 border-t border-white/5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Detailed Review Summary</span>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 common-scrollbar">
              {questions.map((q, idx) => {
                const ans = studentAnswers[q.id];
                const isCorrectAns = evaluateQuestion(q, ans);

                return (
                  <div key={q.id} className="bg-[#111d47]/15 border border-white/5 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-bold text-white leading-tight">Q{idx + 1}: {q.question_text}</span>
                      {isCorrectAns ? (
                        <span className="shrink-0 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Correct</span>
                      ) : (
                        <span className="shrink-0 text-[8px] bg-red/10 text-red border border-red/20 px-1.5 py-0.5 rounded font-bold uppercase">Incorrect</span>
                      )}
                    </div>

                    <div className="bg-black/20 p-2.5 rounded-lg text-[10.5px] space-y-1 font-mono text-white/50 border border-white/5">
                      <div>Your choice: <span className="text-white/80">
                        {q.type === "multiple_choice"
                          ? (Array.isArray(ans) ? ans.map(i => q.options?.[i]?.text).join(", ") : "None")
                          : q.type === "true_false"
                            ? (ans ? "True" : "False")
                            : String(ans || "None")}
                      </span></div>
                      {!isCorrectAns && (
                        <div className="text-emerald-400 mt-0.5">Correct Answer: <span>
                          {q.type === "multiple_choice"
                            ? (q.options || []).filter((o: any) => o.is_correct).map((o: any) => o.text).join(", ")
                            : q.type === "true_false"
                              ? ((q.options || []).find((o: any) => o.is_correct)?.text || "N/A")
                              : "Review reference guidelines"}
                        </span></div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="text-[10px] text-purple-300 bg-[#0e1738]/50 p-3 rounded-lg border border-purple/10 leading-relaxed font-mono">
                        <span className="font-bold block text-purple mb-0.5">Explanation:</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center space-y-1">
            <Eye className="mx-auto text-white/20" size={20} />
            <p className="text-[10px] italic text-white/30">Detailed correct answers and explanations are hidden in Exam Mode.</p>
          </div>
        )}

        <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
          {(!isPassed && quiz?.settings?.require_pass_to_unlock) ? (
            <Button
              onClick={() => {
                setQuizCompleted(false);
                setActiveIdx(0);
                setStudentAnswers({});
                loadQuizData();
              }}
              className="bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-primary/20"
            >
              Retake Evaluation
            </Button>
          ) : (
            <Button
              onClick={onComplete}
              disabled={isCompleting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-emerald-500/10"
            >
              Unlock & Continue
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-[#080f28] border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
        <AlertCircle size={28} className="text-white/20 mb-3" />
        <h4 className="text-sm font-space-grotesk font-black uppercase text-white tracking-widest">Quiz Empty</h4>
        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Academy administrators have not uploaded questions to this quiz node.</p>
      </div>
    );
  }

  const activeQuestion = questions[activeIdx];
  const feedbackTriggerSetting = quiz?.settings?.feedback_trigger || "immediate";

  const mcqCorrectCount = activeQuestion?.type === "multiple_choice"
    ? (activeQuestion.options || []).filter((o: any) => o.is_correct).length
    : 0;
  const isMcqMultiSelect = mcqCorrectCount > 1;
  const mcqRadiusClass = isMcqMultiSelect ? "rounded-md" : "rounded-full";

  return (
    <div className="w-full space-y-6">
      {/* Timer Banner */}
      {timeLeft !== null && (
        <div className={`flex items-center justify-between bg-[#111d47]/20 border border-white/5 px-4 py-2.5 rounded-xl ${timeLeft <= 300 ? "border-red/30 bg-red/5 animate-pulse" : ""}`}>
          <div className="flex items-center gap-2">
            <Clock size={14} className={timeLeft <= 300 ? "text-red" : "text-primary"} />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Remaining Time</span>
          </div>
          <span className={`font-mono text-xs font-black ${timeLeft <= 300 ? "text-red" : "text-white"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      {/* Header index & Points Badge */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <span className="text-[10px] font-display font-black text-accent2 uppercase tracking-widest">
          Question {activeIdx + 1} of {questions.length}
        </span>
        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-mono text-white/50 uppercase tracking-wider font-bold">
          {activeQuestion.points} {activeQuestion.points === 1 ? 'Point' : 'Points'}
        </span>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <h3 className="text-base md:text-lg font-display font-bold text-white leading-relaxed tracking-tight">
          {activeQuestion.question_text}
        </h3>
      </div>

      {/* Type Specific Inputs */}
      <div className="py-2">
        {/* MCQ */}
        {activeQuestion.type === "multiple_choice" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activeQuestion.options || []).map((opt: any, idx: number) => {
              const isSelected = selectedMcq.includes(idx);
              let optionStyle = "bg-white/[0.01] border-white/5 text-white/70 hover:bg-white/5 hover:text-white";
              if (isSelected) {
                optionStyle = "bg-primary/10 border-primary text-white";
              }
              if (checked && feedbackTriggerSetting === "immediate") {
                if (opt.is_correct) {
                  optionStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold";
                } else if (isSelected) {
                  optionStyle = "bg-red/10 border-red/30 text-red/80 line-through";
                } else {
                  optionStyle = "bg-white/[0.01] border-white/5 text-white/30 opacity-60";
                }
              }

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (checked && feedbackTriggerSetting === "immediate") return;
                    if (isMcqMultiSelect) {
                      if (selectedMcq.includes(idx)) {
                        setSelectedMcq(selectedMcq.filter(i => i !== idx));
                      } else {
                        setSelectedMcq([...selectedMcq, idx]);
                      }
                    } else {
                      setSelectedMcq([idx]);
                    }
                  }}
                  className={`px-6 py-4 border rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 select-none active:scale-[0.99] ${optionStyle}`}
                >
                  <span className="text-xs font-medium leading-relaxed">{opt.text}</span>
                  <div className="shrink-0 flex items-center justify-center">
                    {checked && feedbackTriggerSetting === "immediate" && opt.is_correct ? (
                      <span className="text-[9px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-bold">✓ Correct</span>
                    ) : checked && feedbackTriggerSetting === "immediate" && isSelected && !opt.is_correct ? (
                      <span className="text-[9px] font-mono uppercase bg-red/10 border border-red/20 px-2 py-0.5 rounded text-red font-bold">Incorrect</span>
                    ) : (
                      <div className={`w-5 h-5 ${mcqRadiusClass} border flex items-center justify-center transition-all ${
                        isSelected 
                          ? "border-primary bg-primary text-white" 
                          : "border-white/10 bg-black/20"
                      }`}>
                        {isSelected && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* True/False */}
        {activeQuestion.type === "true_false" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[true, false].map((val) => {
              const opt = (activeQuestion.options || [])[val ? 0 : 1];
              const isSelected = selectedTf === val;
              
              let optionStyle = "bg-white/[0.01] border-white/5 text-white/70 hover:bg-white/5 hover:text-white";
              if (isSelected) {
                optionStyle = "bg-primary/10 border-primary text-white";
              }
              if (checked && feedbackTriggerSetting === "immediate") {
                if (opt?.is_correct) {
                  optionStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold";
                } else if (isSelected) {
                  optionStyle = "bg-red/10 border-red/30 text-red/80";
                } else {
                  optionStyle = "bg-white/[0.01] border-white/5 text-white/30 opacity-60";
                }
              }

              return (
                <div
                  key={val ? "true" : "false"}
                  onClick={() => !(checked && feedbackTriggerSetting === "immediate") && setSelectedTf(val)}
                  className={`p-5 border rounded-2xl cursor-pointer text-center transition-all duration-300 active:scale-[0.99] ${optionStyle}`}
                >
                  <span className="text-xs font-black uppercase tracking-wider block">{val ? "True" : "False"}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Short Answer */}
        {activeQuestion.type === "short_answer" && (
          <div className="max-w-xl">
            <input
              type="text"
              value={shortAnswerText}
              disabled={checked && feedbackTriggerSetting === "immediate"}
              onChange={(e) => setShortAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body"
            />
          </div>
        )}

        {/* Matching Pairs */}
        {activeQuestion.type === "matching" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activeQuestion.metadata?.pairs || []).map((pair: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <span className="text-xs font-medium text-white/70">{pair.left}</span>
                <select
                  disabled={checked && feedbackTriggerSetting === "immediate"}
                  value={matchingSelections[pair.left] || ""}
                  onChange={(e) => setMatchingSelections({ ...matchingSelections, [pair.left]: e.target.value })}
                  className="bg-[#111d47] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition-all max-w-[150px] md:max-w-[200px]"
                >
                  <option value="">-- Match --</option>
                  {(activeQuestion.metadata?.pairs || []).map((p: any) => (
                    <option key={p.right} value={p.right}>{p.right}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Ordering */}
        {activeQuestion.type === "ordering" && (
          <div className="space-y-2.5 max-w-xl">
            {orderingList.map((val, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-white/30">{idx + 1}.</span>
                  <span className="text-xs font-medium text-white/70">{val}</span>
                </div>
                {!(checked && feedbackTriggerSetting === "immediate") && (
                  <div className="flex gap-1.5">
                    <button 
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const copy = [...orderingList];
                        [copy[idx], copy[idx - 1]] = [copy[idx - 1], copy[idx]];
                        setOrderingList(copy);
                      }} 
                      className="text-[10px] text-white/50 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/5 transition-all hover:bg-white/10 active:scale-90"
                    >
                      ▲
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (idx === orderingList.length - 1) return;
                        const copy = [...orderingList];
                        [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                        setOrderingList(copy);
                      }} 
                      className="text-[10px] text-white/50 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/5 transition-all hover:bg-white/10 active:scale-90"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fill in blank */}
        {activeQuestion.type === "fill_in_blank" && (
          <div className="text-xs leading-relaxed text-white/70 bg-[#111d47]/20 border border-white/5 p-5 rounded-2xl whitespace-pre-wrap max-w-xl">
            {activeQuestion.metadata?.text_with_blanks?.split("[blank]").map((part: string, idx: number, arr: any[]) => (
              <React.Fragment key={idx}>
                {part}
                {idx < arr.length - 1 && (
                  <input
                    type="text"
                    disabled={checked && feedbackTriggerSetting === "immediate"}
                    value={blankAnswers[idx] || ""}
                    onChange={(e) => {
                      const copy = [...blankAnswers];
                      copy[idx] = e.target.value;
                      setBlankAnswers(copy);
                    }}
                    placeholder={`blank ${idx + 1}`}
                    className="mx-1.5 px-2.5 py-1 w-24 bg-[#111d47] border border-white/10 rounded-lg text-white text-xs inline-block outline-none focus:border-primary transition-all text-center"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Code Challenge */}
        {activeQuestion.type === "code_challenge" && (
          <div className="space-y-4">
            <div className="h-56 border border-white/5 rounded-2xl overflow-hidden shadow-2xl bg-[#1e1e1e]">
              <Editor
                height="100%"
                language="javascript"
                theme="vs-dark"
                value={codeAnswer}
                onChange={(val) => setCodeAnswer(val || "")}
                options={{ 
                  fontSize: 11, 
                  minimap: { enabled: false },
                  padding: { top: 10 } 
                }}
              />
            </div>
            {codeOutput && (
              <pre className="p-4 bg-black/60 border border-white/5 rounded-xl text-[10px] text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                {codeOutput}
              </pre>
            )}
          </div>
        )}

        {/* File Upload Rubrics */}
        {activeQuestion.type === "file_upload" && (
          <div className="space-y-4 max-w-xl">
            <div className="border-2 border-dashed border-white/10 hover:border-primary/40 rounded-2xl p-8 text-center bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all duration-300">
              <input
                type="file"
                disabled={checked && feedbackTriggerSetting === "immediate"}
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file_up"
              />
              <label htmlFor="file_up" className="cursor-pointer block space-y-2">
                <span className="text-xs text-white/60 font-semibold block">
                  {uploadedFile ? `📄 ${uploadedFile.name}` : "Click to select a submission document"}
                </span>
                <span className="text-[10px] text-white/30 block">PDF, DOCX, ZIP or image up to 10MB</span>
              </label>
            </div>
            <div className="space-y-2 bg-[#111d47]/20 p-4 rounded-xl border border-white/5">
              <span className="text-[9px] font-black uppercase text-accent2 tracking-widest block mb-1">Grading Rubric Criteria</span>
              {(activeQuestion.metadata?.rubric_criteria || []).map((c: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[10.5px] text-white/50 border-b border-white/5 pb-1 last:border-b-0 last:pb-0">
                  <span>- {c.criteria}</span>
                  <span className="font-mono text-accent2 font-bold">{c.max_points} Pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rationale feedback loop */}
      {checked && feedbackTriggerSetting === "immediate" && activeQuestion.explanation && (
        <div className="bg-[#0e1738]/85 border-l-4 border-purple p-5 rounded-2xl shadow-xl space-y-3 whitespace-pre-wrap leading-relaxed">
          <div className="flex items-center gap-2 text-purple font-black text-[10px] uppercase tracking-widest mb-1">
            <Sparkles size={12} className="animate-pulse text-purple" /> LENA AI Feedback
          </div>
          <div className="text-xs text-white/70 leading-relaxed font-mono">
            {activeQuestion.explanation}
          </div>
        </div>
      )}

      {/* Bottom check actions and Evaluation Status */}
      <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {feedbackTriggerSetting === "immediate" ? (
            <>
              {!checked ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={isCompiling}
                  className="bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all"
                >
                  {activeIdx < questions.length - 1 ? "Next Question" : "Complete Quiz"} <ArrowRight size={13} />
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all"
            >
              {activeIdx < questions.length - 1 ? "Next Question" : "Complete Quiz"} <ArrowRight size={13} />
            </Button>
          )}
        </div>

        {checked && feedbackTriggerSetting === "immediate" && (
          <div className="shrink-0">
            {isCorrect ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={16} /> Passed
              </div>
            ) : (
              <div className="bg-red/10 border border-red/20 text-red px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <AlertCircle size={16} /> Failed
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

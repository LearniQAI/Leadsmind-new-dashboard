"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download, RefreshCw, BarChart2, TrendingUp, TrendingDown,
  Minus, Clock, ClipboardList, ShieldCheck, XCircle, ChevronRight, X,
  Clock3, FileText, Loader2
} from "lucide-react";
import {
  getQuizSubmissionsAction, getModuleQuizSubmissionsAction, gradeQuizAttemptManualReview,
} from "@/app/actions/quizzes";

interface QuizAnalyticsConsoleProps {
  quiz: any;
  course: any;
  questions: any[];
  /** Module-Level Quiz pass — when set, reads module_quiz_attempts (via
   *  getModuleQuizSubmissionsAction) for this module instead of the lesson quiz's
   *  quiz_attempts. Same dashboard UI either way (Step 4: reuse the existing results view). */
  moduleId?: string;
}

export default function QuizAnalyticsConsole({ quiz, course, questions, moduleId }: QuizAnalyticsConsoleProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [quiz.id, moduleId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = moduleId ? await getModuleQuizSubmissionsAction(moduleId) : await getQuizSubmissionsAction(quiz.id);
      if (res.data) {
        setSubmissions(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to load attempt logs");
    } finally {
      setLoading(false);
    }
  };

  // 1. Group submissions by student (contact)
  const studentAttemptsMap: Record<string, any[]> = {};
  submissions.forEach((sub) => {
    const cid = sub.contact_id;
    if (!studentAttemptsMap[cid]) {
      studentAttemptsMap[cid] = [];
    }
    studentAttemptsMap[cid].push(sub);
  });

  // Sort each student's attempts chronologically
  Object.keys(studentAttemptsMap).forEach((cid) => {
    studentAttemptsMap[cid].sort((a, b) => new Date(a.submitted_at || a.started_at).getTime() - new Date(b.submitted_at || b.started_at).getTime());
  });

  // Calculate Group Baseline average duration
  const timedSubmissions = submissions.filter(s => s.metadata?.total_duration_seconds);
  const groupAverageDuration = timedSubmissions.length > 0
    ? timedSubmissions.reduce((acc, s) => acc + s.metadata.total_duration_seconds, 0) / timedSubmissions.length
    : 0;

  // Format duration into readable text
  const formatDuration = (seconds: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Compute performance delta trend
  const getPerformanceTrend = (attempts: any[]) => {
    if (attempts.length <= 1) return { label: "Flat", icon: Minus, style: "bg-dash-surface !text-dash-textMuted border-dash-border" };

    const firstScore = attempts[0].score || 0;
    const latestScore = attempts[attempts.length - 1].score || 0;

    if (latestScore > firstScore) {
      return { label: "Improving", icon: TrendingUp, style: "bg-green/10 text-green border-green/20" };
    } else if (latestScore < firstScore) {
      return { label: "Declining", icon: TrendingDown, style: "bg-red/10 text-red border-red/20" };
    } else {
      return { label: "Flat", icon: Minus, style: "bg-dash-surface !text-dash-textMuted border-dash-border" };
    }
  };

  // Export CSV arrays
  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.info("No attempt records to export.");
      return;
    }

    const headers = ["Student Name", "Email", "Attempt No", "Score (%)", "Status", "Date", "Duration (sec)"];
    const rows = submissions.map((sub) => {
      const contactName = sub.contact ? `${sub.contact.first_name || ""} ${sub.contact.last_name || ""}`.trim() : "Student";
      const contactEmail = sub.contact?.email || "";
      const dateStr = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "Started";

      // Determine attempt number
      const siblings = studentAttemptsMap[sub.contact_id] || [];
      const attemptNum = siblings.findIndex(s => s.id === sub.id) + 1;

      return [
        `"${contactName.replace(/"/g, '""')}"`,
        `"${contactEmail.replace(/"/g, '""')}"`,
        attemptNum,
        sub.score ?? 0,
        sub.status || "started",
        `"${dateStr}"`,
        sub.metadata?.total_duration_seconds || 0
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quiz_${quiz.id}_attempts_audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  // Export SETA compliance file
  const exportToSETA = () => {
    if (submissions.length === 0) {
      toast.info("No records to export.");
      return;
    }

    // SETA auditing template format
    const headers = [
      "Student Email ID", "Student Full Name", "Course Title", "Assessment Title",
      "Assessment Date", "Score Achieved", "Passing Threshold", "Result Status",
      "SETA Outcome Code"
    ];

    const rows = submissions.map((sub) => {
      const contactName = sub.contact ? `${sub.contact.first_name || ""} ${sub.contact.last_name || ""}`.trim() : "Student";
      const contactEmail = sub.contact?.email || "";
      const dateStr = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "Started";
      const outcomeCode = sub.status === "passed" ? "C" : "NYC"; // Competent vs Not Yet Competent

      return [
        `"${contactEmail}"`,
        `"${contactName}"`,
        `"${course.title}"`,
        `"${quiz.title}"`,
        `"${dateStr}"`,
        `${sub.score ?? 0}%`,
        `${quiz.passing_score ?? 80}%`,
        `"${sub.status}"`,
        `"${outcomeCode}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SETA_audit_${quiz.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("SETA Compliance CSV downloaded!");
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw size={24} className="animate-spin motion-reduce:animate-none text-primary mb-3" />
        <span className="text-xs !text-dash-textMuted font-bold">Compiling Submissions Analytics...</span>
      </div>
    );
  }

  const studentIds = Object.keys(studentAttemptsMap);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          { label: "Total Attempts", value: String(submissions.length), Icon: BarChart2, tint: "text-primary bg-primary/10" },
          { label: "Unique Students", value: String(studentIds.length), Icon: BarChart2, tint: "text-dash-accent bg-dash-accent/10" },
          { label: "Average Group Speed", value: groupAverageDuration > 0 ? formatDuration(groupAverageDuration) : "N/A", Icon: Clock, tint: "text-purple bg-purple/10" },
        ] as const).map(({ label, value, Icon, tint }) => (
          <div key={label} className="bg-white border border-dash-border p-5 rounded-2xl shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] !text-dash-textMuted">{label}</span>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
                <Icon size={16} />
              </span>
            </div>
            <span className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums !text-dash-text mt-3 block leading-none">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-dash-border p-4 rounded-2xl shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] !text-dash-textMuted">Reports Extraction</span>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={exportToCSV}
            className="bg-white hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text rounded-lg text-[11px] font-semibold h-9 px-3.5 border border-dash-border flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
          >
            <Download size={13} /> CSV Array
          </Button>
          <Button
            onClick={exportToSETA}
            className="bg-white hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text rounded-lg text-[11px] font-semibold h-9 px-3.5 border border-dash-border flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
          >
            <ShieldCheck size={13} className="text-purple" /> SETA Compliance
          </Button>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-dash-border flex items-center justify-between gap-3">
          <div>
            <span className="text-[13px] font-bold !text-dash-text block">Assessor Review Console</span>
            <span className="text-[11px] !text-dash-textMuted block mt-0.5">Per-student attempts, trends and diagnostics</span>
          </div>
          <button
            onClick={loadSubmissions}
            className="h-8 px-2.5 rounded-lg text-[11px] font-semibold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface flex items-center gap-1.5 transition-colors motion-reduce:transition-none shrink-0"
          >
            <RefreshCw size={12} /> Reload
          </button>
        </div>

        {studentIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-dash-surface border border-dash-border flex items-center justify-center mb-4">
              <ClipboardList className="!text-dash-textMuted" size={22} />
            </div>
            <p className="text-[13px] font-semibold !text-dash-text">No attempts yet</p>
            <p className="text-[12px] leading-relaxed !text-dash-textMuted mt-1 max-w-[260px]">
              Once students start taking this quiz, their scores and review details will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-dash-border">
            {studentIds.map((cid) => {
              const attempts = studentAttemptsMap[cid];
              const latest = attempts[attempts.length - 1];

              // CRM details
              const contact = latest.contact || {};
              const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Student";
              const email = contact.email || "No email";
              const tags = contact.tags || [];

              // Calculate timing benchmark
              const latestTime = latest.metadata?.total_duration_seconds || 0;
              const timeDiffText = groupAverageDuration > 0 && latestTime > 0
                ? (() => {
                    const diff = latestTime - groupAverageDuration;
                    const valStr = formatDuration(Math.abs(diff));
                    return diff > 0 ? `+${valStr} above avg` : `-${valStr} below avg`;
                  })()
                : "N/A";

              const trend = getPerformanceTrend(attempts);
              const TrendIcon = trend.icon;

              return (
                <div key={cid} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-dash-surface transition-colors motion-reduce:transition-none">
                  {/* CRM profile data card */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                      {fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold !text-dash-text leading-tight truncate">{fullName}</h4>
                      <span className="text-[10px] !text-dash-textMuted font-mono block mt-0.5">{email}</span>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[8px] bg-primary/5 border border-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational diagnostics columns */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center shrink-0">
                    {/* Score */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold !text-dash-textMuted block">Latest Score</span>
                      <span className="text-xs font-bold !text-dash-text flex items-center gap-1">
                        {latest.status === "pending" ? (
                          <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                            <Clock3 size={9} /> Pending review
                          </span>
                        ) : (
                          <>
                            {latest.score}%
                            {latest.status === "passed" ? (
                              <span className="text-[9px] text-green">Passed</span>
                            ) : (
                              <span className="text-[9px] text-red">Failed</span>
                            )}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Trend Vector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold !text-dash-textMuted block">Trend Vector</span>
                      <Badge className={`text-[8.5px] font-bold px-2 py-0.5 flex items-center gap-1 rounded border shrink-0 max-w-[85px] justify-center ${trend.style}`}>
                        <TrendIcon size={10} /> {trend.label}
                      </Badge>
                    </div>

                    {/* Timing relative to benchmark */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold !text-dash-textMuted block">Timing Benchmark</span>
                      <span className="text-[10px] font-mono !text-dash-textMuted block">{timeDiffText}</span>
                    </div>

                    {/* Attempts count */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold !text-dash-textMuted block">Attempts</span>
                      <span className="text-xs font-bold !text-dash-text block">{attempts.length} attempts</span>
                    </div>
                  </div>

                  {/* View Diagnostic CTA */}
                  <div className="shrink-0 flex items-center justify-end">
                    <Button
                      onClick={() => setSelectedSubmission(latest)}
                      className="bg-dash-surface hover:bg-dash-border/60 !text-dash-text rounded-xl text-[9px] font-bold h-9 px-4 border border-dash-border flex items-center gap-1 transition-colors motion-reduce:transition-none"
                    >
                      Diagnostics <ChevronRight size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Diagnostics Modal */}
      {selectedSubmission && (() => {
        const contact = selectedSubmission.contact || {};
        const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Student";
        const answers = selectedSubmission.answers || {};

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-dash-border">
                <div>
                  <span className="text-[9px] font-bold text-primary block">Submission Diagnostics</span>
                  <h3 className="text-sm font-bold !text-dash-text mt-0.5">
                    {fullName} - Attempts Diagnostics
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-2 gap-4 bg-dash-surface border border-dash-border p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] !text-dash-textMuted block">Attempt Score</span>
                    <span className="font-bold !text-dash-text mt-0.5 block">
                      {selectedSubmission.grade_status === "pending_review"
                        ? "Awaiting review"
                        : `${selectedSubmission.score ?? 0}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] !text-dash-textMuted block">Duration Spent</span>
                    <span className="font-bold !text-dash-text mt-0.5 block">
                      {selectedSubmission.metadata?.total_duration_seconds
                        ? formatDuration(selectedSubmission.metadata.total_duration_seconds)
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {selectedSubmission.grade_status === "pending_review" && (
                  <ManualReviewPanel
                    submission={selectedSubmission}
                    questions={questions}
                    scope={moduleId ? "module" : "lesson"}
                    onGraded={() => {
                      setSelectedSubmission(null);
                      loadSubmissions();
                    }}
                  />
                )}

                <div className="space-y-4">
                  <span className="text-[10px] font-bold !text-dash-textMuted block">Question Breakdown</span>
                  {questions.map((q, qIdx) => {
                    const ansVal = answers[q.id];
                    let isCorrect = false;

                    if (q.type === "multiple_choice") {
                      const selected = Array.isArray(ansVal) ? ansVal : [];
                      const correctIndices = (q.options || [])
                        .map((o: any, idx: number) => o.is_correct ? idx : -1)
                        .filter((idx: number) => idx !== -1);
                      isCorrect = selected.length === correctIndices.length &&
                        selected.every(idx => correctIndices.includes(idx));
                    } else if (q.type === "true_false") {
                      const correctOpt = (q.options || []).find((o: any) => o.is_correct);
                      const studentOpt = (q.options || [])[ansVal ? 0 : 1];
                      isCorrect = correctOpt?.text === studentOpt?.text;
                    } else if (q.type === "short_answer") {
                      const trimmed = (ansVal || "").trim().toLowerCase();
                      const synonyms = (q.correct_answer?.synonyms || []).map((s: string) => s.toLowerCase());
                      isCorrect = synonyms.includes(trimmed);
                    } else {
                      isCorrect = ansVal !== undefined;
                    }

                    return (
                      <div key={q.id} className="bg-dash-surface border border-dash-border rounded-xl p-4.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-bold !text-dash-text">Q{qIdx + 1}: {q.question_text}</span>
                          <span className="shrink-0">
                            {isCorrect ? (
                              <Badge className="bg-green/10 text-green border border-green/20 text-[8px] font-bold flex items-center gap-0.5">
                                <ShieldCheck size={9} /> Correct
                              </Badge>
                            ) : (
                              <Badge className="bg-red/10 text-red border border-red/20 text-[8px] font-bold flex items-center gap-0.5">
                                <XCircle size={9} /> Incorrect
                              </Badge>
                            )}
                          </span>
                        </div>

                        {/* Student Response */}
                        <div className="text-[11px] !text-dash-textMuted bg-white p-2.5 rounded-lg border border-dash-border space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span className="!text-dash-textMuted">Student Answer:</span>
                            <span className="!text-dash-text">
                              {q.type === "multiple_choice"
                                ? (Array.isArray(ansVal) ? ansVal.map(idx => q.options?.[idx]?.text).join(", ") : "None")
                                : q.type === "true_false"
                                  ? (ansVal ? "True" : "False")
                                  : (ansVal || "No response")}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-dash-border pt-1 mt-1">
                            <span className="!text-dash-textMuted">Correct Answer:</span>
                            <span className="text-green">
                              {q.type === "multiple_choice"
                                ? (q.options || []).filter((o: any) => o.is_correct).map((o: any) => o.text).join(", ")
                                : q.type === "true_false"
                                  ? ((q.options || []).find((o: any) => o.is_correct)?.text || "N/A")
                                  : ((q.correct_answer?.synonyms || []).join(", ") || "N/A")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-dash-border flex items-center justify-end">
                <Button
                  onClick={() => setSelectedSubmission(null)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold h-11 px-6 shadow-lg transition-colors motion-reduce:transition-none"
                >
                  Close Diagnostic Log
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* --------------------------------------------------------------------------------
 * Manual review panel — shown inside the diagnostics modal when an attempt is sitting
 * in 'pending_review' because it contains file_upload answer(s). The instructor opens
 * each uploaded file, assigns points (0..question points) and optional feedback, and
 * finalises — which recomputes the attempt's score from (auto-graded questions +
 * these awards), sets passed, and (for a lesson quiz that now passes) marks the lesson
 * complete + fires the automation event.
 * ------------------------------------------------------------------------------ */
function ManualReviewPanel({
  submission,
  questions,
  scope,
  onGraded,
}: {
  submission: any;
  questions: any[];
  scope: "lesson" | "module";
  onGraded: () => void;
}) {
  const fileQuestions = (questions || []).filter((q: any) => q.question_type === "file_upload");
  const [awards, setAwards] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    for (const q of fileQuestions) seed[q.id] = submission.manual_points_awarded?.[q.id] ?? 0;
    return seed;
  });
  const [feedback, setFeedback] = useState<string>(submission.reviewer_feedback || "");
  const [saving, setSaving] = useState(false);

  const answers = submission.answers || {};

  const submitReview = async () => {
    setSaving(true);
    try {
      const res = await gradeQuizAttemptManualReview({
        attemptId: submission.id,
        scope,
        awards,
        feedback,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Review saved — ${res.score}% (${res.passed ? "passed" : "not passed"}).`
      );
      onGraded();
    } catch {
      toast.error("Could not save the review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center gap-2">
        <Clock3 size={13} className="text-amber-600" />
        <span className="text-[11px] font-bold text-amber-800">Grade the uploaded file(s) to finalise this attempt</span>
      </div>

      {fileQuestions.map((q: any, i: number) => {
        const ans = answers[q.id];
        const rubric: { criteria: string; max_points: number }[] = q.metadata?.rubric_criteria || [];
        const maxPts = q.points || 1;
        return (
          <div key={q.id} className="space-y-2.5 rounded-lg border border-dash-border bg-white p-3.5">
            <span className="text-[11px] font-bold !text-dash-text block">
              File question {i + 1}: {q.question_text}
            </span>

            {ans?.file_url ? (
              <a
                href={ans.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 hover:underline"
              >
                <FileText size={12} /> {ans.file_name || "Open submitted file"}
              </a>
            ) : (
              <span className="text-[11px] italic !text-dash-textMuted">No file was uploaded.</span>
            )}

            {rubric.length > 0 && (
              <ul className="space-y-0.5">
                {rubric.map((r, ri) => (
                  <li key={ri} className="flex justify-between text-[10.5px] !text-dash-textMuted">
                    <span>{r.criteria}</span>
                    <span>{r.max_points} pts</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Points awarded</label>
              <input
                type="number"
                min={0}
                max={maxPts}
                value={awards[q.id] ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(maxPts, Number(e.target.value) || 0));
                  setAwards((prev) => ({ ...prev, [q.id]: v }));
                }}
                className="w-20 rounded-lg border border-dash-border bg-white px-2 py-1 text-xs !text-dash-text"
              />
              <span className="text-[10px] !text-dash-textMuted">/ {maxPts}</span>
            </div>
          </div>
        );
      })}

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Feedback to the student (optional)</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-dash-border bg-white px-2.5 py-2 text-xs !text-dash-text"
        />
      </div>

      <Button
        onClick={submitReview}
        disabled={saving}
        className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold px-5 flex items-center gap-1.5 transition-colors motion-reduce:transition-none disabled:opacity-50"
      >
        {saving ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <ShieldCheck size={13} />}
        Save review &amp; finalise score
      </Button>
    </div>
  );
}

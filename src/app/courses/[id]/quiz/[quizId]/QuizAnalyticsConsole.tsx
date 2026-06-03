"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Download, RefreshCw, BarChart2, TrendingUp, TrendingDown, 
  Minus, Clock, Info, ShieldCheck, XCircle, ChevronRight, X
} from "lucide-react";
import { getQuizSubmissionsAction } from "@/app/actions/quizzes";

interface QuizAnalyticsConsoleProps {
  quiz: any;
  course: any;
  questions: any[];
}

export default function QuizAnalyticsConsole({ quiz, course, questions }: QuizAnalyticsConsoleProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [quiz.id]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await getQuizSubmissionsAction(quiz.id);
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
    if (attempts.length <= 1) return { label: "Flat", icon: Minus, style: "bg-white/5 text-white/40 border-white/5" };
    
    const firstScore = attempts[0].score || 0;
    const latestScore = attempts[attempts.length - 1].score || 0;
    
    if (latestScore > firstScore) {
      return { label: "Improving", icon: TrendingUp, style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    } else if (latestScore < firstScore) {
      return { label: "Declining", icon: TrendingDown, style: "bg-red-500/10 text-red-400 border-red-500/20" };
    } else {
      return { label: "Flat", icon: Minus, style: "bg-white/5 text-white/40 border-white/5" };
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
        <RefreshCw size={24} className="animate-spin text-primary mb-3" />
        <span className="text-xs text-white/40 uppercase tracking-widest font-black">Compiling Submissions Analytics...</span>
      </div>
    );
  }

  const studentIds = Object.keys(studentAttemptsMap);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Total Attempts</span>
            <span className="text-2xl font-space-grotesk font-black text-white mt-1 block">{submissions.length}</span>
          </div>
          <BarChart2 className="text-primary opacity-60" size={24} />
        </div>
        <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Unique Students</span>
            <span className="text-2xl font-space-grotesk font-black text-white mt-1 block">{studentIds.length}</span>
          </div>
          <BarChart2 className="text-accent2 opacity-60" size={24} />
        </div>
        <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Average Group Speed</span>
            <span className="text-2xl font-space-grotesk font-black text-white mt-1 block">
              {groupAverageDuration > 0 ? formatDuration(groupAverageDuration) : "N/A"}
            </span>
          </div>
          <Clock className="text-purple opacity-60" size={24} />
        </div>
      </div>

      {/* Export Toolbar */}
      <div className="flex items-center justify-between bg-[#080f28] border border-white/5 p-4 rounded-xl">
        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Reports Extraction</span>
        <div className="flex gap-2">
          <Button 
            onClick={exportToCSV}
            className="bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider h-8 px-3 border border-white/5"
          >
            <Download size={11} className="mr-1.5" /> CSV Array
          </Button>
          <Button 
            onClick={exportToSETA}
            className="bg-purple/20 hover:bg-purple/35 text-purple-300 rounded-lg text-[9px] font-bold uppercase tracking-wider h-8 px-3 border border-purple/30"
          >
            <Download size={11} className="mr-1.5" /> SETA Compliance
          </Button>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-[#080f28] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Assessor Review Console</span>
          <button onClick={loadSubmissions} className="text-[10px] font-bold text-primary flex items-center gap-1">
            <RefreshCw size={10} /> Reload
          </button>
        </div>

        {studentIds.length === 0 ? (
          <div className="py-12 text-center">
            <Info className="mx-auto text-white/20 mb-2" size={24} />
            <span className="text-[10.5px] italic text-white/30 block">No students have attempted this quiz yet.</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
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
                <div key={cid} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                  {/* CRM profile data card */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black uppercase shrink-0">
                      {fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white leading-tight truncate">{fullName}</h4>
                      <span className="text-[10px] text-white/40 font-mono block mt-0.5">{email}</span>
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
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Latest Score</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        {latest.score}% 
                        {latest.status === "passed" ? (
                          <span className="text-[9px] text-emerald-400">Passed</span>
                        ) : (
                          <span className="text-[9px] text-red-400">Failed</span>
                        )}
                      </span>
                    </div>

                    {/* Trend Vector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Trend Vector</span>
                      <Badge className={`text-[8.5px] font-bold px-2 py-0.5 flex items-center gap-1 rounded border shrink-0 max-w-[85px] justify-center ${trend.style}`}>
                        <TrendIcon size={10} /> {trend.label}
                      </Badge>
                    </div>

                    {/* Timing relative to benchmark */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Timing Benchmark</span>
                      <span className="text-[10px] font-mono text-white/60 block">{timeDiffText}</span>
                    </div>

                    {/* Attempts count */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Attempts</span>
                      <span className="text-xs font-bold text-white/80 block">{attempts.length} attempts</span>
                    </div>
                  </div>

                  {/* View Diagnostic CTA */}
                  <div className="shrink-0 flex items-center justify-end">
                    <Button 
                      onClick={() => setSelectedSubmission(latest)}
                      className="bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider h-9 px-4 border border-white/5 flex items-center gap-1"
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
          <div className="fixed inset-0 bg-[#04091a]/85 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
            <div className="bg-[#080f28] border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] block">Submission Diagnostics</span>
                  <h3 className="text-sm font-space-grotesk font-black text-white uppercase tracking-tight mt-0.5">
                    {fullName} - Attempts Diagnostics
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-2 gap-4 bg-[#111d47]/20 border border-white/5 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-white/30 block uppercase tracking-wider">Attempt Score</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedSubmission.score}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 block uppercase tracking-wider">Duration Spent</span>
                    <span className="font-bold text-white mt-0.5 block">
                      {selectedSubmission.metadata?.total_duration_seconds 
                        ? formatDuration(selectedSubmission.metadata.total_duration_seconds)
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Question Breakdown</span>
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
                      <div key={q.id} className="bg-[#111d47]/10 border border-white/5 rounded-xl p-4.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-bold text-white">Q{qIdx + 1}: {q.question_text}</span>
                          <span className="shrink-0">
                            {isCorrect ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold flex items-center gap-0.5">
                                <ShieldCheck size={9} /> Correct
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold flex items-center gap-0.5">
                                <XCircle size={9} /> Incorrect
                              </Badge>
                            )}
                          </span>
                        </div>

                        {/* Student Response */}
                        <div className="text-[11px] text-white/50 bg-[#080f28] p-2.5 rounded-lg border border-white/5 space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span className="text-white/30">Student Answer:</span>
                            <span className="text-white/70">
                              {q.type === "multiple_choice"
                                ? (Array.isArray(ansVal) ? ansVal.map(idx => q.options?.[idx]?.text).join(", ") : "None")
                                : q.type === "true_false"
                                  ? (ansVal ? "True" : "False")
                                  : (ansVal || "No response")}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
                            <span className="text-white/30">Correct Answer:</span>
                            <span className="text-emerald-400">
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
              <div className="p-6 border-t border-white/5 flex items-center justify-end">
                <Button 
                  onClick={() => setSelectedSubmission(null)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg"
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

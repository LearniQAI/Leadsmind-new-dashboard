"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Download, FileText, Loader2, MessageSquare, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseSubmissionsTabProps {
  courseId: string;
}

export default function CourseSubmissionsTab({ courseId }: CourseSubmissionsTabProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lms/assignments?courseId=${courseId}`);
      const data = await res.json();
      if (data.error) {
        toast.error(`Failed to load submissions: ${data.error}`);
      } else {
        setSubmissions(data.submissions || []);
      }
    } catch {
      toast.error("Failed to query student submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [courseId]);

  const handleGrade = async (submissionId: string, gradeStatus: "passed" | "failed") => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/lms/assignments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId,
            gradeStatus,
            feedbackComments: feedbackText
          })
        });
        const data = await res.json();
        if (data.error) {
          toast.error(`Grading failed: ${data.error}`);
        } else {
          toast.success(`Submission graded as ${gradeStatus.toUpperCase()}`);
          setSelectedSubmission(null);
          setFeedbackText("");
          await fetchSubmissions();
        }
      } catch {
        toast.error("Failed to submit grades");
      }
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-xs text-white/50 uppercase tracking-widest font-black">Syncing Assignment Submissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white font-body">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Submissions Center</span>
        <h2 className="text-xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1">
          Student Assignment Submissions
        </h2>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
          Grade submissions, issue approvals, and provide qualitative feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Submissions List */}
        <div className="lg:col-span-2 space-y-4">
          {submissions.length === 0 ? (
            <div className="py-20 bg-[#080f28] border-2 border-dashed border-white/5 rounded-3xl text-center">
              <FileText className="mx-auto text-white/20 mb-4" size={32} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">No Submissions Found</h4>
              <p className="text-[10px] text-white/30 uppercase mt-1 font-bold">Students have not uploaded any work yet.</p>
            </div>
          ) : (
            <div className="bg-[#080f28]/60 border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#080f28]/40 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <th className="p-4">Student</th>
                      <th className="p-4">Assignment Lesson</th>
                      <th className="p-4">Submitted At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-white/80">
                    {submissions.map((sub) => {
                      const studentName = `${sub.contact?.first_name || "Student"} ${sub.contact?.last_name || ""}`.trim();
                      const studentEmail = sub.contact?.email || "";
                      return (
                        <tr 
                          key={sub.id} 
                          className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${selectedSubmission?.id === sub.id ? "bg-white/[0.03]" : ""}`}
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setFeedbackText(sub.feedback_comments || "");
                          }}
                        >
                          <td className="p-4">
                            <div className="font-bold">{studentName}</div>
                            <div className="text-[10px] text-white/40 font-mono mt-0.5">{studentEmail}</div>
                          </td>
                          <td className="p-4 font-medium max-w-[200px] truncate">
                            {sub.lesson_id}
                          </td>
                          <td className="p-4 text-white/50 font-mono">
                            {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              sub.grade_status === 'passed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              sub.grade_status === 'failed' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {sub.grade_status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/5"
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Grading details panel */}
        <div className="bg-[#080f28]/40 border border-white/5 rounded-2xl p-6 space-y-6">
          {selectedSubmission ? (
            <div className="space-y-5">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Reviewing Submission</span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {`${selectedSubmission.contact?.first_name || "Student"} ${selectedSubmission.contact?.last_name || ""}`.trim()}
                </h3>
                <p className="text-[10px] text-white/50 mt-0.5 font-mono">{selectedSubmission.contact?.email}</p>
              </div>

              {/* Text Submission content */}
              {selectedSubmission.text_submission && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/40 block">Text Answer Submitted</label>
                  <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-3.5 text-xs text-white/70 whitespace-pre-line leading-relaxed">
                    {selectedSubmission.text_submission}
                  </div>
                </div>
              )}

              {/* Uploaded file metadata */}
              {selectedSubmission.file_url && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/40 block">Attached Assignment File</label>
                  <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="text-primary shrink-0" size={16} />
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate">{selectedSubmission.file_name || "Uploaded File"}</span>
                        {selectedSubmission.file_size && (
                          <span className="text-[9px] text-white/40 block font-mono">{(selectedSubmission.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={selectedSubmission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg p-2 shrink-0 transition-colors"
                      title="Download Attached Work"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              )}

              {/* Feedback form */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 block">Instructor Feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide guidance, point out mistakes, or write congratulatory messages..."
                  rows={4}
                  className="w-full bg-[#111d47] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body leading-relaxed"
                />
              </div>

              {/* Grading Buttons */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 block">Submit Grade Assessment</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleGrade(selectedSubmission.id, "passed")}
                    disabled={isPending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider h-11 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                  >
                    {isPending ? <Loader2 className="animate-spin" size={12} /> : <Check size={13} />} Approve (Pass)
                  </Button>
                  <Button
                    onClick={() => handleGrade(selectedSubmission.id, "failed")}
                    disabled={isPending}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider h-11 flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/10"
                  >
                    {isPending ? <Loader2 className="animate-spin" size={12} /> : <X size={13} />} Reject (Fail)
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-white/30 space-y-2.5">
              <Award className="mx-auto" size={24} />
              <div className="text-[10px] font-black uppercase tracking-widest">No Selection</div>
              <p className="text-[9px] uppercase font-bold leading-relaxed max-w-[200px] mx-auto">
                Select a submission from the list to review details, download files, and submit grades.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

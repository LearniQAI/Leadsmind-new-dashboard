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
          toast.success(`Submission graded as ${gradeStatus}`);
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
        <Loader2 className="animate-spin !text-dash-accent motion-reduce:animate-none" size={32} />
        <span className="text-xs !text-dash-textMuted font-bold">Loading assignment submissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold text-dash-accent">Submissions center</span>
        <h2 className="text-xl font-bold !text-dash-text mt-1">
          Student assignment submissions
        </h2>
        <p className="text-xs !text-dash-textMuted mt-1">
          Grade submissions, issue approvals, and provide qualitative feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Submissions List */}
        <div className="lg:col-span-2 space-y-4">
          {submissions.length === 0 ? (
            <div className="py-20 bg-white border-2 border-dashed border-dash-border rounded-2xl text-center">
              <FileText className="mx-auto !text-dash-textMuted opacity-40 mb-4" size={32} />
              <h4 className="text-sm font-bold !text-dash-textMuted">No submissions found</h4>
              <p className="text-xs !text-dash-textMuted mt-1">Students have not uploaded any work yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-dash-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dash-border text-[10px] font-bold !text-dash-textMuted">
                      <th className="p-4">Student</th>
                      <th className="p-4">Assignment lesson</th>
                      <th className="p-4">Submitted at</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border text-xs !text-dash-text">
                    {submissions.map((sub) => {
                      const studentName = `${sub.contact?.first_name || "Student"} ${sub.contact?.last_name || ""}`.trim();
                      const studentEmail = sub.contact?.email || "";
                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-dash-surface cursor-pointer transition-colors motion-reduce:transition-none ${selectedSubmission?.id === sub.id ? "bg-dash-surface" : ""}`}
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setFeedbackText(sub.feedback_comments || "");
                          }}
                        >
                          <td className="p-4">
                            <div className="font-bold !text-dash-text">{studentName}</div>
                            <div className="text-[10px] !text-dash-textMuted mt-0.5">{studentEmail}</div>
                          </td>
                          <td className="p-4 font-medium max-w-[200px] truncate !text-dash-text">
                            {sub.lesson_id}
                          </td>
                          <td className="p-4 !text-dash-textMuted">
                            {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold capitalize ${
                              sub.grade_status === 'passed' ? "bg-emerald-100 text-emerald-700" :
                              sub.grade_status === 'failed' ? "bg-rose-100 text-rose-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {sub.grade_status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs font-bold rounded-lg border border-dash-border !text-dash-text"
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
        <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6 space-y-6">
          {selectedSubmission ? (
            <div className="space-y-5">
              <div>
                <span className="text-[9px] font-bold !text-dash-textMuted">Reviewing submission</span>
                <h3 className="text-sm font-bold !text-dash-text mt-0.5">
                  {`${selectedSubmission.contact?.first_name || "Student"} ${selectedSubmission.contact?.last_name || ""}`.trim()}
                </h3>
                <p className="text-xs !text-dash-textMuted mt-0.5">{selectedSubmission.contact?.email}</p>
              </div>

              {/* Text Submission content */}
              {selectedSubmission.text_submission && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold !text-dash-textMuted block">Text answer submitted</label>
                  <div className="bg-dash-surface border border-dash-border rounded-xl p-3.5 text-xs !text-dash-text whitespace-pre-line leading-relaxed">
                    {selectedSubmission.text_submission}
                  </div>
                </div>
              )}

              {/* Uploaded file metadata */}
              {selectedSubmission.file_url && (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold !text-dash-textMuted block">Attached assignment file</label>
                  <div className="bg-dash-surface border border-dash-border rounded-xl p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="!text-dash-accent shrink-0" size={16} />
                      <div className="truncate">
                        <span className="text-xs font-bold !text-dash-text block truncate">{selectedSubmission.file_name || "Uploaded file"}</span>
                        {selectedSubmission.file_size && (
                          <span className="text-[9px] !text-dash-textMuted block">{(selectedSubmission.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={selectedSubmission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-dash-border hover:bg-dash-surface !text-dash-text rounded-lg p-2 shrink-0 transition-colors motion-reduce:transition-none"
                      title="Download attached work"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              )}

              {/* Feedback form */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold !text-dash-textMuted block">Instructor feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide guidance, point out mistakes, or write congratulatory messages..."
                  rows={4}
                  className="w-full bg-white border border-dash-border rounded-xl p-3 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-dash-accent transition-all motion-reduce:transition-none leading-relaxed"
                />
              </div>

              {/* Grading Buttons */}
              <div className="space-y-2 pt-2 border-t border-dash-border">
                <label className="text-[9px] font-bold !text-dash-textMuted block">Submit grade assessment</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleGrade(selectedSubmission.id, "passed")}
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-11 flex items-center justify-center gap-1.5"
                  >
                    {isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" size={12} /> : <Check size={13} />} Approve (pass)
                  </Button>
                  <Button
                    onClick={() => handleGrade(selectedSubmission.id, "failed")}
                    disabled={isPending}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold h-11 flex items-center justify-center gap-1.5"
                  >
                    {isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" size={12} /> : <X size={13} />} Reject (fail)
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center !text-dash-textMuted space-y-2.5">
              <Award className="mx-auto opacity-40" size={24} />
              <div className="text-xs font-bold">No selection</div>
              <p className="text-xs leading-relaxed max-w-[200px] mx-auto">
                Select a submission from the list to review details, download files, and submit grades.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Download, FileText, Loader2, ClipboardList } from "lucide-react";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  StatusPill,
  EmptyState,
  LoadingState,
  TextArea,
  SectionLabel,
} from "./settings/primitives";
import { cn } from "@/lib/utils";

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
      if (data.error) toast.error(`Failed to load submissions: ${data.error}`);
      else setSubmissions(data.submissions || []);
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
          body: JSON.stringify({ submissionId, gradeStatus, feedbackComments: feedbackText }),
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

  const gradeTone = (status: string) =>
    status === "passed" ? "green" : status === "failed" ? "red" : "amber";

  if (loading) return <LoadingState label="Loading submissions…" />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
          Submissions
        </div>
        <h2 className="text-[15px] font-semibold text-dash-text">Student assignments</h2>
        <p className="text-[13px] text-dash-textMuted">
          Review submitted work, leave feedback and record a pass or fail.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* List */}
        <div className="lg:col-span-2">
          {submissions.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="No submissions yet"
              description="Students haven’t uploaded any assignment work."
            />
          ) : (
            <SettingsPanel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-dash-border text-[11px] font-semibold uppercase tracking-[0.06em] text-dash-textMuted">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Lesson</th>
                      <th className="px-5 py-3">Submitted</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {submissions.map((sub) => {
                      const studentName = `${sub.contact?.first_name || "Student"} ${
                        sub.contact?.last_name || ""
                      }`.trim();
                      const isSelected = selectedSubmission?.id === sub.id;
                      return (
                        <tr
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setFeedbackText(sub.feedback_comments || "");
                          }}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected ? "bg-sky-50/70" : "hover:bg-dash-surface/60"
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-dash-text">{studentName}</div>
                            <div className="text-[11px] text-dash-textMuted">
                              {sub.contact?.email || ""}
                            </div>
                          </td>
                          <td className="max-w-[180px] truncate px-5 py-3.5 text-dash-textMuted">
                            {sub.lesson_id}
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-dash-textMuted">
                            {new Date(sub.submitted_at).toLocaleDateString()}{" "}
                            {new Date(sub.submitted_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusPill tone={gradeTone(sub.grade_status) as any}>
                              {sub.grade_status || "pending"}
                            </StatusPill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SettingsPanel>
          )}
        </div>

        {/* Grading panel */}
        <SettingsPanel className="lg:sticky lg:top-6 lg:self-start">
          {selectedSubmission ? (
            <>
              <SettingsHeader
                eyebrow="Reviewing"
                title={`${selectedSubmission.contact?.first_name || "Student"} ${
                  selectedSubmission.contact?.last_name || ""
                }`.trim()}
                description={selectedSubmission.contact?.email}
              />
              <SettingsBody className="space-y-5">
                {selectedSubmission.text_submission && (
                  <div className="space-y-1.5">
                    <SectionLabel>Text answer</SectionLabel>
                    <div className="whitespace-pre-line rounded-xl border border-dash-border bg-dash-surface/70 p-3.5 text-[13px] leading-relaxed text-dash-text">
                      {selectedSubmission.text_submission}
                    </div>
                  </div>
                )}

                {selectedSubmission.file_url && (
                  <div className="space-y-1.5">
                    <SectionLabel>Attached file</SectionLabel>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dash-border bg-white p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="size-4 shrink-0 text-sky-500" />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-dash-text">
                            {selectedSubmission.file_name || "Uploaded file"}
                          </div>
                          {selectedSubmission.file_size && (
                            <div className="text-[11px] text-dash-textMuted">
                              {(selectedSubmission.file_size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          )}
                        </div>
                      </div>
                      <a
                        href={selectedSubmission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg border border-dash-border bg-white p-2 text-dash-text transition-colors hover:bg-dash-surface"
                        title="Download"
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <SectionLabel>Instructor feedback</SectionLabel>
                  <TextArea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Point out what worked, what to fix, or congratulate them…"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-dash-border pt-4">
                  <button
                    type="button"
                    onClick={() => handleGrade(selectedSubmission.id, "passed")}
                    disabled={isPending}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 [&_svg]:size-4"
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : <Check />} Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGrade(selectedSubmission.id, "failed")}
                    disabled={isPending}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-rose-600 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60 [&_svg]:size-4"
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : <X />} Fail
                  </button>
                </div>
              </SettingsBody>
            </>
          ) : (
            <SettingsBody>
              <EmptyState
                icon={<ClipboardList />}
                title="Nothing selected"
                description="Pick a submission from the list to review files and record a grade."
              />
            </SettingsBody>
          )}
        </SettingsPanel>
      </div>
    </div>
  );
}

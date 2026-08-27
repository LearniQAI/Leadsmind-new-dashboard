"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Users,
  DollarSign,
  Award,
  Percent,
  BookOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getCourseAnalytics } from "@/app/actions/lms";
import { toast } from "sonner";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  StatCard,
  StatusPill,
  EmptyState,
  LoadingState,
  PrimaryButton,
} from "./settings/primitives";

interface CourseAnalyticsTabProps {
  courseId: string;
}

export default function CourseAnalyticsTab({ courseId }: CourseAnalyticsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchAnalytics = () => {
    startTransition(async () => {
      try {
        const res = await getCourseAnalytics(courseId);
        if (res.error) toast.error(res.error);
        else setData(res.data);
      } catch (err: any) {
        toast.error("Failed to load analytics: " + err.message);
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [courseId]);

  if (loading || isPending) return <LoadingState label="Loading analytics…" />;

  if (!data) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title="Couldn’t load analytics"
        description="Something went wrong fetching this course’s data."
        action={
          <PrimaryButton type="button" onClick={fetchAnalytics}>
            Try again
          </PrimaryButton>
        }
      />
    );
  }

  const { summary, students, quizAttempts } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
          Analytics
        </div>
        <h2 className="text-[15px] font-semibold text-dash-text">Course performance</h2>
        <p className="text-[13px] text-dash-textMuted">
          Enrolment, revenue and progress across everyone taking this course.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={summary.totalEnrollments}
          sub="Registered in this course"
          icon={<Users />}
          tone="sky"
        />
        <StatCard
          label="Earnings"
          value={`$${summary.totalEarnings.toFixed(2)}`}
          sub={`${summary.totalEnrollments} × $${summary.coursePrice.toFixed(2)}`}
          icon={<DollarSign />}
          tone="emerald"
        />
        <StatCard
          label="Completions"
          value={summary.completedStudentsCount}
          sub={`${summary.completionRate}% completion rate`}
          icon={<Award />}
          tone="violet"
        />
        <StatCard
          label="Avg. progress"
          value={`${summary.averageProgress}%`}
          sub="Across all participants"
          icon={<Percent />}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roster */}
        <SettingsPanel className="lg:col-span-2">
          <SettingsHeader
            title="Enrolment roster"
            description="Every student and where they are in the course."
          />
          {students.length === 0 ? (
            <SettingsBody>
              <EmptyState icon={<Users />} title="No students yet" description="Nobody has enrolled in this course." />
            </SettingsBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-dash-border text-[11px] font-semibold uppercase tracking-[0.06em] text-dash-textMuted">
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Enrolled</th>
                    <th className="px-6 py-3">Lessons</th>
                    <th className="w-40 px-6 py-3">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {students.map((student: any) => (
                    <tr key={student.contactId} className="transition-colors hover:bg-dash-surface/60">
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-dash-text">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-[11px] text-dash-textMuted">{student.email}</div>
                      </td>
                      <td className="px-6 py-3.5 text-[12px] text-dash-textMuted">
                        {new Date(student.enrolledAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-dash-text">
                        {student.completedLessons}
                        <span className="text-dash-textMuted"> / {summary.totalLessons}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-sky-500 transition-all duration-500 motion-reduce:transition-none"
                              style={{ width: `${student.progressPercentage}%` }}
                            />
                          </div>
                          <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-dash-textMuted">
                            {student.progressPercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SettingsPanel>

        {/* Quiz activity */}
        <SettingsPanel>
          <SettingsHeader title="Quiz activity" description="Recent attempts and scores." />
          <SettingsBody>
            {quizAttempts.length === 0 ? (
              <EmptyState icon={<CheckCircle2 />} title="No attempts yet" />
            ) : (
              <div className="custom-scrollbar max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {quizAttempts.map((attempt: any) => (
                  <div
                    key={attempt.id}
                    className="rounded-xl border border-dash-border bg-white p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h5 className="truncate text-[13px] font-semibold text-dash-text">
                          {attempt.quizTitle}
                        </h5>
                        <span className="text-[11px] text-dash-textMuted">{attempt.studentName}</span>
                      </div>
                      {attempt.passed ? (
                        <StatusPill tone="green">
                          <CheckCircle2 /> Passed
                        </StatusPill>
                      ) : (
                        <StatusPill tone="red">
                          <XCircle /> Failed
                        </StatusPill>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-end justify-between">
                      <span className="text-[13px] font-semibold text-dash-text">
                        {attempt.score}
                        <span className="text-dash-textMuted">
                          {" "}
                          / {attempt.maxScore} ({attempt.percentage}%)
                        </span>
                      </span>
                      <span className="text-[11px] text-dash-textMuted">
                        {new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SettingsBody>
        </SettingsPanel>
      </div>
    </div>
  );
}

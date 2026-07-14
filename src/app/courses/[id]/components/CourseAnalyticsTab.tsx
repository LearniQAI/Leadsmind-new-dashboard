"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Users, DollarSign, Award, Percent, Loader2, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { getCourseAnalytics } from "@/app/actions/lms";
import { toast } from "sonner";

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
        if (res.error) {
          toast.error(res.error);
        } else {
          setData(res.data);
        }
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

  if (loading || isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white border border-dash-border rounded-2xl shadow-sm">
        <Loader2 className="animate-spin !text-dash-accent motion-reduce:animate-none" size={32} />
        <p className="text-xs !text-dash-textMuted">
          Loading analytics...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white border border-dash-border rounded-2xl shadow-sm !text-dash-textMuted">
        Failed to fetch analytics data. Click below to try again.
        <button
          onClick={fetchAnalytics}
          className="mt-4 block mx-auto px-4 py-2 bg-dash-accent hover:opacity-90 text-white rounded-lg text-xs font-bold transition-opacity motion-reduce:transition-none"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, students, quizAttempts } = data;

  return (
    <div className="space-y-8">
      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Enrollments */}
        <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6 flex items-center justify-between relative overflow-hidden group hover:border-dash-accent/30 transition-all motion-reduce:transition-none">
          <div className="space-y-2">
            <span className="text-[10px] font-bold !text-dash-textMuted">Total students</span>
            <h3 className="text-2xl font-bold !text-dash-text">{summary.totalEnrollments}</h3>
            <p className="text-xs !text-dash-textMuted">Registered in this course</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform motion-reduce:transition-none">
            <Users size={20} />
          </div>
        </div>

        {/* Estimated Earnings */}
        <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6 flex items-center justify-between relative overflow-hidden group hover:border-dash-accent/30 transition-all motion-reduce:transition-none">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-700">Total earnings</span>
            <h3 className="text-2xl font-bold !text-dash-text">${summary.totalEarnings.toFixed(2)}</h3>
            <p className="text-xs !text-dash-textMuted">
              {summary.totalEnrollments} x ${summary.coursePrice.toFixed(2)} USD
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform motion-reduce:transition-none">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Course Completions */}
        <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6 flex items-center justify-between relative overflow-hidden group hover:border-dash-accent/30 transition-all motion-reduce:transition-none">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-purple-700">Completions</span>
            <h3 className="text-2xl font-bold !text-dash-text">{summary.completedStudentsCount}</h3>
            <p className="text-xs !text-dash-textMuted">{summary.completionRate}% completion rate</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform motion-reduce:transition-none">
            <Award size={20} />
          </div>
        </div>

        {/* Average Course Progress */}
        <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6 flex items-center justify-between relative overflow-hidden group hover:border-dash-accent/30 transition-all motion-reduce:transition-none">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-cyan-700">Avg. progress</span>
            <h3 className="text-2xl font-bold !text-dash-text">{summary.averageProgress}%</h3>
            <p className="text-xs !text-dash-textMuted">Across all participants</p>
          </div>
          <div className="w-12 h-12 bg-cyan-50 rounded-xl border border-cyan-100 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform motion-reduce:transition-none">
            <Percent size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Student list and quiz log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Student Progress List */}
        <div className="lg:col-span-2 bg-white border border-dash-border rounded-2xl shadow-sm p-6 space-y-6">
          <div className="border-b border-dash-border pb-4">
            <h4 className="text-sm font-bold !text-dash-text">Student enrollment roster</h4>
            <p className="text-xs !text-dash-textMuted mt-1">
              Participants registered and active progress tracking
            </p>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-10 !text-dash-textMuted text-xs">
              No students enrolled in this course yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-dash-border text-[10px] font-bold !text-dash-textMuted">
                    <th className="py-3 px-2">Student</th>
                    <th className="py-3 px-2">Enrollment date</th>
                    <th className="py-3 px-2">Completed lessons</th>
                    <th className="py-3 px-2 w-32">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {students.map((student: any) => (
                    <tr key={student.contactId} className="hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
                      <td className="py-4 px-2">
                        <div className="font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-[10px] !text-dash-textMuted mt-0.5">{student.email}</div>
                      </td>
                      <td className="py-4 px-2 !text-dash-textMuted text-[10px]">
                        {new Date(student.enrolledAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </td>
                      <td className="py-4 px-2 !text-dash-text font-bold">
                        {student.completedLessons} / {summary.totalLessons}
                      </td>
                      <td className="py-4 px-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] !text-dash-textMuted font-bold">
                            <span>{student.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-dash-surface h-2 rounded-full overflow-hidden border border-dash-border">
                            <div
                              className="bg-dash-accent h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                              style={{ width: `${student.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quiz attempts Log */}
        <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6 space-y-6">
          <div className="border-b border-dash-border pb-4">
            <h4 className="text-sm font-bold !text-dash-text">Quiz activity</h4>
            <p className="text-xs !text-dash-textMuted mt-1">
              Recent quiz submissions and metrics
            </p>
          </div>

          {quizAttempts.length === 0 ? (
            <div className="text-center py-10 !text-dash-textMuted text-xs">
              No quiz attempts logged yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {quizAttempts.map((attempt: any) => (
                <div
                  key={attempt.id}
                  className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-3 hover:border-dash-accent/30 transition-colors motion-reduce:transition-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold !text-dash-text leading-tight">
                        {attempt.quizTitle}
                      </h5>
                      <span className="text-[10px] font-bold !text-dash-textMuted block">
                        {attempt.studentName}
                      </span>
                    </div>

                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 flex items-center gap-1 ${
                      attempt.passed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}>
                      {attempt.passed ? (
                        <>
                          <CheckCircle size={10} /> Passed
                        </>
                      ) : (
                        <>
                          <XCircle size={10} /> Failed
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold !text-dash-textMuted block">Score achieved</span>
                      <span className="text-xs font-bold !text-dash-text">
                        {attempt.score} / {attempt.maxScore} <span className="text-[10px] !text-dash-textMuted font-normal">({attempt.percentage}%)</span>
                      </span>
                    </div>

                    <span className="text-[10px] !text-dash-textMuted font-bold">
                      {new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

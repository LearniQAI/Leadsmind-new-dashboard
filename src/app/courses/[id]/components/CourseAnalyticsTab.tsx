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
      <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-[#080f28] border border-white/5 rounded-2xl">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-white/40 font-mono uppercase tracking-widest">
          Compiling analytics matrix...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-[#080f28] border border-white/5 rounded-2xl text-white/40 font-body">
        Failed to fetch analytics data. Click below to try again.
        <button
          onClick={fetchAnalytics}
          className="mt-4 block mx-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs uppercase font-bold tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, students, quizAttempts } = data;

  return (
    <div className="space-y-8 font-body">
      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Enrollments */}
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Total Students</span>
            <h3 className="text-3xl font-space-grotesk font-black text-white">{summary.totalEnrollments}</h3>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Registered in this course</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl border border-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Users size={20} />
          </div>
        </div>

        {/* Estimated Earnings */}
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Total Earnings</span>
            <h3 className="text-3xl font-space-grotesk font-black text-white">${summary.totalEarnings.toFixed(2)}</h3>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
              {summary.totalEnrollments} x ${summary.coursePrice.toFixed(2)} USD
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl border border-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Course Completions */}
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-400">Completions</span>
            <h3 className="text-3xl font-space-grotesk font-black text-white">{summary.completedStudentsCount}</h3>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{summary.completionRate}% Completion Rate</p>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl border border-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Award size={20} />
          </div>
        </div>

        {/* Average Course Progress */}
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">Avg. Progress</span>
            <h3 className="text-3xl font-space-grotesk font-black text-white">{summary.averageProgress}%</h3>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Across all participants</p>
          </div>
          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl border border-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <Percent size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Student list and quiz log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Student Progress List */}
        <div className="lg:col-span-2 bg-[#080f28] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="border-b border-white/5 pb-4">
            <h4 className="text-sm font-black font-space-grotesk uppercase tracking-wider text-white">Student Enrollment Roster</h4>
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">
              Participants registered and active progress tracking
            </p>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-xs uppercase font-mono tracking-widest">
              No students enrolled in this course yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-white/40">
                    <th className="py-3 px-2">Student</th>
                    <th className="py-3 px-2">Enrollment Date</th>
                    <th className="py-3 px-2">Completed Lessons</th>
                    <th className="py-3 px-2 w-32">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map((student: any) => (
                    <tr key={student.contactId} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 px-2">
                        <div className="font-bold text-white group-hover:text-primary transition-colors">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-[10px] text-white/40 font-mono mt-0.5">{student.email}</div>
                      </td>
                      <td className="py-4 px-2 text-white/60 font-mono text-[10px]">
                        {new Date(student.enrolledAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </td>
                      <td className="py-4 px-2 text-white/80 font-mono font-bold">
                        {student.completedLessons} / {summary.totalLessons}
                      </td>
                      <td className="py-4 px-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono text-white/60 font-bold">
                            <span>{student.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-primary to-cyan-400 h-full rounded-full transition-all duration-500"
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
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="border-b border-white/5 pb-4">
            <h4 className="text-sm font-black font-space-grotesk uppercase tracking-wider text-white">Quiz Activity</h4>
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">
              Recent quiz submissions and metrics
            </p>
          </div>

          {quizAttempts.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-xs uppercase font-mono tracking-widest">
              No quiz attempts logged yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {quizAttempts.map((attempt: any) => (
                <div
                  key={attempt.id}
                  className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h5 className="text-[11px] font-black uppercase text-white tracking-tight leading-tight">
                        {attempt.quizTitle}
                      </h5>
                      <span className="text-[9px] font-bold text-white/50 block">
                        {attempt.studentName}
                      </span>
                    </div>

                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0 flex items-center gap-1 ${
                      attempt.passed
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
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
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 block">Score Achieved</span>
                      <span className="text-xs font-mono font-black text-white">
                        {attempt.score} / {attempt.maxScore} <span className="text-[10px] text-white/40 font-normal">({attempt.percentage}%)</span>
                      </span>
                    </div>

                    <span className="text-[9px] font-mono text-white/30 font-bold uppercase">
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

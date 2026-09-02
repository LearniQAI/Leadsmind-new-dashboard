"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  FileEdit,
  ListChecks,
  Layers,
  ArrowRight,
  Search,
} from "lucide-react";
import type { GradingQueueItem } from "@/app/actions/courseGrading";

interface NeedsGradingClientProps {
  items: GradingQueueItem[];
}

const KIND_META: Record<GradingQueueItem["kind"], { label: string; icon: React.ReactNode; tint: string }> = {
  assignment: { label: "Assignment", icon: <FileEdit size={13} />, tint: "bg-violet-50 text-violet-700 ring-violet-500/15" },
  lesson_quiz: { label: "Quiz (file upload)", icon: <ListChecks size={13} />, tint: "bg-sky-50 text-sky-700 ring-sky-500/15" },
  module_quiz: { label: "Module quiz (file upload)", icon: <Layers size={13} />, tint: "bg-amber-50 text-amber-700 ring-amber-500/15" },
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Batch 8 (G12) — the real, unified cross-course "needs your attention" queue for
 *  instructors: assignment submissions (grade_status='pending') and file-upload quiz
 *  attempts (grade_status='pending_review', Batch 2) across every course in the workspace,
 *  in one place. Grading itself always happens on the real existing screens (Submissions tab
 *  / a quiz's Results tab) — this page only enumerates and deep-links, it never grades. */
export default function NeedsGradingClient({ items }: NeedsGradingClientProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | GradingQueueItem["kind"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      if (!q) return true;
      const hay = `${it.studentName} ${it.studentEmail || ""} ${it.title} ${it.courseTitle}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, kindFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { assignment: 0, lesson_quiz: 0, module_quiz: 0 };
    for (const it of items) c[it.kind] = (c[it.kind] || 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-[26px] md:text-[30px] font-semibold leading-tight tracking-[-0.02em] !text-dash-text flex items-center gap-2.5">
            <ClipboardCheck className="!text-dash-accent" size={26} />
            Needs grading
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed !text-dash-textMuted">
            Every assignment and file-upload quiz answer waiting on a grade, across every course.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-dash-border bg-white px-4 py-2.5 transition-colors focus-within:border-dash-accent">
            <Search className="mr-2 size-4 shrink-0 !text-dash-textMuted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, lesson, course…"
              className="w-56 bg-transparent text-[13px] !text-dash-text outline-none placeholder:!text-dash-textMuted"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            className="rounded-xl border border-dash-border bg-white px-3 py-2.5 text-[13px] !text-dash-text outline-none focus:border-dash-accent"
          >
            <option value="all">All types ({items.length})</option>
            <option value="assignment">Assignments ({counts.assignment})</option>
            <option value="lesson_quiz">Lesson quizzes ({counts.lesson_quiz})</option>
            <option value="module_quiz">Module quizzes ({counts.module_quiz})</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-dash-border bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/15">
              <ClipboardCheck size={22} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold !text-dash-text">
                {items.length === 0 ? "Nothing needs grading" : "No matches"}
              </h3>
              <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed !text-dash-textMuted">
                {items.length === 0
                  ? "Every submission and file-upload quiz answer across your courses has been graded."
                  : "Try a different search or type filter."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface/60 text-[11px] font-semibold uppercase tracking-[0.06em] !text-dash-textMuted">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {filtered.map((item) => {
                  const meta = KIND_META[item.kind];
                  return (
                    <tr key={`${item.kind}-${item.id}`} className="transition-colors hover:bg-dash-surface/50">
                      <td className="px-5 py-3.5">
                        <div className="font-medium !text-dash-text">{item.studentName}</div>
                        {item.studentEmail && (
                          <div className="text-[11px] !text-dash-textMuted">{item.studentEmail}</div>
                        )}
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-3.5 !text-dash-text">{item.title}</td>
                      <td className="max-w-[180px] truncate px-5 py-3.5 !text-dash-textMuted">{item.courseTitle}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${meta.tint}`}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] !text-dash-textMuted">{fmtDate(item.submittedAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold !text-dash-accent hover:opacity-80"
                        >
                          Grade <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

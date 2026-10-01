"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import QuizRulesFields, { DEFAULT_QUIZ_RULES } from "@/components/lms/QuizRulesFields";
import { StatusPill, CARD_SHADOW } from "../../../components/settings/primitives";
import {
  getModuleQuizSettingsOverview,
  saveModuleQuizDefaults,
  type ModuleQuizRules,
  type ModuleQuizSettingsOverview,
} from "@/app/actions/moduleQuizzes";

interface Props {
  course: { id: string; title: string };
  courseModule: { id: string; title: string };
  initialOverview: ModuleQuizSettingsOverview | null;
  loadError: string | null;
}

// Brand blue = the dashboard accent token (#1359FF, the LeadsMind logo blue). It is deliberately
// the fixed `dash-accent` token, not `primary`, which BrandingProvider recolours per workspace.
const btnPrimary =
  "inline-flex h-11 items-center gap-2 rounded-xl bg-dash-accent px-6 text-[12px] font-semibold text-white shadow-sm shadow-dash-accent/25 transition-colors hover:bg-dash-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
const btnSecondary =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface disabled:opacity-60";

const sameRules = (a: ModuleQuizRules, b: ModuleQuizRules) =>
  a.passPercentage === b.passPercentage &&
  a.timeLimitMinutes === b.timeLimitMinutes &&
  a.maxAttempts === b.maxAttempts &&
  a.randomizeQuestions === b.randomizeQuestions &&
  a.isRequired === b.isRequired;

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-dash-border bg-white px-4 py-3">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">{label}</span>
      <span className="mt-1 block font-display text-[18px] font-semibold tabular-nums !text-dash-text">{value}</span>
    </div>
  );
}

export default function ModuleQuizSettingsClient({ course, courseModule, initialOverview, loadError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quizzes, setQuizzes] = useState(initialOverview?.quizzes ?? []);
  // `saved` is what students are graded against right now; null = the module has no settings yet
  // and the built-in defaults apply.
  const [saved, setSaved] = useState<ModuleQuizRules | null>(initialOverview?.defaults ?? null);
  const [rules, setRules] = useState<ModuleQuizRules>(initialOverview?.defaults ?? DEFAULT_QUIZ_RULES);

  const listPath = `/courses/${course.id}/module-quiz/${courseModule.id}`;
  const dirty = saved === null ? true : !sameRules(rules, saved);
  const live = saved ?? DEFAULT_QUIZ_RULES;

  const save = () =>
    startTransition(async () => {
      const res = await saveModuleQuizDefaults(courseModule.id, rules);
      if (res.error) return void toast.error(res.error);
      setSaved(rules);
      toast.success("Module quiz settings saved.");
      const fresh = await getModuleQuizSettingsOverview(courseModule.id);
      if (fresh.data) setQuizzes(fresh.data.quizzes);
    });

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-[13px] !text-dash-textMuted">
        <Link href="/courses" className="hover:!text-dash-text">LMS</Link>
        <span className="opacity-40">/</span>
        <Link href={`/courses/${course.id}`} className="truncate hover:!text-dash-text">{course.title}</Link>
        <span className="opacity-40">/</span>
        <Link href={listPath} className="hover:!text-dash-text">Quizzes</Link>
        <span className="opacity-40">/</span>
        <span className="font-semibold !text-dash-text">Settings</span>
      </nav>

      <div className="space-y-2.5 border-b border-dash-border pb-7">
        <button onClick={() => router.push(listPath)} className={btnSecondary}>
          <ArrowLeft size={14} /> Back to quizzes
        </button>
        <div className="flex items-center gap-2 pt-2">
          <span className="h-1 w-1 rounded-full bg-dash-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dash-accent">Module quiz settings</span>
        </div>
        <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] !text-dash-text md:text-[32px]">
          <span className="font-normal !text-dash-textMuted">Settings for </span>
          {courseModule.title}
        </h1>
        <p className="text-[13px] leading-relaxed !text-dash-textMuted">
          One set of rules for every quiz in this module — individual quizzes can&apos;t have their own.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-[13px] text-rose-700">{loadError}</div>
      ) : (
        <>
          {saved === null && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-[12.5px] leading-relaxed text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p className="mb-0">
                <strong>Not set yet.</strong> Until you save, students are graded with the built-in defaults: 70% to pass,
                unlimited attempts, no time limit, required for completion. Review the rules below and save them.
              </p>
            </div>
          )}

          {/* What students are graded against right now (last saved values). */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Rules currently in force">
            <SummaryTile label="Pass mark" value={`${live.passPercentage}%`} />
            <SummaryTile label="Time limit" value={live.timeLimitMinutes > 0 ? `${live.timeLimitMinutes} min` : "None"} />
            <SummaryTile label="Attempts" value={live.maxAttempts === -1 ? "Unlimited" : String(live.maxAttempts)} />
            <SummaryTile label="Required" value={live.isRequired ? "Yes" : "No"} />
          </div>

          <section className={`rounded-2xl border border-dash-border bg-white p-6 md:p-7 ${CARD_SHADOW}`}>
            <div className="mb-5 flex items-start gap-3 border-b border-dash-border pb-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dash-accent/10 text-dash-accent">
                <SlidersHorizontal size={18} />
              </span>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dash-accent">Configuration</span>
                <h2 className="mt-1 font-display text-[20px] font-semibold tracking-[-0.01em] !text-dash-text">Quiz rules</h2>
                <p className="mb-0 mt-1 text-[12px] leading-relaxed !text-dash-textMuted">
                  Changes apply to every quiz in this module straight away, including attempts students start afterwards.
                </p>
              </div>
            </div>

            <QuizRulesFields value={rules} onChange={setRules} />

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-dash-border pt-5">
              {saved !== null && (
                <span className={`mr-auto inline-flex items-center gap-1.5 text-[11.5px] font-medium ${dirty ? "text-amber-700" : "text-emerald-700"}`}>
                  {dirty ? "Unsaved changes" : (<><CheckCircle2 size={13} /> Saved</>)}
                </span>
              )}
              <button onClick={save} disabled={isPending || !dirty} className={btnPrimary}>
                {isPending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
                Save module settings
              </button>
            </div>
          </section>

          <section className={`rounded-2xl border border-dash-border bg-white p-6 md:p-7 ${CARD_SHADOW}`}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dash-accent">Applies to</span>
            <h2 className="mt-1 font-display text-[20px] font-semibold tracking-[-0.01em] !text-dash-text">Quizzes in this module</h2>
            <p className="mb-4 mt-1 text-[12px] leading-relaxed !text-dash-textMuted">
              {quizzes.length === 0
                ? "No quizzes yet. Every quiz you add follows these rules."
                : `All ${quizzes.length} ${quizzes.length === 1 ? "quiz follows" : "quizzes follow"} these rules, including ones you add later.`}
            </p>

            {quizzes.length > 0 && (
              <ul className="divide-y divide-dash-border overflow-hidden rounded-xl border border-dash-border">
                {quizzes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`${listPath}/${q.id}`}
                      className="group flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-dash-surface"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold !text-dash-text">{q.title}</span>
                      {q.status === "draft" ? <StatusPill tone="slate">Draft</StatusPill> : <StatusPill tone="green">Published</StatusPill>}
                      <ChevronRight size={14} className="shrink-0 !text-dash-textMuted transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

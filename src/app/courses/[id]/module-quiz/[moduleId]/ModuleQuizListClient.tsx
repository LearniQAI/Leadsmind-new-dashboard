"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QuizDialog from "./QuizDialog";
import { StatusPill, CARD_SHADOW } from "../../components/settings/primitives";
import {
  createModuleQuiz,
  deleteModuleQuiz,
  listModuleQuizzes,
  updateModuleQuiz,
  type ModuleQuizListItem,
} from "@/app/actions/moduleQuizzes";

interface Props {
  course: { id: string; title: string };
  courseModule: { id: string; title: string };
  initialQuizzes: ModuleQuizListItem[];
  loadError: string | null;
}

const btnPrimary =
  "inline-flex h-11 items-center gap-2 rounded-full bg-sky-500 px-5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60 [&_svg]:size-4";
const btnSecondary =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface disabled:opacity-60";
const btnDialogPrimary =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60";
const textInput =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-3 text-[13px] !text-dash-text outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12";

function formatEdited(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function ModuleQuizListClient({ course, courseModule, initialQuizzes, loadError }: Props) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<ModuleQuizListItem[]>(initialQuizzes);
  const [isPending, startTransition] = useTransition();

  // One dialog handles both "create" (target null) and "rename" (target = quiz).
  const [nameDialog, setNameDialog] = useState<{ open: boolean; target: ModuleQuizListItem | null }>({ open: false, target: null });
  const [nameValue, setNameValue] = useState("");
  const [deleting, setDeleting] = useState<ModuleQuizListItem | null>(null);

  const basePath = `/courses/${course.id}/module-quiz/${courseModule.id}`;

  const reload = async () => {
    const res = await listModuleQuizzes(courseModule.id);
    if (res.data) setQuizzes(res.data);
  };

  const openCreate = () => {
    setNameValue(`Quiz ${quizzes.length + 1}`);
    setNameDialog({ open: true, target: null });
  };

  const openRename = (quiz: ModuleQuizListItem) => {
    setNameValue(quiz.title);
    setNameDialog({ open: true, target: quiz });
  };

  const submitName = () => {
    const title = nameValue.trim();
    if (!title) {
      toast.error("Give the quiz a title.");
      return;
    }
    const target = nameDialog.target;
    startTransition(async () => {
      if (target) {
        const res = await updateModuleQuiz(target.id, { title });
        if (res.error) return void toast.error(res.error);
        setNameDialog({ open: false, target: null });
        toast.success("Quiz renamed.");
        await reload();
      } else {
        const res = await createModuleQuiz(courseModule.id, title);
        if (res.error || !res.data) return void toast.error(res.error || "Could not create the quiz.");
        setNameDialog({ open: false, target: null });
        router.push(`${basePath}/${res.data.id}`);
      }
    });
  };

  const togglePublish = (quiz: ModuleQuizListItem) => {
    const next = quiz.status === "published" ? "draft" : "published";
    startTransition(async () => {
      const res = await updateModuleQuiz(quiz.id, { status: next });
      if (res.error) return void toast.error(res.error);
      toast.success(next === "published" ? "Quiz published — students can now take it." : "Quiz moved back to draft.");
      await reload();
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const res = await deleteModuleQuiz(target.id);
      if (res.error) return void toast.error(res.error);
      setDeleting(null);
      toast.success("Quiz deleted.");
      await reload();
    });
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-[13px] !text-dash-textMuted">
        <Link href="/courses" className="hover:!text-dash-text">LMS</Link>
        <span className="opacity-40">/</span>
        <Link href={`/courses/${course.id}`} className="truncate hover:!text-dash-text">{course.title}</Link>
        <span className="opacity-40">/</span>
        <span className="truncate font-semibold !text-dash-text">Quizzes</span>
      </nav>

      <div className="flex flex-col gap-6 border-b border-dash-border pb-7 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2.5">
          <button onClick={() => router.push(`/courses/${course.id}`)} className={btnSecondary}>
            <ArrowLeft size={14} /> Back to course
          </button>
          <div className="flex items-center gap-2 pt-2">
            <span className="h-1 w-1 rounded-full bg-sky-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">Module quizzes</span>
          </div>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] !text-dash-text md:text-[32px]">
            <span className="font-normal !text-dash-textMuted">Quizzes for </span>
            {courseModule.title}
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Students see published quizzes once they finish the module&apos;s lessons. Pass mark, attempts, time limit and completion rules are set once for the whole module in Module quiz settings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Quiet outlined button in the brand blue: the module's shared rules, secondary to creating. */}
          <Link
            href={`${basePath}/settings`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-dash-accent/25 bg-white px-5 text-[12px] font-semibold text-dash-accent transition-colors hover:border-dash-accent/50 hover:bg-dash-accent/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none [&_svg]:size-4"
          >
            <SlidersHorizontal /> Module quiz settings
          </Link>
          {quizzes.length > 0 && (
            <button onClick={openCreate} disabled={isPending} className={btnPrimary}>
              <Plus /> Create new quiz
            </button>
          )}
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-[13px] text-rose-700">{loadError}</div>
      ) : quizzes.length === 0 ? (
        <div className={`rounded-2xl border border-dashed border-dash-border bg-white px-6 py-14 text-center ${CARD_SHADOW}`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
            <HelpCircle size={24} />
          </div>
          <h2 className="mt-4 font-display text-[17px] font-semibold !text-dash-text">No quizzes yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed !text-dash-textMuted">
            Create a quiz to assess this module. You can add as many quizzes as you like.
          </p>
          <button onClick={openCreate} disabled={isPending} className={`${btnPrimary} mt-6`}>
            <Plus /> Create new quiz
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className={`group flex items-center gap-4 rounded-2xl border border-dash-border bg-white px-5 py-4 transition-colors hover:border-sky-500/40 ${CARD_SHADOW}`}
            >
              <Link href={`${basePath}/${quiz.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
                  <HelpCircle size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-[15px] font-semibold !text-dash-text">{quiz.title}</span>
                    {quiz.status === "published" ? (
                      <StatusPill tone="green">Published</StatusPill>
                    ) : (
                      <StatusPill tone="slate">Draft</StatusPill>
                    )}
                    {quiz.status === "published" && quiz.questionCount === 0 && (
                      <StatusPill tone="amber">Hidden — no questions</StatusPill>
                    )}
                  </span>
                  <span className="mt-1 block text-[12px] !text-dash-textMuted">
                    {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}
                    {" · "}
                    {quiz.attemptCount} {quiz.attemptCount === 1 ? "attempt" : "attempts"}
                    {" · "}Edited {formatEdited(quiz.updatedAt)}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 !text-dash-textMuted transition-transform group-hover:translate-x-0.5" />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={`Actions for ${quiz.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => togglePublish(quiz)}>
                    {quiz.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                    {quiz.status === "published" ? "Unpublish" : "Publish"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openRename(quiz)}>
                    <Pencil size={14} /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleting(quiz)} className="text-rose-600 focus:text-rose-600">
                    <Trash2 size={14} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <QuizDialog
        open={nameDialog.open}
        onOpenChange={(open) => !isPending && setNameDialog((s) => ({ ...s, open }))}
        icon={nameDialog.target ? <Pencil /> : <HelpCircle />}
        title={nameDialog.target ? "Rename quiz" : "Create new quiz"}
        description={
          nameDialog.target
            ? "Students see this title in the course."
            : "It starts as a draft. Students can't see it until you publish it."
        }
        footer={
          <>
            <button onClick={() => setNameDialog({ open: false, target: null })} disabled={isPending} className={btnSecondary}>
              Cancel
            </button>
            <button onClick={submitName} disabled={isPending || !nameValue.trim()} className={btnDialogPrimary}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {nameDialog.target ? "Save" : "Create and open"}
            </button>
          </>
        }
      >
        <label htmlFor="quiz-name" className="mb-1.5 block text-[12px] font-semibold !text-dash-text">
          Quiz name
        </label>
        <input
          id="quiz-name"
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitName()}
          placeholder="e.g. Quiz 1: Adjectives basics"
          maxLength={200}
          className={textInput}
        />
        <p className="mb-0 mt-1.5 text-right text-[11px] tabular-nums !text-dash-textMuted">{nameValue.length}/200</p>
      </QuizDialog>

      <QuizDialog
        open={!!deleting}
        onOpenChange={(open) => !open && !isPending && setDeleting(null)}
        tone="rose"
        icon={<Trash2 />}
        title={<>Delete &ldquo;{deleting?.title}&rdquo;?</>}
        description={
          <>
            Its {deleting?.questionCount ?? 0} questions and settings are deleted permanently.
            {deleting?.attemptCount
              ? ` The ${deleting.attemptCount} student attempts stay in their history, and students no longer need to pass this quiz to complete the course.`
              : ""}
          </>
        }
        footer={
          <>
            <button onClick={() => setDeleting(null)} disabled={isPending} className={btnSecondary}>
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Delete quiz
            </button>
          </>
        }
      />
    </div>
  );
}

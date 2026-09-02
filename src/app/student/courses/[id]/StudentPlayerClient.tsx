'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen, ChevronRight, ChevronLeft, ChevronDown, CheckSquare, Clock, FileEdit, FileText, Download, Loader2, X, Check, Settings, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';
import { handleLogout } from '@/app/actions/auth';
import {
  DashDropdown, DashDropdownTrigger, DashDropdownContent, DashDropdownItem, DashDropdownSeparator,
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalDescription, DashModalFooter,
} from '@/components/dashboard-ui';
import { recordBlockCompletion, getCompletedBlockIdsForLesson, getLessonBlockCompletionStatus, getLessonReadingGateStatus, recordLessonReadingCompletion } from '@/app/actions/blockCompletion';
import SyllabusSidebar from './components/SyllabusSidebar';
import VideoPlayer from './components/VideoPlayer';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { getLessonLockReason } from './components/lock-utils';
import LockedLessonPlaceholder from './components/LockedLessonPlaceholder';
import CourseQAWidget from './components/CourseQAWidget';
import LessonSummaryPanel from './components/LessonSummaryPanel';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import { VoiceNotePlayer } from '@/components/common/VoiceNotePlayer';
import ReadingModal from './components/ReadingModal';
import { isSafeEmbedUrl } from '@/lib/security/isSafeEmbedUrl';
import { SandboxedHtml } from '@/components/lms/SandboxedHtml';
import { getCourseTheme } from '@/lib/courses/courseThemeTokens';

function getEmbeddablePdfUrl(url: string): string {
  if (!url) return '';

  if (url.includes('google.com')) {
    const fileIdMatch = url.match(/\/d\/([^/]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1].split('/')[0].split('?')[0];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    try {
      const urlObj = new URL(url);
      const id = urlObj.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    } catch (e) {
      // fallback
    }
  }

  if (url.includes('dropbox.com')) {
    return url.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1');
  }

  if (url.includes('box.com/s/')) {
    return url.replace('/s/', '/embed/s/');
  }

  return url;
}

interface StudentPlayerClientProps {
  course: any;
  modules: any[];
  lessons: any[];
  initialCompletedLessonIds: string[];
  enrollment: any;
  studentName?: string | null;
}

/* --- Shared light-theme building blocks for the lesson renderers --- */

function LessonCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-dash-border bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function PanelHead({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15 [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <h3 className="text-[14px] font-semibold !text-dash-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] !text-dash-textMuted">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function StudentPlayerClient({
  course,
  modules,
  lessons,
  initialCompletedLessonIds,
  enrollment,
  studentName: studentNameProp,
}: StudentPlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedLessonIds);
  const [activeLesson, setActiveLesson] = useState<any>(lessons[0] || null);
  const [isPending, startTransition] = useTransition();
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [submission, setSubmission] = useState<any | null>(null);
  const [textSubmission, setTextSubmission] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [uploadingStudentFile, setUploadingStudentFile] = useState(false);

  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const [openReadingId, setOpenReadingId] = useState<string | null>(null);

  const [completedBlockIds, setCompletedBlockIds] = useState<Set<string>>(new Set());
  const [isCheckingAdvance, setIsCheckingAdvance] = useState(false);

  // Reading gate — only for a canvas lesson made entirely of inline content (heading /
  // rich-text / image) with zero trackable blocks. Such a lesson has no other completion
  // signal, so "Mark complete" stays disabled until the student has scrolled through the
  // article AND dwelled on it for the server-computed minimum, recorded server-side in
  // lesson_reading_completions.
  const [readingGate, setReadingGate] = useState<{ required: boolean; requiredDwell: number; done: boolean }>({
    required: false,
    requiredDwell: 0,
    done: false,
  });
  const [readingScrolled, setReadingScrolled] = useState(false);
  const [readingElapsed, setReadingElapsed] = useState(0);
  const lessonBodyRef = useRef<HTMLDivElement | null>(null);
  const readingRecordedRef = useRef(false);

  // Live per-lesson block-completion tally (server-authoritative), so "Mark complete" can be
  // disabled with an accurate "N of M blocks remaining" indicator instead of only surfacing
  // an error banner after a failed click.
  const [blockStatus, setBlockStatus] = useState<{ total: number; completed: number } | null>(null);
  const [showSoftConfirm, setShowSoftConfirm] = useState(false);

  const refreshBlockStatus = async (lessonId: string) => {
    const res = await getLessonBlockCompletionStatus(lessonId);
    if (res.error || !res.data) return;
    // The reading-gate branch reports a synthetic totalBlocks:1 — that gate is surfaced
    // separately via `readingGate`, so ignore it here.
    if ((res.data as any).readingGate) {
      setBlockStatus(null);
      return;
    }
    setBlockStatus({ total: res.data.totalBlocks, completed: res.data.completedBlocks });
  };

  const markBlockComplete = async (blockId: string, metric: Record<string, any> = {}) => {
    if (completedBlockIds.has(blockId)) return;
    const res = await recordBlockCompletion(blockId, metric);
    if (!res.error) {
      setCompletedBlockIds((prev) => new Set(prev).add(blockId));
      if (activeLesson) refreshBlockStatus(activeLesson.id);
    }
  };

  useEffect(() => {
    if (!activeLesson) return;
    let cancelled = false;
    setBlockStatus(null);

    (async () => {
      const res = await getCompletedBlockIdsForLesson(activeLesson.id);
      if (cancelled) return;
      const already = new Set<string>(!res.error ? res.data : []);
      setCompletedBlockIds(already);

      for (const block of activeLesson.contentBlocks || []) {
        if (block.completion_rule === 'none' && !already.has(block.id)) {
          const res2 = await recordBlockCompletion(block.id, { auto: true });
          if (!res2.error && !cancelled) {
            setCompletedBlockIds((prev) => new Set(prev).add(block.id));
          }
        }
      }

      if (!cancelled) await refreshBlockStatus(activeLesson.id);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

  // ---- Reading gate (inline-only canvas lessons) ----
  useEffect(() => {
    setReadingScrolled(false);
    setReadingElapsed(0);
    readingRecordedRef.current = false;

    if (!activeLesson) {
      setReadingGate({ required: false, requiredDwell: 0, done: false });
      return;
    }
    const items = (activeLesson.canvasItems as any[] | null) || null;
    const inlineOnly =
      Array.isArray(items) &&
      items.length > 0 &&
      items.some((i) => i.kind === 'heading' || i.kind === 'richtext' || i.kind === 'image') &&
      !items.some((i) => i.kind === 'block' || (i.kind === 'contentbox' && !!i.blockId));

    if (!inlineOnly) {
      setReadingGate({ required: false, requiredDwell: 0, done: false });
      return;
    }

    let cancelled = false;
    setReadingGate({ required: true, requiredDwell: 0, done: false });
    getLessonReadingGateStatus(activeLesson.id).then((res) => {
      if (cancelled || res.error || !res.data) return;
      setReadingGate({ required: res.data.required, requiredDwell: res.data.requiredDwell, done: res.data.done });
      if (res.data.done) readingRecordedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

  // Dwell timer, running only while the gate is still pending.
  useEffect(() => {
    if (!readingGate.required || readingGate.done) return;
    const id = setInterval(() => setReadingElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [readingGate.required, readingGate.done]);

  // A short article that never needs a scrollbar counts as "scrolled through".
  useEffect(() => {
    if (!readingGate.required || readingScrolled) return;
    const el = lessonBodyRef.current;
    if (el && el.scrollHeight - el.clientHeight < 48) setReadingScrolled(true);
  }, [readingGate.required, readingScrolled, activeLesson?.id]);

  // Once scrolled through AND past the dwell floor, write the real server record.
  useEffect(() => {
    if (
      !activeLesson ||
      !readingGate.required ||
      readingGate.done ||
      readingRecordedRef.current ||
      !readingScrolled ||
      readingElapsed < readingGate.requiredDwell
    ) {
      return;
    }
    readingRecordedRef.current = true;
    recordLessonReadingCompletion(activeLesson.id, { dwellSeconds: readingElapsed, scrolled: true }).then((res) => {
      if (res.error) {
        readingRecordedRef.current = false; // transient — allow a retry on the next tick
        return;
      }
      setReadingGate((g) => ({ ...g, done: true }));
    });
  }, [readingGate, readingScrolled, readingElapsed, activeLesson?.id]);

  const handleLessonBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!readingGate.required || readingScrolled) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) setReadingScrolled(true);
  };

  const hasAssignmentBlock = (activeLesson?.contentBlocks || []).some((b: any) => b.type === 'assignment');
  // Batch 7 (G10) — real content-block signal, replacing the dead activeLesson.lesson_type ===
  // 'video' check (no real lesson has ever set that field; video lessons are real content_blocks
  // rows now, canvas-authored or flat-list, both already present in contentBlocks).
  const hasVideoBlock = (activeLesson?.contentBlocks || []).some((b: any) => b.type === 'video');

  useEffect(() => {
    if (activeLesson && hasAssignmentBlock) {
      setLoadingSubmission(true);
      fetch(`/api/lms/assignments?lessonId=${activeLesson.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.submission) {
            setSubmission(data.submission);
            setTextSubmission(data.submission.text_submission || '');
            setFileUrl(data.submission.file_url || '');
            setFileName(data.submission.file_name || '');
            setFileSize(data.submission.file_size || 0);
          } else {
            setSubmission(null);
            setTextSubmission('');
            setFileUrl('');
            setFileName('');
            setFileSize(0);
          }
        })
        .catch((err) => console.error('Error loading submission:', err))
        .finally(() => setLoadingSubmission(false));
    }
  }, [activeLesson]);

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingStudentFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pathPrefix', 'student-assignments');

    try {
      const res = await fetch('/api/lms/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
      } else {
        setFileUrl(data.url);
        setFileName(data.name);
        setFileSize(data.size);
        toast.success('File attached successfully!');
      }
    } catch {
      toast.error('Network error uploading file');
    } finally {
      setUploadingStudentFile(false);
    }
  };

  const handleSubmitAssignment = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/lms/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: activeLesson.id,
          courseId: course.id,
          workspaceId: course.workspace_id,
          textSubmission,
          fileUrl,
          fileName,
          fileSize,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(`Submission failed: ${data.error}`);
      } else {
        toast.success('Assignment submitted successfully!');
        setSubmission(data.submission);
      }
    } catch {
      toast.error('Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  useHeartbeat({
    enrolmentId: enrollment.id,
    activeLessonId: activeLesson?.id,
    videoElement,
    isVideoPlaying,
  });

  const lessonsByModule = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    lessons.forEach((l) => {
      if (!map[l.module_id]) map[l.module_id] = [];
      map[l.module_id].push(l);
    });
    return map;
  }, [lessons]);

  useEffect(() => {
    const restore = searchParams.get('restore');
    const t = searchParams.get('t');
    const lessonIdParam = searchParams.get('lessonId');

    if (lessonIdParam) {
      const matchedLesson = lessons.find((l) => l.id === lessonIdParam);
      if (matchedLesson && activeLesson?.id !== matchedLesson.id) {
        setActiveLesson(matchedLesson);
      }
    }

    if (restore === 'true' && videoElement && t) {
      const seconds = parseFloat(t);
      if (!isNaN(seconds) && seconds > 0) {
        videoElement.currentTime = seconds;
        const name = enrollment?.contact?.first_name || 'Student';
        toast.success(`Welcome back, ${name}! You are picking up right where you left off.`, {
          duration: 5000,
        });
      }
    }
  }, [searchParams, videoElement, enrollment, lessons, activeLesson]);

  const handleToggleComplete = async (lessonId: string) => {
    const isCompleted = completedLessonIds.includes(lessonId);

    startTransition(async () => {
      try {
        if (isCompleted) {
          const res = await markLessonIncomplete(course.id, lessonId);
          if (res.error) toast.error(res.error);
          else {
            setCompletedLessonIds(completedLessonIds.filter((id) => id !== lessonId));
            toast.success('Progress updated.');
          }
        } else {
          const res = await markLessonComplete(course.id, lessonId);
          if ('error' in res) toast.error(res.error);
          else {
            setCompletedLessonIds([...completedLessonIds, lessonId]);
            toast.success('Lesson completed!');
          }
        }
      } catch {
        toast.error('Failed to update progress status');
      }
    });
  };

  const handleDownloadCertificate = () => {
    window.open(`/api/student/courses/${course.id}/certificate`, '_blank');
  };

  const handleSignOut = async () => {
    try {
      await handleLogout();
    } finally {
      window.location.href = '/auth/signin-basic';
    }
  };

  /**
   * "Mark complete" + auto-advance in one action. The server-side per-block gate lives in
   * markLessonComplete → markLessonCompleteForContact, so a non-error result means the
   * completion is legitimate; we then move the student straight on rather than making them
   * hunt for a separate "Next lesson" button. Navigation reuses getNextLesson() (the same
   * ordered list the Next button uses) and getLessonLockReason() so we never drop them into
   * a still-locked lesson.
   */
  const handleCompleteAndAdvance = (confirmedOverride = false) => {
    if (!activeLesson || completedLessonIds.includes(activeLesson.id)) return;
    // A locked lesson (drip / prerequisite / paid) can never be completed — the server
    // rejects it too, this just avoids a pointless round-trip and error toast.
    if (activeLockReason) return;
    const lesson = activeLesson;
    startTransition(async () => {
      const res = await markLessonComplete(course.id, lesson.id, { confirmedOverride });
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      const newCompleted = [...completedLessonIds, lesson.id];
      setCompletedLessonIds(newCompleted);
      toast.success('Lesson complete!');

      const siblings = lessonsByModule[lesson.module_id] || [];
      const isLastInModule =
        siblings.length > 0 && siblings[siblings.length - 1].id === lesson.id;
      const moduleAllDone = siblings.every((l: any) => newCompleted.includes(l.id));
      const next = getNextLesson();

      // Brief beat so the "Lesson complete!" toast registers before the view changes.
      setTimeout(() => {
        // End of a module that has its own quiz, now unlocked → send them into it first.
        if (isLastInModule && activeModule?.has_module_quiz && moduleAllDone) {
          router.push(`/student/courses/${course.id}/module-quiz/${activeModule.id}`);
          return;
        }
        if (next) {
          const lockReason = getLessonLockReason({
            lesson: next,
            module: modules.find((m: any) => m.id === next.module_id),
            moduleIndex: modules.findIndex((m: any) => m.id === next.module_id),
            course,
            enrollment,
            modules,
            lessonsByModule,
            completedLessonIds: newCompleted,
          });
          // If the next lesson is still gated (drip / prerequisite / paid), stay put —
          // the toast already confirmed this lesson is done.
          if (!lockReason) setActiveLesson(next);
          return;
        }
        // No next lesson → end of course.
        if (newCompleted.length === totalLessonsCount) {
          toast.success('Course complete! 🎓 Your certificate is ready.');
          handleDownloadCertificate();
        }
      }, 550);
    });
  };

  const getNextLesson = () => {
    if (!activeLesson) return null;
    const currentIndex = lessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      return lessons[currentIndex + 1];
    }
    return null;
  };

  const getPrevLesson = () => {
    if (!activeLesson) return null;
    const currentIndex = lessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIndex > 0) {
      return lessons[currentIndex - 1];
    }
    return null;
  };

  const theme = getCourseTheme(course?.landing_page_settings?.template);

  const activeModule = activeLesson ? modules.find((m: any) => m.id === activeLesson.module_id) : null;
  const activeModuleIdx = activeLesson ? modules.findIndex((m: any) => m.id === activeLesson.module_id) : -1;
  const activeLockReason =
    activeLesson && activeModule
      ? getLessonLockReason({
          lesson: activeLesson,
          module: activeModule,
          moduleIndex: activeModuleIdx,
          course,
          enrollment,
          modules,
          lessonsByModule,
          completedLessonIds,
        })
      : null;

  const totalLessonsCount = lessons.length;
  const completedLessonsCount = lessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const globalProgressPercentage =
    totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

  // Real logged-in student name (server-resolved via getCurrentProfile, same as the main
  // dashboard greeting); enrollment.contact is a fallback, 'Student' only if genuinely unset.
  const studentName =
    (studentNameProp || '').trim() ||
    [enrollment?.contact?.first_name, enrollment?.contact?.last_name].filter(Boolean).join(' ') ||
    enrollment?.contact?.email ||
    'Student';

  const isActiveDone = activeLesson ? completedLessonIds.includes(activeLesson.id) : false;

  // ---- "Has the student genuinely finished this lesson's content?" ----
  // "Mark complete" is ALWAYS enabled. This only decides whether a soft confirmation dialog
  // appears first. A lesson gates on EITHER real block completions OR the reading signal,
  // never both. `canvasHasBlocks` matches isTrackableCanvasItem() server-side (an unwired
  // ContentBox with blockId null is decorative, not a signal).
  const canvasHasBlocks = Array.isArray(activeLesson?.canvasItems)
    ? activeLesson.canvasItems.some(
        (i: any) => i.kind === 'block' || (i.kind === 'contentbox' && !!i.blockId)
      )
    : false;
  const hasTrackableBlocks =
    canvasHasBlocks || (activeLesson?.contentBlocks && activeLesson.contentBlocks.length > 0);

  const blocksGateMet = !hasTrackableBlocks || (blockStatus ? blockStatus.completed >= blockStatus.total : false);
  const readingGateMet = !readingGate.required || readingGate.done;
  // blockStatus is null until the first status fetch lands — don't accuse a student of
  // skipping ahead before we actually know, so treat "unknown" as done for the dialog check.
  const signalsKnown = !hasTrackableBlocks || blockStatus !== null;
  const lessonGenuinelyDone =
    isActiveDone || !signalsKnown || (blocksGateMet && readingGateMet);

  /* ---------- Assignment panel (light) ---------- */
  const renderAssignmentPanel = (instructions?: string) => (
    <LessonCard className="mx-auto max-w-2xl space-y-5">
      <PanelHead
        icon={<FileEdit />}
        title="Assignment"
        subtitle="Review the brief and submit your work"
      />

      {instructions && (
        <div className="whitespace-pre-line rounded-xl border border-dash-border bg-dash-surface/60 p-4 text-[13px] leading-relaxed !text-dash-text">
          <strong className="mb-1 block !text-dash-text">Instructions</strong>
          {instructions}
        </div>
      )}

      {loadingSubmission ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[12px] !text-dash-textMuted">
          <Loader2 className="animate-spin" size={14} /> Loading your submission…
        </div>
      ) : submission ? (
        <div className="space-y-4 border-t border-dash-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
              Your submission
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                submission.grade_status === 'passed'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : submission.grade_status === 'failed'
                  ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
              }`}
            >
              {submission.grade_status === 'passed'
                ? 'Passed'
                : submission.grade_status === 'failed'
                ? 'Failed'
                : 'Pending grading'}
            </span>
          </div>

          {submission.text_submission && (
            <div className="rounded-xl border border-dash-border bg-dash-surface/60 p-3.5 text-[13px] leading-relaxed !text-dash-text">
              {submission.text_submission}
            </div>
          )}

          {submission.file_url && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-dash-border bg-white p-3.5 text-[13px] !text-dash-text">
              <span className="truncate pr-4 font-medium">{submission.file_name || 'Attachment'}</span>
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[12px] font-semibold text-sky-600 hover:underline"
              >
                Download
              </a>
            </div>
          )}

          {submission.feedback_comments && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-[13px] leading-relaxed !text-dash-text">
              <strong className="mb-1 block text-sky-700">Instructor feedback</strong>
              {submission.feedback_comments}
            </div>
          )}

          {submission.grade_status !== 'passed' && (
            <button
              onClick={() => setSubmission(null)}
              className="h-10 w-full rounded-lg border border-dash-border bg-white text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface"
            >
              Resubmit assignment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 border-t border-dash-border pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
            Prepare submission
          </span>

          <textarea
            value={textSubmission}
            onChange={(e) => setTextSubmission(e.target.value)}
            placeholder="Type your response or submission notes…"
            rows={5}
            className="w-full rounded-xl border border-dash-border bg-white p-3.5 text-[13px] leading-relaxed !text-dash-text outline-none transition-colors placeholder:text-dash-textMuted focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
          />

          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
              Attachment (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={fileName || 'No file attached'}
                className="flex-1 rounded-lg border border-dash-border bg-dash-surface px-3 py-2.5 text-[12px] font-mono !text-dash-textMuted outline-none"
              />
              <div className="relative shrink-0">
                <input
                  type="file"
                  onChange={handleStudentFileUpload}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={uploadingStudentFile}
                />
                <button
                  type="button"
                  disabled={uploadingStudentFile}
                  className="inline-flex h-full items-center gap-1.5 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface"
                >
                  {uploadingStudentFile ? 'Uploading…' : 'Attach file'}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmitAssignment}
            disabled={submitting || (!textSubmission.trim() && !fileUrl)}
            className={`h-11 w-full rounded-lg text-[13px] font-semibold text-white shadow-sm transition-colors disabled:opacity-60 ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
          >
            {submitting ? 'Submitting…' : 'Submit assignment'}
          </button>
        </div>
      )}
    </LessonCard>
  );

  /* ---------- Flashcards panel (light) ---------- */
  const renderFlashcardsPanel = (cards: { front: string; back: string }[], onFinish: () => void) => (
    <div className="mx-auto max-w-md space-y-6">
      <PanelHead icon={<BookOpen />} title="Flashcards" subtitle={activeLesson.title} />

      {cards.length > 0 ? (
        <div className="space-y-5">
          <button
            onClick={() => setFlashcardFlipped(!flashcardFlipped)}
            className="flex h-[250px] w-full select-none flex-col items-center justify-center gap-3 rounded-2xl border border-dash-border bg-white p-8 text-center shadow-sm transition-colors hover:border-sky-300"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: theme.primaryHex }}
            >
              {flashcardFlipped ? 'Back' : 'Front'}
            </span>
            <p className="text-[16px] font-semibold leading-relaxed !text-dash-text">
              {flashcardFlipped ? cards[flashcardIndex].back : cards[flashcardIndex].front}
            </p>
            <span className="pt-1 text-[11px] uppercase tracking-[0.14em] !text-dash-textMuted/70">
              Tap to flip
            </span>
          </button>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                setFlashcardIndex((prev) => Math.max(0, prev - 1));
                setFlashcardFlipped(false);
              }}
              disabled={flashcardIndex === 0}
              className="h-9 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-[12px] font-medium !text-dash-textMuted">
              {flashcardIndex + 1} / {cards.length}
            </span>

            <button
              onClick={() => {
                setFlashcardIndex((prev) => Math.min(cards.length - 1, prev + 1));
                setFlashcardFlipped(false);
                if (flashcardIndex === cards.length - 1) {
                  onFinish();
                }
              }}
              className={`h-9 rounded-lg px-4 text-[12px] font-semibold text-white transition-colors ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
            >
              {flashcardIndex === cards.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-[13px] !text-dash-textMuted">
          No flashcards in this deck.
        </div>
      )}
    </div>
  );

  // Renders one content_blocks row's body — the single per-type switch shared by the legacy
  // flat-list lesson render AND the canvas-lesson render below, so the two never drift.
  const renderBlockBody = (block: any) => (
    <>
      {block.type === 'video' && block.file_url && (
        <VideoPlayer
          videoUrl={block.file_url}
          onComplete={() => markBlockComplete(block.id, { percentage: 90 })}
          isAlreadyCompleted={completedBlockIds.has(block.id)}
          lowBandwidthMode={lowBandwidthMode}
        />
      )}
      {block.type === 'audio' && block.content?.mode === 'embed' && block.content?.embed_html && (
        <div className="space-y-3">
          <SandboxedHtml
            html={block.content.embed_html}
            className="h-[180px] overflow-hidden rounded-xl border border-dash-border bg-dash-surface"
            title="Audio embed"
          />
          {!completedBlockIds.has(block.id) && (
            <button
              onClick={() => markBlockComplete(block.id, { opened: true })}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface"
            >
              Mark as listened
            </button>
          )}
        </div>
      )}
      {block.type === 'audio' && block.content?.mode !== 'embed' && block.file_url && (
        <VoiceNotePlayer
          audioUrl={block.file_url}
          waveformBars={block.content?.waveform_bars}
          theme="light"
          isAlreadyCompleted={completedBlockIds.has(block.id)}
          onWatchedThreshold={(pct) => markBlockComplete(block.id, { percentage: pct })}
        />
      )}
      {block.type === 'html_code' && block.content?.html && (
        <SandboxedHtml
          html={block.content.html}
          className="h-[420px] overflow-hidden rounded-xl border border-dash-border bg-white"
          title="Embedded content"
        />
      )}
      {(block.type === 'reading' || block.type === 'slides') && block.file_url && (
        <button
          onClick={() => {
            setOpenReadingId(block.id);
            markBlockComplete(block.id, { opened: true });
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface [&_svg]:size-3.5"
        >
          <FileText /> {block.type === 'slides' ? 'Open slides' : 'Open reading'}
        </button>
      )}
      {block.type === 'rich_text' && block.content?.text && (
        <div
          className="prose prose-slate max-w-none text-[14px] leading-relaxed !text-dash-text"
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(block.content.text) }}
        />
      )}
      {block.type === 'download' && block.file_url && (
        <a
          href={block.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-sky-600 hover:underline"
        >
          <Download size={14} /> Download resource
        </a>
      )}
      {block.type === 'embed' && block.content?.embed_url && isSafeEmbedUrl(block.content.embed_url) && (
        <div className="aspect-video overflow-hidden rounded-xl border border-dash-border bg-black">
          <iframe
            src={block.content.embed_url}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title="Embedded content"
          />
        </div>
      )}
      {block.type === 'live_session' && block.file_url && (
        <a
          href={block.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-sky-600 hover:underline"
        >
          Join live session
        </a>
      )}
      {block.type === 'quiz' && (
        <a
          href={`/student/courses/${course.id}/quiz/${activeLesson.id}`}
          className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-6 text-[12px] font-semibold text-white shadow-sm transition-colors ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
        >
          Start quiz
        </a>
      )}
      {block.type === 'assignment' && renderAssignmentPanel(block.content?.instructions)}
      {block.type === 'flashcards' &&
        renderFlashcardsPanel(block.content?.flashcards || [], () =>
          markBlockComplete(block.id, { finished: true })
        )}
    </>
  );

  // Canvas-authored lessons: pages.content is flattened server-side (flattenLessonCanvas) into
  // an ordered list. Text/heading/image render inline like an article; a 'block'/'contentbox'
  // item hands off to renderBlockBody keyed on the real content_blocks row.
  const contentBlocksById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const b of activeLesson?.contentBlocks || []) m.set(b.id, b);
    return m;
  }, [activeLesson]);

  /**
   * SYSTEMIC FIX for the recurring faded-text bug.
   *
   * Root cause (one shared source): the bundled marketing template stylesheet
   * `public/assets/scss/components/_theme.scss` applies BARE type-selector resets —
   *   p        { @apply text-body ...; text-[14px]; font-normal; mb-[15px]; }   // text-body = #878a99 (~2.9:1 on white)
   *   li, span { color reset }
   *   h1..h6   { text-headingPrimary; font-bold; leading-none; }
   * These match the raw `<p>/<li>/<span>/<h*>` elements produced by dangerouslySetInnerHTML,
   * at specificity (0,0,1). An inherited colour on the wrapper — even !important — loses to
   * a directly-matched rule on the child, so authored text renders in #878a99 and, when the
   * Craft.js editor wraps a heading's text in `<p>` (e.g. "<p>Nelly Agboola</p>"), also at
   * 14px non-bold. The earlier fix only patched the `richtext` branch; this applies the same
   * neutralisation to EVERY authored-HTML site (heading, richtext, callout headline + body):
   * force every text descendant to inherit size/weight/line-height/colour from its properly
   * styled container; class-carrying accent glyphs (blue ✓ etc.) keep their own colour.
   */
  const CANVAS_INLINE_HTML =
    '[&_p]:![font-size:inherit] [&_p]:![font-weight:inherit] [&_p]:![line-height:inherit] ' +
    '[&_p]:![color:inherit] [&_li]:![color:inherit] [&_span]:![color:inherit] ' +
    '[&_h1]:![color:inherit] [&_h2]:![color:inherit] [&_h3]:![color:inherit] ' +
    '[&_h4]:![color:inherit] [&_h5]:![color:inherit] [&_h6]:![color:inherit] ' +
    '[&_strong]:font-semibold [&_strong]:![color:inherit] [&_em]:italic [&_em]:![color:inherit] ' +
    '[&_a]:!text-sky-600 [&_a]:underline ' +
    '[&_.text-blue-600]:!text-blue-600 [&_.text-sky-500]:!text-sky-500 [&_.text-amber-500]:!text-amber-500';

  const renderCanvasItem = (item: any, idx: number) => {
    if (item.kind === 'heading') {
      const sizes: Record<string, string> = {
        h1: 'text-[28px] md:text-[34px]',
        h2: 'text-[22px] md:text-[26px]',
        h3: 'text-[18px] md:text-[20px]',
        h4: 'text-[16px]',
        h5: 'text-[15px]',
        h6: 'text-[14px]',
      };
      const Tag = (/^h[1-6]$/.test(item.level) ? item.level : 'h2') as keyof JSX.IntrinsicElements;
      return (
        <Tag
          key={idx}
          className={`font-display font-bold leading-tight tracking-tight !text-dash-text ${sizes[item.level] || sizes.h2} ${CANVAS_INLINE_HTML} ${
            item.align === 'center' ? 'text-center' : item.align === 'right' ? 'text-right' : ''
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.html) }}
        />
      );
    }
    if (item.kind === 'richtext') {
      return (
        <div
          key={idx}
          className={`text-[15px] leading-relaxed !text-dash-text ${CANVAS_INLINE_HTML} [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 ${
            item.align === 'center' ? 'text-center' : item.align === 'right' ? 'text-right' : ''
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.html) }}
        />
      );
    }
    if (item.kind === 'image') {
      return (
        <img
          key={idx}
          src={item.src}
          alt={item.alt}
          className="w-full object-cover"
          style={{ borderRadius: `${item.radius ?? 12}px` }}
        />
      );
    }
    if (item.kind === 'divider') {
      return <hr key={idx} className="border-dash-border" />;
    }
    if (item.kind === 'block') {
      const block = contentBlocksById.get(item.blockId);
      if (!block) return null;
      return <div key={idx}>{renderBlockBody(block)}</div>;
    }
    if (item.kind === 'contentbox') {
      const block = item.blockId ? contentBlocksById.get(item.blockId) : null;
      return (
        <div key={idx} className="overflow-hidden rounded-2xl border border-dash-border bg-white">
          <div
            className="px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
            style={{ background: item.headerColorHex || '#1359FF' }}
          >
            {item.headerLabel}
          </div>
          <div className="space-y-3 p-5">
            {item.headline && (
              <div
                className={`font-display text-[16px] font-semibold !text-dash-text ${CANVAS_INLINE_HTML}`}
                dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.headline) }}
              />
            )}
            {item.body && (
              <div
                className={`text-[13px] leading-relaxed !text-dash-text ${CANVAS_INLINE_HTML} [&_p]:my-1.5`}
                dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.body) }}
              />
            )}
            {block && renderBlockBody(block)}
          </div>
        </div>
      );
    }
    return null;
  };

  const progressCircumference = 2 * Math.PI * 13;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-dash-bg font-body !text-dash-text">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-dash-border bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push('/student')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text"
          >
            <ChevronLeft size={15} /> Dashboard
          </button>
          <span className="h-4 w-px bg-dash-border" />
          <h1 className="truncate font-display text-[14px] font-semibold tracking-[-0.01em] !text-dash-text">
            {course.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
              <circle cx="15" cy="15" r="13" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="15"
                cy="15"
                r="13"
                fill="none"
                stroke={theme.primaryHex}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressCircumference * (1 - globalProgressPercentage / 100)}
                className="transition-all duration-500"
              />
            </svg>
            <span className="text-[12px] font-semibold !text-dash-text">{globalProgressPercentage}%</span>
          </div>

          <DashDropdown>
            <DashDropdownTrigger asChild>
              <button
                type="button"
                className="hidden items-center gap-2 border-l border-dash-border pl-4 outline-none transition-opacity hover:opacity-80 sm:flex"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: theme.primaryHex }}
                >
                  {studentName.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-[12px] font-medium !text-dash-text">{studentName}</span>
                <ChevronDown size={13} className="!text-dash-textMuted" />
              </button>
            </DashDropdownTrigger>
            <DashDropdownContent align="end" className="w-64">
              {/* This course's live stats */}
              <div className="px-2.5 pb-2 pt-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">
                  {course.title}
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="font-display text-[20px] font-semibold leading-none !text-dash-text">
                    {globalProgressPercentage}%
                  </span>
                  <span className="text-[11px] !text-dash-textMuted">
                    {completedLessonsCount} / {totalLessonsCount} lessons
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-dash-surface">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${globalProgressPercentage}%`, background: theme.primaryHex }}
                  />
                </div>
              </div>
              <DashDropdownSeparator />
              <DashDropdownItem onSelect={() => router.push('/student/settings')}>
                <Settings size={14} /> Settings
              </DashDropdownItem>
              <DashDropdownSeparator />
              <DashDropdownItem destructive onSelect={handleSignOut}>
                <LogOut size={14} /> Sign out
              </DashDropdownItem>
            </DashDropdownContent>
          </DashDropdown>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <SyllabusSidebar
          course={course}
          modules={modules}
          lessons={lessons}
          completedLessonIds={completedLessonIds}
          activeLesson={activeLesson}
          setActiveLesson={setActiveLesson}
          lowBandwidthMode={lowBandwidthMode}
          setLowBandwidthMode={setLowBandwidthMode}
          getLessonLockReason={(les, mod, idx) =>
            getLessonLockReason({
              lesson: les,
              module: mod,
              moduleIndex: idx,
              course,
              enrollment,
              modules,
              lessonsByModule,
              completedLessonIds,
            })
          }
          globalProgressPercentage={globalProgressPercentage}
          completedLessonsCount={completedLessonsCount}
          totalLessonsCount={totalLessonsCount}
          handleDownloadCertificate={handleDownloadCertificate}
          lessonsByModule={lessonsByModule}
          studentName={studentName}
        />

        <main className="flex flex-1 flex-col overflow-hidden bg-dash-bg">
          {activeLesson ? (
            <>
              {/* Lesson header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dash-border bg-white px-6 py-4">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                    Active lesson
                  </span>
                  <h2 className="mt-0.5 truncate font-display text-[19px] font-semibold tracking-[-0.01em] !text-dash-text">
                    {activeLesson.title}
                  </h2>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {/* A locked lesson (drip / prerequisite / paid) has no body to complete —
                      hide the action entirely rather than showing a dead disabled button. */}
                  {!activeLockReason && (
                    <button
                      onClick={() => {
                        if (isActiveDone) {
                          handleToggleComplete(activeLesson.id);
                        } else if (lessonGenuinelyDone) {
                          handleCompleteAndAdvance(false);
                        } else {
                          setShowSoftConfirm(true);
                        }
                      }}
                      disabled={isPending}
                      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-5 text-[12px] font-semibold transition-colors [&_svg]:size-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActiveDone
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : `text-white shadow-sm ${theme.solidBgClass} ${theme.solidHoverBgClass}`
                      }`}
                    >
                      {isActiveDone ? <Check /> : <CheckSquare />}
                      {isActiveDone ? 'Completed' : 'Mark complete'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lesson body */}
              <div
                ref={lessonBodyRef}
                onScroll={handleLessonBodyScroll}
                className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8"
              >
                {lowBandwidthMode && hasVideoBlock && !activeLockReason && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-[12px] text-emerald-800">
                    <Clock size={16} className="shrink-0" />
                    <span>
                      <strong>Data saver on</strong> — video bitrate is throttled to avoid buffering on slow connections.
                    </span>
                  </div>
                )}

                {activeLockReason ? (
                  <LockedLessonPlaceholder
                    activeLockReason={activeLockReason}
                    courseId={course.id}
                    onUpgradeRedirect={() => router.push(`/student/checkout/${course.id}`)}
                  />
                ) : activeLesson.canvasItems && activeLesson.canvasItems.length > 0 ? (
                  /* Lesson authored in the canvas Lesson Builder — its real content lives in
                     pages.content, flattened server-side. Renders as one continuous article;
                     interactive blocks hand off to the shared renderBlockBody(). */
                  <div className="space-y-6">
                    {activeLesson.canvasItems.map((item: any, idx: number) => renderCanvasItem(item, idx))}
                  </div>
                ) : activeLesson.contentBlocks && activeLesson.contentBlocks.length > 0 ? (
                  /* Legacy flat-list lesson — content blocks flow in order like an article,
                     no per-block chrome or "Block N · TYPE" labels. */
                  <div className="space-y-8">
                    {activeLesson.contentBlocks.map((block: any) => (
                      <div key={block.id}>{renderBlockBody(block)}</div>
                    ))}
                  </div>
                ) : activeLesson.lesson_type === 'quiz' ? (
                  <LessonCard className="mx-auto max-w-xl space-y-5 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
                      <BookOpen size={24} />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-semibold !text-dash-text">Assessment</h3>
                      <p className="mx-auto max-w-sm text-[13px] leading-relaxed !text-dash-textMuted">
                        This lesson is a quiz to check how much you've retained.
                      </p>
                    </div>
                    <a
                      href={`/student/courses/${course.id}/quiz/${activeLesson.id}`}
                      className={`mx-auto inline-flex h-11 items-center justify-center rounded-lg px-8 text-[13px] font-semibold text-white shadow-sm transition-colors ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
                    >
                      Start quiz
                    </a>
                  </LessonCard>
                ) : (
                  <LessonCard className="mx-auto max-w-2xl">
                    <div className="whitespace-pre-line text-[14px] leading-relaxed !text-dash-text">
                      {activeLesson.content?.text || activeLesson.description || 'No content available for this lesson.'}
                    </div>
                  </LessonCard>
                )}

                <LessonSummaryPanel key={activeLesson.id} lessonId={activeLesson.id} />
              </div>

              {/* Prev / Next */}
              <div className="flex shrink-0 items-center justify-between border-t border-dash-border bg-white px-6 py-4">
                {getPrevLesson() ? (
                  <button
                    onClick={() => setActiveLesson(getPrevLesson())}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface [&_svg]:size-4"
                  >
                    <ChevronLeft /> Previous
                  </button>
                ) : (
                  <span />
                )}
                {getNextLesson() && (
                  <button
                    onClick={async () => {
                      setIsCheckingAdvance(true);
                      let canAdvance = completedLessonIds.includes(activeLesson.id);
                      const needsBlockCheck =
                        (activeLesson.contentBlocks && activeLesson.contentBlocks.length > 0) ||
                        (activeLesson.canvasItems && activeLesson.canvasItems.length > 0);
                      if (needsBlockCheck) {
                        const res = await getLessonBlockCompletionStatus(activeLesson.id);
                        canAdvance = !res.error && res.data.allComplete;
                      }
                      setIsCheckingAdvance(false);

                      if (!canAdvance) {
                        toast.error(
                          readingGate.required && !readingGate.done
                            ? 'Read through the full lesson before moving on.'
                            : 'Complete every block in this lesson before moving on.'
                        );
                        return;
                      }
                      setActiveLesson(getNextLesson());
                    }}
                    disabled={isCheckingAdvance}
                    className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-[12px] font-semibold text-white shadow-sm transition-colors [&_svg]:size-4 ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
                  >
                    {isCheckingAdvance ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        Next lesson <ChevronRight />
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-12 text-center">
              <div>
                <BookOpen size={36} className="mx-auto !text-dash-textMuted/40" />
                <h3 className="mt-3 text-[14px] font-semibold !text-dash-text">Select a lesson</h3>
                <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed !text-dash-textMuted">
                  Choose a lesson from the syllabus on the left to start learning.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <CourseQAWidget
        courseId={course.id}
        onJumpToLesson={(lessonId) => {
          const target = lessons.find((l: any) => l.id === lessonId);
          if (target) setActiveLesson(target);
        }}
      />

      {/* Soft confirmation — shown only when the student clicks "Mark complete" before
          genuinely finishing the lesson's content. No technical wording, one time, no repeat. */}
      <DashModal open={showSoftConfirm} onOpenChange={setShowSoftConfirm}>
        <DashModalContent className="max-w-sm">
          <DashModalHeader>
            <DashModalTitle>Mark this lesson complete?</DashModalTitle>
            <DashModalDescription>
              Looks like there&apos;s still more to see in this lesson. You can mark it complete
              now and move on, or stay a little longer.
            </DashModalDescription>
          </DashModalHeader>
          <DashModalFooter>
            <button
              type="button"
              onClick={() => setShowSoftConfirm(false)}
              className="inline-flex h-9 items-center rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface"
            >
              Keep reading
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSoftConfirm(false);
                handleCompleteAndAdvance(true);
              }}
              className={`inline-flex h-9 items-center rounded-lg px-4 text-[12px] font-semibold text-white shadow-sm transition-colors ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
            >
              Mark complete
            </button>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      {openReadingId &&
        (() => {
          if (openReadingId === 'legacy-pdf') {
            const url = activeLesson.content?.video_url || activeLesson.video_url;
            return (
              <ReadingModal
                title={activeLesson.title}
                embedUrl={getEmbeddablePdfUrl(url)}
                downloadUrl={url}
                onClose={() => setOpenReadingId(null)}
              />
            );
          }
          const block = (activeLesson.contentBlocks || []).find((b: any) => b.id === openReadingId);
          if (!block || !block.file_url) return null;
          return (
            <ReadingModal
              title={activeLesson.title}
              embedUrl={getEmbeddablePdfUrl(block.file_url)}
              downloadUrl={block.file_url}
              onClose={() => setOpenReadingId(null)}
            />
          );
        })()}
    </div>
  );
}

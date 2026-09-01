'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen, ChevronRight, ChevronLeft, CheckSquare, Clock, Headphones, FileEdit, FileText, Video, Archive, Download, MessageSquare, Loader2, X, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';
import { recordBlockCompletion, getCompletedBlockIdsForLesson, getLessonBlockCompletionStatus } from '@/app/actions/blockCompletion';
import Editor from '@monaco-editor/react';
import SyllabusSidebar from './components/SyllabusSidebar';
import VideoPlayer from './components/VideoPlayer';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { getLessonLockReason } from './components/lock-utils';
import LockedLessonPlaceholder from './components/LockedLessonPlaceholder';
import LiveHelpWidget from './components/LiveHelpWidget';
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

  const [showTranscript, setShowTranscript] = useState(false);

  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const [codeValue, setCodeValue] = useState('');
  const [codeConsole, setCodeConsole] = useState('');
  const [codeRunning, setCodeRunning] = useState(false);

  const [openReadingId, setOpenReadingId] = useState<string | null>(null);

  const [completedBlockIds, setCompletedBlockIds] = useState<Set<string>>(new Set());
  const [isCheckingAdvance, setIsCheckingAdvance] = useState(false);

  const markBlockComplete = async (blockId: string, metric: Record<string, any> = {}) => {
    if (completedBlockIds.has(blockId)) return;
    const res = await recordBlockCompletion(blockId, metric);
    if (!res.error) {
      setCompletedBlockIds((prev) => new Set(prev).add(blockId));
    }
  };

  useEffect(() => {
    if (!activeLesson) return;
    let cancelled = false;

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
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

  const hasAssignmentBlock = (activeLesson?.contentBlocks || []).some((b: any) => b.type === 'assignment');

  useEffect(() => {
    if (activeLesson && (activeLesson.lesson_type === 'assignment' || hasAssignmentBlock)) {
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

  useEffect(() => {
    if (activeLesson && activeLesson.lesson_type === 'code') {
      const meta = activeLesson.metadata || {};
      setCodeValue(meta.starterCode || '');
      setCodeConsole('');
    }
  }, [activeLesson]);

  useEffect(() => {
    if (activeLesson && activeLesson.lesson_type === 'scorm') {
      (window as any).API = {
        LMSInitialize: () => 'true',
        LMSFinish: () => 'true',
        LMSGetValue: (element: string) => {
          if (element === 'cmi.core.lesson_status') {
            return completedLessonIds.includes(activeLesson.id) ? 'completed' : 'incomplete';
          }
          return '';
        },
        LMSSetValue: (element: string, value: string) => {
          if (element === 'cmi.core.lesson_status' && (value === 'completed' || value === 'passed')) {
            handleToggleComplete(activeLesson.id);
            toast.success('SCORM package completed!');
          }
          return 'true';
        },
        LMSCommit: () => 'true',
        LMSGetLastError: () => '0',
        LMSGetErrorString: () => 'No error',
        LMSGetDiagnostic: () => 'No error diagnostic',
      };

      (window as any).API_1484_11 = {
        Initialize: () => 'true',
        Terminate: () => 'true',
        GetValue: (element: string) => {
          if (element === 'cmi.completion_status') {
            return completedLessonIds.includes(activeLesson.id) ? 'completed' : 'incomplete';
          }
          return '';
        },
        SetValue: (element: string, value: string) => {
          if ((element === 'cmi.completion_status' || element === 'cmi.success_status') && (value === 'completed' || value === 'passed')) {
            handleToggleComplete(activeLesson.id);
            toast.success('SCORM package completed!');
          }
          return 'true';
        },
        Commit: () => 'true',
        GetLastError: () => '0',
        GetErrorString: () => 'No error',
        GetDiagnostic: () => 'No error diagnostic',
      };
    }

    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [activeLesson, completedLessonIds]);

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

  const studentName =
    [enrollment?.contact?.first_name, enrollment?.contact?.last_name].filter(Boolean).join(' ') ||
    enrollment?.contact?.email ||
    'Student';

  const isActiveDone = activeLesson ? completedLessonIds.includes(activeLesson.id) : false;

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

          <span className="hidden items-center gap-2 border-l border-dash-border pl-4 sm:flex">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: theme.primaryHex }}
            >
              {studentName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-[12px] font-medium !text-dash-text">{studentName}</span>
          </span>
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

                <button
                  onClick={() => handleToggleComplete(activeLesson.id)}
                  disabled={isPending}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-5 text-[12px] font-semibold transition-colors [&_svg]:size-4 ${
                    isActiveDone
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : `text-white shadow-sm ${theme.solidBgClass} ${theme.solidHoverBgClass}`
                  }`}
                >
                  {isActiveDone ? <Check /> : <CheckSquare />}
                  {isActiveDone ? 'Completed' : 'Mark complete'}
                </button>
              </div>

              {/* Lesson body */}
              <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
                {lowBandwidthMode && activeLesson.lesson_type === 'video' && !activeLockReason && (
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
                ) : activeLesson.contentBlocks && activeLesson.contentBlocks.length > 0 ? (
                  <div className="space-y-4">
                    {activeLesson.contentBlocks.map((block: any, i: number) => (
                      <div key={block.id} className="rounded-2xl border border-dash-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
                          Block {i + 1} · {block.type.replace('_', ' ')}
                        </div>
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
                      </div>
                    ))}
                  </div>
                ) : activeLesson.lesson_type === 'video' ? (
                  <VideoPlayer
                    videoUrl={activeLesson.content?.video_url}
                    onComplete={() => {
                      if (!completedLessonIds.includes(activeLesson.id)) {
                        handleToggleComplete(activeLesson.id);
                      }
                    }}
                    isAlreadyCompleted={completedLessonIds.includes(activeLesson.id)}
                    lowBandwidthMode={lowBandwidthMode}
                    onVideoRegister={(el, playing) => {
                      setVideoElement(el);
                      setIsVideoPlaying(playing);
                    }}
                    onProgressUpdate={async (seconds) => {
                      if (seconds % 30 === 0) {
                        try {
                          await fetch(`/api/enrolments/${enrollment.id}/activity`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lessonId: activeLesson.id, progressSeconds: seconds }),
                          });
                        } catch (err) {
                          console.error('[Embed Heartbeat Sync error]:', err);
                        }
                      }
                    }}
                  />
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
                ) : activeLesson.lesson_type === 'pdf' ? (
                  <LessonCard className="mx-auto max-w-xl space-y-5 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
                      <FileText size={24} />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-semibold !text-dash-text">PDF document</h3>
                      <p className="mx-auto max-w-sm text-[13px] leading-relaxed !text-dash-textMuted">
                        Opens in-page so you never lose your place in the course.
                      </p>
                    </div>
                    <button
                      onClick={() => setOpenReadingId('legacy-pdf')}
                      className={`mx-auto inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-8 text-[13px] font-semibold text-white shadow-sm transition-colors [&_svg]:size-3.5 ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
                    >
                      <FileText /> Open reading
                    </button>
                  </LessonCard>
                ) : activeLesson.lesson_type === 'audio' ? (
                  <LessonCard className="mx-auto max-w-2xl space-y-5">
                    <PanelHead icon={<Headphones />} title="Audio lesson" subtitle="MP3 playback" />
                    <audio
                      src={activeLesson.content?.video_url || activeLesson.video_url}
                      controls
                      className="w-full"
                    />
                    {activeLesson.content?.text && (
                      <div className="space-y-3 border-t border-dash-border pt-4">
                        <button
                          onClick={() => setShowTranscript(!showTranscript)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-600 hover:text-sky-700"
                        >
                          <MessageSquare size={13} /> {showTranscript ? 'Hide transcript' : 'View transcript'}
                        </button>
                        {showTranscript && (
                          <div className="max-h-[300px] overflow-y-auto whitespace-pre-line rounded-xl border border-dash-border bg-dash-surface/60 p-4 text-[13px] leading-relaxed !text-dash-text">
                            {activeLesson.content.text}
                          </div>
                        )}
                      </div>
                    )}
                  </LessonCard>
                ) : activeLesson.lesson_type === 'assignment' ? (
                  renderAssignmentPanel(activeLesson.content?.text)
                ) : activeLesson.lesson_type === 'live_session' ? (
                  <LessonCard className="mx-auto max-w-xl space-y-5 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
                      <Video size={24} />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-semibold !text-dash-text">Live session</h3>
                      <p className="text-[13px] !text-dash-textMuted">
                        {activeLesson.metadata?.startTime
                          ? `Scheduled for ${new Date(activeLesson.metadata.startTime).toLocaleString()}`
                          : 'Session is active'}
                      </p>
                    </div>
                    {activeLesson.content?.text && (
                      <div className="mx-auto max-w-md rounded-xl border border-dash-border bg-dash-surface/60 p-4 text-[13px] leading-relaxed !text-dash-text">
                        {activeLesson.content.text}
                      </div>
                    )}
                    <a
                      href={activeLesson.content?.video_url || activeLesson.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mx-auto inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-8 text-[13px] font-semibold text-white shadow-sm transition-colors [&_svg]:size-4 ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
                    >
                      <Video /> Join meeting
                    </a>
                  </LessonCard>
                ) : activeLesson.lesson_type === 'flashcards' ? (
                  renderFlashcardsPanel(activeLesson.metadata?.flashcards || [], () =>
                    handleToggleComplete(activeLesson.id)
                  )
                ) : activeLesson.lesson_type === 'code' ? (
                  <div className="grid h-[550px] grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3">
                    <div className="flex flex-col overflow-hidden rounded-2xl border border-dash-border bg-white lg:col-span-2">
                      <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-4 py-3">
                        <span className="text-[12px] font-semibold !text-dash-text">
                          Code sandbox ({activeLesson.metadata?.codeLanguage || 'javascript'})
                        </span>
                        <button
                          onClick={async () => {
                            setCodeRunning(true);
                            setCodeConsole('Running…\n');
                            setTimeout(() => {
                              try {
                                let logs: string[] = [];
                                const mockConsole = {
                                  log: (...args: any[]) =>
                                    logs.push(
                                      args
                                        .map((a) => (typeof a === 'object' ? JSON.stringify(a) : a))
                                        .join(' ')
                                    ),
                                  error: (...args: any[]) => logs.push('[ERROR]: ' + args.join(' ')),
                                  warn: (...args: any[]) => logs.push('[WARN]: ' + args.join(' ')),
                                };
                                const runner = new Function('console', codeValue);
                                runner(mockConsole);
                                setCodeConsole(
                                  logs.length > 0 ? logs.join('\n') : 'Completed with exit code 0.'
                                );
                                toast.success('Execution completed!');
                                handleToggleComplete(activeLesson.id);
                              } catch (e: any) {
                                setCodeConsole(`[RUNTIME EXCEPTION]: ${e.message}`);
                                toast.error('Execution exception detected.');
                              } finally {
                                setCodeRunning(false);
                              }
                            }, 1000);
                          }}
                          disabled={codeRunning}
                          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-5 text-[12px] font-semibold text-white transition-colors ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
                        >
                          {codeRunning ? <Loader2 className="animate-spin" size={12} /> : null} Run
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 bg-[#1e1e1e]">
                        <Editor
                          height="100%"
                          language={activeLesson.metadata?.codeLanguage || 'javascript'}
                          theme="vs-dark"
                          value={codeValue}
                          onChange={(val) => setCodeValue(val || '')}
                          options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'on', automaticLayout: true }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col overflow-hidden rounded-2xl border border-dash-border bg-white p-4">
                      <span className="mb-3 block shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
                        Console
                      </span>
                      <pre className="flex-1 select-text overflow-y-auto whitespace-pre-wrap rounded-xl border border-dash-border bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
                        {codeConsole || 'Idle. Write code and click Run.'}
                      </pre>
                    </div>
                  </div>
                ) : activeLesson.lesson_type === 'scorm' ? (
                  <div className="flex h-[650px] flex-col overflow-hidden rounded-2xl border border-dash-border bg-white">
                    <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-4 py-3">
                      <span className="text-[12px] font-semibold !text-dash-text">
                        SCORM player ({activeLesson.metadata?.scormVersion === 'scorm2004' ? 'SCORM 2004' : 'SCORM 1.2'})
                      </span>
                      <button
                        onClick={() => {
                          handleToggleComplete(activeLesson.id);
                          toast.success('SCORM package completed!');
                        }}
                        className="inline-flex h-9 items-center rounded-lg border border-dash-border bg-white px-4 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface"
                      >
                        Mark SCORM complete
                      </button>
                    </div>
                    {activeLesson.video_url?.endsWith('.zip') ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-dash-surface/40 p-8 text-center">
                        <Archive className="text-sky-500" size={44} />
                        <div>
                          <h4 className="text-[14px] font-semibold !text-dash-text">SCORM package loaded</h4>
                          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed !text-dash-textMuted">
                            The archive is hosted securely. Download it or mark the lesson complete.
                          </p>
                        </div>
                        <a
                          href={activeLesson.video_url}
                          className={`inline-flex h-10 items-center justify-center rounded-lg px-5 text-[12px] font-semibold text-white transition-colors ${theme.solidBgClass} ${theme.solidHoverBgClass}`}
                        >
                          Download package
                        </a>
                      </div>
                    ) : (
                      <iframe src={activeLesson.video_url} className="flex-1 w-full border-0" />
                    )}
                  </div>
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
                      if (activeLesson.contentBlocks && activeLesson.contentBlocks.length > 0) {
                        const res = await getLessonBlockCompletionStatus(activeLesson.id);
                        canAdvance = !res.error && res.data.allComplete;
                      }
                      setIsCheckingAdvance(false);

                      if (!canAdvance) {
                        toast.error('Complete every block in this lesson before moving on.');
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

      <LiveHelpWidget courseId={course.id} enrollment={enrollment} />
      <CourseQAWidget
        courseId={course.id}
        onJumpToLesson={(lessonId) => {
          const target = lessons.find((l: any) => l.id === lessonId);
          if (target) setActiveLesson(target);
        }}
      />

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

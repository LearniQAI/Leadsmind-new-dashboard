'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, ChevronRight, CheckSquare, Clock, Headphones, FileEdit, FileText, Video, Layers, Code, Archive, Download, MessageSquare, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';
import { Button } from '@/components/ui/button';
import Editor from '@monaco-editor/react';
import SyllabusSidebar from './components/SyllabusSidebar';
import VideoPlayer from './components/VideoPlayer';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { getLessonLockReason } from './components/lock-utils';
import LockedLessonPlaceholder from './components/LockedLessonPlaceholder';
import LiveHelpWidget from './components/LiveHelpWidget';

function getEmbeddablePdfUrl(url: string): string {
  if (!url) return '';
  
  // Google Drive / Docs url conversion
  if (url.includes('google.com')) {
    // Format 1: Matches /d/FILE_ID/ or /d/FILE_ID anywhere in the path
    const fileIdMatch = url.match(/\/d\/([^/]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1].split('/')[0].split('?')[0];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    // Format 2: https://drive.google.com/open?id=FILE_ID
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

  // Dropbox url conversion
  if (url.includes('dropbox.com')) {
    // Change dl=0 or dl=1 to raw=1 to get raw pdf link
    return url.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1');
  }

  // Box.com url conversion
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

export default function StudentPlayerClient({ 
  course, 
  modules, 
  lessons, 
  initialCompletedLessonIds,
  enrollment
}: StudentPlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedLessonIds);
  const [activeLesson, setActiveLesson] = useState<any>(lessons[0] || null);
  const [isPending, startTransition] = useTransition();
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Assignment states
  const [submission, setSubmission] = useState<any | null>(null);
  const [textSubmission, setTextSubmission] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [uploadingStudentFile, setUploadingStudentFile] = useState(false);

  // Audio / Transcript states
  const [showTranscript, setShowTranscript] = useState(false);

  // Flashcards states
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Code Playground states
  const [codeValue, setCodeValue] = useState("");
  const [codeConsole, setCodeConsole] = useState("");
  const [codeRunning, setCodeRunning] = useState(false);

  // Load assignment submission history when active lesson is selected
  useEffect(() => {
    if (activeLesson && activeLesson.lesson_type === 'assignment') {
      setLoadingSubmission(true);
      fetch(`/api/lms/assignments?lessonId=${activeLesson.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.submission) {
            setSubmission(data.submission);
            setTextSubmission(data.submission.text_submission || "");
            setFileUrl(data.submission.file_url || "");
            setFileName(data.submission.file_name || "");
            setFileSize(data.submission.file_size || 0);
          } else {
            setSubmission(null);
            setTextSubmission("");
            setFileUrl("");
            setFileName("");
            setFileSize(0);
          }
        })
        .catch(err => console.error("Error loading submission:", err))
        .finally(() => setLoadingSubmission(false));
    }
  }, [activeLesson]);

  // Load code starter code template
  useEffect(() => {
    if (activeLesson && activeLesson.lesson_type === 'code') {
      const meta = activeLesson.metadata || {};
      setCodeValue(meta.starterCode || "");
      setCodeConsole("");
    }
  }, [activeLesson]);

  // Setup SCORM Runtime environment listeners
  useEffect(() => {
    if (activeLesson && activeLesson.lesson_type === 'scorm') {
      // Expose SCORM API 1.2
      (window as any).API = {
        LMSInitialize: (param: string) => {
          console.log("[SCORM 1.2] LMSInitialize");
          return "true";
        },
        LMSFinish: (param: string) => {
          console.log("[SCORM 1.2] LMSFinish");
          return "true";
        },
        LMSGetValue: (element: string) => {
          console.log("[SCORM 1.2] LMSGetValue:", element);
          if (element === "cmi.core.lesson_status") {
            return completedLessonIds.includes(activeLesson.id) ? "completed" : "incomplete";
          }
          return "";
        },
        LMSSetValue: (element: string, value: string) => {
          console.log("[SCORM 1.2] LMSSetValue:", element, "to", value);
          if (element === "cmi.core.lesson_status" && (value === "completed" || value === "passed")) {
            handleToggleComplete(activeLesson.id);
            toast.success("SCORM package completed!");
          }
          return "true";
        },
        LMSCommit: (param: string) => {
          return "true";
        },
        LMSGetLastError: () => "0",
        LMSGetErrorString: (errCode: string) => "No error",
        LMSGetDiagnostic: (errCode: string) => "No error diagnostic"
      };

      // Expose SCORM API 2004
      (window as any).API_1484_11 = {
        Initialize: (param: string) => {
          console.log("[SCORM 2004] Initialize");
          return "true";
        },
        Terminate: (param: string) => {
          console.log("[SCORM 2004] Terminate");
          return "true";
        },
        GetValue: (element: string) => {
          console.log("[SCORM 2004] GetValue:", element);
          if (element === "cmi.completion_status") {
            return completedLessonIds.includes(activeLesson.id) ? "completed" : "incomplete";
          }
          return "";
        },
        SetValue: (element: string, value: string) => {
          console.log("[SCORM 2004] SetValue:", element, "to", value);
          if ((element === "cmi.completion_status" || element === "cmi.success_status") && (value === "completed" || value === "passed")) {
            handleToggleComplete(activeLesson.id);
            toast.success("SCORM package completed!");
          }
          return "true";
        },
        Commit: (param: string) => {
          return "true";
        },
        GetLastError: () => "0",
        GetErrorString: (errCode: string) => "No error",
        GetDiagnostic: (errCode: string) => "No error diagnostic"
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
      const res = await fetch('/api/lms/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
      } else {
        setFileUrl(data.url);
        setFileName(data.name);
        setFileSize(data.size);
        toast.success("File attached successfully!");
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
          fileSize
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(`Submission failed: ${data.error}`);
      } else {
        toast.success("Assignment submitted successfully!");
        setSubmission(data.submission);
      }
    } catch {
      toast.error("Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  useHeartbeat({
    enrolmentId: enrollment.id,
    activeLessonId: activeLesson?.id,
    videoElement,
    isVideoPlaying
  });

  // Group lessons by module
  const lessonsByModule = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    lessons.forEach(l => {
      if (!map[l.module_id]) map[l.module_id] = [];
      map[l.module_id].push(l);
    });
    return map;
  }, [lessons]);

  // Handle state restoration from URL search parameters (?restore=true&t=seconds&lessonId=uuid)
  useEffect(() => {
    const restore = searchParams.get('restore');
    const t = searchParams.get('t');
    const lessonIdParam = searchParams.get('lessonId');

    if (lessonIdParam) {
      const matchedLesson = lessons.find(l => l.id === lessonIdParam);
      if (matchedLesson && activeLesson?.id !== matchedLesson.id) {
        setActiveLesson(matchedLesson);
      }
    }

    if (restore === 'true' && videoElement && t) {
      const seconds = parseFloat(t);
      if (!isNaN(seconds) && seconds > 0) {
        console.log(`[State Restoration] Seeking video to ${seconds}s`);
        videoElement.currentTime = seconds;
        
        const name = enrollment?.contact?.first_name || 'Student';
        toast.success(`Welcome back, ${name}! You are picking up right where you left off.`, {
          duration: 5000
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
            setCompletedLessonIds(completedLessonIds.filter(id => id !== lessonId));
            toast.success("Progress updated.");
          }
        } else {
          const res = await markLessonComplete(course.id, lessonId);
          if (res.error) toast.error(res.error);
          else {
            setCompletedLessonIds([...completedLessonIds, lessonId]);
            toast.success("Lesson completed!");
          }
        }
      } catch {
        toast.error("Failed to update progress status");
      }
    });
  };

  const handleDownloadCertificate = () => {
    window.open(`/api/student/courses/${course.id}/certificate`, '_blank');
  };

  const getNextLesson = () => {
    if (!activeLesson) return null;
    const currentIndex = lessons.findIndex(l => l.id === activeLesson.id);
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      return lessons[currentIndex + 1];
    }
    return null;
  };

  const activeModule = activeLesson ? modules.find((m: any) => m.id === activeLesson.module_id) : null;
  const activeModuleIdx = activeLesson ? modules.findIndex((m: any) => m.id === activeLesson.module_id) : -1;
  const activeLockReason = activeLesson && activeModule ? getLessonLockReason({
    lesson: activeLesson,
    module: activeModule,
    moduleIndex: activeModuleIdx,
    course,
    enrollment,
    modules,
    lessonsByModule,
    completedLessonIds
  }) : null;

  const totalLessonsCount = lessons.length;
  const completedLessonsCount = lessons.filter(l => completedLessonIds.includes(l.id)).length;
  const globalProgressPercentage = totalLessonsCount > 0 
    ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
    : 0;

  return (
    <div className="flex border border-white/5 rounded-2xl bg-[#080f28]/60 overflow-hidden shadow-2xl h-[calc(100vh-130px)]">
      <SyllabusSidebar
        course={course}
        modules={modules}
        lessons={lessons}
        completedLessonIds={completedLessonIds}
        activeLesson={activeLesson}
        setActiveLesson={setActiveLesson}
        lowBandwidthMode={lowBandwidthMode}
        setLowBandwidthMode={setLowBandwidthMode}
        getLessonLockReason={(les, mod, idx) => getLessonLockReason({
          lesson: les,
          module: mod,
          moduleIndex: idx,
          course,
          enrollment,
          modules,
          lessonsByModule,
          completedLessonIds
        })}
        globalProgressPercentage={globalProgressPercentage}
        completedLessonsCount={completedLessonsCount}
        totalLessonsCount={totalLessonsCount}
        handleDownloadCertificate={handleDownloadCertificate}
        lessonsByModule={lessonsByModule}
      />

      <div className="flex-1 flex flex-col bg-[#04091a]/15 overflow-hidden">
        {activeLesson ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-[#080f28]/30 shrink-0 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Lesson</span>
                <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">{activeLesson.title}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => handleToggleComplete(activeLesson.id)}
                  disabled={isPending}
                  className={`h-11 rounded-xl text-xs font-black uppercase tracking-wider px-6 flex items-center gap-2 transition-all ${
                    completedLessonIds.includes(activeLesson.id)
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/15"
                  }`}
                >
                  <CheckSquare size={14} /> 
                  {completedLessonIds.includes(activeLesson.id) ? "Completed ✓" : "Mark Completed"}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {lowBandwidthMode && activeLesson.lesson_type === 'video' && !activeLockReason && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3 text-emerald-400 text-xs">
                  <Clock size={16} />
                  <span>
                    <strong>South African Bandwidth Optimiser Active:</strong> Throttling video quality automatically to prevent buffering on low-speed 3G profiles.
                  </span>
                </div>
              )}

              {activeLockReason ? (
                <LockedLessonPlaceholder
                  activeLockReason={activeLockReason}
                  courseId={course.id}
                  onUpgradeRedirect={() => router.push(`/student/checkout/${course.id}`)}
                />
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
                          body: JSON.stringify({
                            lessonId: activeLesson.id,
                            progressSeconds: seconds
                          })
                        });
                      } catch (err) {
                        console.error('[Embed Heartbeat Sync error]:', err);
                      }
                    }
                  }}
                />
              ) : activeLesson.lesson_type === 'quiz' ? (
                <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-5">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <BookOpen size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Evaluation Assessment Node</h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      This lecture is configured as an evaluation assessment designed to gauge your course retention rate.
                    </p>
                  </div>
                  <a 
                    href={`/student/courses/${course.id}/quiz/${activeLesson.id}`}
                    className="inline-flex bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-8 items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    Start Quiz Assessment
                  </a>
                </div>
              ) : activeLesson.lesson_type === 'pdf' ? (
                <div className="flex flex-col h-[650px] bg-[#080f28] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#080f28]/60 shrink-0">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">PDF Document Viewer</span>
                    <a
                      href={activeLesson.content?.video_url || activeLesson.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] font-black uppercase tracking-wider h-9 px-4 items-center justify-center gap-1.5"
                    >
                      <Download size={13} /> Download PDF
                    </a>
                  </div>
                  <iframe src={getEmbeddablePdfUrl(activeLesson.content?.video_url || activeLesson.video_url)} className="flex-1 w-full border-0" />
                </div>
              ) : activeLesson.lesson_type === 'audio' ? (
                <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                      <Headphones size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Audio Lecture Node</h3>
                      <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5">MP3 Audio playback</p>
                    </div>
                  </div>
                  <audio src={activeLesson.content?.video_url || activeLesson.video_url} controls className="w-full bg-[#111d47] rounded-xl outline-none" />
                  
                  {activeLesson.content?.text && (
                    <div className="border-t border-white/5 pt-5 space-y-3">
                      <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="text-[10px] font-black text-primary hover:text-primary-light uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <MessageSquare size={13} /> {showTranscript ? "Hide Transcript" : "View Transcript"}
                      </button>
                      {showTranscript && (
                        <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-4 text-xs text-white/70 whitespace-pre-line leading-relaxed max-h-[300px] overflow-y-auto font-body">
                          {activeLesson.content.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeLesson.lesson_type === 'assignment' ? (
                <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                      <FileEdit size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Student Assignment</h3>
                      <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5">Please review instructions and submit your work</p>
                    </div>
                  </div>

                  {activeLesson.content?.text && (
                    <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-4 text-xs text-white/70 whitespace-pre-line leading-relaxed font-body">
                      <strong className="text-white block mb-1">Instructions:</strong>
                      {activeLesson.content.text}
                    </div>
                  )}

                  {loadingSubmission ? (
                    <div className="text-center py-6 text-xs text-white/30 flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={14} /> Loading submission history...
                    </div>
                  ) : submission ? (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Your Submission</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          submission.grade_status === 'passed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          submission.grade_status === 'failed' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {submission.grade_status === 'passed' ? "Passed ✓" : submission.grade_status === 'failed' ? "Failed ✗" : "Pending Grading"}
                        </span>
                      </div>

                      {submission.text_submission && (
                        <div className="bg-[#111d47]/10 border border-white/5 rounded-xl p-3.5 text-xs text-white/60 font-body">
                          {submission.text_submission}
                        </div>
                      )}

                      {submission.file_url && (
                        <div className="bg-[#111d47]/10 border border-white/5 rounded-xl p-3.5 flex items-center justify-between text-xs text-white/60">
                          <span className="truncate pr-4 font-bold">{submission.file_name || "Attachment"}</span>
                          <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline uppercase text-[10px] font-black">Download File</a>
                        </div>
                      )}

                      {submission.feedback_comments && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-white/80 font-body">
                          <strong className="text-primary block mb-1">Instructor Feedback:</strong>
                          {submission.feedback_comments}
                        </div>
                      )}

                      {submission.grade_status !== 'passed' && (
                        <Button
                          onClick={() => setSubmission(null)}
                          className="w-full h-11 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider mt-2"
                        >
                          Resubmit Assignment
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Prepare Submission</span>
                      
                      <textarea
                        value={textSubmission}
                        onChange={(e) => setTextSubmission(e.target.value)}
                        placeholder="Type your text response or submission notes here..."
                        rows={5}
                        className="w-full bg-[#111d47] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body leading-relaxed"
                      />

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-white/40 tracking-wider block">Attachment (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={fileName || "No file attached"}
                            className="flex-1 bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white/40 font-mono outline-none"
                          />
                          <div className="relative shrink-0">
                            <input
                              type="file"
                              onChange={handleStudentFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              disabled={uploadingStudentFile}
                            />
                            <Button
                              type="button"
                              disabled={uploadingStudentFile}
                              className="h-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider px-4 rounded-xl flex items-center gap-1.5"
                            >
                              {uploadingStudentFile ? "Uploading..." : "Attach File"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleSubmitAssignment}
                        disabled={submitting || (!textSubmission.trim() && !fileUrl)}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider mt-4 shadow-lg shadow-primary/20"
                      >
                        {submitting ? "Submitting Work..." : "Submit Assignment"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : activeLesson.lesson_type === 'live_session' ? (
                <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Video size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Live Broadcast Session</h3>
                    {activeLesson.metadata?.startTime ? (
                      <p className="text-xs text-white/50 leading-relaxed font-mono">
                        Scheduled: {new Date(activeLesson.metadata.startTime).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-white/50 leading-relaxed font-mono">Status: Session Active</p>
                    )}
                  </div>
                  {activeLesson.content?.text && (
                    <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-4 text-xs text-white/70 max-w-md mx-auto leading-relaxed">
                      {activeLesson.content.text}
                    </div>
                  )}
                  <a 
                    href={activeLesson.content?.video_url || activeLesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-8 items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-95 gap-1.5"
                  >
                    <Video size={14} /> Join Broadcast Meeting
                  </a>
                </div>
              ) : activeLesson.lesson_type === 'flashcards' ? (
                <div className="max-w-md mx-auto space-y-6 text-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Active Study Deck</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">{activeLesson.title}</h3>
                  </div>

                  {activeLesson.metadata?.flashcards?.length > 0 ? (
                    <div className="space-y-6">
                      <div 
                        onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                        className="relative h-[250px] w-full bg-[#080f28] border border-white/10 rounded-2xl cursor-pointer select-none transition-all flex items-center justify-center p-8 hover:border-primary/40 shadow-xl"
                      >
                        <div className="space-y-4">
                          <span className="text-[9px] font-black uppercase tracking-wider text-primary block">
                            {flashcardFlipped ? "Back Explanation" : "Front Question"}
                          </span>
                          <p className="text-base font-bold text-white leading-relaxed">
                            {flashcardFlipped 
                              ? activeLesson.metadata.flashcards[flashcardIndex].back 
                              : activeLesson.metadata.flashcards[flashcardIndex].front
                            }
                          </p>
                          <span className="text-[9px] text-white/30 uppercase tracking-widest block pt-2">Click to flip card</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <Button
                          onClick={() => {
                            setFlashcardIndex(prev => Math.max(0, prev - 1));
                            setFlashcardFlipped(false);
                          }}
                          disabled={flashcardIndex === 0}
                          className="bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider px-4"
                        >
                          Prev Card
                        </Button>

                        <span className="text-xs text-white/50 font-mono">
                          {flashcardIndex + 1} of {activeLesson.metadata.flashcards.length}
                        </span>

                        <Button
                          onClick={() => {
                            setFlashcardIndex(prev => Math.min(activeLesson.metadata.flashcards.length - 1, prev + 1));
                            setFlashcardFlipped(false);
                            if (flashcardIndex === activeLesson.metadata.flashcards.length - 1) {
                              handleToggleComplete(activeLesson.id);
                            }
                          }}
                          className="bg-primary hover:bg-primary/95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider px-4"
                        >
                          {flashcardIndex === activeLesson.metadata.flashcards.length - 1 ? "Finish ✓" : "Next Card"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-white/30">No flashcards found in this study deck.</div>
                  )}
                </div>
              ) : activeLesson.lesson_type === 'code' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[550px] overflow-hidden">
                  <div className="lg:col-span-2 flex flex-col border border-white/5 bg-[#080f28] rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#080f28]/60 shrink-0">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Monaco Code Sandbox ({activeLesson.metadata?.codeLanguage || "javascript"})</span>
                      <Button 
                        onClick={async () => {
                          setCodeRunning(true);
                          setCodeConsole("Executing script payload...\n");
                          setTimeout(() => {
                            try {
                              let logs: string[] = [];
                              const mockConsole = {
                                log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')),
                                error: (...args: any[]) => logs.push('[ERROR]: ' + args.join(' ')),
                                warn: (...args: any[]) => logs.push('[WARN]: ' + args.join(' '))
                              };
                              
                              const runner = new Function('console', codeValue);
                              runner(mockConsole);
                              setCodeConsole(logs.length > 0 ? logs.join('\n') : "Script completed successfully with exit code 0.");
                              toast.success("Execution completed!");
                              handleToggleComplete(activeLesson.id);
                            } catch (e: any) {
                              setCodeConsole(`[RUNTIME EXCEPTION]: ${e.message}`);
                              toast.error("Execution exception detected.");
                            } finally {
                              setCodeRunning(false);
                            }
                          }, 1000);
                        }}
                        disabled={codeRunning}
                        className="bg-primary hover:bg-primary/95 text-white rounded-lg text-[10px] font-black uppercase tracking-wider h-9 px-5 shadow-lg shadow-primary/20 flex items-center gap-1.5"
                      >
                        {codeRunning ? <Loader2 className="animate-spin" size={12} /> : null} Run execution script
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 bg-[#020617]">
                      <Editor
                        height="100%"
                        language={activeLesson.metadata?.codeLanguage || "javascript"}
                        theme="vs-dark"
                        value={codeValue}
                        onChange={(val) => setCodeValue(val || "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineNumbers: "on",
                          automaticLayout: true
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-[#080f28]/60 border border-white/5 rounded-2xl p-5 flex flex-col overflow-hidden">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-wider shrink-0 mb-3 block">Sandbox Execution Console</span>
                    <pre className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-white/80 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
                      {codeConsole || "Sandbox idle. Write code and click run script to execute compilation logs."}
                    </pre>
                  </div>
                </div>
              ) : activeLesson.lesson_type === 'scorm' ? (
                <div className="flex flex-col h-[650px] bg-[#080f28] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#080f28]/60 shrink-0">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">SCORM Compliance Player ({activeLesson.metadata?.scormVersion === 'scorm2004' ? 'SCORM 2004' : 'SCORM 1.2'})</span>
                    <Button 
                      onClick={() => {
                        handleToggleComplete(activeLesson.id);
                        toast.success("SCORM package completed!");
                      }}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider h-9 px-4 rounded-lg"
                    >
                      Simulate SCORM Completion ✓
                    </Button>
                  </div>
                  {activeLesson.video_url?.endsWith('.zip') ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#020617] space-y-4">
                      <Archive className="text-primary animate-pulse" size={48} />
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">SCORM Zip package loaded</h4>
                        <p className="text-[10px] text-white/40 max-w-sm mx-auto leading-relaxed mt-1">
                          SCORM package archive is securely hosted on our cloud locker. Click below to download or trigger simulation.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href={activeLesson.video_url}
                          className="inline-flex bg-primary hover:bg-primary/95 text-white rounded-lg uppercase tracking-wider text-[10px] font-black h-10 px-5 items-center justify-center"
                        >
                          Download Package Zip
                        </a>
                      </div>
                    </div>
                  ) : (
                    <iframe src={activeLesson.video_url} className="flex-1 w-full border-0 bg-[#020617]" />
                  )}
                </div>
              ) : (
                <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-2xl mx-auto space-y-4 font-body text-xs text-white/80 leading-relaxed whitespace-pre-line">
                  {activeLesson.content?.text || activeLesson.description || "No content available for this lesson."}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/5 bg-[#080f28]/30 shrink-0 flex justify-between items-center">
              <div></div>
              {getNextLesson() && (
                <Button
                  onClick={() => {
                    const next = getNextLesson();
                    setActiveLesson(next);
                  }}
                  className="h-12 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider px-6 flex items-center gap-1.5"
                >
                  Next Lesson <ChevronRight size={15} />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-12 space-y-3">
            <div>
              <BookOpen size={36} className="text-white/20 mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-3">Select a Lesson</h3>
              <p className="text-xs text-white/40 max-w-xs leading-relaxed mt-1">
                Choose a lecture node from the sidebar syllabus explorer on the left to start learning.
              </p>
            </div>
          </div>
        )}
      </div>
      <LiveHelpWidget courseId={course.id} enrollment={enrollment} />
    </div>
  );
}

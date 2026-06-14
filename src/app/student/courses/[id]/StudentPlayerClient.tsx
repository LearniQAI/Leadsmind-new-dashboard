'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, ChevronRight, CheckSquare, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';
import { Button } from '@/components/ui/button';
import SyllabusSidebar from './components/SyllabusSidebar';
import VideoPlayer from './components/VideoPlayer';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { getLessonLockReason } from './components/lock-utils';
import LockedLessonPlaceholder from './components/LockedLessonPlaceholder';
import LiveHelpWidget from './components/LiveHelpWidget';

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
              ) : (
                <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-2xl mx-auto space-y-4 leading-relaxed text-sm text-white/80">
                  {activeLesson.content?.text ? (
                    <div className="whitespace-pre-line text-white/70 leading-relaxed text-sm">
                      {activeLesson.content.text}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/30 italic text-xs">
                      No text description content exists for this lesson node.
                    </div>
                  )}
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

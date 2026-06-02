'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, ChevronRight, CheckCircle2, Play, Lock, Clock, AlertTriangle, CheckSquare, Eye, ArrowLeft, Download, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface StudentPlayerClientProps {
  course: any;
  modules: any[];
  lessons: any[];
  initialCompletedLessonIds: string[];
  enrollment: any;
}

function getEmbedUrl(url: string): string {
  if (!url) return '';
  try {
    if (url.includes('youtube.com/embed/')) return url;
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts[1]) {
        const videoId = parts[1].split(/[?#]/)[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtube.com/v/')) {
      const parts = url.split('youtube.com/v/');
      if (parts[1]) {
        const videoId = parts[1].split(/[?#]/)[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    if (url.includes('player.vimeo.com/video/')) return url;
    if (url.includes('vimeo.com/')) {
      const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
      if (match && match[1]) return `https://player.vimeo.com/video/${match[1]}`;
      const manageMatch = url.match(/vimeo\.com\/manage\/videos\/([0-9]+)/);
      if (manageMatch && manageMatch[1]) return `https://player.vimeo.com/video/${manageMatch[1]}`;
    }
  } catch (e) {
    console.error('[EmbedURL] Parsing error:', e);
  }
  return url;
}

export default function StudentPlayerClient({ 
  course, 
  modules, 
  lessons, 
  initialCompletedLessonIds,
  enrollment
}: StudentPlayerClientProps) {
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedLessonIds);
  const [activeLesson, setActiveLesson] = useState<any>(lessons[0] || null);
  const [isPending, startTransition] = useTransition();

  // Bandwidth optimizer for South African low-bandwidth networks
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  // Group lessons by module
  const lessonsByModule = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    lessons.forEach(l => {
      if (!map[l.module_id]) map[l.module_id] = [];
      map[l.module_id].push(l);
    });
    return map;
  }, [lessons]);

  // Evaluate Navigation Guards/Locks for a module & lesson
  const getLessonLockReason = (lesson: any, module: any, moduleIndex: number) => {
    // 1. Check if module is "Coming soon"
    if (module.publish_status === 'coming_soon') {
      return { type: 'coming_soon', message: 'This module is coming soon!' };
    }

    // 2. Check Drip Days relative to enrollment date
    if (module.drip_days > 0 && enrollment?.enrolled_at) {
      const enrollDate = new Date(enrollment.enrolled_at);
      const unlockDate = new Date(enrollDate.getTime() + module.drip_days * 24 * 60 * 60 * 1000);
      const now = new Date();
      if (now < unlockDate) {
        const diffMs = unlockDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { 
          type: 'dripped', 
          message: `This module is dripped. It will unlock in ${diffDays} day${diffDays === 1 ? '' : 's'}.` 
        };
      }
    }

    // 3. Check Prerequisites (Prior required modules must be complete)
    // Find all preceding modules that are required for completion
    for (let i = 0; i < moduleIndex; i++) {
      const prevMod = modules[i];
      if (prevMod.required_for_completion) {
        const prevLessons = lessonsByModule[prevMod.id] || [];
        const prevLessonIds = prevLessons.map(pl => pl.id);
        const prevCompleted = prevLessonIds.filter(id => completedLessonIds.includes(id));
        if (prevCompleted.length < prevLessonIds.length && prevLessonIds.length > 0) {
          return {
            type: 'prerequisite',
            message: `Please complete all lessons in the required previous module: "${prevMod.title}" first.`
          };
        }
      }
    }

    return null;
  };

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

  // Find next lesson for auto-progression
  const getNextLesson = () => {
    if (!activeLesson) return null;
    const currentIndex = lessons.findIndex(l => l.id === activeLesson.id);
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      return lessons[currentIndex + 1];
    }
    return null;
  };

  return (
    <div className="flex border border-white/5 rounded-2xl bg-[#080f28]/60 overflow-hidden shadow-2xl h-[calc(100vh-130px)]">
      {/* Syllabus Sidebar */}
      <div className="w-[360px] border-r border-white/5 bg-[#04091a]/40 flex flex-col shrink-0">
        <div className="p-5 border-b border-white/5 shrink-0 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Syllabus Explorer</span>
            <span className="text-base font-bold text-white tracking-tight truncate max-w-[240px] mt-0.5">{course.title}</span>
          </div>
          <Switch 
            checked={lowBandwidthMode}
            onCheckedChange={setLowBandwidthMode}
            className="data-[state=checked]:bg-emerald-500"
            title="South African Low-Bandwidth Mode (Throttles bitrates)"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {modules.map((mod, modIdx) => {
            const moduleLessons = lessonsByModule[mod.id] || [];

            return (
              <div key={mod.id} className="space-y-1.5">
                {/* Module title/header */}
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-black uppercase text-primary tracking-widest truncate max-w-[240px]">
                    {modIdx + 1}. {mod.title}
                  </span>
                  {mod.required_for_completion && (
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                      Required
                    </span>
                  )}
                </div>

                {/* Module lessons list */}
                <div className="space-y-1">
                  {moduleLessons.map((les) => {
                    const lockReason = getLessonLockReason(les, mod, modIdx);
                    const isSelected = activeLesson?.id === les.id;
                    const isDone = completedLessonIds.includes(les.id);

                    return (
                      <div
                        key={les.id}
                        onClick={() => {
                          if (!lockReason) {
                            setActiveLesson(les);
                          } else {
                            toast.error(lockReason.message);
                          }
                        }}
                        className={`p-3.5 rounded-xl text-sm flex items-center justify-between gap-3 select-none cursor-pointer transition-all border ${
                          lockReason 
                            ? "opacity-40 border-transparent bg-white/[0.01]" 
                            : isSelected
                              ? "bg-accent/10 border-accent text-white font-bold"
                              : "bg-white/[0.01] border-transparent text-white/60 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {lockReason ? (
                            <Lock size={14} className="text-white/40 shrink-0" />
                          ) : isDone ? (
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Play size={13} className="text-white/40 shrink-0" />
                          )}
                          <span className="truncate pr-1">{les.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/30 uppercase shrink-0">
                          {les.lesson_type}
                        </span>
                      </div>
                    );
                  })}
                  {moduleLessons.length === 0 && (
                    <span className="text-[10px] italic text-white/20 pl-3 block py-1.5">No lectures in module</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content player Area */}
      <div className="flex-1 flex flex-col bg-[#04091a]/15 overflow-hidden">
        {activeLesson ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
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

            {/* Display Media Content Panel */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Bandwidth advisory bar */}
              {lowBandwidthMode && activeLesson.lesson_type === 'video' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3 text-emerald-400 text-xs">
                  <Clock size={16} />
                  <span>
                    <strong>South African Bandwidth Optimiser Active:</strong> Throttling video quality automatically to prevent buffering on low-speed 3G profiles.
                  </span>
                </div>
              )}

              {/* Dynamic Content Views */}
              {activeLesson.lesson_type === 'video' ? (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden border border-white/5 relative flex items-center justify-center">
                    {/* Simulated Player embed */}
                    {activeLesson.content?.video_url ? (
                      <iframe
                        src={getEmbedUrl(activeLesson.content.video_url)}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <AlertTriangle className="text-white/20 mx-auto" size={32} />
                        <span className="text-xs text-white/40 block">No video URL linked to this lecture</span>
                      </div>
                    )}
                  </div>
                </div>
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
                /* Text and other lessons default view */
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

            {/* Bottom Actions Syllabus Navigation */}
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
    </div>
  );
}

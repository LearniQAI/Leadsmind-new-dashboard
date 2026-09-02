"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PlayCircle, BookOpen, Headphones, FileText,
  Video, Layers, CheckCircle,
  ChevronRight, RefreshCw, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

// Helper function to convert YouTube and Vimeo URLs to embed URLs
function getEmbedUrl(url: string): string {
  if (!url) return "";

  // YouTube RegExp
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[2]}`;
  }

  // Vimeo RegExp
  const vimeoRegExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

interface SpecializedPlayerProps {
  lesson: any;
  onComplete: () => Promise<void>;
  isCompleting: boolean;
}

export default function SpecializedPlayer({
  lesson,
  onComplete,
  isCompleting
}: SpecializedPlayerProps) {
  const { type = "Text", content = "", video_url = "", metadata = {} } = lesson;
  
  // Flashcards state
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const deck = metadata.flashcards || [];

  // Quiz state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  // Assignment state
  const [submissionText, setSubmissionText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleQuizSubmit = () => {
    setChecked(true);
    if (selectedAnswer === 0) {
      toast.success("Correct answer!");
    } else {
      toast.error("Incorrect. Try reviewing the lesson material!");
    }
  };

  // Render sub-players based on type
  const renderPlayer = () => {
    switch (type) {
      case "Video":
        return (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-white/5 shadow-2xl">
              <iframe
                src={getEmbedUrl(video_url)}
                className="absolute inset-0 w-full h-full border-none"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            </div>
            {content && <p className="text-xs text-white/60 leading-relaxed font-body mt-4 whitespace-pre-line">{content}</p>}
          </div>
        );

      case "Audio":
        return (
          <div className="space-y-6 bg-[#111d47]/20 border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
              <Headphones size={36} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-accent2 uppercase tracking-widest block">Podcast / Audio Lecture</span>
              <h3 className="text-sm font-bold text-white">{lesson.title}</h3>
            </div>
            <audio controls src={video_url} className="w-full max-w-md mt-4 outline-none filter invert opacity-90" />
            {content && <p className="text-xs text-white/50 leading-relaxed max-w-lg mt-4">{content}</p>}
          </div>
        );

      case "PDF":
        return (
          <div className="space-y-4">
            <div className="w-full h-[550px] rounded-2xl border border-white/5 overflow-hidden shadow-2xl bg-black">
              <iframe src={`${video_url}#toolbar=0`} className="w-full h-full" />
            </div>
            {content && <p className="text-xs text-white/60 leading-relaxed mt-2">{content}</p>}
          </div>
        );

      case "Live Session":
        return (
          <div className="space-y-6 bg-[#111d47]/30 border border-white/10 rounded-2xl p-8 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <Video size={28} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 inline-block">Live Broadcaster Node</span>
              <h3 className="text-lg font-space-grotesk font-black text-white uppercase tracking-tight">{lesson.title}</h3>
              <p className="text-xs text-white/40 font-mono">Stream URL: {video_url}</p>
            </div>
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-t2 leading-relaxed">{content || "Join this live lecture broadcast node using the link below."}</p>
              <Button
                onClick={() => window.open(video_url, "_blank")}
                className="mt-6 bg-accent hover:bg-accent/90 text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-accent/20"
              >
                Launch Broadcast Link
              </Button>
            </div>
          </div>
        );

      case "Flashcards":
        if (deck.length === 0) {
          return (
            <div className="py-20 text-center bg-[#111d47]/10 border border-dashed border-white/5 rounded-2xl">
              <Layers className="mx-auto text-white/20 mb-3" size={32} />
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">No active flashcards inside deck</span>
            </div>
          );
        }
        return (
          <div className="space-y-6 max-w-md mx-auto">
            {/* Flippable Card container */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full h-64 bg-[#111d47]/40 border border-white/5 rounded-2xl cursor-pointer hover:border-accent/40 shadow-2xl flex items-center justify-center p-6 text-center select-none transition-all duration-300 transform"
            >
              {isFlipped ? (
                <div className="space-y-3">
                  <span className="text-[9px] font-bold uppercase text-purple tracking-widest block">Explanation (Back)</span>
                  <p className="text-sm font-medium text-white leading-relaxed">{deck[activeCardIdx]?.back}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-[9px] font-bold uppercase text-accent2 tracking-widest block">Active Recall Question (Front)</span>
                  <p className="text-base font-space-grotesk font-bold text-white uppercase tracking-tight">{deck[activeCardIdx]?.front}</p>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-white/40 font-mono">Card {activeCardIdx + 1} of {deck.length}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveCardIdx((prev) => (prev > 0 ? prev - 1 : deck.length - 1));
                  }}
                  className="h-9 px-3 rounded-lg text-xs"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveCardIdx((prev) => (prev < deck.length - 1 ? prev + 1 : 0));
                  }}
                  className="h-9 px-4 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs"
                >
                  Next Card
                </Button>
              </div>
            </div>
          </div>
        );

      case "Quiz":
        // Three Deferred Items, Item 3 — QuizPlayer.tsx (and the legacy lms_quizzes/
        // lms_questions/lms_quiz_submissions tables it read/wrote) removed: confirmed dead,
        // zero real callers, zero real rows in any of the three tables. This whole
        // /courses/[id]/learn admin-preview player already keyed off `lesson.type` (a field
        // real course_lessons rows don't have — the real column is `lesson_type`), so this
        // case was already unreachable with real lesson data before this removal. Real quiz
        // taking/authoring lives at /courses/[id]/quiz/[quizId] (lesson-scoped) and
        // /courses/[id]/module-quiz/[moduleId] (module-scoped), both untouched by this.
        return (
          <div className="bg-[#111d47]/20 border border-white/5 rounded-2xl p-6 max-w-xl mx-auto text-center space-y-2">
            <p className="text-xs text-white/60">Quiz preview isn't available here.</p>
          </div>
        );

      case "Assignment":
        return (
          <div className="bg-[#111d47]/20 border border-white/5 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-accent2 font-mono">Submission Instructions</span>
              <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{content || "Submit your assignment text answer in the box below."}</p>
            </div>

            {isSubmitted ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                <CheckCircle size={28} className="text-emerald-400 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Assignment Submitted Successfully</h4>
                <p className="text-[10px] text-white/40">Instructors will grade this submission node shortly</p>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Paste your assignment submission text here..."
                  rows={6}
                  className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-accent transition-all leading-relaxed"
                />
                <Button
                  onClick={() => {
                    if (!submissionText) {
                      toast.error("Please enter your submission text.");
                      return;
                    }
                    setIsSubmitted(true);
                    toast.success("Assignment submitted!");
                  }}
                  className="bg-accent hover:bg-accent/90 text-white font-black text-[10px] uppercase tracking-widest h-10 px-5 rounded-xl"
                >
                  Submit Assignment
                </Button>
              </div>
            )}
          </div>
        );

      default:
        // Text format
        return (
          <div className="prose prose-invert max-w-none text-t1 leading-relaxed text-sm font-body bg-[#111d47]/10 border border-white/5 rounded-2xl p-6 whitespace-pre-wrap">
            {content || "No lesson material description specified."}
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Player Wrapper */}
      <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-accent before:rounded-t-2xl">
        {/* Lesson meta header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-accent2 uppercase tracking-widest flex items-center gap-1">
              {type} Lecture Node
            </span>
            <h2 className="text-xl font-space-grotesk font-black text-white uppercase tracking-tight">
              {lesson.title}
            </h2>
          </div>
        </div>

        {/* Dynamic type player mounting */}
        <div className="min-h-[250px]">
          {renderPlayer()}
        </div>
      </div>

      {/* Completion controls */}
      <div className="flex items-center justify-end border-t border-white/5 pt-6 shrink-0">
        <Button
          onClick={onComplete}
          disabled={isCompleting}
          className="bg-accent hover:bg-accent/90 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center gap-2"
        >
          {isCompleting ? (
            <>
              <RefreshCw size={14} className="animate-spin mr-1" /> Completing...
            </>
          ) : (
            <>
              Complete & Next Lesson <ChevronRight size={14} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

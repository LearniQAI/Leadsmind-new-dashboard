"use client";

import React from "react";
import { Play, Check, BookOpen, Stamp } from "lucide-react";
import { CourseThemeTokens } from "@/lib/courses/courseThemeTokens";

interface CourseThemeMiniPreviewProps {
  theme: CourseThemeTokens;
  selected: boolean;
}

// Premium Course Theme Redesign, Step 2: a real miniature rendering of the actual student
// player using this theme's real tokens — including its real page background (not a shared
// dark shell for all 3 anymore) and its real signature element in miniature, since that's
// the actual differentiator between the 3 themes now, not just an accent hue.
export default function CourseThemeMiniPreview({ theme, selected }: CourseThemeMiniPreviewProps) {
  const bg = theme.signature === "seal" ? "#0B0B0C" : theme.pageBgHex;
  const isLight = theme.signature !== "seal";

  return (
    <div
      className="relative rounded-lg overflow-hidden aspect-[4/3] flex text-[6px] leading-none"
      style={{ background: bg }}
    >
      {/* Mini sidebar */}
      <div
        className="w-[38%] p-1.5 flex flex-col gap-1.5 shrink-0"
        style={{
          background: isLight ? `${theme.primaryHex}0D` : "rgba(255,255,255,0.03)",
          borderRight: `1px solid ${isLight ? theme.pageBorderHex : "rgba(255,255,255,0.05)"}`
        }}
      >
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: isLight ? `${theme.primaryHex}33` : "rgba(255,255,255,0.1)" }} />
          <span className={`font-bold truncate ${isLight ? "" : "text-white/70"}`} style={isLight ? { color: theme.pageTextPrimaryHex } : undefined}>
            Jenima Marayag
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <span
            className="rounded px-1 py-0.5"
            style={{ background: isLight ? theme.pageBorderHex : "rgba(255,255,255,0.1)", color: isLight ? theme.pageTextSecondaryHex : "rgba(255,255,255,0.6)" }}
          >
            Prev
          </span>
          <span className="text-white rounded px-1 py-0.5" style={{ background: theme.primaryHex }}>Next</span>
        </div>

        {/* Real signature progress indicator, in miniature */}
        {theme.signature === "branch" ? (
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-2">
            <line x1="1" y1="5" x2="99" y2="5" stroke={theme.primaryHex} strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="5" x2="31" y2="5" stroke={theme.primaryHex} strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="5" x2="47" y2="1.5" stroke={theme.primaryHex} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="75" y1="5" x2="78" y2="8.5" stroke={theme.primaryHex} strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="w-full rounded-full h-0.5 overflow-hidden" style={{ background: isLight ? theme.pageBorderHex : "rgba(255,255,255,0.1)" }}>
            <div className={`h-full bg-gradient-to-r ${theme.gradientClass}`} style={{ width: "30%" }} />
          </div>
        )}

        <div className="space-y-1 mt-0.5">
          <div className="font-bold uppercase" style={{ color: isLight ? theme.pageTextSecondaryHex : "rgba(255,255,255,0.4)" }}>Module 1</div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              {i === 0 && theme.signature === "seal" ? (
                <span
                  className="inline-flex items-center justify-center rounded-sm shrink-0"
                  style={{ width: 5, height: 5, background: theme.primaryHex, transform: "rotate(-14deg)" }}
                >
                  <Stamp size={3} className="text-white" style={{ transform: "rotate(14deg)" }} />
                </span>
              ) : (
                <BookOpen size={5} className="shrink-0" style={{ color: isLight ? theme.pageTextSecondaryHex : "rgba(255,255,255,0.3)" }} />
              )}
              <span className="truncate" style={{ color: isLight ? theme.pageTextSecondaryHex : "rgba(255,255,255,0.4)" }}>Lecture {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main lecture area */}
      <div className="flex-1 p-1.5 flex flex-col gap-1.5 min-w-0">
        <span className="font-bold truncate" style={{ color: isLight ? theme.pageTextPrimaryHex : "rgba(255,255,255,0.8)" }}>Lecture 3</span>
        <div className="flex-1 rounded flex items-center justify-center relative" style={{ background: isLight ? theme.pageSurfaceHex : "rgba(0,0,0,0.6)", border: isLight ? `1px solid ${theme.pageBorderHex}` : "none" }}>
          {/* Real signature glow, in miniature, behind the video placeholder */}
          {theme.signature === "glow" && (
            <div className="absolute inset-2 rounded-full blur-md pointer-events-none" style={{ background: theme.primaryHex, opacity: 0.35 }} />
          )}
          <span className="relative h-4 w-4 rounded-full flex items-center justify-center" style={{ background: theme.primaryHex }}>
            <Play size={6} className="text-white" />
          </span>
        </div>
        <span className="text-white text-center rounded py-0.5 font-bold" style={{ background: theme.primaryHex }}>
          Mark as complete
        </span>
      </div>

      {selected && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1">
            <Check size={9} className="text-green" />
            <span className="text-[7px] font-bold text-green">Theme selected</span>
          </div>
        </div>
      )}
    </div>
  );
}

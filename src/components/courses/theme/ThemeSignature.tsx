"use client";

import React from "react";
import { CheckCircle2, Stamp } from "lucide-react";
import { CourseThemeTokens } from "@/lib/courses/courseThemeTokens";

// The ONE real signature move per theme (Premium Course Theme Redesign), used at genuine
// completion moments only — never scattered decoratively. Signal: a stamped/rotated seal.
// Ember: a soft warm glow bloom. Grove: a branching progress line, built in this same file
// since it's the direct structural replacement for the flat gradient progress bar.

interface ThemeCompletionIconProps {
  theme: CourseThemeTokens;
  size?: number;
}

// Replaces the plain CheckCircle2 completed-lesson indicator with the theme's real signature
// where the brief calls for it (Signal only — "sidebar completed-lesson indicator"). Ember
// and Grove keep the same base checkmark (their signature lives elsewhere: the glow, the
// branch line) so it isn't reproduced in three places and diluted.
export function ThemeCompletionIcon({ theme, size = 15 }: ThemeCompletionIconProps) {
  if (theme.signature === "seal") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-sm shrink-0"
        style={{
          width: size + 4,
          height: size + 4,
          background: theme.primaryHex,
          transform: "rotate(-14deg)",
          boxShadow: `0 2px 6px ${theme.primaryHex}66`
        }}
        title="Completed — stamped"
      >
        <Stamp size={size - 4} className="text-white" style={{ transform: "rotate(14deg)" }} />
      </span>
    );
  }
  return <CheckCircle2 size={size} style={{ color: theme.primaryHex }} className="shrink-0" />;
}

// A soft blurred radial bloom in the theme's accent color, positioned behind whatever it
// wraps (video thumbnails, the active-lesson row). Only rendered for Ember — the other two
// themes render children unwrapped, so this never becomes decorative noise on their surfaces.
export function ThemeGlowWrap({
  theme,
  active = true,
  children,
  className = ""
}: {
  theme: CourseThemeTokens;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (theme.signature !== "glow" || !active) {
    return <>{children}</>;
  }
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute -inset-3 rounded-full blur-2xl pointer-events-none"
        style={{ background: theme.primaryHex, opacity: 0.35 }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

interface ThemeProgressIndicatorProps {
  theme: CourseThemeTokens;
  percent: number;
  /** Real module count — used to place the branch line's fork points at real module
   *  boundaries, not decorative/arbitrary ticks. */
  moduleCount: number;
}

// The flat gradient bar (Signal, Ember) vs. Grove's real structural replacement: a trunk line
// that forks at each module boundary, like a plant's growth structure — evoking "growth"
// through this ONE element rather than literal leaf/plant iconography anywhere else.
export function ThemeProgressIndicator({ theme, percent, moduleCount }: ThemeProgressIndicatorProps) {
  if (theme.signature !== "branch") {
    return (
      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div
          className={`bg-gradient-to-r ${theme.gradientClass} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }

  const forks = Math.max(moduleCount, 1);
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="w-full h-3 overflow-visible">
      {/* Unfilled trunk (full width, faint) */}
      <line x1="1" y1="6" x2="99" y2="6" stroke="white" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" />
      {/* Filled trunk, clipped to real completion percent */}
      <line
        x1="1"
        y1="6"
        x2={1 + (clampedPercent / 100) * 98}
        y2="6"
        stroke={theme.primaryHex}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Fork ticks at each real module boundary */}
      {Array.from({ length: forks }).map((_, i) => {
        const x = 1 + ((i + 1) / (forks + 1)) * 98;
        const isPastFork = (x / 100) * 100 <= clampedPercent;
        return (
          <line
            key={i}
            x1={x}
            y1="6"
            x2={x + (i % 2 === 0 ? -2.5 : 2.5)}
            y2={i % 2 === 0 ? "1.5" : "10.5"}
            stroke={isPastFork ? theme.primaryHex : "white"}
            strokeOpacity={isPastFork ? 1 : 0.15}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

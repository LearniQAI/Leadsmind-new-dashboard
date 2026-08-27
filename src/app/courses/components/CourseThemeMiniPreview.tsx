"use client";

import React from "react";
import { Play, Check } from "lucide-react";
import { CourseThemeTokens } from "@/lib/courses/courseThemeTokens";

interface CourseThemeMiniPreviewProps {
  theme: CourseThemeTokens;
  selected: boolean;
}

/**
 * Premium miniature of the student player for a theme.
 *
 * Rather than shrink real UI text to an illegible 6px, this renders the player
 * as a clean product mockup: window chrome, skeleton content bars, and the
 * theme's real signature motif (glow / seal / branch) as the hero element —
 * which is the actual differentiator between the three themes. Every colour is
 * pulled from the theme's real tokens.
 */
export default function CourseThemeMiniPreview({ theme, selected }: CourseThemeMiniPreviewProps) {
  const isSeal = theme.signature === "seal";
  const isGlow = theme.signature === "glow";
  const isBranch = theme.signature === "branch";
  const isLight = !isSeal;

  const bg = isSeal ? "#0B0B0C" : theme.pageBgHex;
  const line = isLight ? theme.pageBorderHex : "rgba(255,255,255,0.12)";
  const softLine = isLight ? theme.pageBorderHex : "rgba(255,255,255,0.08)";
  const panel = isLight ? theme.pageSurfaceHex : "rgba(255,255,255,0.04)";
  const railBg = isLight ? `${theme.primaryHex}0A` : "rgba(255,255,255,0.025)";
  const videoBg = isLight ? theme.pageSurfaceHex : "#050506";

  const Bar = ({
    w,
    h = 3,
    c,
    className = "",
  }: {
    w: number | string;
    h?: number;
    c?: string;
    className?: string;
  }) => (
    <span
      className={`block rounded-full ${className}`}
      style={{ width: typeof w === "number" ? `${w}%` : w, height: h, background: c ?? line }}
    />
  );

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-1 px-2.5 py-1.5"
        style={{ borderBottom: `1px solid ${softLine}` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: line }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: line }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: line }} />
        <span
          className="ml-1.5 h-2.5 flex-1 rounded-full"
          style={{ background: isLight ? theme.pageBgHex : "rgba(255,255,255,0.05)", border: `1px solid ${softLine}` }}
        />
      </div>

      <div className="flex h-[calc(100%-22px)]">
        {/* Rail */}
        <div
          className="flex w-[34%] shrink-0 flex-col gap-2 p-2.5"
          style={{ background: railBg, borderRight: `1px solid ${softLine}` }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ background: `${theme.primaryHex}2E` }}
            />
            <span className="flex flex-1 flex-col gap-1">
              <Bar w={80} h={3} />
              <Bar w={55} h={2.5} c={softLine} />
            </span>
          </div>

          {/* Signature progress motif */}
          {isBranch ? (
            <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="mt-0.5 h-3 w-full">
              <line x1="2" y1="6" x2="98" y2="6" stroke={theme.primaryHex} strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="2" y1="6" x2="38" y2="6" stroke={theme.primaryHex} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="38" y1="6" x2="34" y2="1.5" stroke={theme.primaryHex} strokeWidth="2" strokeLinecap="round" />
              <line x1="62" y1="6" x2="66" y2="10.5" stroke={theme.primaryHex} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
              <circle cx="38" cy="6" r="2.4" fill={theme.primaryHex} />
            </svg>
          ) : (
            <span
              className="mt-0.5 block h-1 w-full overflow-hidden rounded-full"
              style={{ background: isLight ? theme.pageBorderHex : "rgba(255,255,255,0.1)" }}
            >
              <span
                className={`block h-full rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                style={{ width: "38%" }}
              />
            </span>
          )}

          {/* Lesson rows */}
          <div className="mt-1 flex flex-col gap-1.5">
            <Bar w={40} h={2.5} c={softLine} className="mb-0.5" />
            {[0, 1, 2].map((i) => {
              const active = i === 0;
              return (
                <div key={i} className="flex items-center gap-1.5">
                  {isSeal && active ? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: theme.primaryHex, transform: "rotate(-14deg)" }}
                    />
                  ) : (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: active ? theme.primaryHex : line }}
                    />
                  )}
                  <Bar w={active ? 78 : 60} h={2.5} c={active ? `${theme.primaryHex}66` : softLine} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
          <Bar w={45} h={3.5} c={isLight ? theme.pageTextPrimaryHex : "rgba(255,255,255,0.65)"} />

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md"
            style={{ background: videoBg, border: isLight ? `1px solid ${line}` : "none" }}
          >
            {isGlow && (
              <span
                className="pointer-events-none absolute h-[70%] w-[70%] rounded-full blur-lg"
                style={{ background: theme.primaryHex, opacity: 0.4 }}
              />
            )}
            {isSeal && (
              <span
                className="absolute right-1.5 top-1.5 h-4 w-4 rounded-[3px]"
                style={{ background: theme.primaryHex, transform: "rotate(-12deg)", opacity: 0.9 }}
              />
            )}
            {isBranch && (
              <svg viewBox="0 0 120 60" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-1/2 w-full">
                <path d="M0 55 H40 L52 40 M52 40 H80 L92 52 M92 52 H120" fill="none" stroke={theme.primaryHex} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span
              className="relative flex h-5 w-5 items-center justify-center rounded-full shadow-sm"
              style={{ background: theme.primaryHex }}
            >
              <Play size={9} className="translate-x-[0.5px] text-white" fill="currentColor" />
            </span>
          </div>

          <span
            className="block h-3.5 w-full rounded"
            style={{ background: theme.primaryHex }}
          />
        </div>
      </div>

      {selected && (
        <span
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
          style={{ color: theme.primaryHex }}
        >
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings2,
  Palette,
  DollarSign,
  Mail,
  ClipboardList,
  Zap,
  BarChart3,
  ArrowUpRight,
  Award,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CourseSettingsForm from "./CourseSettingsForm";
import CourseAnalyticsTab from "./CourseAnalyticsTab";
import CourseLandingForm from "./CourseLandingForm";
import CoursePricingForm from "./CoursePricingForm";
import EmailTemplateForm from "./EmailTemplateForm";
import CourseCertificateForm from "./CourseCertificateForm";
import CourseSubmissionsTab from "./CourseSubmissionsTab";
import CourseEnrollmentsTab from "./CourseEnrollmentsTab";

// Nav restructure (Systeme-parity Master Prompt, Section 2): the 6 tabs other than Modules/
// Settings move here as sub-sections. Audit confirmed (Step 0) all 6 were client-side tab
// state on ONE route, not separate URLs — except Automations, which was already a real
// separate route (/courses/[id]/automations navigated via router.push, not activeTab state).
//
// Course Settings Navigation Restructure pass: this was a LEFT SIDEBAR grouped into
// Configuration/Audience. Re-audited and moved to a horizontal top navbar per that pass —
// see the per-line notes below for exactly what changed and why. The "landing-page" id is
// UNCHANGED on purpose (only its visible label became "Description"): it was never a URL
// segment — this whole shell is one route (/courses/[id]?tab=settings), with `section` as a
// query param carrying this same id string (see CourseWorkspaceClient.tsx and the
// "Needs grading" deep link to ?section=submissions) — renaming the id would silently break
// that deep link and the "View and customize theme" quick-action button, for zero benefit
// since no bookmarkable /landing-page URL ever existed to clean up.
export type SettingsSectionId =
  | "general"
  | "landing-page"
  | "pricing"
  | "emails"
  | "certificate"
  | "enrollments"
  | "submissions"
  | "automations"
  | "analytics";

type NavItem = {
  id: SettingsSectionId;
  label: string;
  icon: any;
  external?: boolean;
  /** Visually separates the "Audience" items from "Configuration" without a text label. */
  separatorBefore?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "landing-page", label: "Description", icon: Palette },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "certificate", label: "Certificate", icon: Award },
  { id: "automations", label: "Automations", icon: Zap, external: true },
  // Course Start Methods pass (Method 1): pending_approval enrollments live under Audience,
  // not Configuration — this is about real people signing up, same category as Submissions.
  { id: "enrollments", label: "Enrollments", icon: UserCheck, separatorBefore: true },
  { id: "submissions", label: "Submissions", icon: ClipboardList },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

interface CourseSettingsContainerProps {
  course: any;
  courseId: string;
  onCourseSaved: (course: any) => void;
  activeSection: SettingsSectionId;
  setActiveSection: (section: SettingsSectionId) => void;
}

export default function CourseSettingsContainer({
  course,
  courseId,
  onCourseSaved,
  activeSection,
  setActiveSection,
}: CourseSettingsContainerProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drives the left/right fade masks on the horizontal scroller (narrow-viewport pattern —
  // 8 items don't fit under ~640px). Recomputed on scroll and on resize.
  const updateScrollFades = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollFades();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollFades, { passive: true });
    window.addEventListener("resize", updateScrollFades);
    return () => {
      el.removeEventListener("scroll", updateScrollFades);
      window.removeEventListener("resize", updateScrollFades);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="px-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
          Course settings
        </div>
        <p className="mt-0.5 text-[12px] text-dash-textMuted">
          Everything about how this course is sold and delivered.
        </p>
      </div>

      {/* Horizontal top navbar — replaces the old left sidebar. Same items, same order, same
          icons; the Configuration/Audience text headings are gone, replaced by a thin
          divider (separatorBefore) before Submissions so that group still reads as visually
          distinct. */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex items-center gap-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-dash-border"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = !item.external && activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.external) {
                    router.push(`/courses/${courseId}/automations`);
                  } else {
                    setActiveSection(item.id);
                  }
                }}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20",
                  item.separatorBefore && "ml-3 pl-[18px] before:absolute before:-left-1.5 before:top-1/2 before:h-5 before:-translate-y-1/2 before:border-l before:border-dash-border",
                  isActive
                    ? "text-sky-700"
                    : "text-dash-textMuted hover:text-dash-text hover:bg-dash-surface"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-sky-600" : "text-dash-textMuted group-hover:text-dash-text")} />
                {item.label}
                {item.external && <ArrowUpRight className="size-3 text-dash-textMuted" />}
                {/* Active-tab underline, matching the app's sky accent used elsewhere in this
                    same shell (previously a filled pill on the sidebar; an underline is the
                    natural equivalent for a horizontal row). */}
                <span
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-sky-500 transition-opacity",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Fade edges — only visible while there's more to scroll in that direction. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      {/* Sub-section content. Most sections are single-column forms and read best
          capped to a comfortable measure; Landing / Submissions / Analytics are
          multi-column workspaces and take the full width. */}
      <div className="min-w-0 flex-1">
        {activeSection === "landing-page" ? (
          <CourseLandingForm course={course} onSaved={onCourseSaved} />
        ) : activeSection === "enrollments" ? (
          <CourseEnrollmentsTab courseId={courseId} startMethod={course.start_method || "instant_payment"} />
        ) : activeSection === "submissions" ? (
          <CourseSubmissionsTab courseId={courseId} />
        ) : activeSection === "analytics" ? (
          <CourseAnalyticsTab courseId={courseId} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {activeSection === "general" && (
              <CourseSettingsForm course={course} onSaved={onCourseSaved} />
            )}
            {activeSection === "pricing" && (
              <CoursePricingForm course={course} onSaved={onCourseSaved} />
            )}
            {activeSection === "emails" && (
              <EmailTemplateForm course={course} onSaved={onCourseSaved} />
            )}
            {activeSection === "certificate" && (
              <CourseCertificateForm course={course} onSaved={onCourseSaved} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

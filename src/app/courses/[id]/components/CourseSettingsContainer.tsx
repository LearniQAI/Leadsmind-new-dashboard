"use client";

import React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import CourseSettingsForm from "./CourseSettingsForm";
import CourseAnalyticsTab from "./CourseAnalyticsTab";
import CourseLandingForm from "./CourseLandingForm";
import CoursePricingForm from "./CoursePricingForm";
import EmailTemplateForm from "./EmailTemplateForm";
import CourseSubmissionsTab from "./CourseSubmissionsTab";

// Nav restructure (Systeme-parity Master Prompt, Section 2): the 6 tabs other than Modules/
// Settings move here as sub-sections. Audit confirmed (Step 0) all 6 were client-side tab
// state on ONE route, not separate URLs — except Automations, which was already a real
// separate route (/courses/[id]/automations navigated via router.push, not activeTab state).
//
// Secondary-nav choice: a LEFT SIDEBAR, not a secondary tab row — this content is dense
// (multi-field settings forms, a pricing form, an analytics dashboard, a submissions review
// table) and a sidebar keeps each label readable and the active section unambiguous.
//
// UI pass: rebuilt on the shared Refined-SaaS primitives in ./settings/primitives.tsx —
// hairline cards, label-left fields, one sky accent. Sidebar grouped into
// Configuration / Audience so 7 items don't read as an undifferentiated stack.
export type SettingsSectionId =
  | "general"
  | "landing-page"
  | "pricing"
  | "emails"
  | "submissions"
  | "automations"
  | "analytics";

type NavItem = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: any;
  external?: boolean;
};

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Configuration",
    items: [
      { id: "general", label: "General", description: "Title, cover, launch state", icon: Settings2 },
      { id: "landing-page", label: "Landing page", description: "Theme, sections, copy", icon: Palette },
      { id: "pricing", label: "Pricing", description: "Model, checkout, caps", icon: DollarSign },
      { id: "emails", label: "Emails", description: "Onboarding template", icon: Mail },
      { id: "automations", label: "Automations", description: "Triggers & flows", icon: Zap, external: true },
    ],
  },
  {
    heading: "Audience",
    items: [
      { id: "submissions", label: "Submissions", description: "Grade student work", icon: ClipboardList },
      { id: "analytics", label: "Analytics", description: "Enrolment & progress", icon: BarChart3 },
    ],
  },
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

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Sub-navigation sidebar */}
      <nav className="w-full shrink-0 lg:sticky lg:top-6 lg:w-60">
        <div className="mb-4 px-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            Course settings
          </div>
          <p className="mt-0.5 text-[12px] text-dash-textMuted">
            Everything about how this course is sold and delivered.
          </p>
        </div>

        <div className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dash-textMuted/70">
                {group.heading}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
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
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20",
                        isActive
                          ? "bg-sky-50 ring-1 ring-inset ring-sky-500/20"
                          : "hover:bg-dash-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors [&_svg]:size-4",
                          isActive
                            ? "border-sky-200 bg-white text-sky-600"
                            : "border-dash-border bg-dash-surface text-dash-textMuted group-hover:text-dash-text"
                        )}
                      >
                        <Icon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[13px] font-semibold",
                            isActive ? "text-sky-700" : "text-dash-text"
                          )}
                        >
                          {item.label}
                          {item.external && (
                            <ArrowUpRight className="size-3 text-dash-textMuted" />
                          )}
                        </span>
                        <span className="block truncate text-[11px] text-dash-textMuted">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Sub-section content. Most sections are single-column forms and read best
          capped to a comfortable measure; Landing / Submissions / Analytics are
          multi-column workspaces and take the full width. */}
      <div className="min-w-0 flex-1">
        {activeSection === "landing-page" ? (
          <CourseLandingForm course={course} onSaved={onCourseSaved} />
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
          </div>
        )}
      </div>
    </div>
  );
}

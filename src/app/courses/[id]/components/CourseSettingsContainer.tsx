"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Palette, DollarSign, Mail, ClipboardList, Zap, BarChart3, ExternalLink } from "lucide-react";
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
// So there is no deep-link/bookmark concern to redirect for the other 6 (they never had a
// distinct URL to begin with), and Automations keeps navigating to its real existing route
// here rather than being duplicated/rebuilt inline.
//
// Secondary-nav choice: a LEFT SIDEBAR, not a secondary tab row — chosen because this
// content is dense (multi-field settings forms, a pricing form, an analytics dashboard,
// a submissions review table) and a sidebar gives each label room + keeps the active
// section unambiguous at this density, where a horizontal tab row would either wrap or
// need to shrink labels illegibly at 7 items.
export type SettingsSectionId = "general" | "landing-page" | "pricing" | "emails" | "submissions" | "automations" | "analytics";

const SETTINGS_SECTIONS: { id: SettingsSectionId; label: string; icon: any; external?: boolean }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "landing-page", label: "Landing Page", icon: Palette },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "submissions", label: "Submissions", icon: ClipboardList },
  { id: "automations", label: "Automations", icon: Zap, external: true },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

interface CourseSettingsContainerProps {
  course: any;
  courseId: string;
  onCourseSaved: (course: any) => void;
  activeSection: SettingsSectionId;
  setActiveSection: (section: SettingsSectionId) => void;
}

export default function CourseSettingsContainer({ course, courseId, onCourseSaved, activeSection, setActiveSection }: CourseSettingsContainerProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Sub-navigation sidebar */}
      <div className="w-full md:w-56 shrink-0 bg-white border border-dash-border rounded-2xl p-2 space-y-1 shadow-sm">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => {
                if (section.external) {
                  router.push(`/courses/${courseId}/automations`);
                } else {
                  setActiveSection(section.id);
                }
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-colors motion-reduce:transition-none ${
                isActive
                  ? "bg-dash-accent text-white"
                  : "!text-dash-textMuted hover:bg-dash-surface hover:!text-dash-text"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon size={14} /> {section.label}
              </span>
              {section.external && <ExternalLink size={11} className={isActive ? "text-white/70" : "!text-dash-textMuted"} />}
            </button>
          );
        })}
      </div>

      {/* Sub-section content — each reuses its exact existing component, unchanged */}
      <div className="flex-1 min-w-0 w-full">
        {activeSection === "general" && <CourseSettingsForm course={course} onSaved={onCourseSaved} />}
        {activeSection === "landing-page" && <CourseLandingForm course={course} onSaved={onCourseSaved} />}
        {activeSection === "pricing" && <CoursePricingForm course={course} onSaved={onCourseSaved} />}
        {activeSection === "emails" && <EmailTemplateForm course={course} onSaved={onCourseSaved} />}
        {activeSection === "submissions" && <CourseSubmissionsTab courseId={courseId} />}
        {activeSection === "analytics" && <CourseAnalyticsTab courseId={courseId} />}
      </div>
    </div>
  );
}

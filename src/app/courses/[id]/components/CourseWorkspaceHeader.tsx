"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourseWorkspaceHeaderProps {
  courseTitle: string;
  courseId: string;
  activeTab: "modules" | "settings";
  setActiveTab: (tab: "modules" | "settings") => void;
}

// Nav restructure (Systeme-parity Master Prompt, Section 2): 2 top-level tabs instead of 8.
// Modules stays primary/default (matches how central it is to daily work); everything else
// (Landing Page/Pricing/Emails/Submissions/Automations/Analytics + the original Settings)
// now lives inside CourseSettingsContainer's own sub-navigation, reached via the Settings tab.
export default function CourseWorkspaceHeader({
  courseTitle,
  courseId,
  activeTab,
  setActiveTab
}: CourseWorkspaceHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold !text-dash-textMuted font-mono">
        <span className="hover:text-dash-accent transition-colors motion-reduce:transition-none cursor-pointer" onClick={() => router.push("/courses")}>Courses</span>
        <span>›</span>
        <span className="!text-dash-text">{courseTitle}</span>
      </div>

      {/* Back button */}
      <div>
        <button
          onClick={() => router.push("/courses")}
          className="flex items-center gap-1.5 text-xs !text-dash-textMuted hover:!text-dash-text font-bold bg-dash-surface border border-dash-border hover:bg-dash-border/60 px-3 py-1.5 rounded-xl transition-all motion-reduce:transition-none"
        >
          <ArrowLeft size={13} /> Back to Courses
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-white border border-dash-border rounded-xl p-1 w-fit shrink-0 shadow-sm">
        {(["modules", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-[11px] font-bold capitalize transition-all motion-reduce:transition-none ${
              activeTab === tab
                ? "bg-primary text-white"
                : "!text-dash-textMuted hover:!text-dash-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

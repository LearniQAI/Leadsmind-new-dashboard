"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourseWorkspaceHeaderProps {
  courseTitle: string;
  courseId: string;
  activeTab: "settings" | "modules" | "automations" | "analytics" | "landing-page" | "pricing" | "emails" | "submissions";
  setActiveTab: (tab: "settings" | "modules" | "automations" | "analytics" | "landing-page" | "pricing" | "emails" | "submissions") => void;
}

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
        {(["settings", "modules", "landing-page", "pricing", "emails", "submissions", "automations", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "automations") {
                router.push(`/courses/${courseId}/automations`);
              } else {
                setActiveTab(tab);
              }
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold capitalize transition-all motion-reduce:transition-none ${activeTab === tab
                ? "bg-primary text-white"
                : "!text-dash-textMuted hover:!text-dash-text"
              }`}
          >
            {tab === "landing-page" ? "landing page" : tab}
          </button>
        ))}
      </div>
    </div>
  );
}

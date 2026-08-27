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

// Nav restructure (Systeme-parity Master Prompt, Section 2): the module/settings tab row was
// removed on request. Settings is reached from the quick-action buttons below; Modules is the
// default view. This component now just carries the breadcrumb + a back affordance.
export default function CourseWorkspaceHeader({
  courseTitle,
  courseId,
  activeTab,
  setActiveTab,
}: CourseWorkspaceHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[12px] font-medium tracking-tight !text-dash-textMuted">
        <button
          onClick={() => router.push("/courses")}
          className="transition-colors hover:!text-dash-text"
        >
          Courses
        </button>
        <span className="!text-dash-border">/</span>
        <span className="truncate font-semibold !text-dash-text">{courseTitle}</span>
      </nav>

      {/* Back affordance */}
      <button
        onClick={() => router.push("/courses")}
        className="group inline-flex items-center gap-2 rounded-full border border-dash-border bg-white px-3.5 py-1.5 text-[13px] font-medium tracking-tight !text-dash-textMuted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:!text-dash-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
        Back to courses
      </button>
    </div>
  );
}

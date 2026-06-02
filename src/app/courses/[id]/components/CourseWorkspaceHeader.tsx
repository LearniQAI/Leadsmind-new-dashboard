"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourseWorkspaceHeaderProps {
  courseTitle: string;
  courseId: string;
  activeTab: "settings" | "modules" | "automations" | "analytics";
  setActiveTab: (tab: "settings" | "modules" | "automations" | "analytics") => void;
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
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 font-mono">
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push("/courses")}>Courses</span>
        <span>›</span>
        <span className="text-white/60">{courseTitle}</span>
      </div>

      {/* Back button */}
      <div>
        <button
          onClick={() => router.push("/courses")}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white uppercase tracking-wider font-bold bg-white/5 border border-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft size={13} /> Back to Courses
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-[#080f28] border border-white/5 rounded-xl p-1 w-fit shrink-0">
        {(["settings", "modules", "automations", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "automations") {
                router.push(`/courses/${courseId}/automations`);
              } else {
                setActiveTab(tab);
              }
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                ? "bg-primary text-white"
                : "text-white/40 hover:text-white/60"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

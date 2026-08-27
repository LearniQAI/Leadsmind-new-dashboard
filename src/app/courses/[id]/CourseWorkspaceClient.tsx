"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers, UserPlus, Users, Palette, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import ModuleCard from "./components/ModuleCard";
import ModuleCreatorModal from "./components/ModuleCreatorModal";
import LessonCreatorModal from "./components/LessonCreatorModal";
import LessonTypePicker from "./components/LessonTypePicker";
import ConfirmationModal from "@/components/calendar/modals/ConfirmationModal";
import { mapLessonForModal, mapLessonTypeToDb } from "./utils/lessonMapping";
import ModulesToolbar from "./components/ModulesToolbar";
import CourseWorkspaceHeader from "./components/CourseWorkspaceHeader";
import CourseSettingsContainer, { SettingsSectionId } from "./components/CourseSettingsContainer";
import LessonPreviewModal from "./components/LessonPreviewModal";
import AddStudentModal from "./components/AddStudentModal";
import StudentsRosterModal from "./components/StudentsRosterModal";
import { getCourseTheme } from "@/lib/courses/courseThemeTokens";

interface CourseWorkspaceClientProps {
  course: any;
  initialModules: any[];
}

export default function CourseWorkspaceClient({
  course,
  initialModules
}: CourseWorkspaceClientProps) {
  const router = useRouter();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [currentCourse, setCurrentCourse] = useState<any>(course);
  // Section 3 (Systeme-parity Master Prompt): the 3 daily-use quick actions use the course's
  // own real theme accent (Signal/Ember/Grove) when set, falling back to the app's own brand
  // accent for a course with no theme applied yet — never a hardcoded one-off color.
  const quickActionTheme = getCourseTheme(currentCourse?.landing_page_settings?.template);

  const [modules, setModules] = useState<any[]>(initialModules);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "draft" | "published" | "coming_soon">("All");
  // Nav restructure (Section 2): 2 top-level tabs only. Modules stays the default — see
  // CourseWorkspaceHeader.tsx and CourseSettingsContainer.tsx for where the other 6 moved.
  const [activeTab, setActiveTab] = useState<"modules" | "settings">("modules");
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("general");

  // Modals States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | undefined>(undefined);

  const [isLessonPickerOpen, setIsLessonPickerOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<any | undefined>(undefined);

  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewLesson, setPreviewLesson] = useState<{ id: string; title: string } | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const refreshWorkspace = async () => {
    try {
      const res = await fetch(`/api/lms/modules?courseId=${course.id}`);
      const dataJson = await res.json();
      if (dataJson.data) setModules(dataJson.data);
    } catch {
      toast.error("Failed to sync module records");
    }
  };

  useEffect(() => {
    refreshWorkspace();
  }, [course.id]);

  const handleDeleteModule = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/lms/modules?id=${moduleId}`, { method: "DELETE" });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success("Module node removed.");
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to delete module");
    }
  };

  const handleLessonTypeSelect = async (lessonType: string) => {
    if (!activeModuleIdForLesson || !workspaceId) return;
    try {
      const res = await fetch("/api/lms/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: activeModuleIdForLesson,
          course_id: course.id,
          workspace_id: workspaceId,
          title: `Untitled ${lessonType.toUpperCase()}`,
          lesson_type: lessonType,
          content: {},
          position: (modules.find(m => m.id === activeModuleIdForLesson)?.lessons?.length || 0) + 1
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success("Lesson initialized.");
        setIsLessonPickerOpen(false);
        await refreshWorkspace();
        if (lessonType === "quiz") {
          router.push(`/courses/${course.id}/quiz/${dataJson.data.id}`);
        } else {
          setEditingLesson(mapLessonForModal(dataJson.data));
          setIsLessonModalOpen(true);
        }
      }
    } catch {
      toast.error("Failed to initialize lesson");
    }
  };

  const handleSaveLesson = async (lessonData: any) => {
    try {
      const url = lessonData.id ? `/api/lms/lessons?id=${lessonData.id}` : "/api/lms/lessons";
      const method = lessonData.id ? "PATCH" : "POST";
      const contentJsonb = {
        text: lessonData.content || "",
        video_url: lessonData.video_url || "",
        metadata: lessonData.metadata || {}
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonData.title,
          lesson_type: mapLessonTypeToDb(lessonData.type),
          content: contentJsonb,
          is_preview: lessonData.is_free,
          access_level: lessonData.access_level,
          time_estimate_minutes: lessonData.time_estimate_minutes,
          unlock_type: lessonData.unlock_type,
          drip_value: lessonData.drip_value
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) throw new Error(dataJson.error);
      toast.success("Lesson saved successfully!");
      refreshWorkspace();
    } catch (err: any) {
      throw new Error(err.message || "Failed to save lesson");
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deletingLessonId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lms/lessons?id=${deletingLessonId}`, { method: "DELETE" });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success("Lesson removed.");
        setDeletingLessonId(null);
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to delete lesson");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleModuleActive = async (moduleId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/lms/modules?id=${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive })
      });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success(isActive ? "Module activated." : "Module deactivated.");
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to update module status");
    }
  };

  const handleToggleLessonActive = async (lessonId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/lms/lessons?id=${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive })
      });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success(isActive ? "Lesson activated." : "Lesson deactivated.");
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to update lesson status");
    }
  };

  const handleDuplicateModule = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/lms/modules/${moduleId}/duplicate`, { method: "POST" });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success(`Module duplicated (${dataJson.lessonsCopied} lesson(s), ${dataJson.blocksCopied} block(s)).`);
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to duplicate module");
    }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/lms/lessons/${lessonId}/duplicate`, { method: "POST" });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success(`Lesson duplicated (${dataJson.blocksCopied} block(s)).`);
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to duplicate lesson");
    }
  };

  const handleMoveLesson = async (lessonId: string, targetModuleId: string) => {
    try {
      const res = await fetch(`/api/lms/lessons?id=${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: targetModuleId })
      });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success("Lesson moved.");
        refreshWorkspace();
      }
    } catch {
      toast.error("Failed to move lesson");
    }
  };

  const handleCreateAssignment = async (lesson: any) => {
    try {
      const res = await fetch("/api/lms/content-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lesson.id,
          type: "assignment",
          content: { instructions: "" },
          completion_rule: "graded_passed"
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success("Assignment block created — opening lesson editor.");
        setActiveModuleIdForLesson(lesson.module_id);
        setEditingLesson(lesson);
        setIsLessonModalOpen(true);
      }
    } catch {
      toast.error("Failed to create assignment block");
    }
  };

  const filteredModules = modules.filter((m) => {
    const search = searchTerm.toLowerCase();
    const titleMatches = (m?.title || m?.name || "").toLowerCase().includes(search);
    const descMatches = (m?.description || "").toLowerCase().includes(search);
    return (titleMatches || descMatches) && (activeFilter === "All" || m.publish_status === activeFilter);
  });

  const deletingLessonTitle = deletingLessonId
    ? modules.flatMap((m) => m.lessons || []).find((l) => l.id === deletingLessonId)?.title || ""
    : "";

  return (
    <div className="space-y-6 text-white font-body">

      <CourseWorkspaceHeader
        courseTitle={currentCourse.title}
        courseId={currentCourse.id}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === "modules" && (
        <>
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-dash-border pb-6">
            <div>
              <span className="text-[10px] font-bold text-primary">Control Room</span>
              <h1 className="text-3xl font-bold !text-dash-text mt-1.5">
                Course <span className="text-dash-accent">{currentCourse.title}</span>
              </h1>
              <p className="text-[10px] !text-dash-textMuted font-bold mt-2">
                Curriculum builder & modular execution node
              </p>
            </div>

            <Button
              onClick={() => { setEditingModule(undefined); setIsModuleModalOpen(true); }}
            >
              <Plus size={14} /> New Module
            </Button>
          </div>

          {/* Quick actions — Section 3 (Systeme-parity Master Prompt): the 3 primary daily
              actions get solid-fill visual weight using the course's real theme accent;
              Settings stays visually secondary (outline) so the hierarchy reads clearly. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className={`h-11 px-5 rounded-full text-white text-[12px] font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4 ${quickActionTheme.solidBgClass} ${quickActionTheme.solidHoverBgClass}`}
            >
              <UserPlus /> Add student
            </button>
            <button
              onClick={() => setIsRosterOpen(true)}
              className={`h-11 px-5 rounded-full text-white text-[12px] font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4 ${quickActionTheme.solidBgClass} ${quickActionTheme.solidHoverBgClass}`}
            >
              <Users /> Students
            </button>
            <button
              onClick={() => { setActiveTab("settings"); setSettingsSection("landing-page"); }}
              className={`h-11 px-5 rounded-full text-white text-[12px] font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4 ${quickActionTheme.solidBgClass} ${quickActionTheme.solidHoverBgClass}`}
            >
              <Palette /> View and customize theme
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className="h-11 px-5 rounded-full bg-white border border-dash-border hover:bg-dash-surface text-[12px] font-semibold !text-dash-textMuted hover:!text-dash-text flex items-center gap-2 transition-colors motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white [&_svg]:size-4"
            >
              <SettingsIcon /> Settings
            </button>
          </div>

          {/* Toolbar */}
          <ModulesToolbar
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          {/* Modules List */}
          {filteredModules.length === 0 ? (
            <div className="py-20 bg-dash-surface border-2 border-dashed border-dash-border rounded-3xl flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 border border-dash-border">
                <Layers className="w-8 h-8 !text-dash-textMuted" />
              </div>
              <h3 className="text-lg font-bold !text-dash-textMuted">
                No Modules Found
              </h3>
              <Button
                onClick={() => { setEditingModule(undefined); setIsModuleModalOpen(true); }}
                size="sm"
                className="mt-6"
              >
                <Plus size={13} /> Create First Module
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={{
                    ...module,
                    lessons: (module.lessons || []).map(mapLessonForModal)
                  }}
                  siblingModules={modules.map((m) => ({ id: m.id, title: m.title || m.name }))}
                  onEditModule={(mod) => { setEditingModule(mod); setIsModuleModalOpen(true); }}
                  onDeleteModule={handleDeleteModule}
                  onAddLesson={(modId) => { setActiveModuleIdForLesson(modId); setIsLessonPickerOpen(true); }}
                  onEditLesson={(les, modId) => {
                    setActiveModuleIdForLesson(modId);
                    if (les.type === "Quiz") {
                      router.push(`/courses/${currentCourse.id}/quiz/${les.id}`);
                    } else {
                      setEditingLesson(les);
                      setIsLessonModalOpen(true);
                    }
                  }}
                  onDeleteLesson={(lesId) => setDeletingLessonId(lesId)}
                  onToggleModuleActive={handleToggleModuleActive}
                  onToggleLessonActive={handleToggleLessonActive}
                  onDuplicateModule={handleDuplicateModule}
                  onDuplicateLesson={handleDuplicateLesson}
                  onMoveLesson={handleMoveLesson}
                  onViewLesson={(les) => setPreviewLesson({ id: les.id, title: les.title })}
                  onCreateAssignment={handleCreateAssignment}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "settings" && (
        <CourseSettingsContainer
          course={currentCourse}
          courseId={currentCourse.id}
          onCourseSaved={setCurrentCourse}
          activeSection={settingsSection}
          setActiveSection={setSettingsSection}
        />
      )}

      {/* Modals */}
      <ModuleCreatorModal
        isOpen={isModuleModalOpen}
        courseId={currentCourse.id}
        moduleId={editingModule?.id}
        onClose={() => { setIsModuleModalOpen(false); setEditingModule(undefined); }}
        onSaved={refreshWorkspace}
      />

      <LessonTypePicker
        isOpen={isLessonPickerOpen}
        onClose={() => setIsLessonPickerOpen(false)}
        onSelect={handleLessonTypeSelect}
      />

      <LessonCreatorModal
        isOpen={isLessonModalOpen}
        onClose={() => { setIsLessonModalOpen(false); setEditingLesson(undefined); }}
        onSave={handleSaveLesson}
        moduleId={activeModuleIdForLesson}
        courseId={currentCourse.id}
        editingLesson={editingLesson}
      />

      <ConfirmationModal
        isOpen={deletingLessonId !== null}
        onClose={() => setDeletingLessonId(null)}
        onConfirm={confirmDeleteLesson}
        title="Remove Lesson Node"
        description={`Are you sure you want to delete lesson "${deletingLessonTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {previewLesson && (
        <LessonPreviewModal
          lessonId={previewLesson.id}
          lessonTitle={previewLesson.title}
          onClose={() => setPreviewLesson(null)}
        />
      )}

      {isAddStudentOpen && (
        <AddStudentModal
          courseId={currentCourse.id}
          onClose={() => setIsAddStudentOpen(false)}
          onEnrolled={() => {}}
        />
      )}

      {isRosterOpen && (
        <StudentsRosterModal courseId={currentCourse.id} onClose={() => setIsRosterOpen(false)} />
      )}
    </div>
  );
}

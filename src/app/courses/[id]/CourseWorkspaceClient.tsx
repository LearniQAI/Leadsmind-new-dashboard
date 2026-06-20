"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import ModuleCard from "./components/ModuleCard";
import ModuleCreatorModal from "./components/ModuleCreatorModal";
import LessonCreatorModal from "./components/LessonCreatorModal";
import LessonTypePicker from "./components/LessonTypePicker";
import ConfirmationModal from "@/components/calendar/modals/ConfirmationModal";
import { mapLessonForModal, mapLessonTypeToDb } from "./utils/lessonMapping";
import CourseSettingsForm from "./components/CourseSettingsForm";
import ModulesToolbar from "./components/ModulesToolbar";
import CourseWorkspaceHeader from "./components/CourseWorkspaceHeader";
import CourseAnalyticsTab from "./components/CourseAnalyticsTab";
import CourseLandingForm from "./components/CourseLandingForm";
import CoursePricingForm from "./components/CoursePricingForm";
import EmailTemplateForm from "./components/EmailTemplateForm";
import CourseSubmissionsTab from "./components/CourseSubmissionsTab";

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

  const [modules, setModules] = useState<any[]>(initialModules);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "draft" | "published" | "coming_soon">("All");
  const [activeTab, setActiveTab] = useState<"settings" | "modules" | "automations" | "analytics" | "landing-page" | "pricing" | "emails" | "submissions">("modules");

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
          access_level: lessonData.access_level
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
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Control Room</span>
              <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1.5">
                Course <span className="text-[#3b82f6]">{currentCourse.title}</span>
              </h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
                Curriculum builder & modular execution node
              </p>
            </div>

            <Button
              onClick={() => { setEditingModule(undefined); setIsModuleModalOpen(true); }}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> New Module
            </Button>
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
            <div className="py-20 bg-[#080f28] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-[#111d47] rounded-full flex items-center justify-center mb-5 border border-white/5">
                <Layers className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-lg font-space-grotesk font-black text-white/50 uppercase tracking-widest">
                No Modules Found
              </h3>
              <Button
                onClick={() => { setEditingModule(undefined); setIsModuleModalOpen(true); }}
                className="mt-6 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-10 px-5"
              >
                + Create First Module
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
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "settings" && (
        <CourseSettingsForm course={currentCourse} onSaved={setCurrentCourse} />
      )}

      {activeTab === "analytics" && (
        <CourseAnalyticsTab courseId={currentCourse.id} />
      )}

      {activeTab === "landing-page" && (
        <CourseLandingForm course={currentCourse} onSaved={setCurrentCourse} />
      )}

      {activeTab === "pricing" && (
        <CoursePricingForm course={currentCourse} onSaved={setCurrentCourse} />
      )}

      {activeTab === "emails" && (
        <EmailTemplateForm course={currentCourse} onSaved={setCurrentCourse} />
      )}

      {activeTab === "submissions" && (
        <CourseSubmissionsTab courseId={currentCourse.id} />
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
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  createModule, 
  updateModule, 
  deleteModule, 
  createLesson, 
  updateLesson, 
  deleteLesson,
  getModules
} from "@/app/actions/lms";
import ModuleCard from "./components/ModuleCard";
import ModuleCreatorModal from "./components/ModuleCreatorModal";
import LessonCreatorModal from "./components/LessonCreatorModal";
import ConfirmationModal from "@/components/calendar/modals/ConfirmationModal";

interface CourseWorkspaceClientProps {
  course: any;
  initialModules: any[];
}

export default function CourseWorkspaceClient({
  course,
  initialModules
}: CourseWorkspaceClientProps) {
  const router = useRouter();
  const [modules, setModules] = useState<any[]>(initialModules);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Draft" | "Published" | "Coming Soon">("All");
  
  // Modals States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | undefined>(undefined);
  
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<any | undefined>(undefined);
  
  // Lesson Delete Modal State
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPending, startTransition] = useTransition();

  const refreshWorkspace = async () => {
    const res = await getModules(course.id);
    if (res.data) {
      setModules(res.data);
    }
  };

  // Module CRUD handlers
  const handleSaveModule = async (moduleData: any) => {
    let res;
    if (moduleData.id) {
      res = await updateModule(
        moduleData.id,
        moduleData.name,
        moduleData.description,
        moduleData.icon_emoji,
        moduleData.publish_status,
        moduleData.nqf_level,
        moduleData.is_required_for_completion,
        moduleData.is_active
      );
    } else {
      res = await createModule(
        course.id,
        moduleData.name,
        moduleData.description,
        moduleData.icon_emoji,
        moduleData.publish_status,
        moduleData.nqf_level,
        moduleData.is_required_for_completion,
        moduleData.is_active
      );
    }

    if (res.error) {
      throw new Error(res.error);
    } else {
      toast.success(moduleData.id ? "Module node updated successfully!" : "Module node initialized successfully!");
      startTransition(async () => {
        await refreshWorkspace();
        router.refresh();
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    const res = await deleteModule(moduleId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Module node removed.");
      startTransition(async () => {
        await refreshWorkspace();
        router.refresh();
      });
    }
  };

  // Lesson CRUD handlers
  const handleSaveLesson = async (lessonData: any) => {
    let res;
    if (lessonData.id) {
      res = await updateLesson(
        lessonData.id,
        lessonData.title,
        lessonData.content,
        lessonData.video_url,
        lessonData.is_free,
        lessonData.type,
        lessonData.metadata
      );
    } else {
      res = await createLesson(
        lessonData.module_id,
        lessonData.title,
        lessonData.content,
        lessonData.video_url,
        lessonData.is_free,
        lessonData.type,
        lessonData.metadata
      );
    }

    if (res.error) {
      throw new Error(res.error);
    } else {
      toast.success(lessonData.id ? "Lesson node updated!" : "Lesson node created!");
      startTransition(async () => {
        await refreshWorkspace();
        router.refresh();
      });
    }
  };

  const handleDeleteLesson = (lessonId: string) => {
    setDeletingLessonId(lessonId);
  };

  const confirmDeleteLesson = async () => {
    if (!deletingLessonId) return;
    setIsDeleting(true);
    const res = await deleteLesson(deletingLessonId);
    setIsDeleting(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Lesson node removed.");
      setDeletingLessonId(null);
      startTransition(async () => {
        await refreshWorkspace();
        router.refresh();
      });
    }
  };

  // Filters and search logic
  const filteredModules = modules.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = activeFilter === "All" || m.publish_status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const deletingLesson = deletingLessonId
    ? modules.flatMap((m) => m.lessons || []).find((l) => l.id === deletingLessonId)
    : null;

  return (
    <div className="space-y-6">
      {/* Dynamic Interactive Breadcrumbs Map */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 font-mono">
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push("/courses")}>Courses</span>
        <span>›</span>
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push(`/courses/${course.id}`)}>{course.title}</span>
        {activeModuleIdForLesson && (
          <>
            <span>›</span>
            <span className="text-white/60">
              {modules.find(m => m.id === activeModuleIdForLesson)?.name || "Module"}
            </span>
          </>
        )}
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

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Control Room
            </span>
          </div>
          <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white">
            Course <span className="text-primary-light">{course.title}</span>
          </h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
            Curriculum builder & modular execution node
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingModule(undefined);
              setIsModuleModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5"
          >
            <Plus size={14} /> New Module
          </Button>
        </div>
      </div>

      {/* Toolbar (Filters & Search) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#080f28] border border-white/5 rounded-2xl p-4">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(["All", "Draft", "Published", "Coming Soon"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                activeFilter === filter
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-white/5 text-white/40 border-transparent hover:text-white/60"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex items-center bg-white/5 border border-white/5 rounded-xl px-4 py-2 w-full md:max-w-xs focus-within:border-primary transition-all">
          <Search size={14} className="text-white/20 mr-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search module node..."
            className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full"
          />
        </div>
      </div>

      {/* Main List */}
      {filteredModules.length === 0 ? (
        <div className="py-20 bg-[#080f28] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 bg-[#111d47] rounded-full flex items-center justify-center mb-5 border border-white/5">
            <Layers className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-space-grotesk font-black text-white/50 uppercase tracking-widest">
            No Module Nodes Found
          </h3>
          <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-wider max-w-sm">
            Create your first module node to begin structuring your curriculum framework.
          </p>
          <Button
            onClick={() => {
              setEditingModule(undefined);
              setIsModuleModalOpen(true);
            }}
            className="mt-6 bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-10 px-5 shadow-lg shadow-primary/20"
          >
            + Create First Module
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onEditModule={(mod) => {
                setEditingModule(mod);
                setIsModuleModalOpen(true);
              }}
              onDeleteModule={handleDeleteModule}
              onAddLesson={(modId) => {
                setActiveModuleIdForLesson(modId);
                setEditingLesson(undefined);
                setIsLessonModalOpen(true);
              }}
              onEditLesson={(les, modId) => {
                setActiveModuleIdForLesson(modId);
                setEditingLesson(les);
                setIsLessonModalOpen(true);
              }}
              onDeleteLesson={handleDeleteLesson}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ModuleCreatorModal
        isOpen={isModuleModalOpen}
        onClose={() => {
          setIsModuleModalOpen(false);
          setEditingModule(undefined);
        }}
        onSave={handleSaveModule}
        editingModule={editingModule}
      />

      <LessonCreatorModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setEditingLesson(undefined);
        }}
        onSave={handleSaveLesson}
        moduleId={activeModuleIdForLesson}
        courseId={course.id}
        editingLesson={editingLesson}
      />

      <ConfirmationModal
        isOpen={deletingLessonId !== null}
        onClose={() => setDeletingLessonId(null)}
        onConfirm={confirmDeleteLesson}
        title="Remove Lesson Node"
        description={`Are you sure you want to delete lesson "${deletingLesson?.title || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}

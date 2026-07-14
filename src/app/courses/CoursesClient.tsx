"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  BookOpen,
  Layers,
  Users,
  Search,
  Zap,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from "@/components/dashboard-ui/Modal";
import { DashFormField, DashInput } from "@/components/dashboard-ui/FormField";
import { createCourse } from "@/app/actions/lms";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CoursesClient({
  initialCourses,
}: {
  initialCourses: any[];
}) {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");

  const closeModal = () => {
    setNewCourseTitle("");
    setIsModalOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle || newCourseTitle.trim() === "") {
      toast.error("Course title is required");
      return;
    }

    setIsInitializing(true);
    try {
      const res = await createCourse(newCourseTitle);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Course created successfully!");
        setNewCourseTitle("");
        setIsModalOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsInitializing(false);
    }
  };

  const filteredCourses = initialCourses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-dash-border pb-6">
        <div>
          <h1 className="text-3xl font-bold !text-dash-text mb-1">
            Course <span className="text-dash-accent">management</span>
          </h1>
          <p className="text-xs !text-dash-textMuted">
            Create and manage the courses in your learning academy
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-dash-surface border border-dash-border focus-within:border-dash-accent rounded-xl px-4 py-2 w-full md:w-64 transition-colors motion-reduce:transition-none">
            <Search className="w-4 h-4 !text-dash-textMuted mr-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search courses..."
              className="bg-transparent border-none outline-none text-xs !text-dash-text placeholder:text-dash-textMuted w-full"
            />
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-dash-accent/10 transition-all motion-reduce:transition-none active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Create course
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full py-20 bg-dash-surface border-2 border-dashed border-dash-border rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 border border-dash-border">
              <BookOpen className="w-8 h-8 !text-dash-textMuted" />
            </div>
            <h3 className="text-lg font-bold !text-dash-text">
              No courses yet
            </h3>
            <p className="!text-dash-textMuted text-xs mt-2">
              Create your first course to get started
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[10px] h-10 px-5 rounded-xl transition-colors motion-reduce:transition-none"
            >
              + Create course
            </Button>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-dash-border rounded-2xl p-6 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-dash-accent before:rounded-t-2xl"
            >
              <div className="absolute top-0 right-0 p-4">
                <Badge
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded border-none capitalize ${
                    course.status === "published"
                      ? "bg-green/10 text-green"
                      : "bg-purple/10 text-purple"
                  }`}
                >
                  {course.status === "published" ? "Published" : "Draft"}
                </Badge>
              </div>

              <div className="h-12 w-12 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent border border-dash-accent/20 group-hover:bg-dash-accent group-hover:text-white transition-all duration-300 motion-reduce:transition-none mb-6 shrink-0">
                <BookOpen size={20} />
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-bold !text-dash-text mb-2 group-hover:text-dash-accent transition-colors motion-reduce:transition-none truncate">
                  {course.title}
                </h4>
                <div className="flex items-center gap-4 !text-dash-textMuted text-[10px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-dash-accent" />{" "}
                    {course.modules?.[0]?.count || 0} modules
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-dash-accent" /> 0 students
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="h-10 px-4 bg-dash-surface border border-dash-border !text-dash-text hover:!text-dash-accent hover:border-dash-accent rounded-xl font-bold text-[9px] transition-colors motion-reduce:transition-none"
                >
                  Manage
                </Button>
                <Button
                  onClick={() => toast.info("Opening automation...")}
                  className="h-10 px-5 bg-purple text-white rounded-xl font-bold text-[9px] hover:bg-purple/90 transition-colors motion-reduce:transition-none flex items-center gap-1.5 shadow-lg shadow-purple/10"
                >
                  Automate <Zap size={13} className="fill-white" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Course Modal */}
      <DashModal open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : closeModal())}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-dash-accent" /> Create course
            </DashModalTitle>
          </DashModalHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <DashFormField label="Course title" htmlFor="new-course-title" required>
              <DashInput
                id="new-course-title"
                type="text"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="e.g. Masterclass in JavaScript"
                required
                autoFocus
              />
            </DashFormField>

            <DashModalFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                disabled={isInitializing}
                className="h-10 rounded-xl !text-dash-textMuted hover:bg-dash-surface text-[10px] font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInitializing}
                className="h-10 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-[10px] font-bold px-5 shadow-lg shadow-dash-accent/20 flex items-center gap-1.5"
              >
                {isInitializing ? (
                  <>
                    <Loader2 size={12} className="animate-spin motion-reduce:animate-none mr-1" /> Creating...
                  </>
                ) : (
                  "Create course"
                )}
              </Button>
            </DashModalFooter>
          </form>
        </DashModalContent>
      </DashModal>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  BookOpen,
  Search,
  Zap,
  MoreHorizontal,
  Filter as FilterIcon,
  Trash2,
  ExternalLink,
  Award,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CreateCourseWizard from "./components/CreateCourseWizard";
import { getCourseTheme } from "@/lib/courses/courseThemeTokens";
import ConfirmationModal from "@/components/calendar/modals/ConfirmationModal";

// Real course-level status values (confirmed live: only 'draft' and 'published' exist in
// courses.status — 'coming_soon' is a module-level publish_status value, not a course one,
// per the Control Room page's own filter). Not inventing a status this table can't back.
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export default function CoursesClient({
  initialCourses,
}: {
  initialCourses: any[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Course Wizard state (Phase D: name+domain+url -> theme -> add module)
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [courses, setCourses] = useState(initialCourses);
  const [deletingCourse, setDeletingCourse] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lms/courses?id=${deletingCourse.id}`, { method: "DELETE" });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success(`"${deletingCourse.title}" and everything in it has been deleted.`);
        setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
        setDeletingCourse(null);
      }
    } catch {
      toast.error("Failed to delete course");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold !text-dash-text">
          {courses.length} Course{courses.length === 1 ? "" : "s"}
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-white border border-dash-border focus-within:border-dash-accent rounded-xl px-4 py-2.5 w-full md:w-64 transition-colors motion-reduce:transition-none">
            <Search className="w-4 h-4 !text-dash-textMuted mr-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="bg-transparent border-none outline-none text-xs !text-dash-text placeholder:text-dash-textMuted w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-dash-border rounded-xl px-3 py-2.5 text-xs !text-dash-text outline-none focus:border-dash-accent"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <Button variant="outline">
            <FilterIcon size={13} /> Filter
          </Button>

          <Button variant="outline" onClick={() => router.push("/courses/certificates")}>
            <Award size={13} /> Certificates
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-500 text-white hover:bg-sky-600"
          >
            <Plus size={14} /> Add a new course
          </Button>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white border border-dash-border rounded-2xl shadow-sm overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-dash-surface rounded-full flex items-center justify-center mb-6 border border-dash-border">
              <BookOpen className="w-8 h-8 !text-dash-textMuted" />
            </div>
            <h3 className="text-lg font-bold !text-dash-text">
              {courses.length === 0 ? "No courses yet" : "No courses match your filters"}
            </h3>
            <p className="!text-dash-textMuted text-xs mt-2">
              {courses.length === 0 ? "Create your first course to get started" : "Try a different search or status filter"}
            </p>
            {courses.length === 0 && (
              <Button onClick={() => setIsModalOpen(true)} className="mt-6 bg-sky-500 text-white hover:bg-sky-600">
                <Plus size={14} /> Add a new course
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface/60">
                  <th className="px-6 py-3.5 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => {
                  const theme = getCourseTheme(course.landing_page_settings?.template);
                  return (
                  <tr
                    key={course.id}
                    className="border-b border-dash-border last:border-0 hover:bg-dash-surface/40 transition-colors motion-reduce:transition-none"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          title={`${theme.label} theme`}
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: theme.primaryHex }}
                        />
                        <button
                          onClick={() => router.push(`/courses/${course.id}`)}
                          className="text-sm font-bold text-dash-accent hover:underline text-left"
                        >
                          {course.title}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs !text-dash-textMuted">
                      Classic course
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                          course.status === "published"
                            ? "bg-green/10 text-green"
                            : "bg-purple/10 text-purple"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${course.status === "published" ? "bg-green" : "bg-purple"}`} />
                        {course.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 rounded-lg hover:bg-dash-surface flex items-center justify-center !text-dash-textMuted transition-colors motion-reduce:transition-none">
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)}>
                            Manage
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(
                                `/unauthenticated/courses/${course.slug || course.id}${
                                  course.status === "published" ? "" : "?preview=true"
                                }`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            <ExternalLink size={13} className="mr-1.5" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Opening automation...")}>
                            <Zap size={13} className="mr-1.5" /> Automate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingCourse(course)}
                            className="text-red focus:text-red"
                          >
                            <Trash2 size={13} className="mr-1.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateCourseWizard
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreated={() => router.refresh()}
      />

      <ConfirmationModal
        isOpen={deletingCourse !== null}
        onClose={() => setDeletingCourse(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deletingCourse?.title || ""}"?`}
        description={
          deletingCourse
            ? `This permanently deletes ${deletingCourse.modules?.[0]?.count ?? 0} module(s), ${deletingCourse.lessons?.[0]?.count ?? 0} lesson(s), and unenrolls ${deletingCourse.enrollments?.[0]?.count ?? 0} student(s). This cannot be undone.`
            : ""
        }
        confirmText="Delete course"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}

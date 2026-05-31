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
  X,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  
  // Custom Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");

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
        toast.success("Course initialized successfully!");
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent2">
              Management Portal
            </span>
          </div>
          <h1 className="text-4xl font-space-grotesk font-black uppercase tracking-tighter text-t1 leading-none">
            Academy <span className="text-accent2">Portal</span>
          </h1>
          <p className="text-[11px] text-t3 font-black uppercase tracking-[0.2em] mt-2.5">
            Deploy and manage your learning nodes with precision
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-n800 border border-white/5 focus-within:border-accent/30 rounded-xl px-4 py-2 w-full md:w-64 transition-all">
            <Search className="w-4 h-4 text-t3 mr-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search course node..."
              className="bg-transparent border-none outline-none text-xs text-t1 placeholder:text-t3 w-full"
            />
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-accent/10 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Initialize Course
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full py-20 bg-n800 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#111d47] rounded-full flex items-center justify-center mb-6 border border-white/5">
              <BookOpen className="w-8 h-8 text-t3" />
            </div>
            <h3 className="text-lg font-space-grotesk font-black uppercase text-t2 tracking-widest">
              Academy Offline
            </h3>
            <p className="text-t3 text-[10px] font-bold mt-2 uppercase tracking-widest">
              Deploy your first course node
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-5 rounded-xl transition-all"
            >
              + Initialize Course
            </Button>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-n800 border border-white/5 rounded-2xl p-6 group hover:bg-[#0c1535] hover:border-white/10 hover:-translate-y-0.5 transition-all duration-300 shadow-xl shadow-black/40 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-accent before:rounded-t-2xl"
            >
              <div className="absolute top-0 right-0 p-4">
                <Badge
                  className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-transparent ${
                    course.status === "published"
                      ? "bg-green/10 text-green border-green/20"
                      : "bg-purple/10 text-purple border-purple/20"
                  }`}
                >
                  {course.status === "published" ? "Live Node" : "Draft"}
                </Badge>
              </div>

              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-accent2 border border-primary/20 group-hover:bg-accent group-hover:text-white transition-all duration-300 mb-6 shrink-0">
                <BookOpen size={20} />
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-space-grotesk font-black text-t1 uppercase tracking-tight mb-2 group-hover:text-accent2 transition-colors truncate">
                  {course.title}
                </h4>
                <div className="flex items-center gap-4 text-t3 text-[10px] font-bold tracking-wider uppercase font-mono">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-accent2" />{" "}
                    {course.modules?.[0]?.count || 0} Modules
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-accent2" /> 0 Students
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="h-10 px-4 bg-white/5 border border-white/5 text-t1 hover:text-white hover:bg-white/10 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                >
                  Manage
                </Button>
                <Button
                  onClick={() => toast.info("Opening Neural Automation Engine...")}
                  className="h-10 px-5 bg-purple text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-purple/90 transition-all flex items-center gap-1.5 shadow-lg shadow-purple/10"
                >
                  Automate <Zap size={13} className="fill-white" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Styled Course Initializer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#04091a]/85 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-[#080f28] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-accent2 animate-pulse" />
                <h3 className="text-sm font-space-grotesk font-black text-white uppercase tracking-wider">
                  Initialize Course Node
                </h3>
              </div>
              <button 
                onClick={() => {
                  setNewCourseTitle("");
                  setIsModalOpen(false);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-t3 block">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="e.g. Masterclass in JavaScript"
                  className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent transition-all font-body"
                  required
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setNewCourseTitle("");
                    setIsModalOpen(false);
                  }}
                  disabled={isInitializing}
                  className="h-10 rounded-xl text-white/60 hover:bg-white/5 uppercase tracking-wider text-[9px] font-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isInitializing}
                  className="h-10 bg-accent hover:bg-accent/90 text-white rounded-xl uppercase tracking-wider text-[9px] font-black px-5 shadow-lg shadow-accent/20 flex items-center gap-1.5"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1" /> Initializing...
                    </>
                  ) : (
                    "Deploy Node"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

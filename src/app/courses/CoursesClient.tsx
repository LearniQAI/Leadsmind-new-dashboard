"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
 Plus,
 BookOpen,
 Layers,
 Users,
 PlayCircle,
 Star,
 Search,
 Filter,
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

 const handleCreate = async () => {
  const title = window.prompt("Enter Course Title:");
  if (!title) return;

  setIsInitializing(true);
  try {
   const res = await createCourse(title);
   if (res.error) {
    toast.error(res.error);
   } else {
    toast.success("Course initialized successfully!");
    router.refresh();
   }
  } catch (error) {
   toast.error("An unexpected error occurred");
  } finally {
   setIsInitializing(false);
  }
 };

 return (
  <div className="space-y-8 animate-in fade-in duration-700">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
    <div>
     <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
       <BookOpen className="w-4 h-4 text-primary" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
       Management Portal
      </span>
     </div>
     <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
      LeadsMind
     </h1>
     <p className="text-white/40 text-sm font-medium mt-2">
      Deploy and manage your learning nodes with precision.
     </p>
    </div>
    <div className="flex items-center gap-3">
     <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
      <Search className="w-4 h-4 text-white/20 mr-2" />
      <input
       type="text"
       placeholder="Search courses..."
       className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-40"
      />
     </div>
     <Button
      onClick={handleCreate}
      disabled={isInitializing}
      className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
     >
      {isInitializing ? (
       "Initializing..."
      ) : (
       <>
        <Plus className="w-4 h-4 mr-2" /> Initialize Course
       </>
      )}
     </Button>
    </div>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {initialCourses.length === 0 ? (
     <div className="col-span-full py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
       <BookOpen className="w-8 h-8 text-white/20" />
      </div>
      <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">
       Academy Offline
      </h3>
      <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">
       Deploy your first course node
      </p>
     </div>
    ) : (
     initialCourses.map((course) => (
      <div
       key={course.id}
       className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 group hover:border-primary/50 transition-all duration-500 shadow-xl shadow-black/40 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4">
         <Badge
          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none ${
           course.status === 'published'
            ? "bg-success/10 text-success"
            : "bg-warning/10 text-warning"
          }`}
         >
          {course.status === 'published' ? "Live Node" : "Draft"}
         </Badge>
        </div>

       <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500 mb-6">
        <BookOpen size={20} />
       </div>

       <div className="mb-8">
        <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1 group-hover:text-primary transition-colors">
         {course.title}
        </h4>
        <div className="flex items-center gap-4 text-white/30 text-[10px] font-bold tracking-widest uppercase">
         <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />{" "}
          {course.modules?.[0]?.count || 0} Modules
         </span>
         <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" /> 0 Students
         </span>
        </div>
       </div>

        <div className="flex items-center gap-2">
         <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            const newTitle = window.prompt("New Title:", course.title);
            if (newTitle) toast.success("Title updated (Simulated)");
          }}
          className="h-10 px-4 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all"
         >
          Edit
         </Button>
         <Button 
          onClick={() => toast.info("Opening Neural Automation Engine...")}
          className="h-10 px-5 bg-primary text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
         >
          Automate <Zap size={14} />
         </Button>
        </div>
       </div>
      </div>
     ))
    )}
   </div>
  </div>
 );
}

function Zap({ size, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}

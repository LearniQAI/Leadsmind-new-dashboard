const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(process.cwd(), 'src', 'app', 'student', 'courses', '[courseId]');
if (!fs.existsSync(UI_DIR)) fs.mkdirSync(UI_DIR, { recursive: true });

const pageTsx = `import React from 'react';
import Link from 'next/link';
import { PlayCircle, CheckCircle2, Lock, ChevronLeft, BookOpen, Clock } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export default async function StudentCourseViewer({ params }: { params: { courseId: string } }) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: course } = await supabase
    .from('courses')
    .select('*, modules(*, lessons(*))')
    .eq('id', params.courseId)
    .single();

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Course Unavailable</h2>
          <p className="text-gray-500 mb-6">This course is currently locked or unavailable.</p>
          <Link href="/student" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const modules = course.modules?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) || [];
  modules.forEach((m: any) => {
    m.lessons = m.lessons?.sort((a: any, b: any) => (a.title.localeCompare(b.title))) || [];
  });

  const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  const progressPct = totalLessons > 0 ? 0 : 0; 

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-[320px] bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <Link href="/student" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4">
            <ChevronLeft size={16} className="mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-[#0A0F3D] leading-tight mb-4">{course.name}</h1>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-gray-500">Your Progress</span>
              <span className="text-blue-600">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: \`\${progressPct}%\` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {modules.map((mod: any, index: number) => (
            <div key={mod.id}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-2">Module {index + 1}: {mod.title}</h3>
              <div className="space-y-1">
                {mod.lessons.map((lesson: any, lIndex: number) => (
                  <button key={lesson.id} className="w-full text-left group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="mt-0.5 flex-shrink-0 text-gray-300 group-hover:text-blue-500">
                      {index === 0 && lIndex === 0 ? <PlayCircle size={18} className="text-blue-600" /> : <Lock size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">{lesson.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FC]">
        <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
          <div className="w-full aspect-video bg-black rounded-2xl shadow-xl overflow-hidden relative group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                <PlayCircle className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4">Current Lesson</div>
              <h2 className="text-2xl font-bold text-[#0A0F3D]">Welcome to {course.name}</h2>
            </div>
            <div className="prose prose-blue max-w-none text-gray-600 text-sm leading-relaxed">
              <p>In this lesson, you will learn the fundamental concepts that will set you up for success. Please watch the video above entirely before proceeding to the quiz.</p>
            </div>
            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
              <button className="text-gray-400 hover:text-gray-600 font-medium text-sm">Previous Lesson</button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-sm">Complete & Continue</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(UI_DIR, 'page.tsx'), pageTsx);

console.log("SUCCESS! Highly visual Student Course Portal UI injected.");
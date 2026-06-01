import React from 'react';
import { getCourse, getModules, getStudentCourseProgress } from '@/app/actions/lms';
import { notFound } from 'next/navigation';
import CoursePlayerClient from './CoursePlayerClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentClassroomPage({ params }: PageProps) {
  const courseId = params.id;

  const [courseRes, modulesRes, progressRes] = await Promise.all([
    getCourse(courseId),
    getModules(courseId),
    getStudentCourseProgress(courseId)
  ]);

  if (courseRes.error || !courseRes.data) {
    notFound();
  }

  const course = courseRes.data;
  const modules = modulesRes.data || [];
  const progressList = progressRes.data || [];

  return (
    <div className="min-h-screen bg-n900 text-t1 overflow-x-hidden p-6 md:p-10 font-body">
      <div className="max-w-7xl mx-auto text-white">
        <CoursePlayerClient
          course={course}
          modules={modules}
          initialProgress={progressList}
        />
      </div>
    </div>
  );
}

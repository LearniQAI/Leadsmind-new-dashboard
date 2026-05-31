import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import CoursePlayerClient from './CoursePlayerClient';
import { getCourse, getModules, getStudentCourseProgress } from '@/app/actions/lms';
import { notFound } from 'next/navigation';

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
    <Wrapper>
      <div className="p-4 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <CoursePlayerClient 
          course={course} 
          modules={modules} 
          initialProgress={progressList} 
        />
      </div>
    </Wrapper>
  );
}

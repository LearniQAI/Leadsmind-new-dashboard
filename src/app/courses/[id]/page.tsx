import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse, getModules } from '@/app/actions/lms';
import { notFound } from 'next/navigation';
import CourseWorkspaceClient from './CourseWorkspaceClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CourseWorkspacePage({ params }: PageProps) {
  const courseId = params.id;

  // Parallel server fetches
  const [courseRes, modulesRes] = await Promise.all([
    getCourse(courseId),
    getModules(courseId)
  ]);

  if (courseRes.error || !courseRes.data) {
    notFound();
  }

  const course = courseRes.data;
  const initialModules = modulesRes.data || [];

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <CourseWorkspaceClient
          course={course}
          initialModules={initialModules}
        />
      </div>
    </Wrapper>
  );
}

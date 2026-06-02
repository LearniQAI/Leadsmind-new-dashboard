import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import CoursesClient from './CoursesClient';
import { getCourses } from '@/app/actions/lms';

export default async function CoursesPage() {
  const { data: courses, error } = await getCourses();

  if (error) {
    return (
      <Wrapper>
        <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-80px)] flex flex-col items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl max-w-md text-center space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider">Database Fetch Error</h2>
            <p className="text-xs font-mono">{error}</p>
          </div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <CoursesClient initialCourses={courses || []} />
      </div>
    </Wrapper>
  );
}

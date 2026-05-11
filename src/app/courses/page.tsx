import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import CoursesClient from './CoursesClient';
import { getCourses } from '@/app/actions/lms';

export default async function CoursesPage() {
 const { data: courses } = await getCourses();

 return (
  <Wrapper>
   <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
    <CoursesClient initialCourses={courses || []} />
   </div>
  </Wrapper>
 );
}

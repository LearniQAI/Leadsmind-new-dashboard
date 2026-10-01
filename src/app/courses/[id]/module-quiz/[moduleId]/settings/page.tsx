import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse } from '@/app/actions/lms';
import { getModuleQuizSettingsOverview } from '@/app/actions/moduleQuizzes';
import { createServerClient } from '@/lib/supabase/server';
import ModuleQuizSettingsClient from './ModuleQuizSettingsClient';

interface PageProps {
  params: {
    id: string;
    moduleId: string;
  };
}

// Module-level quiz settings: the grading / pacing / completion rules every quiz in the module
// uses unless it opts out in its own Advanced settings. Reached from the module's quiz list.
export default async function ModuleQuizSettingsPage({ params }: PageProps) {
  const courseRes = await getCourse(params.id);
  if (courseRes.error || !courseRes.data) notFound();
  const course = courseRes.data;

  const supabase = await createServerClient();
  const { data: courseModule } = await supabase
    .from('course_modules')
    .select('id, title')
    .eq('id', params.moduleId)
    .eq('course_id', params.id)
    .eq('workspace_id', course.workspace_id)
    .maybeSingle();
  if (!courseModule) notFound();

  const overview = await getModuleQuizSettingsOverview(params.moduleId);

  return (
    <Wrapper>
      <div className="mx-auto min-h-[calc(100vh-80px)] max-w-3xl p-6 font-body !text-dash-text">
        <ModuleQuizSettingsClient
          course={{ id: course.id, title: course.title }}
          courseModule={courseModule}
          initialOverview={overview.data || null}
          loadError={overview.error || null}
        />
      </div>
    </Wrapper>
  );
}

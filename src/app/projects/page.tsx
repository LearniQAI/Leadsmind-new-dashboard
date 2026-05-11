import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ProjectsClient from './ProjectsClient';
import { getProjects } from '@/app/actions/operations';

export default async function ProjectsPage() {
  const { data: projects } = await getProjects();

  return (
    <MetaData pageTitle="Project Hub">
      <Wrapper>
        <div className="app__slide-wrapper">
          <ProjectsClient initialProjects={projects || []} />
        </div>
      </Wrapper>
    </MetaData>
  );
}

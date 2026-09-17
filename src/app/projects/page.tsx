import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ProjectsClient from './ProjectsClient';
import { getProjects } from '@/app/actions/operations';
import { getCurrentWorkspaceId } from '@/lib/auth';

export default async function ProjectsPage() {
  const [{ data: projects, total }, workspaceId] = await Promise.all([
    getProjects(0, 30),
    getCurrentWorkspaceId(),
  ]);

  return (
    <MetaData pageTitle="Project Hub">
      <Wrapper>
        <div className="px-4 py-6 bg-white min-h-screen">
          <ProjectsClient initialProjects={projects || []} workspaceId={workspaceId || null} initialTotal={total ?? (projects || []).length} />
        </div>
      </Wrapper>
    </MetaData>
  );
}

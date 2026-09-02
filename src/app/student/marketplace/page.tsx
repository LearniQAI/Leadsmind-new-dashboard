import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ShoppingBag } from 'lucide-react';
import { getMarketplaceCourses, getMyEnrollments } from '@/app/actions/studentEnrollments';
import { getUserRoleForWorkspace, getCurrentWorkspaceId } from '@/lib/auth';
import MarketplaceClient from './MarketplaceClient';
import { WorkspaceSync } from '@/components/auth/WorkspaceSync';
import { DashCard, DashEmptyState } from '@/components/dashboard-ui';

interface MarketplacePageProps {
  searchParams: {
    workspaceId?: string;
  };
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const workspaceId = searchParams.workspaceId || (await getCurrentWorkspaceId());

  // Role must be looked up against the same workspace the courses/activeWorkspaceId
  // are scoped to — not the session's cookie-based "current workspace".
  const [coursesRes, enrolledRes, userRole] = await Promise.all([
    getMarketplaceCourses(workspaceId || undefined),
    getMyEnrollments(),
    workspaceId ? getUserRoleForWorkspace(workspaceId) : Promise.resolve(null),
  ]);

  const courses = coursesRes.data || [];
  const categories = (coursesRes as any).categories || [];
  const enrolledCourses = enrolledRes.data || [];
  const enrolledCourseIds = enrolledCourses.map((e: any) => e.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {searchParams.workspaceId && <WorkspaceSync workspaceId={searchParams.workspaceId} />}

      {/* Header */}
      <header className="space-y-3 border-b border-dash-border pb-7">
        <nav className="flex items-center gap-2 text-[12px] font-medium tracking-tight !text-dash-textMuted">
          <Link
            href="/student"
            className="inline-flex items-center gap-0.5 transition-colors hover:!text-dash-text"
          >
            <ChevronLeft size={13} /> Dashboard
          </Link>
          <span className="!text-dash-border">/</span>
          <span className="font-semibold !text-dash-text">Catalog</span>
        </nav>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-dash-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] !text-dash-accent">
              Student portal
            </span>
          </div>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] !text-dash-text md:text-[36px]">
            Course catalog
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Browse published courses and enrol in a new learning track.
          </p>
        </div>
      </header>

      {courses.length > 0 ? (
        <MarketplaceClient
          courses={courses}
          categories={categories}
          enrolledCourseIds={enrolledCourseIds}
          userRole={userRole}
          activeWorkspaceId={workspaceId}
        />
      ) : (
        <DashCard padding="default" interactive={false} className="border-dashed">
          <DashEmptyState
            icon={ShoppingBag}
            title="No courses available"
            description="Nothing is published in the catalog right now. Check back later."
          />
        </DashCard>
      )}
    </div>
  );
}

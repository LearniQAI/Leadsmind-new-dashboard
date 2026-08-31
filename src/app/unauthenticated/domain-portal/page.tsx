import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getPublishedCoursesForDomain } from '@/app/actions/courseLanding';

// Custom-Domain Course Serving pass — Step 0 root-path decision: a custom domain's root ("/")
// has no single obvious course to show unless the workspace only has exactly one published
// course there (middleware redirects straight to it in that case, see src/middleware.ts). For
// zero or multiple courses, this is a real, minimal "workspace portal" — not a placeholder —
// listing every real published course on that domain so root is never blank or broken.
export default async function DomainPortalPage() {
  const domainConfigId = headers().get('x-domain-config-id');
  if (!domainConfigId) notFound();

  const res = await getPublishedCoursesForDomain(domainConfigId);
  if ('error' in res && res.error) notFound();

  const { data: courses, workspaceName, hostname } = res as {
    data: any[];
    workspaceName: string | null;
    hostname: string | null;
  };

  return (
    <div className="min-h-screen bg-dash-surface">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-dash-text">{workspaceName || hostname}</h1>
        <p className="mt-2 text-sm text-dash-textMuted">
          {courses.length === 0
            ? 'No courses are published here yet.'
            : `${courses.length} course${courses.length === 1 ? '' : 's'} available.`}
        </p>

        {courses.length > 0 && (
          <div className="mt-8 space-y-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/${course.url_path}`}
                className="block rounded-xl border border-dash-border bg-white p-5 transition-colors hover:border-dash-accent"
              >
                <span className="text-base font-semibold text-dash-text">{course.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

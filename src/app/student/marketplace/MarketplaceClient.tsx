'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronRight,
  CheckCircle2,
  ShoppingBag,
  Loader2,
  Settings,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/app/actions/studentEnrollments';
import { DashCard } from '@/components/dashboard-ui';

interface MarketplaceClientProps {
  courses: any[];
  enrolledCourseIds: string[];
  userRole?: string | null;
  activeWorkspaceId?: string | null;
}

type PriceFilter = 'all' | 'free' | 'paid';
type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'title_az';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'title_az', label: 'Title: A–Z' },
];

const controlBase =
  'h-10 rounded-lg border border-dash-border bg-white text-[13px] !text-dash-text outline-none transition-colors placeholder:text-dash-textMuted focus:border-dash-accent focus:ring-4 focus:ring-dash-accent/10';

export default function MarketplaceClient({
  courses,
  enrolledCourseIds,
  userRole,
  activeWorkspaceId,
}: MarketplaceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const isCourseFree = (c: any) => !(c.price > 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = courses.filter((c: any) => {
      if (priceFilter === 'free' && !isCourseFree(c)) return false;
      if (priceFilter === 'paid' && isCourseFree(c)) return false;
      if (!q) return true;
      const hay = `${c.title || ''} ${c.description || ''}`.toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a: any, b: any) => {
      switch (sortKey) {
        case 'price_asc':
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        case 'price_desc':
          return (Number(b.price) || 0) - (Number(a.price) || 0);
        case 'title_az':
          return String(a.title || '').localeCompare(String(b.title || ''));
        case 'newest':
        default:
          return (
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
      }
    });
    return list;
  }, [courses, query, priceFilter, sortKey]);

  const isFiltering = query.trim() !== '' || priceFilter !== 'all';
  const clearFilters = () => {
    setQuery('');
    setPriceFilter('all');
  };

  const handleEnroll = (courseId: string) => {
    setLoadingCourseId(courseId);
    startTransition(async () => {
      try {
        const res = await enrollStudent(courseId);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Successfully enrolled in course!');
          router.push(`/student/courses/${courseId}`);
        }
      } catch {
        toast.error('Failed to enroll in course');
      } finally {
        setLoadingCourseId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
            aria-label="Search courses"
            className={`${controlBase} w-full pl-9 pr-9`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Free / Paid segmented */}
          <div className="inline-flex h-10 items-center rounded-lg border border-dash-border bg-white p-0.5">
            {(['all', 'free', 'paid'] as PriceFilter[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPriceFilter(k)}
                className={`h-full rounded-[7px] px-3 text-[12px] font-semibold capitalize transition-colors ${
                  priceFilter === k
                    ? 'bg-dash-accent text-white'
                    : '!text-dash-textMuted hover:!text-dash-text'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <SlidersHorizontal
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort courses"
              className={`${controlBase} cursor-pointer appearance-none pl-8 pr-8 font-medium`}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronRight
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 !text-dash-textMuted"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-dash-border pb-2.5">
        <span className="text-[12px] font-medium !text-dash-textMuted">
          Showing {filtered.length} of {courses.length}{' '}
          {courses.length === 1 ? 'course' : 'courses'}
        </span>
        {isFiltering && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[12px] font-semibold !text-dash-accent transition-opacity hover:opacity-80"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <DashCard padding="default" interactive={false} className="border-dashed">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dash-surface !text-dash-textMuted [&_svg]:size-5">
              <Search />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold !text-dash-text">
                No courses match your search
              </h3>
              <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed !text-dash-textMuted">
                Try a different search term or clear the filters to see the full catalog.
              </p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center rounded-lg bg-dash-accent px-4 text-[12px] font-semibold text-white transition-colors hover:bg-dash-accent/90"
            >
              Clear filters
            </button>
          </div>
        </DashCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course: any) => {
            const isEnrolled = enrolledCourseIds.includes(course.id);
            const isLoading = loadingCourseId === course.id && isPending;
            const isCourseAdmin =
              userRole === 'admin' && course.workspace_id === activeWorkspaceId;
            const isFree = !(course.price > 0);

            return (
              <DashCard
                key={course.id}
                padding="none"
                className="group flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
              >
                {/* Cover */}
                <div className="relative h-36 shrink-0 overflow-hidden border-b border-dash-border bg-dash-surface">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-dash-accent/10 to-dash-accent/5">
                      <BookOpen size={40} className="!text-dash-accent/40" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                  <span
                    className={`absolute bottom-3 right-3 rounded-lg border px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm ${
                      isFree
                        ? 'border-emerald-500/20 bg-emerald-50/90 text-emerald-700'
                        : 'border-white/60 bg-white/90 !text-dash-text'
                    }`}
                  >
                    {isFree ? 'FREE' : `$${course.price}`}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                  <div>
                    <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight !text-dash-text">
                      {course.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed !text-dash-textMuted">
                      {course.description || 'No description provided.'}
                    </p>
                  </div>

                  {isCourseAdmin ? (
                    <button
                      onClick={() => router.push(`/courses/${course.id}`)}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dash-border bg-white text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface [&_svg]:size-3.5"
                    >
                      <Settings className="!text-dash-accent" /> Manage course
                    </button>
                  ) : isEnrolled ? (
                    <button
                      onClick={() => router.push(`/student/courses/${course.id}`)}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 [&_svg]:size-3.5"
                    >
                      <CheckCircle2 /> Enrolled — open
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (course.price > 0) {
                          router.push(`/checkout/${course.id}`);
                        } else {
                          handleEnroll(course.id);
                        }
                      }}
                      disabled={isLoading}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-dash-accent text-[12px] font-semibold text-white transition-colors hover:bg-dash-accent/90 disabled:opacity-60 [&_svg]:size-3.5"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin" /> Enrolling…
                        </>
                      ) : course.price > 0 ? (
                        <>
                          <ShoppingBag /> Buy &amp; enrol
                        </>
                      ) : (
                        <>
                          Enrol now <ChevronRight />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </DashCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

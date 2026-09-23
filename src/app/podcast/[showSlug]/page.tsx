import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Rss, Headphones } from 'lucide-react';
import { getPublicShow, getPublicShowEpisodes } from '@/app/actions/podcastPublic';

interface PageProps {
  params: { showSlug: string };
  searchParams: { page?: string };
}

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getPublicShow(params.showSlug);
  if ('error' in result) return {};
  const { show } = result;
  return {
    title: { absolute: show.title },
    description: show.description || show.title,
    openGraph: {
      title: show.title,
      description: show.description || undefined,
      images: show.artwork_url ? [{ url: show.artwork_url, width: 1400, height: 1400 }] : undefined,
    },
    alternates: { types: { 'application/rss+xml': `/podcast/${show.slug}/feed.xml` } },
  };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default async function PublicShowPage({ params, searchParams }: PageProps) {
  const showResult = await getPublicShow(params.showSlug);
  if ('error' in showResult) notFound();
  const { show } = showResult;

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const episodesResult = await getPublicShowEpisodes(params.showSlug, page, PAGE_SIZE);
  if ('error' in episodesResult) notFound();
  const { episodes, total } = episodesResult;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-dash-bg">
      <div className="mx-auto max-w-2xl px-5 py-10 md:py-16">
        <div className="mb-8 flex items-start gap-5">
          {show.artwork_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={show.artwork_url} alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-sm" />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-dash-accent text-white">
              <Headphones size={32} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight !text-dash-text">{show.title}</h1>
            {show.description && <p className="mt-2 text-[13px] leading-relaxed !text-dash-textMuted">{show.description}</p>}
            <a
              href={`/podcast/${show.slug}/feed.xml`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dash-border bg-white px-3 py-1.5 text-[11px] font-bold !text-dash-text transition-colors hover:bg-dash-surface"
            >
              <Rss size={12} className="text-orange-500" /> Subscribe via RSS
            </a>
          </div>
        </div>

        {episodes.length === 0 ? (
          <p className="py-16 text-center text-[13px] !text-dash-textMuted">No episodes published yet.</p>
        ) : (
          <div className="space-y-2">
            {episodes.map((ep: any) => (
              <Link
                key={ep.id}
                href={`/podcast/${show.slug}/${ep.slug}`}
                className="block rounded-2xl border border-dash-border bg-white p-4 transition-colors hover:border-dash-accent/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {(ep.season_number != null || ep.episode_number != null) && (
                      <p className="text-[10px] font-bold uppercase tracking-wide text-dash-accent">
                        {ep.season_number != null ? `S${ep.season_number} · ` : ''}
                        {ep.episode_number != null ? `E${ep.episode_number}` : ''}
                      </p>
                    )}
                    <p className="truncate text-[14px] font-bold !text-dash-text">{ep.title}</p>
                    <p className="mt-0.5 text-[11px] !text-dash-textMuted">
                      {new Date(ep.publish_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {ep.audio_assets?.duration_seconds ? ` · ${formatDuration(ep.audio_assets.duration_seconds)}` : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/podcast/${show.slug}?page=${page - 1}`}
                className="rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[12px] font-bold !text-dash-text hover:bg-dash-surface"
              >
                Previous
              </Link>
            )}
            <span className="text-[12px] !text-dash-textMuted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/podcast/${show.slug}?page=${page + 1}`}
                className="rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[12px] font-bold !text-dash-text hover:bg-dash-surface"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

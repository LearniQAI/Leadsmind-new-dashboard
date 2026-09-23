import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPublicEpisode } from '@/app/actions/podcastPublic';
import PublicEpisodePlayer from './components/PublicEpisodePlayer';

interface PageProps {
  params: { showSlug: string; episodeSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getPublicEpisode(params.showSlug, params.episodeSlug);
  if ('error' in result) return {};
  const { show, episode } = result;

  const title = `${episode.title} | ${show.title}`;
  const description = episode.description || show.title;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      type: 'music.song',
      images: show.artwork_url ? [{ url: show.artwork_url, width: 1400, height: 1400 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: show.artwork_url ? [show.artwork_url] : undefined,
    },
    alternates: {
      types: { 'application/rss+xml': `/podcast/${show.slug}/feed.xml` },
    },
  };
}

export default async function PublicEpisodePage({ params }: PageProps) {
  const result = await getPublicEpisode(params.showSlug, params.episodeSlug);
  if ('error' in result) notFound();
  const { show, episode, chapters } = result;

  return (
    <div className="min-h-screen bg-dash-bg">
      <div className="mx-auto max-w-2xl px-5 py-10 md:py-16">
        <Link
          href={`/podcast/${show.slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-bold !text-dash-textMuted hover:!text-dash-text"
        >
          <ArrowLeft size={14} /> {show.title}
        </Link>

        <div className="mb-6 flex items-start gap-4">
          {show.artwork_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={show.artwork_url} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-sm" />
          )}
          <div className="min-w-0">
            {(episode.season_number != null || episode.episode_number != null) && (
              <p className="text-[11px] font-bold uppercase tracking-wide text-dash-accent">
                {episode.season_number != null ? `Season ${episode.season_number} · ` : ''}
                {episode.episode_number != null ? `Episode ${episode.episode_number}` : ''}
              </p>
            )}
            <h1 className="mt-1 text-[24px] font-bold leading-tight !text-dash-text">{episode.title}</h1>
            <p className="mt-1 text-[12px] !text-dash-textMuted">
              {new Date(episode.publish_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <PublicEpisodePlayer
          episodeId={episode.id}
          title={episode.title}
          artworkUrl={show.artwork_url}
          chapters={chapters}
          accentHex="#1359FF"
        />

        {episode.description && (
          <div className="mt-6 rounded-2xl border border-dash-border bg-white p-5">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide !text-dash-textMuted">Show notes</h2>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed !text-dash-text">{episode.description}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href={`/podcast/${show.slug}/feed.xml`}
            className="text-[11px] font-medium !text-dash-textMuted hover:text-dash-accent"
          >
            Subscribe via RSS
          </a>
        </div>
      </div>
    </div>
  );
}

// Real RSS 2.0 + iTunes namespace feed generation, pure functions (no I/O) so they're testable
// on their own and independent of however the route resolves data. Podcast directories validate
// the enclosure length/type and itunes:* fields strictly — get these wrong and submission fails
// silently or with a cryptic directory-side error, so every field here is real, not a stub.

export interface FeedShow {
  title: string;
  description: string | null;
  artworkUrl: string | null;
  ownerName: string;
  ownerEmail: string;
  category: string;
  explicit: boolean;
  language: string;
  slug: string;
}

export interface FeedChapter {
  title: string;
  startTimeMs: number;
}

export interface FeedEpisode {
  id: string;
  title: string;
  description: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  slug: string;
  publishAt: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  chapters?: FeedChapter[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value: string | null | undefined): string {
  return `<![CDATA[${(value || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function buildEpisodeXmlItem(episode: FeedEpisode, showSlug: string, baseUrl: string): string {
  const enclosureUrl = `${baseUrl}/api/podcast/episodes/${episode.id}/stream`;
  const episodePageUrl = `${baseUrl}/podcast/${showSlug}/${episode.slug}`;
  const pubDate = new Date(episode.publishAt).toUTCString();
  const length = episode.sizeBytes ?? 0;
  const type = episode.mimeType || 'audio/mpeg';

  const chaptersTag =
    episode.chapters && episode.chapters.length > 0
      ? `<podcast:chapters url="${baseUrl}/api/podcast/episodes/${episode.id}/chapters.json" type="application/json+chapters"/>`
      : '';

  return [
    '<item>',
    `<title>${escapeXml(episode.title)}</title>`,
    `<description>${cdata(episode.description)}</description>`,
    `<content:encoded>${cdata(episode.description)}</content:encoded>`,
    `<guid isPermaLink="false">${escapeXml(episode.id)}</guid>`,
    `<pubDate>${pubDate}</pubDate>`,
    `<link>${escapeXml(episodePageUrl)}</link>`,
    `<enclosure url="${escapeXml(enclosureUrl)}" length="${length}" type="${escapeXml(type)}"/>`,
    `<itunes:title>${escapeXml(episode.title)}</itunes:title>`,
    `<itunes:duration>${formatDuration(episode.durationSeconds)}</itunes:duration>`,
    episode.episodeNumber != null ? `<itunes:episode>${episode.episodeNumber}</itunes:episode>` : '',
    episode.seasonNumber != null ? `<itunes:season>${episode.seasonNumber}</itunes:season>` : '',
    '<itunes:episodeType>full</itunes:episodeType>',
    chaptersTag,
    '</item>',
  ].filter(Boolean).join('');
}

export function buildRssFeed(show: FeedShow, episodes: FeedEpisode[], baseUrl: string): string {
  const showUrl = `${baseUrl}/podcast/${show.slug}`;
  const items = episodes.map((ep) => buildEpisodeXmlItem(ep, show.slug, baseUrl)).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(show.title)}</title>`,
    `<link>${escapeXml(showUrl)}</link>`,
    `<atom:link href="${escapeXml(baseUrl + '/podcast/' + show.slug + '/feed.xml')}" rel="self" type="application/rss+xml"/>`,
    `<description>${cdata(show.description)}</description>`,
    `<language>${escapeXml(show.language)}</language>`,
    `<itunes:explicit>${show.explicit ? 'true' : 'false'}</itunes:explicit>`,
    `<itunes:owner><itunes:name>${escapeXml(show.ownerName)}</itunes:name><itunes:email>${escapeXml(show.ownerEmail)}</itunes:email></itunes:owner>`,
    `<itunes:author>${escapeXml(show.ownerName)}</itunes:author>`,
    `<itunes:category text="${escapeXml(show.category)}"/>`,
    show.artworkUrl ? `<itunes:image href="${escapeXml(show.artworkUrl)}"/>` : '',
    show.artworkUrl
      ? `<image><url>${escapeXml(show.artworkUrl)}</url><title>${escapeXml(show.title)}</title><link>${escapeXml(showUrl)}</link></image>`
      : '',
    '<itunes:type>episodic</itunes:type>',
    items,
    '</channel>',
    '</rss>',
  ].filter(Boolean).join('');
}

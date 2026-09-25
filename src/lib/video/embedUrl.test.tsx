// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
});
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, default: actual, cache: (fn: any) => fn };
});
vi.mock('@/app/actions/builder', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getWorkspaceBuilderSettings: async () => ({ success: false }),
}));

import React from 'react';
import { render, act } from '@testing-library/react';
import { Editor, Frame } from '@craftjs/core';
import { RESOLVER } from '@/lib/builder/resolver';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { parseYouTubeId, parseVimeo, videoEmbedUrl } from './embedUrl';

// The embed-URL logic exactly as it was in Video.tsx before this fix (git HEAD), to reproduce.
function oldEmbedUrl(provider: string, url: string, o: { autoPlay?: boolean; controls?: boolean; loop?: boolean; muted?: boolean }) {
  if (provider === 'youtube') {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}?autoplay=${o.autoPlay ? 1 : 0}&controls=${o.controls ? 1 : 0}&loop=${o.loop ? 1 : 0}&mute=${o.muted ? 1 : 0}`;
  }
  const videoId = url.split('/').pop();
  return `https://player.vimeo.com/video/${videoId}?autoplay=${o.autoPlay ? 1 : 0}&loop=${o.loop ? 1 : 0}&muted=${o.muted ? 1 : 0}`;
}
const q = (u: string) => Object.fromEntries(new URL(u).searchParams);
const path = (u: string) => new URL(u).pathname;

describe('Bug 4 - youtu.be share links with ?si=', () => {
  const share = 'https://youtu.be/dQw4w9WgXcQ?si=pWx2rS6k4YkqGZ7A';
  it('reproduces: the old parser kept "?si=..." in the id, giving a URL with two "?"', () => {
    const old = oldEmbedUrl('youtube', share, { controls: true });
    expect(old).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?si=pWx2rS6k4YkqGZ7A?autoplay=0&controls=1&loop=0&mute=0');
    expect(q(old).si).toBe('pWx2rS6k4YkqGZ7A?autoplay=0'); // the player params are swallowed
  });
  it('fixed: a clean embed URL from the id alone, for every real YouTube link shape', () => {
    for (const link of [
      share,
      'https://youtu.be/dQw4w9WgXcQ?t=42',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=abc',
      'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share',
      'https://www.youtube.com/live/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=10',
      'youtube.com/watch?v=dQw4w9WgXcQ',
      'dQw4w9WgXcQ',
    ]) {
      const url = videoEmbedUrl('youtube', link, { controls: true })!;
      expect(path(url), link).toBe('/embed/dQw4w9WgXcQ');
      expect(q(url), link).toEqual({ autoplay: '0', controls: '1', mute: '0' });
    }
  });
  it('rejects non-video links instead of embedding garbage', () => {
    expect(parseYouTubeId('https://www.youtube.com/@somechannel')).toBeNull();
    expect(parseYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(videoEmbedUrl('youtube', '', {})).toBeNull();
  });
});

describe('Bug 2 - YouTube Loop', () => {
  const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  it('reproduces: loop=1 was sent without the playlist param YouTube requires', () => {
    expect(q(oldEmbedUrl('youtube', link, { loop: true })).playlist).toBeUndefined();
  });
  it('fixed: loop=1 AND playlist=<same id>; neither when Loop is off', () => {
    expect(q(videoEmbedUrl('youtube', link, { loop: true })!)).toMatchObject({ loop: '1', playlist: 'dQw4w9WgXcQ' });
    const off = q(videoEmbedUrl('youtube', link, { loop: false })!);
    expect(off.loop).toBeUndefined();
    expect(off.playlist).toBeUndefined();
  });
});

describe('Bug 3 - Vimeo Controls', () => {
  const link = 'https://vimeo.com/76979871';
  it('reproduces: the controls setting never reached the Vimeo URL', () => {
    expect(q(oldEmbedUrl('vimeo', link, { controls: false })).controls).toBeUndefined();
  });
  it('fixed: controls=0 / controls=1 follows the toggle', () => {
    expect(q(videoEmbedUrl('vimeo', link, { controls: false })!).controls).toBe('0');
    expect(q(videoEmbedUrl('vimeo', link, { controls: true })!).controls).toBe('1');
    expect(q(videoEmbedUrl('vimeo', link, { autoPlay: true, loop: true, muted: true, controls: true })!))
      .toEqual({ autoplay: '1', loop: '1', muted: '1', controls: '1' });
  });
  it('real Vimeo link shapes, incl. share params and unlisted hashes (old parser broke both)', () => {
    expect(oldEmbedUrl('vimeo', 'https://vimeo.com/76979871?share=copy', {})).toContain('/video/76979871?share=copy?');
    expect(oldEmbedUrl('vimeo', 'https://vimeo.com/76979871/8272103f6e', {})).toContain('/video/8272103f6e?');
    expect(parseVimeo('https://vimeo.com/76979871?share=copy')).toEqual({ id: '76979871' });
    expect(parseVimeo('https://vimeo.com/76979871/8272103f6e')).toEqual({ id: '76979871', hash: '8272103f6e' });
    expect(parseVimeo('https://player.vimeo.com/video/76979871?h=8272103f6e&badge=0')).toEqual({ id: '76979871', hash: '8272103f6e' });
    expect(parseVimeo('https://vimeo.com/channels/staffpicks/76979871')).toEqual({ id: '76979871' });
    expect(parseVimeo('https://vimeo.com/showcase/123/video/76979871')).toEqual({ id: '76979871' });
    const unlisted = videoEmbedUrl('vimeo', 'https://vimeo.com/76979871/8272103f6e', { controls: true })!;
    expect(path(unlisted)).toBe('/video/76979871');
    expect(q(unlisted).h).toBe('8272103f6e');
    expect(parseVimeo('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

// ---- Bug 1 - the real component, editor vs published ----
beforeAll(() => {
  window.matchMedia = ((m: string) => ({ matches: false, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});
function renderVideo(enabled: boolean, props: Record<string, any>) {
  const page = { ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: ['v'] }, v: { type: { resolvedName: 'Video' }, parent: 'ROOT', nodes: [], props } };
  let r!: ReturnType<typeof render>;
  act(() => {
    r = render(
      <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}}>
        <Editor resolver={RESOLVER as any} enabled={enabled} {...(enabled ? {} : { onRender: PublishedNodeRender })}>
          <Frame data={JSON.stringify(page)} />
        </Editor>
      </BuilderProvider>,
    );
  });
  return r.container;
}
const yt = { url: 'https://youtu.be/dQw4w9WgXcQ?si=pWx2rS6k4YkqGZ7A', provider: 'youtube', controls: true, autoPlay: false, loop: true, muted: false };

describe('Bug 1 - published embeds must be clickable', () => {
  it('reproduces: the old iframe markup blocked every click, on every page', () => {
    // Video.tsx:92 before this fix — the class carried no editor condition.
    const old = 'absolute top-0 left-0 w-full h-full border-none pointer-events-none';
    expect(old).toContain('pointer-events-none');
  });
  it('published page: iframe receives clicks, with the clean embed URL', () => {
    const iframe = renderVideo(false, yt).querySelector('iframe')!;
    expect(iframe.className).not.toContain('pointer-events-none');
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&controls=1&mute=0&loop=1&playlist=dQw4w9WgXcQ');
  });
  it('editor: still pointer-events-none, so clicking selects/drags the block instead of playing', () => {
    expect(renderVideo(true, yt).querySelector('iframe')!.className).toContain('pointer-events-none');
  });
  it('bad link: hint in the editor, nothing (no broken frame) on the live page', () => {
    const bad = { ...yt, url: 'https://www.youtube.com/@channel' };
    expect(renderVideo(true, bad).textContent).toContain('Paste a valid YouTube video link');
    const live = renderVideo(false, bad);
    expect(live.querySelector('iframe')).toBeNull();
    expect(live.textContent).not.toContain('Paste a valid');
  });
  it('direct video (custom provider) is unchanged', () => {
    const v = renderVideo(false, { url: 'https://cdn.example.com/a.mp4', provider: 'custom', controls: true }).querySelector('video')!;
    expect(v.getAttribute('src')).toBe('https://cdn.example.com/a.mp4');
  });
});

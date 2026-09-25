// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

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
import { render, act, waitFor } from '@testing-library/react';
import { Editor, Frame, useEditor } from '@craftjs/core';
import { RESOLVER } from '@/lib/builder/resolver';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { LessonCanvasMediaScope } from './canvasMedia';
import { BlockCanvasPreview } from './LessonBlockPreviews';

beforeAll(() => {
  window.matchMedia = ((m: string) => ({ matches: false, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});

const driveBlock = (id: string, asset: string) => ({ id, type: 'video', video_provider: 'gdrive', video_asset_id: asset, content: {}, completion_threshold: 90 });
const BLOCKS: Record<string, any> = {
  v1: driveBlock('v1', 'a1'),
  v2: driveBlock('v2', 'a2'),
  yt: { id: 'yt', type: 'video', video_provider: 'youtube', file_url: 'https://youtu.be/abc', content: { thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg' } },
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const id = String(url).split('/api/lms/content-blocks/')[1];
    return { json: async () => (id && BLOCKS[id] && !init?.method ? { data: BLOCKS[id] } : { error: 'unexpected' }) } as any;
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const page = (ids: string[]) => JSON.stringify({
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: ids.map((i) => `n_${i}`) },
  ...Object.fromEntries(ids.map((i) => [`n_${i}`, { type: { resolvedName: 'LessonBlockNode' }, parent: 'ROOT', props: { blockId: i, blockType: 'video' }, nodes: [] }])),
});

async function mount(ids: string[]) {
  let api!: ReturnType<typeof useEditor>;
  const Grab = () => { api = useEditor(); return null; };
  let r!: ReturnType<typeof render>;
  act(() => {
    r = render(
      <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}}>
        <LessonCanvasMediaScope enabled>
          <Editor resolver={RESOLVER as any} enabled>
            <Grab />
            <Frame data={page(ids)} />
          </Editor>
        </LessonCanvasMediaScope>
      </BuilderProvider>,
    );
  });
  await waitFor(() => expect(r.container.textContent).not.toContain('Loading block'));
  const selected = () => [...api.query.getEvent('selected').all()];
  const blockRoot = (id: string) => api.query.node(`n_${id}`).get().dom as HTMLElement;
  return { container: r.container, selected, blockRoot };
}

// jsdom has no media playback: give each element a controllable paused state.
function fakeMedia(el: HTMLMediaElement, playing: boolean) {
  let paused = !playing;
  Object.defineProperty(el, 'paused', { configurable: true, get: () => paused });
  const pause = vi.fn(() => { paused = true; });
  el.pause = pause;
  return { pause, play: () => { paused = false; el.dispatchEvent(new Event('play')); } }; // `play` does not bubble
}

const mouse = (el: Element, type: string) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
const pointer = (el: EventTarget, type: string) => el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

describe('Drive video on the lesson canvas', () => {
  it('reproduces: the canvas used to show a static poster image, not a player', () => {
    // BlockCanvasPreview (HEAD) rendered DriveVideoCanvasPreview — an <img> + PlayCircle icon —
    // for a validated Drive video. It no longer has a Drive-video branch; the case now only
    // covers an un-validated link, and LessonBlockNode mounts the real player instead.
    const { container } = render(<BlockCanvasPreview block={BLOCKS.v1} />);
    expect(container.querySelector('video')).toBeNull();
  });

  it('renders the real native player on the gated stream + poster routes', async () => {
    const { container } = await mount(['v1']);
    const video = container.querySelector('video')!;
    expect(video).not.toBeNull();
    expect(video.getAttribute('src')).toBe('/api/video/a1/stream?contentBlockId=v1');
    expect(video.getAttribute('poster')).toBe('/api/video/a1/poster?contentBlockId=v1');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(container.querySelector('img')).toBeNull(); // not the old static preview
  });

  it('a press on the video does not select the block; the header strip still does', async () => {
    const { container, selected, blockRoot } = await mount(['v1']);
    mouse(container.querySelector('video')!, 'mousedown');
    expect(selected()).toEqual([]);
    mouse(blockRoot('v1').firstElementChild!, 'mousedown'); // header strip
    expect(selected()).toEqual(['n_v1']);
  });

  it('pressing the video turns off block dragging until release — even a release off the block', async () => {
    const { container, blockRoot } = await mount(['v1']);
    const root = blockRoot('v1');
    expect(root.getAttribute('draggable')).toBe('true'); // Craft drag-anywhere
    pointer(container.querySelector('video')!, 'pointerdown');
    expect(root.getAttribute('draggable')).toBe('false'); // scrub can't become a block drag
    pointer(document.body, 'pointerup'); // released outside the block
    expect(root.getAttribute('draggable')).toBe('true'); // block drag works again
    pointer(root.firstElementChild!, 'pointerdown'); // header press: dragging untouched
    expect(root.getAttribute('draggable')).toBe('true');
  });

  it('two videos: starting one pauses the other (and the canvas audio track)', async () => {
    const { container } = await mount(['v1', 'v2']);
    const [a, b] = Array.from(container.querySelectorAll('video'));
    const audio = container.querySelector('audio')!; // the scope's one shared <audio>
    const ma = fakeMedia(a, false);
    const mb = fakeMedia(b, true);
    const mAudio = fakeMedia(audio, true);
    ma.play();
    expect(mb.pause).toHaveBeenCalledTimes(1);
    expect(mAudio.pause).toHaveBeenCalledTimes(1);
    expect(ma.pause).not.toHaveBeenCalled();
    mb.play();
    expect(ma.pause).toHaveBeenCalledTimes(1);
  });

  it('scrubbing / finishing writes nothing — no request beyond loading the block', async () => {
    const { container } = await mount(['v1']);
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
    Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: 95 });
    video.dispatchEvent(new Event('timeupdate'));
    video.dispatchEvent(new Event('ended'));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock.mock.calls.map((c) => [String(c[0]), (c[1] as any)?.method ?? 'GET'])).toEqual([['/api/lms/content-blocks/v1', 'GET']]);
  });

  it('YouTube stays a thumbnail (no iframe on the canvas)', async () => {
    const { container } = await mount(['yt']);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
  });
});

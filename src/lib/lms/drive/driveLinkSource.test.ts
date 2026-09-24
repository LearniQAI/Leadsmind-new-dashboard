import { describe, it, expect } from 'vitest';
import { clampRange, parseRangeHeader } from './driveLinkSource';
import { classifyVideoMime } from '@/lib/lms/video/googleDriveVideoProvider';
import { driveVideoUrls } from '@/lib/lms/video/driveVideoUrls';

const MB8 = 8 * 1024 * 1024;

describe('parseRangeHeader', () => {
  it('parses open-ended and closed single ranges', () => {
    expect(parseRangeHeader('bytes=0-')).toEqual({ start: 0, end: undefined });
    expect(parseRangeHeader('bytes=100-199')).toEqual({ start: 100, end: 199 });
    expect(parseRangeHeader(' bytes=5-5 ')).toEqual({ start: 5, end: 5 });
  });

  it('treats absent, suffix, multi-range, and inverted ranges as absent', () => {
    expect(parseRangeHeader(null)).toBeUndefined();
    expect(parseRangeHeader('bytes=-500')).toBeUndefined();
    expect(parseRangeHeader('bytes=0-10,20-30')).toBeUndefined();
    expect(parseRangeHeader('bytes=200-100')).toBeUndefined();
    expect(parseRangeHeader('items=0-10')).toBeUndefined();
  });
});

describe('clampRange', () => {
  it("bounds a media element's opening `bytes=0-` to one chunk", () => {
    expect(clampRange({ start: 0 }, MB8)).toEqual({ start: 0, end: MB8 - 1 });
  });

  it('treats a missing Range header as bytes=0- (never an unbounded whole-file stream)', () => {
    expect(clampRange(undefined, MB8)).toEqual({ start: 0, end: MB8 - 1 });
  });

  it('bounds an open-ended seek from the middle of the file', () => {
    const start = 1_500_000_000;
    expect(clampRange({ start }, MB8)).toEqual({ start, end: start + MB8 - 1 });
  });

  it('leaves a range already smaller than a chunk untouched', () => {
    expect(clampRange({ start: 0, end: 1 }, MB8)).toEqual({ start: 0, end: 1 });
    expect(clampRange({ start: 10, end: 10 + MB8 - 1 }, MB8)).toEqual({ start: 10, end: 10 + MB8 - 1 });
  });

  it('shrinks an explicit range larger than a chunk', () => {
    expect(clampRange({ start: 0, end: 50 * MB8 }, MB8)).toEqual({ start: 0, end: MB8 - 1 });
  });
});

describe('classifyVideoMime', () => {
  it('accepts containers a browser <video> can play', () => {
    for (const m of ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v']) {
      expect(classifyVideoMime(m)).toEqual({ ok: true });
    }
  });

  it('rejects unplayable video containers with an export-as-MP4 hint', () => {
    const r = classifyVideoMime('video/x-msvideo');
    expect(r.ok).toBe(false);
    expect((r as any).error).toMatch(/MP4/);
  });

  it('rejects audio, documents, folders and unknown types', () => {
    expect(classifyVideoMime('audio/mpeg').ok).toBe(false);
    expect(classifyVideoMime('application/pdf').ok).toBe(false);
    expect((classifyVideoMime('application/vnd.google-apps.folder') as any).error).toMatch(/folder/);
    expect(classifyVideoMime(null).ok).toBe(false);
  });
});

describe('driveVideoUrls', () => {
  it('builds gated same-origin URLs for a validated Drive block', () => {
    expect(driveVideoUrls({ id: 'blk-1', video_provider: 'gdrive', video_asset_id: 'asset-1' })).toEqual({
      src: '/api/video/asset-1/stream?contentBlockId=blk-1',
      poster: '/api/video/asset-1/poster?contentBlockId=blk-1',
    });
  });

  it('returns null for other providers or an unvalidated Drive block', () => {
    expect(driveVideoUrls({ id: 'b', video_provider: 'youtube', video_asset_id: 'a' })).toBeNull();
    expect(driveVideoUrls({ id: 'b', video_provider: 'gdrive', video_asset_id: null })).toBeNull();
  });
});

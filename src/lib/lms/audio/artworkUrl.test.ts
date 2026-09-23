import { describe, expect, it } from 'vitest';
import { audioArtworkFileProblem, isOwnedAudioArtworkUrl } from './artworkUrl';

const PREFIX = 'https://proj.supabase.co/storage/v1/object/public/media/ws-a/lms/audio-artwork/';

describe('isOwnedAudioArtworkUrl', () => {
  it('accepts an image uploaded directly into this workspace’s artwork folder', () => {
    expect(isOwnedAudioArtworkUrl(`${PREFIX}1727000000000-studio.jpg`, PREFIX)).toBe(true);
    expect(isOwnedAudioArtworkUrl(`${PREFIX}cover.WEBP`, PREFIX)).toBe(true);
  });

  it('rejects another workspace’s folder, other prefixes and foreign hosts', () => {
    expect(isOwnedAudioArtworkUrl(PREFIX.replace('ws-a', 'ws-b') + 'x.png', PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(PREFIX.replace('audio-artwork', 'speakers') + 'x.png', PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl('https://evil.example/x.png', PREFIX)).toBe(false);
  });

  it('rejects non-image uploads the shared endpoint would otherwise allow', () => {
    expect(isOwnedAudioArtworkUrl(`${PREFIX}notes.pdf`, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(`${PREFIX}anim.gif`, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(`${PREFIX}noext`, PREFIX)).toBe(false);
  });

  it('rejects traversal, sub-folders, query strings and non-strings', () => {
    expect(isOwnedAudioArtworkUrl(`${PREFIX}../../other/x.png`, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(`${PREFIX}sub/x.png`, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(`${PREFIX}x.png?download=1`, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(`${PREFIX}`, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl(null, PREFIX)).toBe(false);
    expect(isOwnedAudioArtworkUrl({ url: 'x' }, PREFIX)).toBe(false);
  });
});

describe('audioArtworkFileProblem', () => {
  it('passes a normal square JPG', () => {
    expect(audioArtworkFileProblem({ name: 'cover.jpg', type: 'image/jpeg', size: 900_000 })).toBeNull();
  });
  it('rejects non-images, disguised files and oversize images', () => {
    expect(audioArtworkFileProblem({ name: 'notes.pdf', type: 'application/pdf', size: 1 })).toMatch(/PNG, JPG or WebP/);
    expect(audioArtworkFileProblem({ name: 'x.png', type: 'application/pdf', size: 1 })).toMatch(/PNG, JPG or WebP/);
    expect(audioArtworkFileProblem({ name: 'big.png', type: 'image/png', size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
  });
});

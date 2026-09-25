import { describe, it, expect } from 'vitest';
import { flattenLessonCanvas, isInlineOnlyCanvas } from './flattenLessonCanvas';

const tree = (imageProps: Record<string, any>) => ({
  ROOT: { type: { resolvedName: 'Container' }, nodes: ['img'], isCanvas: true },
  img: { type: { resolvedName: 'Image' }, props: imageProps },
});

describe('flattenLessonCanvas — Image element', () => {
  it('carries alignment, sizing, fit and shape through to the student item', () => {
    const [item] = flattenLessonCanvas(tree({
      src: 'https://x/a.png', alt: 'Diagram', borderRadius: 8,
      width: '50%', height: '240px', align: 'center', objectFit: 'contain', shape: 'square',
    }));
    expect(item).toEqual({
      kind: 'image', src: 'https://x/a.png', alt: 'Diagram', radius: 8,
      width: '50%', height: '240px', align: 'center', objectFit: 'contain', shape: undefined,
      frame: { borderRadius: '8px' }, // the builder's frameBorderStyle() output (shadow/border/corners when set)
    });
  });

  it('keeps legacy image nodes (templates) rendering exactly as before', () => {
    const [item] = flattenLessonCanvas(tree({ src: 'https://x/a.png', alt: 'A' }));
    expect(item).toMatchObject({ kind: 'image', radius: 12, width: undefined, align: undefined, objectFit: undefined });
  });

  it('emits alt="" for an image marked decorative, even if alt text was typed earlier', () => {
    const [item] = flattenLessonCanvas(tree({ src: 'https://x/a.png', alt: 'old text', decorative: true }));
    expect(item).toMatchObject({ alt: '' });
  });

  it('drops non-length width/height values instead of passing them to the student page', () => {
    const [item] = flattenLessonCanvas(tree({ src: 'https://x/a.png', alt: 'A', width: 'calc(100%);color:red', height: '400' }));
    expect(item).toMatchObject({ width: undefined, height: undefined });
  });

  it('skips an Image still on its empty upload placeholder (no src)', () => {
    const items = flattenLessonCanvas(tree({ src: '', alt: '' }));
    expect(items).toEqual([]);
    expect(isInlineOnlyCanvas(items)).toBe(false);
  });
});

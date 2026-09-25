import React from 'react';
import type { LessonCanvasItem } from '@/lib/lms/flattenLessonCanvas';

type ImageItem = Extract<LessonCanvasItem, { kind: 'image' }>;

// Student-facing render of a canvas Image element (shared by the student player and the admin
// "preview as student" page) — mirrors the builder's Image: width/height/fit/shape/alignment,
// and `maxWidth: 100%` so a fixed-width image shrinks rather than overflowing on a phone.
// Shadow / border / corner radii come from the builder's own frameBorderStyle() (item.frame), so
// they match the builder exactly — including no radius when none was set.
export function CanvasLessonImage({ item }: { item: ImageItem }) {
  const circle = item.shape === 'circle';
  const width = item.width || '100%';
  const margins: React.CSSProperties =
    item.align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' }
    : item.align === 'right' ? { marginLeft: 'auto' }
    : {};

  return (
    <div
      className={circle ? 'aspect-square overflow-hidden rounded-full' : undefined}
      style={{ width, maxWidth: '100%', ...margins }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.src}
        alt={item.alt}
        loading="lazy"
        className="block w-full"
        style={{
          height: circle ? '100%' : item.height || 'auto',
          objectFit: circle ? 'cover' : item.objectFit || 'cover',
          ...(circle ? { borderRadius: '50%' } : item.frame ?? { borderRadius: `${item.radius ?? 12}px` }),
        }}
      />
    </div>
  );
}

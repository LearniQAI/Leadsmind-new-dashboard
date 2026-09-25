import React from 'react';
import type { LessonCanvasItem } from '@/lib/lms/flattenLessonCanvas';

type DividerItem = Extract<LessonCanvasItem, { kind: 'divider' }>;

// Student-facing canvas Divider (student player + public preview): the builder's own line —
// Divider.tsx's inner bar — with its thickness, colour, length and alignment. Its top/bottom
// spacing (default 16px) arrives through the universal spacing wrapper, like every block.
const ALIGN: Record<DividerItem['alignment'], React.CSSProperties> = {
  left: { marginLeft: 0, marginRight: 'auto' },
  center: { marginLeft: 'auto', marginRight: 'auto' },
  right: { marginLeft: 'auto', marginRight: 0 },
};

export function CanvasDivider({ item }: { item: DividerItem }) {
  return (
    <div role="separator" className="w-full">
      <div style={{ height: `${item.weight}px`, backgroundColor: item.color, width: item.width, maxWidth: '100%', ...ALIGN[item.alignment] }} />
    </div>
  );
}

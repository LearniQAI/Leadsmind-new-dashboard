import React from 'react';
import type { LessonCanvasItem } from '@/lib/lms/flattenLessonCanvas';
import { gridTemplateFor } from '@/lib/builder/columnWidths';
import { CanvasItemSpacing } from './CanvasItemSpacing';

/**
 * Renders a flattened canvas item list, laying the items of a drag-resized Columns block out
 * side by side at the author's percentages (flattenLessonCanvas tags them with `columns`).
 * Everything else — and every Columns block that was never resized — renders as the stacked
 * list it always did. Shared by the student player and the public preview so both match.
 *
 * `.lm-canvas-cols` (globals.css) stacks to one column below 768px, like the builder's mobile view.
 */
export function renderCanvasList(
  items: LessonCanvasItem[],
  renderItem: (item: any, idx: number) => React.ReactNode,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < items.length; ) {
    const tag = items[i].columns;
    if (!tag) {
      const item = items[i];
      out.push(<CanvasItemSpacing key={i} spacing={item.spacing}>{renderItem(item, i)}</CanvasItemSpacing>);
      i++;
      continue;
    }
    let j = i;
    while (j < items.length && items[j].columns?.group === tag.group) j++;
    const cells: React.ReactNode[][] = tag.widths.map(() => []);
    for (let k = i; k < j; k++) {
      const item = items[k];
      cells[Math.min(item.columns!.index, cells.length - 1)].push(
        <CanvasItemSpacing key={k} spacing={item.spacing}>{renderItem(item, k)}</CanvasItemSpacing>,
      );
    }
    out.push(
      <div
        key={`cols-${i}`}
        className="lm-canvas-cols"
        style={{ ['--lm-cols' as any]: gridTemplateFor(tag.widths), gap: tag.gap }}
      >
        {cells.map((cell, c) => (
          <div key={c} className="min-w-0 space-y-6">{cell}</div>
        ))}
      </div>,
    );
    i = j;
  }
  return out;
}

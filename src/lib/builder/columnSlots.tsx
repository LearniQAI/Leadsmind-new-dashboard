// Column slots for the Columns block.
//
// Columns is a CSS grid: its layout presets only choose the grid template (grid-cols-3,
// 1fr 2fr, …) for whatever child blocks it already has. Nothing ever created those children,
// so a freshly added Columns block had none — and showed "EMPTY COLUMNS GRID" whichever
// preset was picked. Templates only worked because they're authored with a Container per
// column. These helpers give every Columns block the same shape: one empty "Column" Container
// per slot (the templates' own column shape), added through Craft's own parseReactElement +
// addNodeTree so parent links are set correctly.
import React from 'react';
import { Element } from '@craftjs/core';

// Pure helpers live in columnCount.ts so server code can use them without loading Craft.
export { COLUMN_COUNT, columnCountFor } from './columnCount';

/**
 * Add empty Column containers until `columnsId` has at least `count` children. Never removes
 * or moves existing children (switching to fewer columns must not destroy content — the extra
 * columns wrap onto the next grid row instead). Idempotent: counts the node's live children, so
 * a repeated call (e.g. React StrictMode's double effect) adds nothing. Returns how many it added.
 */
export function ensureColumnSlots(actions: any, query: any, columnsId: string, count: number): number {
  const node = query.node(columnsId).get();
  if (!node) return 0;
  const have = node.data.nodes.length;
  if (have >= count) return 0;
  const Container = query.getOptions().resolver.Container; // the resolver's own (wrapped) type
  for (let i = have; i < count; i++) {
    const tree = query
      .parseReactElement(
        <Element is={Container} canvas layoutType="fixed" padding={0} backgroundColor="transparent" custom={{ displayName: 'Column' }} />,
      )
      .toNodeTree();
    actions.addNodeTree(tree, columnsId);
  }
  return count - have;
}

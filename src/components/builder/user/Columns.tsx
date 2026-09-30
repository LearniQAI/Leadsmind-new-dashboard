"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ColumnsSettings } from './ColumnsSettings';
import { useBuilder } from '../BuilderContext';
import { columnCountFor, ensureColumnSlots } from '@/lib/builder/columnSlots';
import { validColumnWidths, presetWidths, resizeAdjacent, gridTemplateFor } from '@/lib/builder/columnWidths';

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export interface ColumnsProps {
 layout: '1' | '2' | '3' | '4' | '1/3-2/3' | '2/3-1/3';
 gap: number;
 padding: number;
 /** Manual per-column widths (percentages summing to 100), set by dragging the column edges.
  *  Overrides the preset's ratio; absent = the preset's own split. */
 columnWidths?: number[];
 children?: React.ReactNode;
}

export const Columns = ({
  layout,
  gap,
  padding,
  columnWidths,
  children,
  canvas,
  isCanvas,
  dragRef,
  ...props
}: ColumnsProps & any) => {
 const { id, connectors: { connect, drag }, actions: { setProp }, selected } = useNode((node) => ({ selected: node.events.selected }));
 const { enabled, actions, query } = useEditor((state) => ({
   enabled: state.options.enabled
 }));
 const perRow = columnCountFor(layout);
 const storedWidths = validColumnWidths(columnWidths, perRow);
 // Live widths while an edge is being dragged; committed to the node once, on release.
 const [draft, setDraft] = React.useState<number[] | null>(null);
 const widths = draft ?? storedWidths;
 const gridRef = React.useRef<HTMLDivElement | null>(null);
 const [handleX, setHandleX] = React.useState<number[]>([]);

 // Handle positions come from the grid's own resolved tracks (getComputedStyle gives real px per
 // column), so each handle sits in the middle of the gap between two tracks whatever the column
 // contents, gap or padding — and follows the drag live. A stacked (1-track) grid has no shared
 // edge, so no handles.
 const measure = React.useCallback(() => {
  const grid = gridRef.current;
  if (!grid || perRow < 2) return;
  const cs = getComputedStyle(grid);
  const tracks = cs.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => Number.isFinite(n));
  if (tracks.length !== perRow) { setHandleX((prev) => (prev.length ? [] : prev)); return; }
  const colGap = parseFloat(cs.columnGap) || 0;
  let x = parseFloat(cs.paddingLeft) || 0;
  const xs: number[] = [];
  for (let i = 0; i < perRow - 1; i++) {
   x += tracks[i];
   xs.push(Math.round(x + colGap / 2));
   x += colGap;
  }
  setHandleX((prev) => (prev.length === xs.length && prev.every((v, i) => v === xs[i]) ? prev : xs));
 }, [perRow]);
 React.useLayoutEffect(() => { if (enabled) measure(); });
 React.useEffect(() => {
  const grid = gridRef.current;
  if (!enabled || !grid || typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver(measure);
  ro.observe(grid);
  return () => ro.disconnect();
 }, [enabled, measure]);

 const startResize = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
  const grid = gridRef.current;
  if (!grid || e.button !== 0) return;
  e.preventDefault(); // no text selection, and no Craft block drag (the wrapper is draggable)
  e.stopPropagation();
  const start = widths ?? presetWidths(layout, perRow);
  // The fr tracks share what's left after padding and the gaps between columns.
  const track = grid.clientWidth - 2 * (padding || 0) - (gap || 0) * (perRow - 1);
  if (track <= 0) return;
  const x0 = e.clientX;
  let latest = start;
  const move = (ev: PointerEvent) => {
   latest = resizeAdjacent(start, index, ((ev.clientX - x0) / track) * 100);
   setDraft(latest);
  };
  const end = () => {
   window.removeEventListener('pointermove', move);
   window.removeEventListener('pointerup', end);
   window.removeEventListener('pointercancel', end);
   if (latest !== start) setProp((p: any) => { p.columnWidths = latest; });
   setDraft(null);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
 };

 // A Columns block with no children has nothing for its grid to lay out — every preset showed
 // "EMPTY COLUMNS GRID". In the editor, give an empty one real column slots for its preset
 // (the same Column containers the templates use). Only when EMPTY, so a column the admin
 // deletes on purpose isn't forced back; the settings presets top slots up.
 React.useEffect(() => {
  if (!enabled) return;
  if (query.node(id).get()?.data.nodes.length === 0) ensureColumnSlots(actions, query, id, columnCountFor(layout));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/enable only (see above)
 }, [enabled, id]);
 const { viewMode } = useBuilder();

 // Real Tailwind breakpoint classes (md:/lg:) — correct on every real device, since they key
 // off the actual browser viewport width. Also the asymmetric splits used to unconditionally
 // apply a fixed 2-column `gridTemplateColumns` inline style with NO responsive behavior at
 // all — they never stacked on real mobile. Now real classes, same as every other layout.
 let gridStyle = "grid-cols-1";
 switch (layout) {
  case '2': gridStyle = "grid-cols-1 md:grid-cols-2"; break;
  case '3': gridStyle = "grid-cols-1 md:grid-cols-3"; break;
  case '4': gridStyle = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"; break;
  case '1/3-2/3': gridStyle = "grid-cols-1 md:[grid-template-columns:1fr_2fr]"; break;
  case '2/3-1/3': gridStyle = "grid-cols-1 md:[grid-template-columns:2fr_1fr]"; break;
 }

 // The editor's Desktop/Tablet/Mobile toggle narrows a container div, not the real browser
 // window — so Tailwind's md:/lg: classes above (keyed to real viewport width, not any
 // ancestor's width) don't respond to it: the real window stays desktop-wide, so those
 // classes keep winning in the compiled CSS regardless of class order, and multi-column
 // grids never visually stack in Tablet/Mobile preview even though they'd correctly stack on
 // an actual device. A plain same-order class can't fix this (a later `grid-cols-1` still
 // loses to an earlier `md:grid-cols-2` in the real stylesheet), so this REPLACES gridStyle
 // entirely rather than appending to it — editor-preview-only, production always uses the
 // real breakpoint classes above.
 //
 // This per-component JS override is the ACCEPTED PERMANENT PATTERN for this problem, not a
 // stopgap — a real fix (rendering the canvas in an iframe with its own true viewport) was
 // investigated and reverted, since it breaks every canvas interaction that depends on native
 // DOM events (select, drag-reorder, inline-edit, block insertion) once content crosses an
 // iframe document boundary. See the long comment on Viewport.tsx's `getWidth()` for the full
 // reasoning. Copy this same pattern into any other multi-column component only if/when its
 // own preview-stacking is actually reported wrong — not a batch retrofit.
 const viewModeColsOverride: Record<string, Partial<Record<string, string>>> = {
  mobile: { '2': 'grid-cols-1', '3': 'grid-cols-1', '4': 'grid-cols-1', '1/3-2/3': 'grid-cols-1', '2/3-1/3': 'grid-cols-1' },
  tablet: { '4': 'grid-cols-2' }, // '2'/'3' already show their md: column count at tablet width for real
 };
 const previewOverride = enabled ? viewModeColsOverride[viewMode]?.[layout] : undefined;

 // Manual widths: same responsive stacking as the preset (single column on mobile), with the
 // custom template taking over at the breakpoint where the preset would show all its columns.
 // (Static class strings, so Tailwind's scanner keeps them.) The template rides in a CSS var.
 if (widths) {
  gridStyle = perRow >= 4
   ? "grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:var(--lm-cols)] [&>*]:w-full"
   : "grid-cols-1 md:[grid-template-columns:var(--lm-cols)] [&>*]:w-full";
  // ^ [&>*]:w-full: a 'fixed' column Container is mx-auto (shrinks to its content), which would
  //   make a resized column look unchanged. Only applied once widths are manual.
 }

 return (
  <div
   {...props}
   ref={(el) => {
    gridRef.current = el;
    if (el) {
      connect(el);
      drag(el);
      if (dragRef) {
       if (typeof dragRef === 'function') dragRef(el);
       else dragRef.current = el;
      }
    }
   }}
   className={cn(
      // scroll-mt-24: same reasoning as Section.tsx's own scroll-mt-24 — a Columns node can
      // itself be a Navbar/Footer link's scroll target (e.g. a sub-anchor inside a larger
      // Section, for a distinct nav entry that shouldn't just jump to the whole section's top).
      // No `transition-all`-driven width easing while dragging: the grid must track the pointer.
      "w-full grid scroll-mt-24 relative group",
      !draft && "transition-all",
      enabled && "outline-dashed outline-1 outline-transparent hover:outline-black/10",
      previewOverride || gridStyle,
      props.className
    )}
   style={{
    gap: `${gap}px`,
    padding: `${padding}px`,
    ...(widths ? ({ ['--lm-cols' as any]: gridTemplateFor(widths) }) : {}),
   }}
  >
    {React.Children.count(children) === 0 && enabled ? (
      <div className="col-span-full w-full min-h-[80px] bg-dash-surface border border-dashed border-dash-border flex items-center justify-center rounded-xl p-4">
        <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest pointer-events-none">Empty Columns Grid</span>
      </div>
    ) : children}
    {enabled && !previewOverride && handleX.map((x, i) => (
      // One grab handle per shared edge. Out of grid flow (absolute), so it never becomes a
      // column. Shown while hovering the block or while it is selected, and during a drag.
      <div
        key={i}
        data-col-overlay=""
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize columns ${i + 1} and ${i + 2}`}
        onPointerDown={startResize(i)}
        className={cn(
          "absolute top-1 bottom-1 z-20 flex w-3 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none",
          (selected || draft) && "opacity-100"
        )}
        style={{ left: x }}
      >
        <div className={cn("h-full w-1 rounded-full bg-blue-500/60 hover:bg-blue-600", draft && "bg-blue-600")} />
        {draft && (
          <span className="pointer-events-none absolute -top-5 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {Math.round(draft[i])}% · {Math.round(draft[i + 1])}%
          </span>
        )}
      </div>
    ))}
  </div>
 );
};

Columns.craft = {
 displayName: 'Columns',
 isCanvas: true,
 props: {
  layout: '2',
  gap: 16,
  padding: 16,
 },
 related: {
  settings: ColumnsSettings,
 },
 rules: {
  canDrag: () => true,
  canMoveIn: () => true,
 },
};

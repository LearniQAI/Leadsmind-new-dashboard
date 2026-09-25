"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { useBuilder } from './BuilderContext';
import { SELF_SPACED_BLOCKS, hasSpacing, pickSpacingProps, spacingStyle } from '@/lib/builder/spacing';

/**
 * The universal top/bottom spacing for the current Craft node, applied by its wrapper — for
 * every block that does NOT paint spacing on its own box (see SELF_SPACED_BLOCKS). One hook,
 * used by both the editor canvas (RenderNode) and live pages (PublishedNodeRender), so the
 * builder preview and what visitors see resolve the same props the same way.
 *
 * `active` depends on whether a value exists at ANY breakpoint (not just the current one), so
 * a wrapper never appears/disappears when the viewport crosses a breakpoint — that would
 * remount the block (resetting a playing video, a half-filled form, ...).
 */
export function useNodeSpacing(): { active: boolean; style: React.CSSProperties | undefined } {
  const { id, name, spacingProps } = useNode((node) => ({
    name: node.data.name,
    spacingProps: pickSpacingProps(node.data.props),
  }));
  const { viewMode } = useBuilder();
  const active = id !== 'ROOT' && !SELF_SPACED_BLOCKS.has(name) && hasSpacing(spacingProps);
  return { active, style: active ? spacingStyle(spacingProps, viewMode) : undefined };
}

/** Craft `onRender` for non-editing renders (published pages, thumbnails). No spacing set =
 *  the block renders exactly as before, with no extra element. */
export const PublishedNodeRender = ({ render }: { render: React.ReactElement }) => {
  const { active, style } = useNodeSpacing();
  if (!active) return render;
  return <div style={style}>{render}</div>;
};

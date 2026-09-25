"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { AlertTriangle } from 'lucide-react';
import { columnCountFor, ensureColumnSlots } from '@/lib/builder/columnSlots';
import { SliderWithInput, PropertyGroup } from '../inspector/primitives';

// Consistent Premium Settings Panels pass — already used SliderWithInput (auto-upgraded via
// the shared primitives change); wrapped in PropertyGroup for title consistency with every
// other panel. The layout ratio grid stays a segmented button grid (not a dropdown) since it
// needs to show 6 spatial options at once — the same legitimate pattern already used for
// Heading's level/weight selectors, not swapped to StyledDropdown.
export const ColumnsSettings = () => {
  const { id, actions: { setProp }, layout, gap, padding, childCount } = useNode((node) => ({
    layout: node.data.props.layout,
    gap: node.data.props.gap,
    padding: node.data.props.padding,
    childCount: node.data.nodes.length,
  }));
  const { actions: editorActions, query } = useEditor();
  const perRow = columnCountFor(layout);

  // A preset sets the grid AND makes sure there's a real column slot for each of its columns
  // (lib/builder/columnSlots). Switching to fewer never deletes: extra columns wrap to a new row.
  const choose = (next: string) => {
    setProp((props: any) => { props.layout = next; });
    ensureColumnSlots(editorActions, query, id, columnCountFor(next));
  };

  return (
    <div className="space-y-6">
      <PropertyGroup title="Column layout">
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: '1', label: '1 column' },
            { id: '2', label: '2 columns' },
            { id: '3', label: '3 columns' },
            { id: '4', label: '4 columns' },
            { id: '1/3-2/3', label: '1/3 + 2/3' },
            { id: '2/3-1/3', label: '2/3 + 1/3' },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => choose(l.id)}
              className={`text-[12px] py-2 rounded-xl font-medium transition-all motion-reduce:transition-none border ${layout === l.id ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {childCount > perRow && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              This grid has {childCount} columns; this layout shows {perRow} per row, so the other {childCount - perRow}{' '}
              wrap onto the next row. Nothing was removed — move or delete the extra columns if you don&apos;t want them.
            </span>
          </p>
        )}
      </PropertyGroup>

      <PropertyGroup title="Spacing">
        <SliderWithInput
          label="Gap spacing"
          value={gap || 0}
          onChange={(val) => setProp((props: any) => props.gap = val)}
          min={0}
          max={64}
          step={4}
          numeric
        />
        <SliderWithInput
          label="Internal padding"
          value={padding || 0}
          onChange={(val) => setProp((props: any) => props.padding = val)}
          min={0}
          max={64}
          step={4}
          numeric
        />
      </PropertyGroup>
    </div>
  );
};

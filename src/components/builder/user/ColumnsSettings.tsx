"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { SliderWithInput, PropertyGroup } from '../inspector/primitives';

// Consistent Premium Settings Panels pass — already used SliderWithInput (auto-upgraded via
// the shared primitives change); wrapped in PropertyGroup for title consistency with every
// other panel. The layout ratio grid stays a segmented button grid (not a dropdown) since it
// needs to show 6 spatial options at once — the same legitimate pattern already used for
// Heading's level/weight selectors, not swapped to StyledDropdown.
export const ColumnsSettings = () => {
  const { actions: { setProp }, layout, gap, padding } = useNode((node) => ({
    layout: node.data.props.layout,
    gap: node.data.props.gap,
    padding: node.data.props.padding,
  }));

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
              onClick={() => setProp((props: any) => props.layout = l.id)}
              className={`text-[10px] py-2 rounded font-bold transition-all motion-reduce:transition-none border border-dash-border ${layout === l.id ? 'bg-primary text-white shadow-lg' : 'bg-dash-surface !text-dash-textMuted hover:!text-dash-text'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
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

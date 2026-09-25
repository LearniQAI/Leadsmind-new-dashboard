"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { NumCell, SectionHeader } from './panelControls';
import { MICRO_LABEL, segmentIconBtn, SEGMENT_WRAP } from './panelTheme';
import {
  DEVICES, SPACING_BOUNDS, SPACING_DEFAULTS, SPACING_KEYS,
  clampSpacing, pickSpacingProps, readResponsive, responsivePropName,
  type Device, type SpacingKey,
} from '@/lib/builder/spacing';

const FIELDS: { key: SpacingKey; label: string }[] = [
  { key: 'paddingTop', label: 'Padding top' },
  { key: 'paddingBottom', label: 'Padding bottom' },
  { key: 'marginTop', label: 'Margin top' },
  { key: 'marginBottom', label: 'Margin bottom' },
];

const DEVICE_META: Record<Device, { label: string; icon: React.ElementType }> = {
  desktop: { label: 'Desktop', icon: Monitor },
  tablet: { label: 'Tablet', icon: Tablet },
  mobile: { label: 'Mobile', icon: Smartphone },
};

/**
 * The ONE settings section for universal top/bottom spacing. ElementProperties mounts it for
 * every selected node, so every block type gets identical controls in the identical place —
 * nothing here is block-specific. Values are px, edited for the breakpoint currently shown on
 * the canvas (the builder's own Desktop/Tablet/Mobile toggle; the switcher below drives the
 * same toggle). A blank Tablet/Mobile field inherits Desktop, shown as its placeholder.
 */
export const SpacingControls = ({ nodeId }: { nodeId: string }) => {
  const { viewMode, setViewMode } = useBuilder();
  const { actions, spacing, name } = useEditor((state) => ({
    spacing: pickSpacingProps(state.nodes[nodeId]?.data.props),
    name: state.nodes[nodeId]?.data.name as string | undefined,
  }));
  const defaults = (name && SPACING_DEFAULTS[name]) || {};

  const inheritedAt = (key: SpacingKey, device: Device) =>
    readResponsive(spacing, key, device) ?? defaults[key] ?? 0;

  const write = (key: SpacingKey, raw: string) => {
    const prop = responsivePropName(key, viewMode);
    const n = raw.trim() === '' ? NaN : Number(raw);
    actions.setProp(nodeId, (props: any) => {
      if (Number.isFinite(n)) props[prop] = clampSpacing(key, n);
      // Cleared: Desktop falls back to the block's default, Tablet/Mobile re-inherit Desktop.
      else if (viewMode === 'desktop') props[prop] = '';
      else delete props[prop];
    });
  };

  const resetDevice = () =>
    actions.setProp(nodeId, (props: any) => {
      for (const key of SPACING_KEYS) {
        const prop = responsivePropName(key, viewMode);
        if (viewMode === 'desktop') props[prop] = '';
        else delete props[prop];
      }
    });

  const hasOverride = (device: Device) =>
    device !== 'desktop' && SPACING_KEYS.some((k) => spacing[responsivePropName(k, device)] !== undefined);

  return (
    <div className="space-y-3" data-testid="spacing-controls">
      <SectionHeader title="Spacing" onReset={resetDevice} resetTitle={`Clear ${DEVICE_META[viewMode].label} spacing`} />
      <div className="flex items-center justify-between gap-2">
        <span className={MICRO_LABEL}>Editing {DEVICE_META[viewMode].label}</span>
        <div className={`${SEGMENT_WRAP} max-w-fit`}>
          {DEVICES.map((device) => {
            const { label, icon: Icon } = DEVICE_META[device];
            return (
              <button
                key={device}
                type="button"
                onClick={() => setViewMode(device)}
                title={`${label}${hasOverride(device) ? ' (has its own values)' : ''}`}
                aria-pressed={viewMode === device}
                data-testid={`spacing-device-${device}`}
                className={`${segmentIconBtn(viewMode === device)} relative`}
              >
                <Icon className="w-3.5 h-3.5" />
                {hasOverride(device) && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-dash-accent" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
        {FIELDS.map(({ key, label }) => {
          const own = spacing[responsivePropName(key, viewMode)];
          const bounds = SPACING_BOUNDS[key.startsWith('padding') ? 'padding' : 'margin'];
          const fallback = viewMode === 'desktop' ? (defaults[key] ?? 0) : inheritedAt(key, 'desktop');
          return (
            <div key={key} className="space-y-1">
              <Label className={`${MICRO_LABEL} block`}>{label} (px)</Label>
              <NumCell
                value={own === undefined || own === '' ? '' : String(parseFloat(String(own)))}
                onChange={(v) => write(key, v)}
                placeholder={String(parseFloat(String(fallback)) || 0)}
                min={bounds.min}
                max={bounds.max}
                ariaLabel={`${label}, ${DEVICE_META[viewMode].label}`}
                testid={`spacing-${key}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

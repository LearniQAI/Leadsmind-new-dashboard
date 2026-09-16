"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import CountUp from 'react-countup';
import { StatCounterSettings } from './StatCounterSettings';
import { useBuilder } from '../BuilderContext';

export interface StatCounterItem {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export interface StatCounterProps {
  stats: StatCounterItem[];
  numberColor: string;
  labelColor: string;
  accentColor: string;
  backgroundColor: string;
  duration: number;
}

const gridColsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

// Same accepted permanent pattern as Columns.tsx's `viewModeColsOverride` (see the long
// comment there and on Viewport.tsx's `getWidth()`): the editor's Desktop/Tablet/Mobile
// toggle only narrows a wrapper <div>'s CSS width, not the real browser viewport, so the
// `md:grid-cols-*` classes above — keyed to the real window width — never respond to it.
// At "mobile" preview this collapsed 3-4 stat numbers into 2 real columns squeezed into a
// 390px-wide box, overlapping into illegible text. Force single-column stacking in the
// editor's mobile/tablet preview only; production always uses the real breakpoint classes.
const viewModeColsOverride: Record<string, Partial<Record<number, string>>> = {
  mobile: { 1: 'grid-cols-1', 2: 'grid-cols-1', 3: 'grid-cols-1', 4: 'grid-cols-1' },
  tablet: { 3: 'grid-cols-2', 4: 'grid-cols-2' },
};

export const StatCounter = ({
  // Templates/deserialized JSON can omit this entirely — stats.map below is
  // unguarded, so default it rather than let a bare StatCounter node crash the canvas.
  stats = [],
  numberColor,
  labelColor,
  accentColor,
  backgroundColor,
  duration,
  dragRef,
  ...props
}: StatCounterProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const { viewMode } = useBuilder();
  const clampedLen = Math.min(stats.length, 4);
  const previewOverride = enabled ? viewModeColsOverride[viewMode]?.[clampedLen] : undefined;
  const colsClass = previewOverride || gridColsMap[clampedLen] || gridColsMap[4];

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
          connect(ref);
          drag(ref);
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className="w-full transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50"
      style={{ backgroundColor }}
    >
      <div className={`grid ${colsClass} gap-8`}>
        {stats.map((stat: StatCounterItem, i: number) => (
          <div key={i} className="flex flex-col items-center text-center gap-2">
            <div className="flex items-baseline gap-0.5" style={{ color: numberColor }}>
              <span className="text-4xl md:text-5xl font-black tracking-tight">
                {stat.prefix}
                <CountUp end={stat.value} duration={duration} />
                <span style={{ color: accentColor }}>{stat.suffix}</span>
              </span>
            </div>
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest" style={{ color: labelColor }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

StatCounter.craft = {
  displayName: 'Stat Counter',
  props: {
    stats: [
      { value: 3900, suffix: '+', label: 'Students Enrolled' },
      { value: 1200, suffix: '+', label: 'Active Courses' },
      { value: 850, suffix: '+', label: 'Qualified Instructors' },
      { value: 5500, suffix: '+', label: 'Course Completions' },
    ],
    numberColor: '#0f172a',
    labelColor: '#64748b',
    accentColor: '#0d9488',
    backgroundColor: 'transparent',
    duration: 2.5,
  },
  related: {
    settings: StatCounterSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

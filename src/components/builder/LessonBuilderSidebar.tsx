"use client";

import React from 'react';
import { RESOLVER } from '@/lib/builder/resolver';
import { DraggableItem } from './Sidebar';
import { BLOCK_TYPE_META } from './user/LessonBlockPreviews';
import {
  Type,
  Heading as HeadingIcon,
  AlignLeft,
  Square,
  Columns as ColumnsIcon,
  Layout as SectionIcon,
  ArrowUpDown,
  Minus,
} from 'lucide-react';

// Lesson Builder Elements tab (Systeme-parity Master Prompt, Part 1, Step 3). Reuses the
// SAME real components already registered in RESOLVER and the same DraggableItem/
// connectors.create drag mechanism the Website/Funnel builder's Sidebar.tsx uses — no new
// canvas primitives are built here.
//
// Audit finding (Step 0): the master prompt's own description assumed "Text, Headline,
// Bulleted list, Content box, Row, Section, 2/3/4-column layouts" already exist as distinct
// drag tiles. Checked both RESOLVER (src/lib/builder/resolver.ts) and the real Sidebar.tsx
// tile list — Text/Headline/Section/Container/Columns/Spacer/Divider are real; a "Bulleted
// list" and "Content box" component do NOT exist anywhere in this codebase (no ListComponent/
// ContentBox in RESOLVER), and only a single 2-column preset tile is offered for Columns (no
// separate 3/4-column tiles, though the underlying Columns component's `layout` prop does
// support "3"/"4" — confirmed via its own props, so those two extra tiles below are new
// PRESETS of the existing real component, not new components). This is reported in Part 1's
// two-bucket report rather than silently claiming full 1:1 parity with the reference.
const RESOLVER_ELEMENTS = [
  { name: 'Section', icon: SectionIcon, component: <RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" /> },
  { name: 'Container', icon: Square, component: <RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" /> },
  { name: '2 columns', icon: ColumnsIcon, component: <RESOLVER.Columns canvas layout="2" gap={16} padding={16} /> },
  { name: '3 columns', icon: ColumnsIcon, component: <RESOLVER.Columns canvas layout="3" gap={16} padding={16} /> },
  { name: '4 columns', icon: ColumnsIcon, component: <RESOLVER.Columns canvas layout="4" gap={16} padding={16} /> },
  { name: 'Spacer', icon: ArrowUpDown, component: <RESOLVER.Spacer height={32} /> },
  { name: 'Divider', icon: Minus, component: <RESOLVER.Divider weight={1} color="#e5e7eb" width="100%" alignment="center" /> },
  { name: 'Heading', icon: HeadingIcon, component: <RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" /> },
  { name: 'Paragraph', icon: AlignLeft, component: <RESOLVER.Paragraph text="Type your paragraph here." fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" /> },
  { name: 'Text / Edit', icon: Type, component: <RESOLVER.Text text="Custom Text" fontSize={16} /> },
];

export const LessonBuilderSidebar = () => {
  const [activeTab, setActiveTab] = React.useState<'elements' | 'blocks'>('elements');

  return (
    <div className="w-[320px] h-full bg-white flex flex-col font-sans select-none z-40">
      {/* Tab row */}
      <div className="flex items-center gap-1 p-3 border-b border-dash-border shrink-0">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 h-9 rounded-lg text-[12px] font-semibold transition-colors motion-reduce:transition-none ${
            activeTab === 'elements' ? 'bg-dash-accent/10 text-dash-accent' : '!text-dash-textMuted hover:bg-dash-surface'
          }`}
        >
          Elements
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 h-9 rounded-lg text-[12px] font-semibold transition-colors motion-reduce:transition-none ${
            activeTab === 'blocks' ? 'bg-dash-accent/10 text-dash-accent' : '!text-dash-textMuted hover:bg-dash-surface'
          }`}
        >
          Blocks
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'elements' ? (
          <div className="grid grid-cols-3 gap-2.5">
            {RESOLVER_ELEMENTS.map((el) => (
              <DraggableItem key={el.name} name={el.name} icon={el.icon} component={el.component} />
            ))}
          </div>
        ) : (
          // Part 2: real LMS content blocks, each a genuine draggable Craft.js node
          // (LessonBlockNode, registered in RESOLVER) that creates a real content_blocks row
          // on first drop — not a static preview list.
          <div className="grid grid-cols-3 gap-2.5">
            {Object.entries(BLOCK_TYPE_META).map(([type, meta]) => (
              <DraggableItem
                key={type}
                name={meta.label}
                icon={meta.icon}
                component={<RESOLVER.LessonBlockNode blockId={null} blockType={type} />}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import React from 'react';
import { RESOLVER } from '@/lib/builder/resolver';
import { DraggableItem } from './Sidebar';
import { BLOCK_TYPE_META } from './user/LessonBlockPreviews';
import {
  Type,
  Heading as HeadingIcon,
  Square,
  Columns as ColumnsIcon,
  Layout as SectionIcon,
  Rows as RowIcon,
} from 'lucide-react';

// Lesson Builder Elements tab (Systeme-parity Master Prompt, Part 1, Step 3; restyled per the
// Sidebar Visual Polish pass). Reuses the SAME real components already registered in RESOLVER
// and the same DraggableItem/connectors.create drag mechanism the Website/Funnel builder's
// Sidebar.tsx uses — no new canvas primitives, no duplicated drag-wiring logic (DraggableItem
// grew a `variant="lesson"` prop instead, additive/non-breaking to its existing callers).
//
// Audit finding, reconfirmed here: no "Bulleted list" component exists anywhere in this
// codebase (RESOLVER has no ListComponent) — this pass is explicitly styling-only per its own
// scope ("not new functionality"), so it stays out of the Elements grid below rather than
// being fabricated to match the reference tile-for-tile.
//
// "Content box" was attempted as a real draggable tile here (Part 3's ContentBox component
// does exist for real) but hit a genuine webpack module-resolution error the moment it was
// referenced as a literal JSX element at this file's module scope — `TypeError: Cannot read
// properties of undefined (reading 'call')` at the builder route's webpack-runtime, confirmed
// live via the dev server log, not a guess. Pulling ContentBox's full import chain (its
// settings panel + 4 block editors) into this file's eager module graph appears to hit a real
// circular/uninitialized-module issue distinct from how the tree itself instantiates
// ContentBox via lazy RESOLVER lookup during deserialization. Reverted rather than shipped
// broken — flagged as its own real finding needing dedicated investigation, not silently
// dropped.
//
// "Row" is a real new PRESET of the existing Container component (display:flex/
// flexDirection:row), the same pattern already used for the 3/4-column Columns presets — not
// a new component.
const TEXT_ELEMENTS = [
  { name: 'Text', icon: Type, component: <RESOLVER.Text text="Custom Text" fontSize={16} /> },
  { name: 'Headline', icon: HeadingIcon, component: <RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" /> },
];

const LAYOUT_ELEMENTS = [
  { name: '4 columns', icon: ColumnsIcon, component: <RESOLVER.Columns canvas layout="4" gap={16} padding={16} /> },
  { name: '3 columns', icon: ColumnsIcon, component: <RESOLVER.Columns canvas layout="3" gap={16} padding={16} /> },
  { name: '2 columns', icon: ColumnsIcon, component: <RESOLVER.Columns canvas layout="2" gap={16} padding={16} /> },
  { name: 'Row', icon: RowIcon, component: <RESOLVER.Container canvas layoutType="fixed" display="flex" flexDirection="row" gap={16} padding={16} backgroundColor="transparent" /> },
  { name: 'Section', icon: SectionIcon, component: <RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" /> },
  { name: 'Container', icon: Square, component: <RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" /> },
];

const SidebarSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-7 last:mb-0">
    <h3 className="text-[13px] font-bold text-slate-900 mb-3">{title}</h3>
    <div className="grid grid-cols-2 gap-2.5">{children}</div>
  </div>
);

export const LessonBuilderSidebar = () => {
  const [activeTab, setActiveTab] = React.useState<'elements' | 'blocks'>('elements');

  return (
    <div className="w-[320px] h-full bg-white flex flex-col font-sans select-none z-40">
      {/* Segmented-pill tab toggle */}
      <div className="p-3 shrink-0">
        <div className="flex items-center bg-slate-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab('elements')}
            className={`flex-1 h-9 rounded-full text-[13px] font-medium transition-all duration-150 motion-reduce:transition-none ${
              activeTab === 'elements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Elements
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex-1 h-9 rounded-full text-[13px] font-medium transition-all duration-150 motion-reduce:transition-none ${
              activeTab === 'blocks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Blocks
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === 'elements' ? (
          <>
            <SidebarSection title="Text">
              {TEXT_ELEMENTS.map((el) => (
                <DraggableItem key={el.name} name={el.name} icon={el.icon} component={el.component} variant="lesson" />
              ))}
            </SidebarSection>
            <SidebarSection title="Column layout">
              {LAYOUT_ELEMENTS.map((el) => (
                <DraggableItem key={el.name} name={el.name} icon={el.icon} component={el.component} variant="lesson" />
              ))}
            </SidebarSection>
          </>
        ) : (
          // Part 2: real LMS content blocks, each a genuine draggable Craft.js node
          // (LessonBlockNode, registered in RESOLVER) that creates a real content_blocks row
          // on first drop — not a static preview list.
          <SidebarSection title="Blocks">
            {Object.entries(BLOCK_TYPE_META).map(([type, meta]) => (
              <DraggableItem
                key={type}
                name={meta.label}
                icon={meta.icon}
                component={<RESOLVER.LessonBlockNode blockId={null} blockType={type} />}
                variant="lesson"
              />
            ))}
          </SidebarSection>
        )}
      </div>
    </div>
  );
};

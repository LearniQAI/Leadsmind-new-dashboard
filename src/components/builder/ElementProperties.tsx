"use client";

import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import {
  Settings, Trash2, Layout, Paintbrush, Sliders,
  Box, Type, Image, Video, RectangleHorizontal as ButtonIconPlaceholder,
  AlignLeft, Columns, Minus, ArrowUpDown, Code, Star,
  Navigation, FormInput, Timer, CreditCard, MessageCircle, LayoutGrid,
  ChevronDown, ChevronRight, Layers, ArrowLeft, ArrowUp, ArrowDown, Copy, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilder } from './BuilderContext';

// Map component display names to icons
const COMPONENT_ICONS: Record<string, any> = {
  'Section': Layers,
  'Container': Box,
  'Columns': Columns,
  'Heading': Type,
  'Paragraph': AlignLeft,
  'Text': Type,
  'Image': Image,
  'Video': Video,
  'Button': ButtonIconPlaceholder,
  'Form': FormInput,
  'Countdown': Timer,
  'PricingTable': CreditCard,
  'FAQ': MessageCircle,
  'Testimonial': Star,
  'LogoStrip': LayoutGrid,
  'StarRating': Star,
  'BlogFeed': LayoutGrid,
  'Hero': Layers,
  'Navbar': Navigation,
  'Footer': Layout,
  'ProgressBar': Sliders,
  'Spacer': ArrowUpDown,
  'Divider': Minus,
  'CodeBlock': Code,
  'Icon': Star,
};

// Collapsible accordion section
const AccordionSection = ({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-dash-border last:border-none">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-dash-surface transition-colors motion-reduce:transition-none duration-100 group"
      >
        <span className="text-[11px] font-semibold !text-dash-textMuted tracking-wider uppercase">{title}</span>
        <span className="!text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Renders the settings UI for whichever node is currently selected on the canvas.
// Mounted by BuilderLeftPanel in place of Sidebar whenever Craft.js selection is
// non-empty; the "< Back" action clears selection so BuilderLeftPanel swaps back
// to Sidebar on the next render.
export const ElementProperties = ({ nodeId }: { nodeId: string }) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'advanced'>('layout');

  const { selected, actions, query, parentName, parentId, siblingIndex, siblingCount } = useEditor((state, query) => {
    const node = state.nodes[nodeId];
    if (!node) return { selected: undefined, parentName: undefined, parentId: undefined, siblingIndex: -1, siblingCount: 0 };

    const parentId = node.data.parent;
    const parentNode = parentId ? state.nodes[parentId] : undefined;
    const siblings = parentNode?.data.nodes || [];

    return {
      selected: {
        id: nodeId,
        name: node.data.custom?.displayName || node.data.displayName,
        settings: node.related && node.related.settings,
        isDeletable: (node.data as any).rules?.canDelete
          ? (node.data as any).rules.canDelete()
          : true,
        // Real bug found during the settings-panel design pass: ContentBox (like
        // LessonBlockNode) creates and owns its own content_blocks row (create-on-first-render,
        // same pattern). Deleting the canvas node alone would orphan that row forever — there
        // is no other delete path for it. blockId is carried through so the handler below can
        // clean it up before removing the node.
        blockId: (node.data.props as any)?.blockId ?? null,
      },
      parentName: parentId && parentId !== 'ROOT'
        ? (parentNode?.data.custom?.displayName || parentNode?.data.displayName)
        : undefined,
      parentId,
      siblingIndex: siblings.indexOf(nodeId),
      siblingCount: siblings.length,
    };
  });

  const { setBlueprintNodeId } = useBuilder();

  if (!selected) return null;

  // Real reorder — moves this node to the previous/next index among its actual siblings via
  // Craft.js's own actions.move (the same primitive drag-and-drop reordering uses), not a
  // decorative up/down pair.
  const handleMove = (direction: -1 | 1) => {
    if (!parentId) return;
    const targetIndex = siblingIndex + direction;
    if (targetIndex < 0 || targetIndex >= siblingCount) return;
    actions.move(nodeId, parentId, targetIndex);
  };

  // Real duplicate — clones this node's actual subtree (toNodeTree/addNodeTree, the same
  // mechanism the AI Landing Copy insert and the lesson block/module duplicate routes already
  // use) and inserts the copy directly after the original, not a placeholder.
  const handleDuplicate = () => {
    if (!parentId) return;
    const tree = query.node(nodeId).toNodeTree();
    actions.addNodeTree(tree, parentId, siblingIndex + 1);
  };

  // Cleans up an owned content_blocks row (ContentBox) before removing the canvas node, so
  // deleting the element from this shared header can never orphan its backing row. Fire-and
  // -forget is intentional — the canvas node removal must not be blocked by network latency,
  // and a failed cleanup here is a stale row, not data loss (same tolerance the rest of this
  // codebase's best-effort cleanup calls already accept).
  const handleDelete = () => {
    if (selected?.blockId) {
      fetch(`/api/lms/content-blocks/${selected.blockId}`, { method: 'DELETE' }).catch(() => {});
    }
    actions.delete(selected!.id);
  };

  const ComponentIcon = COMPONENT_ICONS[selected.name] || Settings;

  return (
    <div className="w-full h-full bg-white flex flex-col z-40 select-none">
      {/* Breadcrumb + back */}
      <div className="px-4 h-11 border-b border-dash-border flex items-center gap-2 shrink-0 bg-white text-[11px] font-semibold !text-dash-textMuted">
        <button
          onClick={() => actions.selectNode()}
          className="h-7 px-2 -ml-1.5 flex items-center gap-1 rounded-lg hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <span className="text-dash-border">/</span>
        {parentName && (
          <>
            <span className="truncate">{parentName}</span>
            <span className="text-dash-border">/</span>
          </>
        )}
        <span className="!text-dash-text truncate">{selected.name}</span>
      </div>

      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-dash-border flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-dash-accent/10 to-dash-accent/5 flex items-center justify-center border border-dash-accent/15 shrink-0">
            <ComponentIcon className="w-4 h-4 text-dash-accent" />
          </div>
          <div>
            <p className="text-[13px] font-semibold !text-dash-text leading-none">{selected.name}</p>
            <p className="text-[10px] !text-dash-textMuted mt-0.5 font-medium">Element Properties</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => handleMove(-1)}
            disabled={siblingIndex <= 0}
            className="h-8 w-8 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-all motion-reduce:transition-none duration-150 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Move up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleMove(1)}
            disabled={siblingIndex < 0 || siblingIndex >= siblingCount - 1}
            className="h-8 w-8 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-all motion-reduce:transition-none duration-150 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Move down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!parentId}
            className="h-8 w-8 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-all motion-reduce:transition-none duration-150 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setBlueprintNodeId(nodeId)}
            className="h-8 w-8 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-all motion-reduce:transition-none duration-150 active:scale-95 motion-reduce:active:scale-100"
            title="Save as reusable blueprint"
          >
            <Save className="w-4 h-4" />
          </button>
          {selected.isDeletable && (
            <button
              onClick={handleDelete}
              className="h-8 w-8 flex items-center justify-center !text-dash-textMuted hover:text-red hover:bg-red/10 rounded-lg transition-all motion-reduce:transition-none duration-150 active:scale-95 motion-reduce:active:scale-100"
              title="Delete element"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pill Tabs — 40px height, 12px radius */}
      <div className="px-4 py-3 border-b border-dash-border bg-white shrink-0">
        <div className="flex bg-dash-surface p-1 rounded-[12px] h-10 items-center gap-0.5">
          {([
            { id: 'layout', label: 'Layout', icon: Layout },
            { id: 'style', label: 'Style', icon: Paintbrush },
            { id: 'advanced', label: 'Advanced', icon: Sliders },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-semibold rounded-[8px] transition-all motion-reduce:transition-none duration-150 active:scale-[0.97]',
                activeTab === id
                  ? 'bg-white !text-dash-text shadow-sm border border-dash-border'
                  : '!text-dash-textMuted hover:!text-dash-text'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content with Accordions */}
      <div className="flex-1 overflow-y-auto pb-20 common-scrollbar">
        {selected.settings ? (
          <div>
            {/* The settings component renders all its controls; we wrap them in accordion groups */}
            <AccordionSection title="Properties" defaultOpen={true}>
              {React.createElement(selected.settings as any, { activeTab })}
            </AccordionSection>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-dash-surface flex items-center justify-center mx-auto mb-4 border border-dash-border">
              <Settings className="w-5 h-5 !text-dash-textMuted" />
            </div>
            <p className="text-[12px] font-semibold !text-dash-textMuted mb-1">No settings available</p>
            <p className="text-[11px] !text-dash-textMuted">This element does not have configurable properties.</p>
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import {
  Settings, Trash2, Layout, Sliders,
  Box, Type, Image, Video, RectangleHorizontal as ButtonIconPlaceholder,
  AlignLeft, Columns, Minus, ArrowUpDown, Code, Star,
  Navigation, FormInput, Timer, CreditCard, MessageCircle, LayoutGrid,
  Layers, ArrowLeft, ArrowUp, ArrowDown, Copy, Save
} from 'lucide-react';
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

// Renders the settings UI for whichever node is currently selected on the canvas.
// Mounted by BuilderLeftPanel in place of Sidebar whenever Craft.js selection is
// non-empty; the "< Back" action clears selection so BuilderLeftPanel swaps back
// to Sidebar on the next render.
export const ElementProperties = ({ nodeId }: { nodeId: string }) => {
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
      <div className="px-4 h-11 border-b border-dash-border flex items-center gap-1.5 shrink-0 bg-white text-[11px] font-semibold !text-dash-textMuted">
        <button
          onClick={() => actions.selectNode()}
          className="h-7 px-2 -ml-1.5 flex items-center gap-1 rounded-lg hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none active:scale-95 motion-reduce:active:scale-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <span className="text-dash-border/70">/</span>
        {parentName && (
          <>
            <span className="truncate">{parentName}</span>
            <span className="text-dash-border/70">/</span>
          </>
        )}
        <span className="!text-dash-text truncate">{selected.name}</span>
      </div>

      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-dash-border flex items-center justify-between gap-3 shrink-0 bg-gradient-to-b from-white to-dash-surface/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-dash-accent/15 to-dash-accent/5 flex items-center justify-center ring-1 ring-inset ring-dash-accent/20 shadow-[0_1px_3px_rgba(0,0,0,0.06)] shrink-0">
            <ComponentIcon className="w-4 h-4 text-dash-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold !text-dash-text leading-none truncate">{selected.name}</p>
            <p className="text-[9px] uppercase tracking-[0.1em] !text-dash-textMuted mt-1 font-bold">Element Properties</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 bg-dash-surface/70 rounded-lg p-0.5 ring-1 ring-inset ring-dash-border">
          <button
            onClick={() => handleMove(-1)}
            disabled={siblingIndex <= 0}
            className="h-7 w-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-white rounded-md transition-all motion-reduce:transition-none duration-150 active:scale-90 motion-reduce:active:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Move up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleMove(1)}
            disabled={siblingIndex < 0 || siblingIndex >= siblingCount - 1}
            className="h-7 w-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-white rounded-md transition-all motion-reduce:transition-none duration-150 active:scale-90 motion-reduce:active:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Move down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!parentId}
            className="h-7 w-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-white rounded-md transition-all motion-reduce:transition-none duration-150 active:scale-90 motion-reduce:active:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setBlueprintNodeId(nodeId)}
            className="h-7 w-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-white rounded-md transition-all motion-reduce:transition-none duration-150 active:scale-90 motion-reduce:active:scale-100"
            title="Save as reusable blueprint"
          >
            <Save className="w-4 h-4" />
          </button>
          {selected.isDeletable && (
            <>
              <span className="w-px h-4 bg-dash-border mx-0.5" />
              <button
                onClick={handleDelete}
                className="h-7 w-7 flex items-center justify-center !text-dash-textMuted hover:text-red hover:bg-red/10 rounded-md transition-all motion-reduce:transition-none duration-150 active:scale-90 motion-reduce:active:scale-100"
                title="Delete element"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* AUDIT-THEN-FIX (Bug 2): the Layout/Style/Advanced tabs and the outer "Properties"
          accordion below were both pure decorative chrome — confirmed via a codebase-wide
          search that no settings component anywhere reads the `activeTab` prop this host was
          passing them (every panel always rendered its full content regardless of which tab
          was "selected"), and the accordion was hardcoded `defaultOpen={true}` with no other
          panel ever relying on it being collapsed. Removed so every element's panel — Text,
          Heading, Paragraph, Image, and everything else hosted here — goes straight from this
          header into its own direct sections, matching the Text panel (the reference this
          audit was measured against) exactly, with zero loss of functionality. */}
      <div className="flex-1 overflow-y-auto pb-20 common-scrollbar px-5 pt-5">
        {selected.settings ? (
          React.createElement(selected.settings as any)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
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

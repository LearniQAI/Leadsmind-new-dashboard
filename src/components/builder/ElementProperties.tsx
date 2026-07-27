"use client";

import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import {
  Settings, Trash2, Layout, Paintbrush, Sliders,
  Box, Type, Image, Video, RectangleHorizontal as ButtonIconPlaceholder,
  AlignLeft, Columns, Minus, ArrowUpDown, Code, Star,
  Navigation, FormInput, Timer, CreditCard, MessageCircle, LayoutGrid,
  ChevronDown, ChevronRight, Layers, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const { selected, actions, parentName } = useEditor((state) => {
    const node = state.nodes[nodeId];
    if (!node) return { selected: undefined, parentName: undefined };

    const parentId = node.data.parent;
    const parentNode = parentId ? state.nodes[parentId] : undefined;

    return {
      selected: {
        id: nodeId,
        name: node.data.custom?.displayName || node.data.displayName,
        settings: node.related && node.related.settings,
        isDeletable: (node.data as any).rules?.canDelete
          ? (node.data as any).rules.canDelete()
          : true,
      },
      parentName: parentId && parentId !== 'ROOT'
        ? (parentNode?.data.custom?.displayName || parentNode?.data.displayName)
        : undefined,
    };
  });

  if (!selected) return null;

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
        {selected.isDeletable && (
          <button
            onClick={() => actions.delete(selected.id)}
            className="h-8 w-8 flex items-center justify-center !text-dash-textMuted hover:text-red hover:bg-red/10 rounded-lg transition-all motion-reduce:transition-none duration-150 active:scale-95 motion-reduce:active:scale-100"
            title="Delete element"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
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

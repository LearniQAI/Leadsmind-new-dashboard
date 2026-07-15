"use client";

import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import {
  Settings, Trash2, Layout, Paintbrush, Sliders,
  Box, Type, Image, Video, RectangleHorizontal as ButtonIconPlaceholder,
  AlignLeft, Columns, Minus, ArrowUpDown, Code, Star,
  Navigation, FormInput, Timer, CreditCard, MessageCircle, LayoutGrid,
  ChevronDown, ChevronRight, Layers
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
    <div className="border-b border-slate-100 last:border-none">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50/80 transition-colors duration-100 group"
      >
        <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">{title}</span>
        <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
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

export const PropertiesPanel = () => {
  const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'advanced'>('layout');

  const { selected, actions } = useEditor((state) => {
    const selectedId = Array.from(state.events.selected)[0];
    let selected;

    if (selectedId) {
      selected = {
        id: selectedId,
        name: state.nodes[selectedId].data.displayName,
        settings: state.nodes[selectedId].related && state.nodes[selectedId].related.settings,
        isDeletable: (state.nodes[selectedId].data as any).rules?.canDelete
          ? (state.nodes[selectedId].data as any).rules.canDelete()
          : true,
      };
    }

    return { selected };
  });

  if (!selected || selected.id === 'ROOT') {
    return (
      <div className="w-full h-full bg-white flex flex-col select-none">
        {/* Empty state panel header */}
        <div className="px-5 h-14 border-b border-slate-100 flex items-center shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Properties</span>
        </div>

        {/* Premium empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-6">
            {/* Decorative rings */}
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-slate-300" />
              </div>
            </div>
            {/* Accent dots */}
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-white" />
            <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-emerald-200 border-2 border-white" />
          </div>

          <h4 className="text-[13px] font-semibold text-slate-700 mb-1.5">No element selected</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-[180px]">
            Click any element on the canvas to edit its properties
          </p>

          <div className="mt-8 w-full space-y-2">
            {['Typography', 'Spacing', 'Colors', 'Effects'].map((label) => (
              <div key={label} className="h-8 bg-slate-50 rounded-lg border border-slate-100/80 flex items-center px-3 gap-2 opacity-40">
                <div className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="text-[10px] font-medium text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const ComponentIcon = COMPONENT_ICONS[selected.name] || Settings;

  return (
    <div className="w-full h-full bg-white flex flex-col z-40 select-none">
      {/* Premium Panel Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/15 shrink-0">
            <ComponentIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800 leading-none">{selected.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Element Properties</p>
          </div>
        </div>
        {selected.isDeletable && (
          <button
            onClick={() => actions.delete(selected.id)}
            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150 active:scale-95"
            title="Delete element"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pill Tabs — 40px height, 12px radius */}
      <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-[12px] h-10 items-center gap-0.5">
          {([
            { id: 'layout', label: 'Layout', icon: Layout },
            { id: 'style', label: 'Style', icon: Paintbrush },
            { id: 'advanced', label: 'Advanced', icon: Sliders },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-semibold rounded-[8px] transition-all duration-150 active:scale-[0.97]',
                activeTab === id
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
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
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Settings className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1">No settings available</p>
            <p className="text-[11px] text-slate-400">This element does not have configurable properties.</p>
          </div>
        )}
      </div>
    </div>
  );
};

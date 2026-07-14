"use client";

import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import { Settings, Trash2, Layout, Paintbrush, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    isDeletable: (state.nodes[selectedId].data as any).rules?.canDelete ? (state.nodes[selectedId].data as any).rules.canDelete() : true,
   };
  }

  return {
   selected
  };
 });

 if (!selected || selected.id === 'ROOT') {
  return (
   <div className="w-full h-full bg-white flex flex-col items-center justify-center !text-dash-textMuted p-12 text-center">
    <div className="h-16 w-16 rounded-full bg-dash-surface flex items-center justify-center mb-6 border border-dash-border">
     <Settings className="w-8 h-8 opacity-40" />
    </div>
    <h4 className="text-[13px] font-bold mb-2 !text-dash-text">No element selected</h4>
    <p className="text-[11px] font-medium opacity-70">Select an element on the canvas to configure its properties.</p>
   </div>
  );
 }

 return (
  <div className="w-full h-full bg-white flex flex-col z-40">
   {/* Header */}
   <div className="px-4 py-3 border-b border-dash-border flex items-center justify-between bg-white shrink-0">
    <h2 className="text-[13px] font-bold flex items-center gap-2 !text-dash-text">
      <div className="h-7 w-7 rounded-[8px] bg-primary/10 flex items-center justify-center border border-primary/20">
       <Settings className="w-3.5 h-3.5 text-primary" />
      </div>
      {selected.name}
    </h2>
    {selected.isDeletable && (
      <button
        onClick={() => actions.delete(selected.id)}
        className="h-8 w-8 flex items-center justify-center hover:bg-red-50 text-red-500 rounded-lg transition-all"
        title="Delete element"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )}
   </div>

   {/* Segmented Tabs */}
   <div className="px-4 py-3 border-b border-dash-border bg-slate-50/50 shrink-0">
     <div className="flex bg-slate-100/80 p-1 rounded-[10px] border border-slate-200/60">
       <button
         onClick={() => setActiveTab('layout')}
         className={cn(
           "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-[6px] transition-all",
           activeTab === 'layout' ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
         )}
       >
         <Layout className="w-3.5 h-3.5" />
         Layout
       </button>
       <button
         onClick={() => setActiveTab('style')}
         className={cn(
           "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-[6px] transition-all",
           activeTab === 'style' ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
         )}
       >
         <Paintbrush className="w-3.5 h-3.5" />
         Style
       </button>
       <button
         onClick={() => setActiveTab('advanced')}
         className={cn(
           "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-[6px] transition-all",
           activeTab === 'advanced' ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
         )}
       >
         <Sliders className="w-3.5 h-3.5" />
         Advanced
       </button>
     </div>
   </div>

   {/* Settings Content */}
   <div className="flex-1 overflow-y-auto pb-20 common-scrollbar">
    {selected.settings ? (
      // Passing activeTab allows the individual settings component to conditionally render controls.
      // If the component hasn't been migrated yet, it might just ignore the prop and render everything.
      React.createElement(selected.settings as any, { activeTab })
    ) : (
      <div className="text-center py-20 px-4">
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
         <Settings className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-[12px] font-semibold text-slate-600 mb-1">No settings available</p>
        <p className="text-[11px] text-slate-400">This element does not have configurable properties.</p>
      </div>
    )}
   </div>
  </div>
 );
};

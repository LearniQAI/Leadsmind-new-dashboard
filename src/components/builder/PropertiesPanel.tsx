"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Settings, Trash2 } from 'lucide-react';

export const PropertiesPanel = () => {
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

 if (!selected) {
  return (
   <div className="w-80 h-full bg-white border-l border-dash-border flex flex-col items-center justify-center !text-dash-textMuted p-12 text-center">
    <div className="h-16 w-16 rounded-full bg-dash-surface flex items-center justify-center mb-6">
     <Settings className="w-8 h-8 opacity-40" />
    </div>
    <h4 className="text-[11px] font-bold mb-2">No selection</h4>
    <p className="text-[9px] font-bold opacity-70">Select a node to edit its properties.</p>
   </div>
  );
 }

 return (
  <div className="w-80 h-full bg-white border-l border-dash-border flex flex-col shadow-2xl z-40">
   <div className="p-5 border-b border-dash-border flex items-center justify-between bg-dash-surface">
    <h2 className="text-[11px] font-bold flex items-center gap-3">
      <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
       <Settings className="w-3 h-3 text-primary" />
      </div>
      {selected.name}
    </h2>
    {selected.id !== 'ROOT' && (
      <button
        onClick={() => actions.delete(selected.id)}
        className="h-8 w-8 flex items-center justify-center hover:bg-red/10 text-red rounded-lg transition-all motion-reduce:transition-none group"
        title="Delete node"
      >
        <Trash2 className="w-4 h-4 group-hover:scale-110" />
      </button>
    )}
   </div>

   <div className="flex-1 overflow-y-auto p-5 space-y-8 common-scrollbar">
    {selected.settings && React.createElement(selected.settings as any)}

    {!selected.settings && (
      <div className="text-center py-20">
        <div className="w-12 h-12 rounded-2xl bg-dash-surface flex items-center justify-center mx-auto mb-4 opacity-40">
         <Settings className="w-6 h-6" />
        </div>
        <p className="text-[9px] font-bold !text-dash-textMuted">No settings available</p>
      </div>
    )}
   </div>
  </div>
 );
};

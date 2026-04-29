"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Settings, Trash2 } from 'lucide-react';

export const PropertiesPanel = () => {
  const { selected, actions } = useEditor((state) => {
    const [selectedId] = state.events.selected;
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
      <div className="w-80 h-full bg-card border-l flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <Settings className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">Select an element to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-card border-l flex flex-col shadow-xl">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {selected.name}
        </h2>
        {selected.id !== 'ROOT' && (
            <button 
                onClick={() => actions.delete(selected.id)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {selected.settings && React.createElement(selected.settings)}
        
        {!selected.settings && (
            <div className="text-center py-10 opacity-50">
                <p className="text-xs italic">No settings available for this component</p>
            </div>
        )}
      </div>
    </div>
  );
};

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
      <div className="w-80 h-full bg-[#0b0b14] border-l border-white/5 flex flex-col items-center justify-center text-white/20 p-12 text-center">
        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Settings className="w-8 h-8 opacity-20" />
        </div>
        <h4 className="text-[11px] font-black uppercase tracking-widest mb-2">Neural Link Idle</h4>
        <p className="text-[9px] font-bold italic opacity-40">Select a node to modulate its properties.</p>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-[#0b0b14] border-l border-white/5 flex flex-col shadow-2xl z-40">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <h2 className="text-[11px] font-black uppercase italic tracking-tighter flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Settings className="w-3 h-3 text-primary" />
            </div>
            {selected.name}
        </h2>
        {selected.id !== 'ROOT' && (
            <button 
                onClick={() => actions.delete(selected.id)}
                className="h-8 w-8 flex items-center justify-center hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all group"
                title="Purge Node"
            >
                <Trash2 className="w-4 h-4 group-hover:scale-110" />
            </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-8 common-scrollbar">
        {selected.settings && React.createElement(selected.settings as any)}
        
        {!selected.settings && (
            <div className="text-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 opacity-20">
                  <Settings className="w-6 h-6" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">No Modulators Available</p>
            </div>
        )}
      </div>
    </div>
  );
};

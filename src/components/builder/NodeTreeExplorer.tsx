"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import { ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronRight, Folder, File, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const NodeTreeExplorer = () => {
  const { actions, query, nodes, selectedId } = useEditor((state) => {
    const selectedId = Array.from(state.events.selected)[0];
    return {
      nodes: state.nodes,
      selectedId
    };
  });

  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({ ROOT: true });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectNode = (id: string) => {
    actions.selectNode(id);
  };

  const handleMoveUp = (id: string, parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const parentNode = nodes[parentId];
    if (!parentNode || !parentNode.data.nodes) return;
    const siblingIds = parentNode.data.nodes;
    const idx = siblingIds.indexOf(id);
    if (idx > 0) {
      actions.move(id, parentId, idx - 1);
    }
  };

  const handleMoveDown = (id: string, parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const parentNode = nodes[parentId];
    if (!parentNode || !parentNode.data.nodes) return;
    const siblingIds = parentNode.data.nodes;
    const idx = siblingIds.indexOf(id);
    if (idx !== -1 && idx < siblingIds.length - 1) {
      actions.move(id, parentId, idx + 2); // In craftjs, moving down moves after the target index + 1
    }
  };

  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id !== 'ROOT') {
      actions.delete(id);
    }
  };

  const renderNodeItem = (id: string, depth: number = 0) => {
    const node = nodes[id];
    if (!node) return null;

    const displayName = node.data.displayName || node.data.name;
    const childIds = node.data.nodes || [];
    const hasChildren = childIds.length > 0;
    const isExpanded = !!expandedNodes[id];
    const isSelected = selectedId === id;

    return (
      <div key={id} className="select-none font-sans">
        {/* Node Label Row */}
        <div
          onClick={() => handleSelectNode(id)}
          className={cn(
            "group flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer",
            isSelected 
              ? "bg-primary/10 border-primary/20 text-primary font-bold" 
              : "bg-white/[0.01] border-transparent hover:bg-white/[0.04] text-white/70 hover:text-white"
          )}
          style={{ marginLeft: `${depth * 14}px` }}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(id, e)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/30 hover:text-white"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <div className="w-5" />
            )}

            {hasChildren ? (
              <Folder size={13} className={cn("shrink-0", isSelected ? "text-primary" : "text-[#fbbf24]")} />
            ) : (
              <File size={13} className="shrink-0 text-white/30" />
            )}

            <span className="text-[10px] uppercase tracking-wider truncate">
              {displayName}
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {id !== 'ROOT' && node.data.parent && (
              <>
                <button
                  onClick={(e) => handleMoveUp(id, node.data.parent!, e)}
                  className="p-1 hover:bg-white/10 text-white/40 hover:text-white rounded transition-colors"
                  title="Move Up"
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  onClick={(e) => handleMoveDown(id, node.data.parent!, e)}
                  className="p-1 hover:bg-white/10 text-white/40 hover:text-white rounded transition-colors"
                  title="Move Down"
                >
                  <ArrowDown size={10} />
                </button>
                <button
                  onClick={(e) => handleDeleteNode(id, e)}
                  className="p-1 hover:bg-rose-500/20 text-rose-400 hover:text-rose-500 rounded transition-colors"
                  title="Purge Node"
                >
                  <Trash2 size={10} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Nested Child Nodes */}
        {hasChildren && isExpanded && (
          <div className="space-y-1 mt-1">
            {childIds.map(childId => renderNodeItem(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col pt-2 bg-transparent text-white select-none">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Layout Node Tree</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 common-scrollbar">
        {renderNodeItem('ROOT')}
      </div>
    </div>
  );
};

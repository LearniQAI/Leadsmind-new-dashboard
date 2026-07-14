"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '@craftjs/core';
import { Settings, Trash2, X, Copy, RefreshCw, Save, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilder } from './BuilderContext';

export const FloatingPropertiesPanel = () => {
  const { 
    propertiesOpen, 
    setPropertiesOpen,
    setBlueprintNodeId
  } = useBuilder();

  const { selected, actions: editorActions, query } = useEditor((state) => {
    const selectedId = Array.from(state.events.selected)[0];
    let selectedNode;

    if (selectedId) {
      selectedNode = {
        id: selectedId,
        name: state.nodes[selectedId].data.custom?.displayName || state.nodes[selectedId].data.displayName,
        settings: state.nodes[selectedId].related && state.nodes[selectedId].related.settings,
        parentId: state.nodes[selectedId].data.parent,
        isDeletable: (state.nodes[selectedId].data as any).rules?.canDelete ? (state.nodes[selectedId].data as any).rules.canDelete() : true,
      };
    }

    return {
      selected: selectedNode
    };
  });

  const [position, setPosition] = useState({ x: 340, y: 100 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position when properties panel is opened via right-click
  useEffect(() => {
    const handleSetPos = (e: any) => {
      const { x, y } = e.detail;
      // Clamp to screen bounds
      const width = 320;
      const height = 500;
      const maxX = window.innerWidth - width - 20;
      const maxY = window.innerHeight - height - 20;
      setPosition({
        x: Math.max(20, Math.min(x, maxX)),
        y: Math.max(20, Math.min(y, maxY))
      });
    };

    window.addEventListener('open-floating-properties', handleSetPos);
    return () => {
      window.removeEventListener('open-floating-properties', handleSetPos);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header/grip
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.preventDefault();
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - startX;
      const newY = moveEvent.clientY - startY;
      
      const width = 320;
      const height = panelRef.current?.offsetHeight || 500;
      const maxX = window.innerWidth - width - 10;
      const maxY = window.innerHeight - height - 10;

      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!propertiesOpen || !selected) return null;

  const handleDuplicate = () => {
    try {
      const nodeTree = query.node(selected.id).toNodeTree();
      if (selected.parentId) {
        const parentNode = query.node(selected.parentId).get();
        const siblingIds = parentNode.data.nodes || [];
        const idx = siblingIds.indexOf(selected.id);
        editorActions.addNodeTree(nodeTree, selected.parentId, idx + 1);
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleResetLayout = () => {
    editorActions.setProp(selected.id, (props: any) => {
      props.marginTop = '';
      props.marginRight = '';
      props.marginBottom = '';
      props.marginLeft = '';
      props.paddingTop = '';
      props.paddingRight = '';
      props.paddingBottom = '';
      props.paddingLeft = '';
    });
  };

  const handleSaveBlueprint = () => {
    setBlueprintNodeId(selected.id);
  };

  const handleDelete = () => {
    if (selected.id !== 'ROOT') {
      editorActions.delete(selected.id);
    }
  };

  return (
    <div
      ref={panelRef}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      className="fixed w-[320px] max-h-[550px] bg-white/95 border border-dash-border shadow-2xl rounded-2xl flex flex-col font-sans backdrop-blur-xl z-[100] overflow-hidden"
    >
      {/* Header and Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="drag-handle flex items-center justify-between p-4 border-b border-dash-border bg-dash-surface cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 !text-dash-textMuted shrink-0" />
          <span className="text-[10px] font-bold !text-dash-text">
            {selected.name}
          </span>
        </div>
        <button
          onClick={() => setPropertiesOpen(false)}
          className="!text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60 rounded-lg p-1 transition-colors motion-reduce:transition-none"
          title="Close properties"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick Actions Toolbar */}
      {selected.id !== 'ROOT' && (
        <div className="flex items-center justify-around px-3 py-2 border-b border-dash-border bg-white">
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-lg transition-all motion-reduce:transition-none"
            title="Duplicate element"
          >
            <Copy size={11} className="text-primary" />
            Dup
          </button>
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-lg transition-all motion-reduce:transition-none"
            title="Reset margins & padding"
          >
            <RefreshCw size={11} className="text-primary" />
            Reset
          </button>
          <button
            onClick={handleSaveBlueprint}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-lg transition-all motion-reduce:transition-none"
            title="Save blueprint"
          >
            <Save size={11} className="text-amber-600" />
            Save
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold text-red hover:text-red/80 hover:bg-red/10 rounded-lg transition-all motion-reduce:transition-none"
            title="Delete element"
          >
            <Trash2 size={11} />
            Del
          </button>
        </div>
      )}

      {/* Properties Settings Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 common-scrollbar">
        {selected.settings && React.createElement(selected.settings as any)}
        {!selected.settings && (
          <div className="text-center py-12">
            <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center mx-auto mb-3 opacity-40">
              <Settings className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-bold !text-dash-textMuted">No settings available</p>
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useBuilder } from './BuilderContext';
import { Save, Copy, Trash2, RefreshCw, Settings } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RenderNode = ({ render }: { render: React.ReactNode }) => {
  const { id } = useNode();
  const { setBlueprintNodeId, setPropertiesOpen } = useBuilder();
  const { actions: editorActions, query } = useEditor();

  const { isActive, isHovered, dom, name, parentId } = useNode((node) => ({
    isActive: node.events.selected,
    isHovered: node.events.hovered,
    dom: node.dom,
    name: node.data.custom.displayName || node.data.displayName,
    parentId: node.data.parent
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [contextMenu]);

  const handleDuplicate = () => {
    try {
      const nodeTree = query.node(id).toNodeTree();
      if (parentId) {
        const parentNode = query.node(parentId).get();
        const siblingIds = parentNode.data.nodes || [];
        const idx = siblingIds.indexOf(id);
        editorActions.addNodeTree(nodeTree, parentId, idx + 1);
        setContextMenu(null);
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleDelete = () => {
    if (id !== 'ROOT') {
      editorActions.delete(id);
      setContextMenu(null);
    }
  };

  const handleResetLayout = () => {
    editorActions.setProp(id, (props: any) => {
      props.marginTop = '';
      props.marginRight = '';
      props.marginBottom = '';
      props.marginLeft = '';
      props.paddingTop = '';
      props.paddingRight = '';
      props.paddingBottom = '';
      props.paddingLeft = '';
    });
    setContextMenu(null);
  };

  const handleSaveBlueprint = () => {
    setBlueprintNodeId(id);
    setContextMenu(null);
  };

  useEffect(() => {
    if (dom && isEnabled) {
      if (isActive || isHovered) dom.classList.add('component-selected');
      else dom.classList.remove('component-selected');
    }
  }, [dom, isActive, isHovered, isEnabled]);

  const { connectors: { connect, drag } } = useNode();

  if (!isEnabled) {
    return <>{render}</>;
  }

  return (
    <div 
      ref={(ref) => { 
        if (ref) {
          if (id === 'ROOT') connect(ref);
          else connect(drag(ref));
        }
      }}
      className="relative"
      onContextMenu={(e) => {
        if (!isEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        editorActions.selectNode(id);
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {isActive && id !== 'ROOT' && (
        <div className="absolute -top-6 left-0 bg-primary text-white text-[9px] px-3 py-1.5 rounded-t-lg flex items-center gap-2 z-30 shadow-md">
          <span className="font-bold pointer-events-none">{name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setBlueprintNodeId(id);
            }}
            className="text-white hover:text-green cursor-pointer flex items-center justify-center p-0.5"
            title="Save component blueprint"
          >
            <Save size={10} />
          </button>
        </div>
      )}
      {isHovered && !isActive && (
        <div className="absolute inset-0 border border-primary/40 border-dashed rounded-[inherit] pointer-events-none z-10" />
      )}
      {isActive && (
        <div className="absolute inset-0 border-2 border-primary rounded-[inherit] pointer-events-none z-20 shadow-xl" />
      )}
      {render}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white/95 border border-dash-border shadow-2xl rounded-2xl p-1.5 w-44 !text-dash-text z-[9999] flex flex-col font-sans backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setPropertiesOpen(true);
              window.dispatchEvent(new CustomEvent('open-floating-properties', {
                detail: { x: contextMenu.x, y: contextMenu.y }
              }));
              setContextMenu(null);
            }}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <Settings size={12} className="text-purple-600 shrink-0" />
            Properties
          </button>
          <div className="h-[1px] bg-dash-border my-1" />
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <Copy size={12} className="text-primary shrink-0" />
            Duplicate
          </button>
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <RefreshCw size={12} className="text-primary shrink-0" />
            Reset layout
          </button>
          <button
            onClick={handleSaveBlueprint}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-primary/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <Save size={12} className="text-amber-600 shrink-0" />
            Save blueprint
          </button>
          {id !== 'ROOT' && (
            <div className="h-[1px] bg-dash-border my-1" />
          )}
          {id !== 'ROOT' && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red hover:text-red/80 hover:bg-red/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
            >
              <Trash2 size={12} className="shrink-0" />
              Delete element
            </button>
          )}
        </div>
      )}
    </div>
  );
};

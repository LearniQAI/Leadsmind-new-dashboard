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
          <span className="font-black uppercase tracking-wider pointer-events-none">{name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setBlueprintNodeId(id);
            }}
            className="text-white hover:text-emerald-400 cursor-pointer flex items-center justify-center p-0.5"
            title="Save Component Blueprint"
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
          className="fixed bg-[#0c0c16]/95 border border-white/5 shadow-2xl rounded-2xl p-1.5 w-44 text-white z-[9999] flex flex-col font-sans backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
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
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/75 hover:text-white hover:bg-primary/20 rounded-xl transition-all text-left w-full"
          >
            <Settings size={12} className="text-[#a855f7] shrink-0" />
            Properties
          </button>
          <div className="h-[1px] bg-white/5 my-1" />
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/75 hover:text-white hover:bg-primary/20 rounded-xl transition-all text-left w-full"
          >
            <Copy size={12} className="text-primary shrink-0" />
            Duplicate
          </button>
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/75 hover:text-white hover:bg-primary/20 rounded-xl transition-all text-left w-full"
          >
            <RefreshCw size={12} className="text-[#3b82f6] shrink-0" />
            Reset Layout
          </button>
          <button
            onClick={handleSaveBlueprint}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/75 hover:text-white hover:bg-primary/20 rounded-xl transition-all text-left w-full"
          >
            <Save size={12} className="text-[#fbbf24] shrink-0" />
            Save Blueprint
          </button>
          {id !== 'ROOT' && (
            <div className="h-[1px] bg-white/5 my-1" />
          )}
          {id !== 'ROOT' && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all text-left w-full"
            >
              <Trash2 size={12} className="shrink-0" />
              Delete Element
            </button>
          )}
        </div>
      )}
    </div>
  );
};

"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useBuilder } from './BuilderContext';
import { Save, Copy, Trash2, RefreshCw, Settings, Move, Plus, MoreHorizontal, ChevronDown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RenderNode = ({ render }: { render: React.ReactNode }) => {
  const { id } = useNode();
  const { setBlueprintNodeId, setLeftPanelOpen, setLeftPanelTab } = useBuilder();
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
      className="relative group"
      onContextMenu={(e) => {
        if (!isEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        editorActions.selectNode(id);
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {/* Hover label, top-left: element name + chevron, shown only while hovering an
          unselected element (once selected, the left panel's breadcrumb takes over
          naming the element, so we don't need to keep the pill up).
          Inset (top-1.5 left-1.5) rather than floated above the box on a negative
          offset: elements at the very top of the canvas have no clearance above them
          before Viewport's overflow-hidden frame clips into the badge, which then
          rendered its clipped remainder smashed onto the element's own top edge —
          garbled text right under the badge. Sitting inside the box's own bounds
          can never be clipped by an ancestor, regardless of scroll/padding. */}
      {isHovered && !isActive && id !== 'ROOT' && (
        <div className="absolute top-1.5 left-1.5 bg-dash-hover text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 z-40 pointer-events-none shadow-md">
          {name}
          <ChevronDown size={11} strokeWidth={3} />
        </div>
      )}

      {/* Icon cluster, top-right, shown on hover or selection — same inset fix as the hover label above. */}
      {(isHovered || isActive) && id !== 'ROOT' && (
        <div className="absolute top-1.5 right-1.5 bg-white/95 border border-dash-border text-dash-textMuted h-[36px] px-1 rounded-xl flex items-center justify-center gap-0.5 z-40 shadow-2xl backdrop-blur-xl transition-opacity motion-reduce:transition-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              editorActions.selectNode(); // deselect so the panel shows the elements picker, not this node's properties
              setLeftPanelTab('elements');
              setLeftPanelOpen(true);
            }}
            className="w-7 h-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-accent hover:bg-dash-accent/10 rounded-lg transition-colors motion-reduce:transition-none"
            title="Add element"
          >
            <Plus size={14} />
          </button>
          <div className="flex items-center justify-center h-full px-1 cursor-grab active:cursor-grabbing !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none" title="Move element">
            <Move size={14} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
            className="w-7 h-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-accent hover:bg-dash-accent/10 rounded-lg transition-colors motion-reduce:transition-none"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              editorActions.selectNode(id);
              setLeftPanelOpen(true);
            }}
            className="w-7 h-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-accent hover:bg-dash-accent/10 rounded-lg transition-colors motion-reduce:transition-none"
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="w-7 h-7 flex items-center justify-center !text-dash-textMuted hover:text-red hover:bg-red/10 rounded-lg transition-colors motion-reduce:transition-none"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              editorActions.selectNode(id);
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setContextMenu({ x: rect.left, y: rect.bottom + 6 });
            }}
            className="w-7 h-7 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-colors motion-reduce:transition-none"
            title="More"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      )}

      {/* Hover Outline */}
      {isHovered && !isActive && (
        <div className="absolute inset-0 border-[1.5px] border-dash-hover/60 rounded-[inherit] pointer-events-none z-10 transition-colors duration-200 motion-reduce:transition-none" />
      )}
      {/* Selection Outline */}
      {isActive && (
        <div className="absolute inset-0 border-2 border-dash-accent rounded-[inherit] pointer-events-none z-20" />
      )}
      {render}

      {/* Section Inserter */}
      {isHovered && parentId === 'ROOT' && (
         <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none duration-200">
           <button
             onClick={(e) => {
               e.stopPropagation();
               editorActions.selectNode();
               setLeftPanelTab('elements');
               setLeftPanelOpen(true);
             }}
             className="bg-dash-accent text-white h-7 px-3 rounded-full text-[11px] font-bold shadow-[0_4px_12px_rgba(19,89,255,0.3)] flex items-center gap-1.5 hover:bg-dash-accent/90 hover:scale-105 transition-all motion-reduce:transition-none motion-reduce:hover:scale-100"
           >
             <Plus className="w-3.5 h-3.5" /> Add Section
           </button>
         </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white/95 border border-dash-border shadow-2xl rounded-2xl p-1.5 w-44 !text-dash-text z-[9999] flex flex-col font-sans backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setLeftPanelOpen(true);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-accent/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <Settings size={12} className="text-dash-accent shrink-0" />
            Properties
          </button>
          <div className="h-[1px] bg-dash-border my-1" />
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-accent/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <Copy size={12} className="text-dash-accent shrink-0" />
            Duplicate
          </button>
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-accent/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
          >
            <RefreshCw size={12} className="text-dash-accent shrink-0" />
            Reset layout
          </button>
          <button
            onClick={handleSaveBlueprint}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-accent/10 rounded-xl transition-all motion-reduce:transition-none text-left w-full"
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

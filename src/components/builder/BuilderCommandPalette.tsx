"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Plus, LayoutTemplate, Box, Type, Image, FileText, ArrowRight } from 'lucide-react';
import { useEditor } from '@craftjs/core';
import { RESOLVER } from '@/lib/builder/resolver';
import { useBuilder } from './BuilderContext';
import { toast } from 'sonner';

interface CommandItem {
  id: string;
  name: string;
  icon: any;
  category: string;
  component: React.ReactElement;
}

const COMMANDS: CommandItem[] = [
  { id: 'section', name: 'Section', category: 'Layout', icon: LayoutTemplate, component: <RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" /> },
  { id: 'container', name: 'Container', category: 'Layout', icon: Box, component: <RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" /> },
  { id: 'columns', name: 'Columns (2)', category: 'Layout', icon: Box, component: <RESOLVER.Columns canvas layout="2" gap={16} padding={16} /> },
  { id: 'heading', name: 'Heading', category: 'Typography', icon: Type, component: <RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" /> },
  { id: 'paragraph', name: 'Paragraph', category: 'Typography', icon: Type, component: <RESOLVER.Paragraph text="Type your paragraph here." fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" /> },
  { id: 'image', name: 'Image', category: 'Media', icon: Image, component: <RESOLVER.Image imageUrl="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop" altText="Placeholder Image" /> },
  { id: 'button', name: 'Button', category: 'Interactive', icon: ArrowRight, component: <RESOLVER.Button text="Click Here" variant="primary" size="default" /> },
  { id: 'form', name: 'Form', category: 'Interactive', icon: FileText, component: <RESOLVER.Form formId="" buttonText="Submit" /> },
];

export const BuilderCommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { actions, query } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredCommands = search.trim() === '' 
    ? COMMANDS 
    : COMMANDS.filter((cmd) => cmd.name.toLowerCase().includes(search.toLowerCase()) || cmd.category.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (cmd: CommandItem) => {
    try {
      const selectedNodes = query.getEvent('selected').first();
      let parentId = 'ROOT';
      let insertIndex = undefined;

      if (selectedNodes) {
        const selectedNode = query.node(selectedNodes).get();
        if (selectedNode.data.isCanvas) {
            parentId = selectedNodes;
        } else {
            parentId = selectedNode.data.parent || 'ROOT';
            const parentNode = query.node(parentId).get();
            const siblings = parentNode.data.nodes || [];
            insertIndex = siblings.indexOf(selectedNodes) + 1;
        }
      }

      // We use addNodeTree because React Elements are not automatically converted to nodes in this context without parsing
      // Actually, craft.js actions.add expects a Node. But actions.add(query.parseReactElement(component).toNodeTree()) works.
      const nodeTree = query.parseReactElement(cmd.component).toNodeTree();
      actions.addNodeTree(nodeTree, parentId, insertIndex);
      
      toast.success(`Inserted ${cmd.name}`);
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Could not insert element. Please select a container first.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999]" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden z-[10000] border border-slate-200 focus:outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center px-4 h-14 border-b border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search elements... (e.g. Section, Image)"
              className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-800 placeholder:text-slate-400 font-medium"
            />
            <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md ml-2">ESC</div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2" ref={listRef}>
            {filteredCommands.length > 0 ? (
              filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    idx === selectedIndex ? 'bg-primary/5 text-primary' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${idx === selectedIndex ? 'bg-primary/10' : 'bg-slate-100 border border-slate-200'}`}>
                    <cmd.icon className={`w-4 h-4 ${idx === selectedIndex ? 'text-primary' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold">{cmd.name}</span>
                    <span className="text-[11px] text-slate-500">{cmd.category}</span>
                  </div>
                  <div className="text-slate-400">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500 text-[13px] font-medium">
                No elements found for "{search}"
              </div>
            )}
          </div>
          
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              Select an element or container first, then insert.
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

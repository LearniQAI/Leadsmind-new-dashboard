"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, ChevronDown, ChevronUp, Palette, List } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

export const FAQSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { 
    items, 
    itemBg, 
    borderColor, 
    questionColor, 
    answerColor, 
    iconColor, 
    borderRadius, 
    gap,
    padding 
  } = props;

  const addItem = () => {
    setProp((props: any) => {
      props.items.push({
        question: 'New Question',
        answer: 'New Answer content goes here...',
      });
    });
  };

  const removeItem = (index: number) => {
    setProp((props: any) => {
      props.items.splice(index, 1);
    });
  };

  const updateItem = (index: number, key: 'question' | 'answer', value: string) => {
    setProp((props: any) => {
      props.items[index][key] = value;
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setProp((props: any) => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < props.items.length) {
        const temp = props.items[index];
        props.items[index] = props.items[newIndex];
        props.items[newIndex] = temp;
      }
    });
  };

  return (
    <Tabs defaultValue="items" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface border border-dash-border p-1 mb-4">
        <TabsTrigger value="items" className="text-[10px] font-bold gap-2 !text-dash-textMuted data-[state=active]:!bg-dash-accent data-[state=active]:!text-white data-[state=active]:shadow-sm">
          <List size={12} /> Content
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[10px] font-bold gap-2 !text-dash-textMuted data-[state=active]:!bg-dash-accent data-[state=active]:!text-white data-[state=active]:shadow-sm">
          <Palette size={12} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="items" className="space-y-6">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold !text-dash-textMuted">FAQ items</Label>
          <Button variant="ghost" size="icon" onClick={addItem} className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-3 bg-dash-surface rounded-xl border border-dash-border space-y-3 group relative">
              <div className="flex items-center gap-1 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10">
                <button
                  onClick={() => moveItem(i, 'up')}
                  disabled={i === 0}
                  className="p-1 bg-white hover:bg-dash-surface border border-dash-border !text-dash-textMuted rounded-full disabled:opacity-30 shadow-sm transition-colors motion-reduce:transition-none"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveItem(i, 'down')}
                  disabled={i === items.length - 1}
                  className="p-1 bg-white hover:bg-dash-surface border border-dash-border !text-dash-textMuted rounded-full disabled:opacity-30 shadow-sm transition-colors motion-reduce:transition-none"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeItem(i)}
                  className="p-1 bg-red hover:bg-red/90 text-white rounded-full shadow-sm transition-colors motion-reduce:transition-none"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-bold !text-dash-textMuted">Question</Label>
                <Input
                  value={item.question}
                  onChange={(e) => updateItem(i, 'question', e.target.value)}
                  className="h-8 bg-white border-dash-border text-xs font-bold !text-dash-text"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-bold !text-dash-textMuted">Answer</Label>
                <textarea
                  value={item.answer}
                  onChange={(e) => updateItem(i, 'answer', e.target.value)}
                  className="w-full bg-white border border-dash-border rounded p-2 text-xs h-24 !text-dash-text outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">Appearance</h4>
          <ColorPicker label="Item background" value={itemBg} onChange={(val) => setProp((props: any) => props.itemBg = val)} />
          <ColorPicker label="Border color" value={borderColor} onChange={(val) => setProp((props: any) => props.borderColor = val)} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <Label className="text-[10px] font-bold !text-dash-textMuted">Shadow/radius ({borderRadius}px)</Label>
               <input type="range" min="0" max="64" step="4" value={borderRadius} onChange={(e) => setProp((p: any) => p.borderRadius = Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-2">
               <Label className="text-[10px] font-bold !text-dash-textMuted">Gap ({gap}px)</Label>
               <input type="range" min="0" max="48" step="4" value={gap} onChange={(e) => setProp((p: any) => p.gap = Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">Typography & icons</h4>
          <ColorPicker label="Question text" value={questionColor} onChange={(val) => setProp((props: any) => props.questionColor = val)} />
          <ColorPicker label="Answer text" value={answerColor} onChange={(val) => setProp((props: any) => props.answerColor = val)} />
          <ColorPicker label="Chevron icon" value={iconColor} onChange={(val) => setProp((props: any) => props.iconColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

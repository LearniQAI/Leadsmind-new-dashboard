"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, ChevronDown, ChevronUp, Palette, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SliderWithInput } from '../inspector/primitives';

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
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="items" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <List size={14} /> Content
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="items" className="space-y-0">
        <div className="mb-7 last:mb-0 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-bold text-slate-900">FAQ items</Label>
            <Button variant="ghost" size="icon" onClick={addItem} className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item: any, i: number) => (
              <div key={i} className="p-3 bg-slate-100 rounded-xl border border-transparent space-y-3 group relative">
                <div className="flex items-center gap-1 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10">
                  <button
                    onClick={() => moveItem(i, 'up')}
                    disabled={i === 0}
                    className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-full disabled:opacity-30 shadow-sm transition-colors motion-reduce:transition-none"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => moveItem(i, 'down')}
                    disabled={i === items.length - 1}
                    className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-full disabled:opacity-30 shadow-sm transition-colors motion-reduce:transition-none"
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

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-slate-700">Question</Label>
                  <Input
                    value={item.question}
                    onChange={(e) => updateItem(i, 'question', e.target.value)}
                    className="h-8 bg-white border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus-visible:border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-slate-700">Answer</Label>
                  <textarea
                    value={item.answer}
                    onChange={(e) => updateItem(i, 'answer', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs h-24 text-slate-700 outline-none focus:border-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
        <div className="mb-7 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Appearance</h4>
          <ColorPicker label="Item background" value={itemBg} onChange={(val) => setProp((props: any) => props.itemBg = val)} />
          <ColorPicker label="Border color" value={borderColor} onChange={(val) => setProp((props: any) => props.borderColor = val)} />
          <div className="grid grid-cols-2 gap-4">
            <SliderWithInput label="Shadow/radius" value={borderRadius} onChange={(val) => setProp((p: any) => p.borderRadius = val)} min={0} max={64} step={4} numeric />
            <SliderWithInput label="Gap" value={gap} onChange={(val) => setProp((p: any) => p.gap = val)} min={0} max={48} step={4} numeric />
          </div>
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Typography & icons</h4>
          <ColorPicker label="Question text" value={questionColor} onChange={(val) => setProp((props: any) => props.questionColor = val)} />
          <ColorPicker label="Answer text" value={answerColor} onChange={(val) => setProp((props: any) => props.answerColor = val)} />
          <ColorPicker label="Chevron icon" value={iconColor} onChange={(val) => setProp((props: any) => props.iconColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

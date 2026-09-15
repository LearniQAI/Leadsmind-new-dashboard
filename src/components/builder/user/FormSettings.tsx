"use client";

import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, Settings2, Palette, List, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from './Form';
import { LinkSelector } from '../LinkSelector';
import { SliderWithInput } from '../inspector/primitives';


export const FormSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    fields,
    buttonText,
    backgroundColor,
    borderRadius,
    padding,
    gap,
    labelColor,
    inputBg,
    inputBorderColor,
    inputTextColor,
    buttonBg,
    buttonTextColor,
    onSuccess,
    successMessage,
    redirectLink
  } = props;

  const addField = () => {
    setProp((props: any) => {
      props.fields.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        label: 'New Field',
        placeholder: 'Placeholder...',
        required: false,
        mapping: 'custom'
      });
    });
  };

  const removeField = (index: number) => {
    setProp((props: any) => {
      props.fields.splice(index, 1);
    });
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    setProp((props: any) => {
      props.fields[index][key] = value;
    });
  };

  return (
    <Tabs defaultValue="fields" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="fields" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <List size={14} /> Fields
        </TabsTrigger>
        <TabsTrigger value="logic" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Zap size={14} /> Logic
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="logic" className="space-y-0">
        <div className="mb-7 last:mb-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">On success</Label>
            <select
              value={onSuccess}
              onChange={(e) => setProp((p: any) => p.onSuccess = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] px-3 outline-none font-medium text-slate-700 focus:border-slate-300"
            >
              <option value="message">Show success message</option>
              <option value="redirect">Redirect to page/URL</option>
            </select>
          </div>

          {onSuccess === 'message' ? (
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Message</Label>
              <textarea
                value={successMessage}
                onChange={(e) => setProp((p: any) => p.successMessage = e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs h-24 outline-none text-slate-700 focus:border-slate-300"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
               <Label className="text-[12px] font-medium text-slate-700">Redirect destination</Label>
               <LinkSelector
                value={redirectLink}
                onChange={(val) => setProp((p: any) => p.redirectLink = val)}
               />
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="fields" className="space-y-0">
        <div className="mb-7 space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Button text</Label>
          <Input
            value={buttonText}
            onChange={(e) => setProp((props: any) => props.buttonText = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>

        <div className="mb-7 last:mb-0 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-bold text-slate-900">Form fields</Label>
            <Button variant="ghost" size="icon" onClick={addField} className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field: FormField, index: number) => (
              <div key={field.id} className="p-3 bg-slate-100 rounded-xl border border-transparent space-y-3 group relative">
                <button
                  onClick={() => removeField(index)}
                  className="absolute -top-2 -right-2 p-1.5 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10 shadow-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-slate-700">Field label</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(index, 'label', e.target.value)}
                    className="h-8 bg-white border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus-visible:border-slate-300"
                    placeholder="e.g. Email Address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-slate-700">Type</Label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, 'type', e.target.value as any)}
                      className="w-full bg-white border-slate-200 border rounded-lg h-8 px-2 py-1 text-[11px] outline-none text-slate-700 focus:border-slate-300"
                    >
                      <option value="text">Short text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="textarea">Long text</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Radio buttons</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-primary">CRM mapping</Label>
                    <select
                      value={field.mapping || 'custom'}
                      onChange={(e) => updateField(index, 'mapping', e.target.value as any)}
                      className="w-full bg-primary/10 border-primary/20 border rounded-lg h-8 px-2 py-1 text-[11px] text-primary font-medium outline-none"
                    >
                      <option value="custom">Custom (JSON)</option>
                      <option value="email">Lead email</option>
                      <option value="first_name">First name</option>
                      <option value="last_name">Last name</option>
                      <option value="phone">Phone number</option>
                    </select>
                  </div>
                </div>

                {(field.type === 'select' || field.type === 'radio') && (
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-slate-700">Options (one per line)</Label>
                    <textarea
                      value={field.options?.join('\n') || ''}
                      onChange={(e) => updateField(index, 'options', e.target.value.split('\n'))}
                      className="w-full bg-white border-slate-200 border rounded-lg p-2 text-[11px] h-24 outline-none text-slate-700 focus:border-slate-300"
                      placeholder="Option 1&#10;Option 2"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, 'required', e.target.checked)}
                    id={`req-${field.id}`}
                    className="w-3 h-3 rounded bg-white border-slate-200 text-primary accent-primary"
                  />
                  <Label htmlFor={`req-${field.id}`} className="text-[12px] font-medium text-slate-700 cursor-pointer">Mark as required</Label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
        <div className="mb-7 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Container styling</h4>
          <ColorPicker label="Form background" value={backgroundColor} onChange={(val) => setProp((props: any) => props.backgroundColor = val)} />
          <div className="grid grid-cols-2 gap-4">
            <SliderWithInput label="Radius" value={borderRadius} onChange={(val) => setProp((p: any) => p.borderRadius = val)} min={0} max={64} step={4} numeric />
            <SliderWithInput label="Outer gap" value={gap} onChange={(val) => setProp((p: any) => p.gap = val)} min={0} max={32} step={4} numeric />
          </div>
        </div>

        <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Input design</h4>
          <ColorPicker label="Label color" value={labelColor} onChange={(val) => setProp((props: any) => props.labelColor = val)} />
          <ColorPicker label="Input background" value={inputBg} onChange={(val) => setProp((props: any) => props.inputBg = val)} />
          <ColorPicker label="Input border" value={inputBorderColor} onChange={(val) => setProp((props: any) => props.inputBorderColor = val)} />
          <ColorPicker label="Input text" value={inputTextColor} onChange={(val) => setProp((props: any) => props.inputTextColor = val)} />
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Button brand</h4>
          <ColorPicker label="Button color" value={buttonBg} onChange={(val) => setProp((props: any) => props.buttonBg = val)} />
          <ColorPicker label="Button text" value={buttonTextColor} onChange={(val) => setProp((props: any) => props.buttonTextColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

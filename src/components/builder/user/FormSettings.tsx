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
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 mb-4">
                <TabsTrigger value="fields" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <List size={12} /> Fields
                </TabsTrigger>
                <TabsTrigger value="logic" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Zap size={12} /> Logic
                </TabsTrigger>
                <TabsTrigger value="style" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Palette size={12} /> Style
                </TabsTrigger>
            </TabsList>

            <TabsContent value="logic" className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">On Success</Label>
                        <select 
                            value={onSuccess} 
                            onChange={(e) => setProp((p: any) => p.onSuccess = e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded h-9 text-[11px] px-2 outline-none font-bold"
                        >
                            <option value="message">Show Success Message</option>
                            <option value="redirect">Redirect to Page/URL</option>
                        </select>
                    </div>

                    {onSuccess === 'message' ? (
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Message</Label>
                            <textarea 
                                value={successMessage} 
                                onChange={(e) => setProp((p: any) => p.successMessage = e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded p-2 text-xs h-24 outline-none"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Redirect Destination</Label>
                             <LinkSelector 
                                value={redirectLink}
                                onChange={(val) => setProp((p: any) => p.redirectLink = val)}
                             />
                        </div>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="fields" className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Button Text</Label>
                    <Input 
                        value={buttonText} 
                        onChange={(e) => setProp((props: any) => props.buttonText = e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-xs"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Form Fields</Label>
                        <Button variant="ghost" size="icon" onClick={addField} className="h-6 w-6">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {fields.map((field: FormField, index: number) => (
                            <div key={field.id} className="p-3 bg-muted/30 rounded-xl border border-white/5 space-y-3 group relative">
                                <button 
                                    onClick={() => removeField(index)}
                                    className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                                
                                <div className="space-y-1">
                                    <Label className="text-[9px] text-muted-foreground uppercase font-bold">Field Label</Label>
                                    <Input 
                                        value={field.label}
                                        onChange={(e) => updateField(index, 'label', e.target.value)}
                                        className="h-8 bg-black/20 border-white/10 text-xs font-bold"
                                        placeholder="e.g. Email Address"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] text-muted-foreground uppercase font-bold">Type</Label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateField(index, 'type', e.target.value as any)}
                                            className="w-full bg-black/20 border-white/10 border rounded h-8 px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="text">Short Text</option>
                                            <option value="email">Email</option>
                                            <option value="tel">Phone</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="textarea">Long Text</option>
                                            <option value="checkbox">Checkbox</option>
                                            <option value="select">Dropdown</option>
                                            <option value="radio">Radio Buttons</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] text-muted-foreground uppercase font-bold text-primary">CRM Mapping</Label>
                                        <select
                                            value={field.mapping || 'custom'}
                                            onChange={(e) => updateField(index, 'mapping', e.target.value as any)}
                                            className="w-full bg-primary/10 border-primary/20 border rounded h-8 px-2 py-1 text-[10px] text-primary font-bold outline-none"
                                        >
                                            <option value="custom">Custom (JSON)</option>
                                            <option value="email">Lead Email</option>
                                            <option value="first_name">First Name</option>
                                            <option value="last_name">Last Name</option>
                                            <option value="phone">Phone Number</option>
                                        </select>
                                    </div>
                                </div>

                                {(field.type === 'select' || field.type === 'radio') && (
                                    <div className="space-y-1">
                                        <Label className="text-[9px] text-muted-foreground uppercase font-bold">Options (one per line)</Label>
                                        <textarea 
                                            value={field.options?.join('\n') || ''}
                                            onChange={(e) => updateField(index, 'options', e.target.value.split('\n'))}
                                            className="w-full bg-black/20 border-white/10 border rounded p-2 text-[10px] h-24 outline-none"
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
                                        className="w-3 h-3 rounded bg-black/20 border-white/10 text-primary accent-primary"
                                    />
                                    <Label htmlFor={`req-${field.id}`} className="text-[10px] text-muted-foreground cursor-pointer">Mark as Required</Label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Container Styling</h4>
                    <ColorPicker label="Form Background" value={backgroundColor} onChange={(val) => setProp((props: any) => props.backgroundColor = val)} />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Radius ({borderRadius}px)</Label>
                             <input type="range" min="0" max="64" step="4" value={borderRadius} onChange={(e) => setProp((p: any) => p.borderRadius = Number(e.target.value))} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Outer Gap ({gap}px)</Label>
                             <input type="range" min="0" max="32" step="4" value={gap} onChange={(e) => setProp((p: any) => p.gap = Number(e.target.value))} className="w-full accent-primary" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Input Design</h4>
                    <ColorPicker label="Label Color" value={labelColor} onChange={(val) => setProp((props: any) => props.labelColor = val)} />
                    <ColorPicker label="Input Background" value={inputBg} onChange={(val) => setProp((props: any) => props.inputBg = val)} />
                    <ColorPicker label="Input Border" value={inputBorderColor} onChange={(val) => setProp((props: any) => props.inputBorderColor = val)} />
                    <ColorPicker label="Input Text" value={inputTextColor} onChange={(val) => setProp((props: any) => props.inputTextColor = val)} />
                </div>

                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Button Brand</h4>
                    <ColorPicker label="Button Color" value={buttonBg} onChange={(val) => setProp((props: any) => props.buttonBg = val)} />
                    <ColorPicker label="Button Text" value={buttonTextColor} onChange={(val) => setProp((props: any) => props.buttonTextColor = val)} />
                </div>
            </TabsContent>
        </Tabs>
    );
};

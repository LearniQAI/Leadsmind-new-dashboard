"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Link2, FileText, Anchor, Zap } from 'lucide-react';

import { useBuilder } from './BuilderContext';

export interface LinkObject {
    type: 'url' | 'page' | 'section' | 'action';
    value: string;
}

interface LinkSelectorProps {
    value: string | LinkObject;
    onChange: (val: LinkObject) => void;
    pages?: { id: string; name: string; slug: string }[];
}

export const LinkSelector = ({ value, onChange, pages: propPages }: LinkSelectorProps) => {
    const { pages: contextPages, funnelId, websiteId } = useBuilder();
    const pages = propPages || contextPages || [];
    
    // Standardize the value to LinkObject
    const linkObj: LinkObject = typeof value === 'string' 
        ? { type: value.startsWith('#') ? 'section' : 'url', value } 
        : value || { type: 'url', value: '' };

    const handleTypeChange = (type: LinkObject['type']) => {
        onChange({ type, value: '' });
    };

    const handleValueChange = (val: string | null) => {
        onChange({ ...linkObj, value: val || '' });
    };

    const types = [
        { id: 'url', label: 'External URL', icon: Link2 },
        { id: 'page', label: 'Internal Page', icon: FileText },
        { id: 'section', label: 'Scroll to Section', icon: Anchor },
        { id: 'action', label: 'Action', icon: Zap },
    ];

    const isFunnel = !!funnelId;

    const actions = [
        ...(isFunnel ? [
            { id: 'next_step', label: 'Next Step in Funnel' },
            { id: 'prev_step', label: 'Previous Step' },
        ] : []),
        { id: 'submit_form', label: 'Submit Form' },
        { id: 'open_popup', label: 'Open Popup' },
        { id: 'close_popup', label: 'Close Popup' },
    ];
    return (
        <div className="space-y-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Destination Type</Label>
                <div className="grid grid-cols-4 gap-1">
                    {types.map((t) => {
                        const Icon = t.icon;
                        const active = linkObj.type === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleTypeChange(t.id as any)}
                                title={t.label}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${active ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-black/20 border-white/5 text-muted-foreground hover:text-white'}`}
                            >
                                <Icon size={14} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    {types.find(t => t.id === linkObj.type)?.label}
                </Label>
                
                {linkObj.type === 'url' && (
                    <Input 
                        value={linkObj.value}
                        onChange={(e) => handleValueChange(e.target.value)}
                        placeholder="https://example.com"
                        className="h-8 bg-black/20 border-white/5 text-[11px]"
                    />
                )}

                {linkObj.type === 'page' && (
                    <Select value={linkObj.value} onValueChange={handleValueChange}>
                        <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                            <SelectValue placeholder="Select a page..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {pages.length > 0 ? pages.map(p => (
                                <SelectItem key={p.id} value={p.slug} className="text-[11px]">
                                    {p.name} ({p.slug})
                                </SelectItem>
                            )) : (
                                <SelectItem value="none" disabled className="text-[11px]">No pages found</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                )}

                {linkObj.type === 'section' && (
                    <div className="flex gap-1 items-center">
                        <span className="text-muted-foreground text-xs pl-2">#</span>
                        <Input 
                            value={linkObj.value.replace('#', '')}
                            onChange={(e) => handleValueChange('#' + e.target.value.replace('#', ''))}
                            placeholder="section-id"
                            className="h-8 bg-black/20 border-white/5 text-[11px]"
                        />
                    </div>
                )}

                {linkObj.type === 'action' && (
                    <Select value={linkObj.value} onValueChange={handleValueChange}>
                        <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                            <SelectValue placeholder="Select an action..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {actions.map(a => (
                                <SelectItem key={a.id} value={a.id} className="text-[11px]">
                                    {a.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            
            <p className="text-[9px] text-muted-foreground italic px-1">
                {linkObj.type === 'url' && "Directs the user to an external website."}
                {linkObj.type === 'page' && "Seamlessly links to another page in this site."}
                {linkObj.type === 'section' && "Smooth-scrolls to a specific ID on this page."}
                {linkObj.type === 'action' && "Triggers a dynamic flow like form submission."}
            </p>
        </div>
    );
};

"use client";

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IconPickerProps {
    value: string;
    onChange: (name: string) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
    const [search, setSearch] = useState('');
    
    // Get all icon names from Lucide
    const allIconNames = useMemo(() => {
        return Object.keys(LucideIcons).filter(key => 
            typeof (LucideIcons as any)[key] === 'function' || 
            (typeof (LucideIcons as any)[key] === 'object' && (LucideIcons as any)[key].render)
        );
    }, []);

    // Filter icons based on search
    const filteredIcons = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return allIconNames
            .filter(name => name.toLowerCase().includes(lowerSearch))
            .slice(0, 100); // Limit to 100 icons for performance
    }, [allIconNames, search]);

    // Current selected icon component
    const CurrentIcon = (LucideIcons as any)[value] || LucideIcons.HelpCircle;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all w-full group">
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white">
                        <CurrentIcon size={18} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground group-hover:text-white transition-colors">{value}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-black/90 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="p-3 border-b border-white/10 bg-white/5">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search icons..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9 text-xs bg-black/40 border-white/10"
                        />
                    </div>
                </div>
                <ScrollArea className="h-[300px] p-2">
                    <div className="grid grid-cols-5 gap-1">
                        {filteredIcons.map((iconName) => {
                            const IconComponent = (LucideIcons as any)[iconName];
                            return (
                                <button
                                    key={iconName}
                                    onClick={() => onChange(iconName)}
                                    className={`p-2 rounded-md hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center ${value === iconName ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}
                                    title={iconName}
                                >
                                    <IconComponent size={20} />
                                </button>
                            );
                        })}
                    </div>
                    {filteredIcons.length === 0 && (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            No icons found for "{search}"
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t border-white/10 bg-white/5 text-[9px] text-center text-muted-foreground uppercase tracking-widest">
                    {allIconNames.length} Professional Icons
                </div>
            </PopoverContent>
        </Popover>
    );
};

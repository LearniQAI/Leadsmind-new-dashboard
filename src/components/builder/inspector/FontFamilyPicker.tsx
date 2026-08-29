"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Search, ChevronDown } from 'lucide-react';
import { GOOGLE_FONTS, searchGoogleFonts } from '@/lib/builder/googleFontsCatalog';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

// Real, searchable Google Fonts family picker (Part 2, Step 1) — not a fixed short list.
// Loads the selected family live via loadGoogleFontFamily() so the dropdown's own option
// rows preview each font in its real typeface, same as the canvas will once applied.
export const FontFamilyPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (family: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Preview-load a handful of visible results as the user scrolls/searches, not the whole
  // catalog up front — keeps this from injecting 50 <link> tags on open.
  const results = searchGoogleFonts(query).slice(0, 30);
  useEffect(() => {
    if (!open) return;
    results.slice(0, 12).forEach((f) => loadGoogleFontFamily(f.family));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const handleSelect = (family: string) => {
    loadGoogleFontFamily(family);
    onChange(family);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-2" ref={rootRef}>
      <Label className="text-[10px] font-bold !text-dash-textMuted block">Font family</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full h-9 flex items-center justify-between text-xs bg-white border border-dash-border rounded-lg !text-dash-text px-3 focus:border-dash-accent outline-none"
        >
          <span style={{ fontFamily: `'${value}', sans-serif` }}>{value || 'Select a font'}</span>
          <ChevronDown className="w-3.5 h-3.5 !text-dash-textMuted shrink-0" />
        </button>

        {open && (
          <div className="absolute left-0 right-0 mt-1 z-[1200] bg-white border border-dash-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-dash-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 !text-dash-textMuted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Google Fonts..."
                  className="w-full h-8 pl-8 pr-2 text-xs bg-dash-surface border border-dash-border rounded-lg outline-none focus:border-dash-accent !text-dash-text"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {results.length === 0 ? (
                <div className="px-3 py-4 text-[11px] !text-dash-textMuted text-center">No fonts match "{query}"</div>
              ) : (
                results.map((f) => (
                  <button
                    key={f.family}
                    type="button"
                    onClick={() => handleSelect(f.family)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-dash-surface transition-colors motion-reduce:transition-none ${
                      f.family === value ? 'bg-dash-accent/10' : ''
                    }`}
                    style={{ fontFamily: `'${f.family}', sans-serif` }}
                  >
                    {f.family}
                    <span className="ml-2 text-[9px] !text-dash-textMuted font-sans capitalize">{f.category}</span>
                  </button>
                ))
              )}
              {results.length === 30 && (
                <div className="px-3 py-2 text-[10px] !text-dash-textMuted text-center border-t border-dash-border">
                  Showing top 30 of {GOOGLE_FONTS.length} — refine your search
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

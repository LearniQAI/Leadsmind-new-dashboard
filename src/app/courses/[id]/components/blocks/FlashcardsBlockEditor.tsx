"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";

interface FlashcardsBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

type Flashcard = { front: string; back: string };

// No dedicated flashcards table exists (or is needed) — cards live directly in
// content_blocks.content.flashcards, same shape the legacy lesson.metadata.flashcards
// already used, just relocated per the new per-block content model.
export default function FlashcardsBlockEditor({ block, onChange }: FlashcardsBlockEditorProps) {
  const [cards, setCards] = useState<Flashcard[]>(block.content?.flashcards || []);

  const persist = (next: Flashcard[]) => {
    setCards(next);
    onChange({ content: { ...block.content, flashcards: next } });
  };

  const handleAdd = () => persist([...cards, { front: "", back: "" }]);
  const handleRemove = (idx: number) => persist(cards.filter((_, i) => i !== idx));
  const handleFieldChange = (idx: number, side: "front" | "back", val: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [side]: val };
    setCards(next);
  };
  const handleFieldBlur = () => onChange({ content: { ...block.content, flashcards: cards } });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold !text-dash-textMuted">Flashcard Deck</span>
        <button
          type="button"
          onClick={handleAdd}
          className="text-[10px] font-bold text-primary hover:opacity-80 flex items-center gap-1"
        >
          <Plus size={12} /> Add Card
        </button>
      </div>
      {cards.length === 0 ? (
        <div className="py-6 text-center text-[11px] !text-dash-textMuted border border-dashed border-dash-border rounded-xl">
          No flashcards yet. Add cards to begin.
        </div>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {cards.map((card, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white border border-dash-border p-2.5 rounded-lg">
              <input
                type="text"
                value={card.front}
                onChange={(e) => handleFieldChange(idx, "front", e.target.value)}
                onBlur={handleFieldBlur}
                placeholder="Front Question"
                className="flex-1 bg-dash-surface border border-dash-border rounded px-2 py-1 text-xs !text-dash-text outline-none"
              />
              <input
                type="text"
                value={card.back}
                onChange={(e) => handleFieldChange(idx, "back", e.target.value)}
                onBlur={handleFieldBlur}
                placeholder="Back Explanation"
                className="flex-1 bg-dash-surface border border-dash-border rounded px-2 py-1 text-xs !text-dash-text outline-none"
              />
              <button type="button" onClick={() => handleRemove(idx)} className="text-red hover:text-red/80 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

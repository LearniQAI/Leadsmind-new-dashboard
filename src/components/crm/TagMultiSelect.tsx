'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createTag } from '@/app/actions/tags';
import { TagIconGlyph } from '@/lib/tags/tagIcons';

export interface TagOption {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface TagMultiSelectProps {
  availableTags: TagOption[];
  value: string[];
  onChange: (names: string[]) => void;
}

// Selects from existing workspace tags (created in the Smart Tags Tag Manager) by
// name, or creates a brand-new tag inline via the same createTag() action the Tag
// Manager uses — so a tag picked here is immediately a real row with real color/
// icon, not a placeholder that only exists as a string in contacts.tags.
export function TagMultiSelect({ availableTags, value, onChange }: TagMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [knownTags, setKnownTags] = useState<TagOption[]>(availableTags);

  useEffect(() => {
    setKnownTags(availableTags);
  }, [availableTags]);

  const selectedLower = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);
  const lowerQuery = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      knownTags.filter(
        (t) => !selectedLower.has(t.name.toLowerCase()) && (!lowerQuery || t.name.toLowerCase().includes(lowerQuery)),
      ),
    [knownTags, selectedLower, lowerQuery],
  );

  const exactMatchExists = knownTags.some((t) => t.name.toLowerCase() === lowerQuery);
  const canCreate = lowerQuery.length > 0 && !exactMatchExists && !selectedLower.has(lowerQuery);

  const addTagByName = (name: string) => {
    onChange([...value, name]);
    setQuery('');
  };

  const removeTag = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;
    setIsCreating(true);
    const res = await createTag({ name });
    if (res.success) {
      const newTag = res.data as TagOption;
      setKnownTags((prev) => [...prev, newTag]);
      addTagByName(newTag.name);
      toast.success(`Tag "${newTag.name}" created`);
    } else {
      toast.error(res.error || 'Failed to create tag');
    }
    setIsCreating(false);
  };

  const chipFor = (name: string) => knownTags.find((t) => t.name.toLowerCase() === name.toLowerCase());

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => {
            const tag = chipFor(name);
            const color = tag?.color ?? '#9ca3af';
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[12px] font-bold border"
                style={{ backgroundColor: `${color}1a`, borderColor: `${color}40`, color }}
              >
                <TagIconGlyph icon={tag?.icon} size={12} />
                {name}
                <button type="button" onClick={() => removeTag(name)} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-textMuted text-left hover:border-dash-accent transition-colors flex items-center gap-2"
          >
            <TagIcon size={14} />
            {value.length > 0 ? 'Add another tag...' : 'Select or create tags...'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-2" align="start">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full border border-dash-border rounded-lg px-3 py-2 text-[13px] !text-dash-text mb-2 focus:outline-none focus:border-dash-accent"
          />
          <div className="max-h-[220px] overflow-y-auto space-y-0.5">
            {filtered.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => addTagByName(tag.name)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-semibold !text-dash-text hover:bg-dash-surface transition-colors"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? '#9ca3af' }} />
                <TagIconGlyph icon={tag.icon} size={12} />
                {tag.name}
              </button>
            ))}
            {filtered.length === 0 && !canCreate && (
              <p className="text-[12px] !text-dash-textMuted px-2.5 py-2">No matching tags</p>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-bold text-dash-accent hover:bg-dash-accent/10 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {isCreating ? 'Creating…' : `Create "${query.trim()}"`}
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

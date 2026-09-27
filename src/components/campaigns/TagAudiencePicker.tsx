'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { toast } from 'sonner';
import { Check, Plus, Tag as TagIcon, Users, X } from 'lucide-react';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { createTag } from '@/app/actions/tags';
import { getCampaignTagReach } from '@/app/actions/marketing';
import { TagIconGlyph } from '@/lib/tags/tagIcons';
import type { TagOption } from '@/components/crm/TagMultiSelect';

type Reach = { total: number; emailReach: number };

interface TagAudiencePickerProps {
  /** Every workspace tag (listTags — the same source the Tag Manager uses). */
  availableTags: TagOption[];
  /** Selected tag IDS (a saved campaign targets tags by id, so a rename never breaks it). */
  value: string[];
  onChange: (tagIds: string[]) => void;
  /** Called with a tag created inline, so the parent's tag list stays in sync. */
  onTagCreated?: (tag: TagOption) => void;
  placeholder?: string;
}

const ROW_HEIGHT = 36;
const LIST_HEIGHT = 252; // 7 rows
const OVERSCAN = 4;

const formatCount = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString());

/**
 * Campaign audience tag picker: search, multi-select chips, inline create, and live audience
 * sizes (count-only) — per tag, and for the selection as a whole (contacts with ALL the tags).
 * The list is windowed, so a workspace with thousands of tags renders only what is visible.
 */
export function TagAudiencePicker({ availableTags, value, onChange, onTagCreated, placeholder = 'Select or create tags...' }: TagAudiencePickerProps) {
  const [tags, setTags] = useState<TagOption[]>(availableTags);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [creating, setCreating] = useState(false);
  const [reach, setReach] = useState<Record<string, Reach>>({});
  const [combined, setCombined] = useState<Reach | null>(null);
  const [combinedLoading, setCombinedLoading] = useState(false);
  const requested = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTags(availableTags); }, [availableTags]);

  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const selected = useMemo(() => new Set(value), [value]);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => tags.filter((t) => !selected.has(t.id) && (!q || t.name.toLowerCase().includes(q))),
    [tags, selected, q],
  );
  const canCreate = q.length > 0 && !tags.some((t) => t.name.toLowerCase() === q);
  // Matching tags first (so Enter picks the best match), then "Create …" as the last row.
  const rowCount = filtered.length + (canCreate ? 1 : 0);
  const createRow = canCreate ? filtered.length : -1;

  useEffect(() => { setActive(0); setScrollTop(0); if (listRef.current) listRef.current.scrollTop = 0; }, [q]);

  // Windowing.
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(rowCount, Math.ceil((scrollTop + LIST_HEIGHT) / ROW_HEIGHT) + OVERSCAN);

  // Lazily fetch counts for the tag rows actually on screen (and for selected chips).
  const loadReach = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    const res = await getCampaignTagReach(missing);
    if ('perTag' in res) setReach((prev) => ({ ...prev, ...res.perTag }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const visible = filtered.slice(first, last).map((t) => t.id);
    const timer = setTimeout(() => loadReach(visible), 120);
    return () => clearTimeout(timer);
  }, [open, first, last, filtered, loadReach]);

  useEffect(() => { loadReach(value); }, [value, loadReach]);

  // The real audience of the selection: contacts carrying ALL selected tags.
  useEffect(() => {
    if (value.length === 0) { setCombined(null); return; }
    let cancelled = false;
    setCombinedLoading(true);
    const timer = setTimeout(async () => {
      const res = await getCampaignTagReach([], value);
      if (!cancelled) { setCombined('combined' in res ? res.combined : null); setCombinedLoading(false); }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value]);

  const select = (id: string) => { onChange([...value, id]); setQuery(''); inputRef.current?.focus(); };
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  const create = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    const res = await createTag({ name });
    setCreating(false);
    if (!res.success) { toast.error(res.error || 'Failed to create tag'); return; }
    const tag = res.data as TagOption;
    setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    onTagCreated?.(tag);
    requested.current.add(tag.id);
    setReach((prev) => ({ ...prev, [tag.id]: { total: 0, emailReach: 0 } }));
    select(tag.id);
    toast.success(`Tag "${tag.name}" created`);
  };

  const choose = (row: number) => {
    if (row === createRow) { create(); return; }
    const tag = filtered[row];
    if (tag) select(tag.id);
  };

  const scrollIntoView = (row: number) => {
    const el = listRef.current;
    if (!el) return;
    const top = row * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + LIST_HEIGHT) el.scrollTop = top + ROW_HEIGHT - LIST_HEIGHT;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); const n = Math.min(rowCount - 1, active + 1); setActive(n); scrollIntoView(n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.max(0, active - 1); setActive(n); scrollIntoView(n); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && rowCount > 0) choose(active); }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); } }
    else if (e.key === 'Backspace' && !query && value.length > 0) remove(value[value.length - 1]);
  };

  const reachLabel = (r?: Reach) => (r ? `${formatCount(r.emailReach)}` : '…');

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div
            onClick={() => { setOpen(true); inputRef.current?.focus(); }}
            className={`min-h-11 w-full rounded-xl border bg-white px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text transition-colors motion-reduce:transition-none ${
              open ? 'border-dash-accent ring-2 ring-dash-accent/15' : 'border-dash-border hover:border-dash-accent/60'
            }`}
          >
            <TagIcon size={14} className="!text-dash-textMuted ml-1 shrink-0" />
            {value.map((id) => {
              const tag = byId.get(id);
              const color = tag?.color ?? '#64748b';
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 h-7 rounded-lg text-[12px] font-semibold border"
                  style={{ backgroundColor: `${color}14`, borderColor: `${color}33`, color }}
                >
                  <TagIconGlyph icon={tag?.icon} size={12} />
                  {tag?.name ?? 'Deleted tag'}
                  {reach[id] && <span className="opacity-70 font-medium">· {formatCount(reach[id].emailReach)}</span>}
                  <button
                    type="button"
                    aria-label={`Remove ${tag?.name ?? 'tag'}`}
                    onClick={(e) => { e.stopPropagation(); remove(id); }}
                    className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-black/5"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onKeyDown={onKeyDown}
              readOnly={creating}
              placeholder={value.length ? 'Add another tag…' : placeholder}
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              className="flex-1 min-w-[140px] h-7 bg-transparent px-1 text-[13px] !text-dash-text placeholder:!text-dash-textMuted focus:outline-none"
            />
          </div>
        </PopoverPrimitive.Anchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => { if (e.target instanceof Node && inputRef.current?.parentElement?.contains(e.target)) e.preventDefault(); }}
          className="p-1.5 w-[var(--radix-popover-trigger-width)] min-w-[300px]"
        >
          <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">
            <span>{q ? `${filtered.length} matching` : `${tags.length} tags`}</span>
            <span className="inline-flex items-center gap-1"><Users size={11} /> can be emailed</span>
          </div>
          {rowCount === 0 ? (
            <p className="px-2.5 py-6 text-center text-[12px] !text-dash-textMuted">
              {tags.length === 0 ? 'No tags yet. Type a name to create one.' : 'Every tag is already selected.'}
            </p>
          ) : (
            <div
              ref={listRef}
              role="listbox"
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: LIST_HEIGHT }}
            >
              <div style={{ height: rowCount * ROW_HEIGHT, position: 'relative' }}>
                {Array.from({ length: last - first }, (_, i) => first + i).map((row) => {
                  const isActive = row === active;
                  const style: React.CSSProperties = { position: 'absolute', top: row * ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT };
                  if (row === createRow) {
                    return (
                      <button
                        key="__create" type="button" style={style}
                        onMouseEnter={() => setActive(row)} onClick={() => choose(row)} disabled={creating}
                        className={`flex items-center gap-2 px-2.5 rounded-lg text-left text-[13px] font-bold text-dash-accent transition-colors motion-reduce:transition-none disabled:opacity-50 ${isActive ? 'bg-dash-accent/10' : ''}`}
                      >
                        <Plus size={14} className="shrink-0" /> <span className="truncate">{creating ? 'Creating…' : `Create tag “${query.trim()}”`}</span>
                      </button>
                    );
                  }
                  const tag = filtered[row];
                  if (!tag) return null;
                  const r = reach[tag.id];
                  return (
                    <button
                      key={tag.id} type="button" role="option" aria-selected={isActive} style={style}
                      onMouseEnter={() => setActive(row)} onClick={() => choose(row)}
                      title={r ? `${r.total.toLocaleString()} tagged contact(s), ${r.emailReach.toLocaleString()} can be emailed` : undefined}
                      className={`flex items-center gap-2.5 px-2.5 rounded-lg text-left text-[13px] font-semibold !text-dash-text transition-colors motion-reduce:transition-none ${isActive ? 'bg-dash-surface' : ''}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? '#94a3b8' }} />
                      <TagIconGlyph icon={tag.icon} size={12} />
                      <span className="flex-1 truncate">{tag.name}</span>
                      <span className={`tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-md ${r ? 'bg-dash-surface !text-dash-textMuted' : '!text-dash-textMuted/60'}`}>
                        {reachLabel(r)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-dash-surface border border-dash-border px-3 py-2 text-[11.5px] !text-dash-textMuted">
          <Check size={13} className="text-dash-accent shrink-0" />
          <span>
            {value.length > 1 ? 'Contacts with ALL of these tags: ' : 'Contacts with this tag: '}
            {combinedLoading || !combined ? (
              <span className="font-bold !text-dash-text">counting…</span>
            ) : (
              <>
                <span className="font-bold !text-dash-text">{combined.total.toLocaleString()}</span>
                {' · '}
                <span className="font-bold !text-dash-text">{combined.emailReach.toLocaleString()}</span> can be emailed
                {combined.total > combined.emailReach ? ' (unsubscribed or invalid addresses are skipped)' : ''}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

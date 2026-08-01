'use client';

import React, { useEffect, useState } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { listTags, createTag } from '@/app/actions/tags';
import { Tag as TagIcon, Plus, X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface TagOption {
  id: string;
  name: string;
}

export function TagOnSubmitPicker() {
  const { state, dispatch } = useFormBuilder();
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const selectedTagId: string | null = state.config?.tagOnSubmit?.tagId ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listTags();
      if (!cancelled && res.success) {
        setTags((res.data || []).map((t: any) => ({ id: t.id, name: t.name })));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTagId = (tagId: string | null) => {
    dispatch({ type: 'UPDATE_CONFIG', config: { tagOnSubmit: tagId ? { tagId } : null } });
  };

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await createTag({ name });
      if (res.success && res.data) {
        const created = { id: res.data.id, name: res.data.name };
        setTags((prev) => [...prev, created]);
        setTagId(created.id);
        setNewTagName('');
        setShowCreate(false);
      } else {
        toast.error(res.error || 'Failed to create tag');
      }
    } finally {
      setCreating(false);
    }
  };

  const selectedTag = tags.find((t) => t.id === selectedTagId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="builder-section-label m-0 flex items-center gap-1.5">
          <TagIcon size={12} className="text-dash-accent" />
          Tag submissions
        </p>
      </div>

      <p className="text-[11px] !text-dash-textMuted mb-4 leading-relaxed">
        Automatically apply a tag to the contact created or updated by each real submission of this form.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={selectedTagId || undefined} onValueChange={(v) => setTagId(v)} disabled={loading}>
              <SelectTrigger className="h-9 w-full border-dash-border rounded-lg text-[12px]">
                <SelectValue placeholder={loading ? 'Loading tags…' : 'No tag selected'} />
              </SelectTrigger>
              <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                {tags.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] !text-dash-textMuted">No tags yet</div>
                ) : (
                  tags.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[12px]">
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedTagId && (
            <button
              type="button"
              onClick={() => setTagId(null)}
              title="Remove tag"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-dash-border text-dash-textMuted hover:text-red hover:border-red/40 transition-colors motion-reduce:transition-none"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {selectedTag && (
          <p className="text-[11px] !text-dash-textMuted">
            Every real submission will tag its contact{' '}
            <span className="font-semibold !text-dash-text">{selectedTag.name}</span>.
          </p>
        )}

        {!showCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="text-[10px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1 self-start"
          >
            <Plus size={10} /> Create new tag
          </button>
        ) : (
          <div className="p-3 bg-white border border-dash-border rounded-xl flex flex-col gap-2">
            <label className="text-[10px] font-bold !text-dash-textMuted block">New tag name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. Webinar Signup"
                className="flex-1 h-8 px-2 bg-dash-surface border border-dash-border rounded-lg !text-dash-text text-[11px] outline-none focus:border-dash-accent"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newTagName.trim()}
                className="h-8 px-3 rounded-lg bg-dash-accent text-white text-[11px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {creating ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewTagName('');
                }}
                className="h-8 px-2 rounded-lg border border-dash-border text-[11px] !text-dash-textMuted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

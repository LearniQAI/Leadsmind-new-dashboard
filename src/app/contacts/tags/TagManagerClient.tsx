'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Star,
  Trash2,
  SquarePen,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Folder,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashFormField } from '@/components/dashboard-ui/FormField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  createTag,
  updateTag,
  deleteTag,
  bulkDeleteTags,
  bulkUpdateTagCategory,
  createTagCategory,
  updateTagCategory,
  deleteTagCategory,
  reorderTagCategories,
  toggleFavoriteTag,
} from '@/app/actions/tags';

interface TagRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  category_id: string | null;
  visibility: 'private' | 'team' | 'company';
  parent_tag_id: string | null;
  expires_at: string | null;
  usage_count: number;
  is_favorite: boolean;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
}

const EMOJI_CHOICES = ['🏷️', '⭐', '🔥', '💼', '📈', '🎯', '💰', '🎓', '🛟', '📣', '🤝', '⚡'];
const COLOR_CHOICES = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

export default function TagManagerClient({
  initialTags,
  initialCategories,
  isAdmin,
}: {
  initialTags: TagRow[];
  initialCategories: CategoryRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tagModal, setTagModal] = useState<{ mode: 'create' | 'edit'; tag?: TagRow } | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ mode: 'create' | 'edit'; category?: CategoryRow } | null>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<TagRow | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  const tagsById = useMemo(() => new Map(initialTags.map((t) => [t.id, t])), [initialTags]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, TagRow[]>();
    initialTags.forEach((t) => {
      if (!t.parent_tag_id) return;
      if (!map.has(t.parent_tag_id)) map.set(t.parent_tag_id, []);
      map.get(t.parent_tag_id)!.push(t);
    });
    return map;
  }, [initialTags]);

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;

  const flatMatches = useMemo(() => {
    if (!isSearching) return [];
    return initialTags.filter((t) => t.name.toLowerCase().includes(query));
  }, [initialTags, isSearching, query]);

  const topLevelByCategory = useMemo(() => {
    const map = new Map<string, TagRow[]>();
    initialTags
      .filter((t) => !t.parent_tag_id)
      .forEach((t) => {
        const key = t.category_id ?? '__uncategorized__';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      });
    return map;
  }, [initialTags]);

  const sortedCategories = useMemo(
    () => [...initialCategories].sort((a, b) => a.sort_order - b.sort_order),
    [initialCategories],
  );

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleFavorite = async (tag: TagRow) => {
    const res = await toggleFavoriteTag(tag.id, !tag.is_favorite);
    if (res.success === false) toast.error(res.error || 'Failed to update favorite');
    refresh();
  };

  const handleDeleteTag = async () => {
    if (!deleteTagTarget) return;
    setIsProcessing(true);
    const res = await deleteTag(deleteTagTarget.id);
    if (res.success) {
      toast.success(`Tag "${deleteTagTarget.name}" deleted`);
      setDeleteTagTarget(null);
      refresh();
    } else {
      toast.error(res.error || 'Failed to delete tag');
    }
    setIsProcessing(false);
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setIsProcessing(true);
    const res = await deleteTagCategory(deleteCategoryTarget.id);
    if (res.success) {
      toast.success(`Category "${deleteCategoryTarget.name}" deleted`);
      setDeleteCategoryTarget(null);
      refresh();
    } else {
      toast.error(res.error || 'Failed to delete category');
    }
    setIsProcessing(false);
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    const res = await bulkDeleteTags(Array.from(selectedIds));
    if (res.success) {
      toast.success(`Deleted ${selectedIds.size} tag${selectedIds.size === 1 ? '' : 's'}`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      refresh();
    } else {
      toast.error(res.error || 'Failed to delete tags');
    }
    setIsProcessing(false);
  };

  const handleBulkMoveCategory = async (categoryId: string) => {
    const targetId = categoryId === '__uncategorized__' ? null : categoryId;
    const res = await bulkUpdateTagCategory(Array.from(selectedIds), targetId);
    if (res.success) {
      toast.success(`Moved ${selectedIds.size} tag${selectedIds.size === 1 ? '' : 's'}`);
      setSelectedIds(new Set());
      refresh();
    } else {
      toast.error(res.error || 'Failed to move tags');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!isAdmin || !result.destination) return;
    const reordered = [...sortedCategories];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const res = await reorderTagCategories(reordered.map((c) => c.id));
    if (res.success === false) toast.error(res.error || 'Failed to reorder categories');
    refresh();
  };

  const renderTagRow = (tag: TagRow, depth: number) => (
    <div key={tag.id}>
      <div
        className="group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-dash-surface transition-colors"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Checkbox
            checked={selectedIds.has(tag.id)}
            onCheckedChange={(checked) => toggleSelected(tag.id, checked === true)}
          />
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: tag.color ?? '#9ca3af' }}
          />
          {tag.icon && <span className="text-sm">{tag.icon}</span>}
          <span className="text-sm font-bold !text-dash-text truncate">{tag.name}</span>
          {tag.visibility === 'private' && (
            <span className="text-[10px] font-bold text-dash-textMuted bg-dash-border/50 px-2 py-0.5 rounded-full shrink-0">
              private
            </span>
          )}
          <span className="text-[11px] font-semibold !text-dash-textMuted shrink-0">
            {tag.usage_count} {tag.usage_count === 1 ? 'use' : 'uses'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleToggleFavorite(tag)}
            className="p-1.5 rounded-lg text-dash-textMuted hover:text-amber-500 hover:bg-amber-500/10 transition-all"
            title={tag.is_favorite ? 'Unfavorite' : 'Favorite'}
          >
            <Star size={14} fill={tag.is_favorite ? 'currentColor' : 'none'} className={tag.is_favorite ? 'text-amber-500' : ''} />
          </button>
          <button
            onClick={() => setTagModal({ mode: 'edit', tag })}
            className="p-1.5 rounded-lg text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 transition-all opacity-0 group-hover:opacity-100"
            title="Edit tag"
          >
            <SquarePen size={13} />
          </button>
          <button
            onClick={() => setDeleteTagTarget(tag)}
            className="p-1.5 rounded-lg text-dash-textMuted hover:text-red hover:bg-red/10 transition-all opacity-0 group-hover:opacity-100"
            title="Delete tag"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {!isSearching && (childrenByParent.get(tag.id) ?? []).map((child) => renderTagRow(child, depth + 1))}
    </div>
  );

  return (
    <div className="bg-white border border-dash-border rounded-2xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-dash-border bg-dash-surface/60">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-textMuted" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-dash-border rounded-xl pl-9 pr-3 py-2 text-[13px] !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-all"
          />
        </div>
        {isAdmin && (
          <DashButton size="sm" variant="secondary" onClick={() => setCategoryModal({ mode: 'create' })}>
            <Folder size={14} />
            New category
          </DashButton>
        )}
        <DashButton size="sm" onClick={() => setTagModal({ mode: 'create' })}>
          <Plus size={14} />
          New tag
        </DashButton>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dash-border bg-dash-accent/5">
          <span className="text-[12px] font-bold !text-dash-text">{selectedIds.size} selected</span>
          <Select onValueChange={handleBulkMoveCategory}>
            <SelectTrigger className="h-8 w-[180px] text-[12px]">
              <SelectValue placeholder="Move to category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__uncategorized__">Uncategorized</SelectItem>
              {sortedCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DashButton size="sm" variant="secondary" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 size={14} />
            Delete selected
          </DashButton>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto p-1.5 rounded-lg text-dash-textMuted hover:text-dash-text transition-all"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        {initialTags.length === 0 ? (
          <div className="py-20 text-center">
            <TagIcon size={40} className="mx-auto text-dash-accent/30 mb-4" />
            <p className="!text-dash-textMuted font-bold">No tags created yet</p>
          </div>
        ) : isSearching ? (
          <div className="space-y-1">
            {flatMatches.length === 0 ? (
              <p className="text-sm !text-dash-textMuted text-center py-8">No tags match "{searchQuery}"</p>
            ) : (
              flatMatches.map((tag) => renderTagRow(tag, 0))
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {sortedCategories.map((category, index) => {
                    const categoryTags = topLevelByCategory.get(category.id) ?? [];
                    const isCollapsed = collapsed.has(category.id);
                    return (
                      <Draggable key={category.id} draggableId={category.id} index={index} isDragDisabled={!isAdmin}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className="rounded-xl border border-dash-border overflow-hidden"
                          >
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-dash-surface">
                              {isAdmin && (
                                <span {...dragProvided.dragHandleProps} className="cursor-grab text-dash-textMuted">
                                  <GripVertical size={14} />
                                </span>
                              )}
                              <button onClick={() => toggleCollapsed(category.id)} className="text-dash-textMuted">
                                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </button>
                              {category.icon && <span className="text-sm">{category.icon}</span>}
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: category.color ?? '#9ca3af' }}
                              />
                              <span className="text-[13px] font-bold !text-dash-text">{category.name}</span>
                              <span className="text-[11px] font-semibold !text-dash-textMuted">
                                {categoryTags.length}
                              </span>
                              {isAdmin && (
                                <div className="ml-auto flex items-center gap-1">
                                  <button
                                    onClick={() => setCategoryModal({ mode: 'edit', category })}
                                    className="p-1.5 rounded-lg text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 transition-all"
                                  >
                                    <SquarePen size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteCategoryTarget(category)}
                                    className="p-1.5 rounded-lg text-dash-textMuted hover:text-red hover:bg-red/10 transition-all"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                            {!isCollapsed && (
                              <div className="p-2">
                                {categoryTags.length === 0 ? (
                                  <p className="text-[12px] !text-dash-textMuted px-3 py-2">No tags in this category</p>
                                ) : (
                                  categoryTags.map((tag) => renderTagRow(tag, 0))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}

                  {/* Uncategorized */}
                  {(topLevelByCategory.get('__uncategorized__') ?? []).length > 0 && (
                    <div className="rounded-xl border border-dash-border overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-dash-surface">
                        <button onClick={() => toggleCollapsed('__uncategorized__')} className="text-dash-textMuted">
                          {collapsed.has('__uncategorized__') ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <span className="text-[13px] font-bold !text-dash-text">Uncategorized</span>
                        <span className="text-[11px] font-semibold !text-dash-textMuted">
                          {(topLevelByCategory.get('__uncategorized__') ?? []).length}
                        </span>
                      </div>
                      {!collapsed.has('__uncategorized__') && (
                        <div className="p-2">
                          {(topLevelByCategory.get('__uncategorized__') ?? []).map((tag) => renderTagRow(tag, 0))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {tagModal && (
        <TagFormModal
          mode={tagModal.mode}
          tag={tagModal.tag}
          categories={sortedCategories}
          allTags={initialTags}
          onClose={() => setTagModal(null)}
          onSaved={() => {
            setTagModal(null);
            refresh();
          }}
        />
      )}

      {categoryModal && (
        <CategoryFormModal
          mode={categoryModal.mode}
          category={categoryModal.category}
          onClose={() => setCategoryModal(null)}
          onSaved={() => {
            setCategoryModal(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTagTarget}
        onClose={() => setDeleteTagTarget(null)}
        onConfirm={handleDeleteTag}
        title="Delete tag?"
        description={`"${deleteTagTarget?.name}" will be removed from every record it's assigned to. Child tags will become top-level tags. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={handleDeleteCategory}
        title="Delete category?"
        description={`"${deleteCategoryTarget?.name}" will be removed. Tags in this category become uncategorized, not deleted.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected tags?"
        description={`${selectedIds.size} tag${selectedIds.size === 1 ? '' : 's'} will be permanently deleted and removed from every record. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function TagFormModal({
  mode,
  tag,
  categories,
  allTags,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  tag?: TagRow;
  categories: CategoryRow[];
  allTags: TagRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tag?.name ?? '');
  const [color, setColor] = useState(tag?.color ?? COLOR_CHOICES[0]);
  const [icon, setIcon] = useState(tag?.icon ?? '');
  const [categoryId, setCategoryId] = useState<string>(tag?.category_id ?? '__none__');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'company'>(tag?.visibility ?? 'team');
  const [parentTagId, setParentTagId] = useState<string>(tag?.parent_tag_id ?? '__none__');
  const [expiresAt, setExpiresAt] = useState(tag?.expires_at ? tag.expires_at.slice(0, 10) : '');
  const [isSaving, setIsSaving] = useState(false);

  const parentOptions = allTags.filter((t) => t.id !== tag?.id);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    const payload = {
      name: name.trim(),
      color,
      icon: icon || undefined,
      categoryId: categoryId === '__none__' ? null : categoryId,
      visibility,
      parentTagId: parentTagId === '__none__' ? null : parentTagId,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const res = mode === 'create' ? await createTag(payload) : await updateTag(tag!.id, payload);

    if (res.success) {
      toast.success(mode === 'create' ? `Tag "${name}" created` : `Tag "${name}" updated`);
      onSaved();
    } else {
      toast.error(res.error || 'Failed to save tag');
    }
    setIsSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-dash-border !text-dash-text max-w-md rounded-2xl shadow-xl p-6 z-[1001]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold !text-dash-text">
            {mode === 'create' ? 'Create tag' : 'Edit tag'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <DashFormField label="Name" htmlFor="tag-name" required>
            <DashInput id="tag-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP Client" />
          </DashFormField>

          <DashFormField label="Color" htmlFor="tag-color">
            <div className="flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: color === c ? '#111827' : 'transparent' }}
                />
              ))}
            </div>
          </DashFormField>

          <DashFormField label="Icon (optional)" htmlFor="tag-icon">
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(icon === e ? '' : e)}
                  className={`h-8 w-8 rounded-lg border flex items-center justify-center text-base transition-all ${icon === e ? 'border-dash-accent bg-dash-accent/10' : 'border-dash-border'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </DashFormField>

          <DashFormField label="Category" htmlFor="tag-category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DashFormField>

          <DashFormField label="Parent tag (optional)" htmlFor="tag-parent">
            <Select value={parentTagId} onValueChange={setParentTagId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (top-level)</SelectItem>
                {parentOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DashFormField>

          <DashFormField label="Visibility" htmlFor="tag-visibility">
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (only me)</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </DashFormField>

          <DashFormField label="Expiry date (optional)" htmlFor="tag-expiry">
            <DashInput id="tag-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </DashFormField>
        </div>

        <DialogFooter className="flex gap-2">
          <DashButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </DashButton>
          <DashButton type="button" variant="primary" className="flex-1" disabled={!name.trim() || isSaving} onClick={handleSave}>
            {mode === 'create' ? 'Create' : 'Save'}
          </DashButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormModal({
  mode,
  category,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  category?: CategoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? COLOR_CHOICES[0]);
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    const payload = { name: name.trim(), color, icon: icon || undefined };
    const res = mode === 'create' ? await createTagCategory(payload) : await updateTagCategory(category!.id, payload);

    if (res.success) {
      toast.success(mode === 'create' ? `Category "${name}" created` : `Category "${name}" updated`);
      onSaved();
    } else {
      toast.error(res.error || 'Failed to save category');
    }
    setIsSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-dash-border !text-dash-text max-w-sm rounded-2xl shadow-xl p-6 z-[1001]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold !text-dash-text">
            {mode === 'create' ? 'Create category' : 'Edit category'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <DashFormField label="Name" htmlFor="category-name" required>
            <DashInput id="category-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales" />
          </DashFormField>

          <DashFormField label="Color" htmlFor="category-color">
            <div className="flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: color === c ? '#111827' : 'transparent' }}
                />
              ))}
            </div>
          </DashFormField>

          <DashFormField label="Icon (optional)" htmlFor="category-icon">
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(icon === e ? '' : e)}
                  className={`h-8 w-8 rounded-lg border flex items-center justify-center text-base transition-all ${icon === e ? 'border-dash-accent bg-dash-accent/10' : 'border-dash-border'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </DashFormField>
        </div>

        <DialogFooter className="flex gap-2">
          <DashButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </DashButton>
          <DashButton type="button" variant="primary" className="flex-1" disabled={!name.trim() || isSaving} onClick={handleSave}>
            {mode === 'create' ? 'Create' : 'Save'}
          </DashButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

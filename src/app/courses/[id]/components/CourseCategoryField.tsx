"use client";

import React, { useEffect, useState } from "react";
import { Plus, X, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  getWorkspaceCourseCategories,
  createCourseCategory,
  deleteCourseCategory,
  type CourseCategory,
} from "@/app/actions/courseCategories";
import { Select, GhostButton, TextInput } from "./settings/primitives";

// Batch 6 (G9) — a small, fixed swatch palette rather than a full color picker: matches the
// "simple list — name, maybe a color" scope this feature was asked to stay at.
const SWATCHES = [
  "#0284c7", "#7c3aed", "#16a34a", "#dc2626",
  "#d97706", "#0f172a", "#db2777", "#0891b2",
];

interface CourseCategoryFieldProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

/** Category picker + inline create/manage, embedded in the course's General settings
 *  (CourseSettingsForm). Plugs into that form's existing value/dirty/save flow — this
 *  component owns only the category LIST (fetch/create/delete via the dedicated real-time
 *  actions), the parent form owns the SELECTED value and saves it with everything else. */
export default function CourseCategoryField({ value, onChange }: CourseCategoryFieldProps) {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    const res = await getWorkspaceCourseCategories();
    if ("data" in res) setCategories(res.data);
    else toast.error(res.error);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await createCourseCategory({ name, color: newColor });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setCategories((prev) => [...prev, res.data]);
      onChange(res.data.id);
      setNewName("");
      toast.success("Category created");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    setDeletingId(categoryId);
    try {
      const res = await deleteCourseCategory(categoryId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      if (value === categoryId) onChange(null);
      toast.success("Category deleted — courses using it are now uncategorized.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Select
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={loading}
          className="max-w-[260px]"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {loading && <Loader2 size={14} className="animate-spin motion-reduce:animate-none !text-dash-textMuted" />}
        <GhostButton type="button" onClick={() => setManaging((m) => !m)} className="!h-9 !px-3">
          <Tag className="size-3.5" /> {managing ? "Done" : "Manage"}
        </GhostButton>
      </div>

      {managing && (
        <div className="space-y-3 rounded-xl border border-dash-border bg-dash-surface/50 p-3.5">
          {categories.length > 0 && (
            <ul className="space-y-1.5">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[12px]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="min-w-0 flex-1 truncate !text-dash-text">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    aria-label={`Delete category ${c.name}`}
                    className="shrink-0 rounded-md p-1 !text-dash-textMuted transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    {deletingId === c.id ? (
                      <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <X size={13} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-dash-border pt-3">
            <div className="flex items-center gap-2">
              <TextInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New category name"
                className="flex-1 !h-9 text-[12px]"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-dash-accent px-3 text-[11px] font-semibold text-white transition-colors hover:bg-dash-accent/90 disabled:opacity-50"
              >
                {creating ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Plus size={13} />}
                Add
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {SWATCHES.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  aria-label={`Choose color ${sw}`}
                  onClick={() => setNewColor(sw)}
                  className={`h-5 w-5 shrink-0 rounded-full transition-transform ${
                    newColor === sw ? "scale-110 ring-2 ring-offset-1 ring-dash-accent" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: sw }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

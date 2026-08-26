"use client";

import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import {
  GripVertical, Plus, Trash2, Video, Headphones, FileText, Type,
  CheckSquare, FileEdit, Layers, Download, Presentation, Code2, Radio
} from "lucide-react";

export interface ContentBlock {
  id: string;
  lesson_id: string;
  position: number;
  type: string;
  video_provider: string | null;
  file_url: string | null;
  completion_rule: string;
  completion_threshold: number | null;
  content: Record<string, any>;
}

const BLOCK_TYPE_META: Record<string, { label: string; icon: any }> = {
  video: { label: "Video", icon: Video },
  audio: { label: "Audio", icon: Headphones },
  reading: { label: "Reading (PDF)", icon: FileText },
  rich_text: { label: "Rich Text", icon: Type },
  quiz: { label: "Quiz", icon: CheckSquare },
  assignment: { label: "Assignment", icon: FileEdit },
  flashcards: { label: "Flashcard Set", icon: Layers },
  download: { label: "Downloadable Resource", icon: Download },
  slides: { label: "Presentation Slides", icon: Presentation },
  embed: { label: "External Embed", icon: Code2 },
  live_session: { label: "Live Session Link", icon: Radio }
};

const BLOCK_TYPE_ORDER = [
  "video", "audio", "reading", "rich_text", "quiz", "assignment",
  "flashcards", "download", "slides", "embed", "live_session"
];

interface ContentBlockListProps {
  lessonId: string;
  renderBlockEditor?: (block: ContentBlock, onChange: (patch: Partial<ContentBlock>) => void) => React.ReactNode;
}

export default function ContentBlockList({ lessonId, renderBlockEditor }: ContentBlockListProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const loadBlocks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/lms/content-blocks?lessonId=${lessonId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBlocks(data.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load content blocks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handleAddBlock = async (type: string) => {
    setShowAddMenu(false);
    setIsAdding(true);
    try {
      const res = await fetch("/api/lms/content-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, type })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBlocks((prev) => [...prev, data.data]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add block");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    const prev = blocks;
    setBlocks(blocks.filter((b) => b.id !== id));
    try {
      const res = await fetch(`/api/lms/content-blocks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err: any) {
      setBlocks(prev);
      toast.error(err.message || "Failed to delete block");
    }
  };

  const handleBlockChange = (id: string, patch: Partial<ContentBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const persistBlockChange = async (id: string, patch: Partial<ContentBlock>) => {
    try {
      const res = await fetch(`/api/lms/content-blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to save block");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(blocks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBlocks(reordered);

    try {
      const res = await fetch("/api/lms/content-blocks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, order: reordered.map((b) => b.id) })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to save new order");
      loadBlocks();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold !text-dash-textMuted">Content Blocks</span>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-[11px] !text-dash-textMuted">Loading blocks...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="content-blocks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {blocks.length === 0 && (
                  <div className="py-6 text-center text-[11px] !text-dash-textMuted border border-dashed border-dash-border rounded-xl">
                    No content blocks yet. Add one below.
                  </div>
                )}
                {blocks.map((block, index) => {
                  const meta = BLOCK_TYPE_META[block.type] || { label: block.type, icon: Type };
                  const Icon = meta.icon;
                  return (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`bg-dash-surface border border-dash-border rounded-xl p-3 ${dragSnapshot.isDragging ? "shadow-lg" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <span {...dragProvided.dragHandleProps} className="cursor-grab text-dash-textMuted shrink-0">
                              <GripVertical size={14} />
                            </span>
                            <span className="w-7 h-7 rounded-lg bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent shrink-0">
                              <Icon size={13} />
                            </span>
                            <span className="text-xs font-bold !text-dash-text flex-1">
                              {index + 1}. {meta.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(block.id)}
                              className="text-red hover:text-red/80 transition-colors motion-reduce:transition-none shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {renderBlockEditor && (
                            <div className="mt-3">
                              {renderBlockEditor(block, (patch) => {
                                handleBlockChange(block.id, patch);
                                persistBlockChange(block.id, patch);
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu((v) => !v)}
          disabled={isAdding}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-primary hover:opacity-80 border border-dashed border-dash-border rounded-xl transition-opacity motion-reduce:transition-none"
        >
          <Plus size={13} /> {isAdding ? "Adding..." : "Add block"}
        </button>
        {showAddMenu && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-dash-border rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
            {BLOCK_TYPE_ORDER.map((type) => {
              const meta = BLOCK_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddBlock(type)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs !text-dash-text hover:bg-dash-surface text-left transition-colors motion-reduce:transition-none"
                >
                  <Icon size={13} className="text-dash-accent shrink-0" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

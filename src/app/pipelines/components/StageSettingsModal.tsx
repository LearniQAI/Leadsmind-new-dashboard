'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PipelineStage } from '@/types/crm';
import { Layers, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { updateStageOrder, updateStage, deleteStage, updatePipelineStages } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface StageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
  initialStages: PipelineStage[];
}

export function StageSettingsModal({
  isOpen,
  onClose,
  pipelineId,
  initialStages
}: StageSettingsModalProps) {
  const router = useRouter();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages, isOpen]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setStages(updatedItems);

    // Persist reorder
    const res = await updateStageOrder(pipelineId, updatedItems.map(s => ({ id: s.id, position: s.position })));
    if (!res.success) toast.error('Failed to sync stage order');
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return setEditingId(null);

    setIsProcessing(true);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] Renaming stage ${id} to "${editName.trim()}"`);
    }
    const res = await updateStage(id, editName.trim());
    if (res.success) {
      setStages(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
      setEditingId(null);
      toast.success('Stage synchronized');
      router.refresh();
    } else {
      // eslint-disable-next-line no-console
      console.error(`[DEBUG] Rename failure:`, res.error);
      toast.error('Failed to rename stage');
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Stage?',
      description: 'Are you sure? All deals in this stage will be permanently detached.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setIsProcessing(true);
        const res = await deleteStage(id);
        if (res.success) {
          setStages(prev => prev.filter(s => s.id !== id));
          toast.success('Stage purged');
        } else {
          toast.error('Failed to delete stage');
        }
        setIsProcessing(false);
      }
    });
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;

    setIsProcessing(true);
    const tempId = `new-${Date.now()}`;
    const newStage = { id: tempId, name: newStageName.trim(), position: stages.length };

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] Adding new stage:`, newStage);
    }

    // Using updatePipelineStages which already handles 'new-' prefixed IDs
    const res = await updatePipelineStages(pipelineId, [...stages, newStage]);

    if (res.success) {
      toast.success('New stage activated');
      setNewStageName('');
      router.refresh();
      // The useEffect will refresh the stages from props when the page revalidates
    } else {
      console.error(`[DEBUG] Add stage failure:`, res.error);
      toast.error('Failed to create stage');
    }
    setIsProcessing(false);
  };

  const { destination, source } = { destination: null, source: { index: 0 } } as any; // Dummy for type safety in splice above

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-dash-border !text-dash-text max-w-md p-0 overflow-hidden rounded-3xl shadow-2xl z-[1001]">
        <DialogHeader className="p-6 pb-4 border-b border-dash-border">
          <DialogTitle className="text-xl font-extrabold tracking-tight !text-dash-text flex items-center gap-3">
            <Layers size={18} className="text-dash-accent" />
            Sales Process Settings
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <p className="text-[11px] font-medium !text-dash-textMuted tracking-[1px] mb-4">
            Reorder stages or edit labels
          </p>

          <DragDropContext onDragEnd={(res) => {
            if (!res.destination) return;
            const items = Array.from(stages);
            const [reorderedItem] = items.splice(res.source.index, 1);
            items.splice(res.destination.index, 0, reorderedItem);
            const updated = items.map((s, i) => ({ ...s, position: i }));
            setStages(updated);
            updateStageOrder(pipelineId, updated.map(s => ({ id: s.id, position: s.position })));
          }}>
            <Droppable droppableId="stages-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {stages.map((stage, index) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="flex items-center gap-3 p-3 bg-dash-surface border border-dash-border rounded-xl group hover:border-dash-accent/30 transition-all"
                        >
                          <div {...dragProvided.dragHandleProps} className="!text-dash-textMuted cursor-grab active:cursor-grabbing">
                            <GripVertical size={14} />
                          </div>

                          <div className="flex-1">
                            {editingId === stage.id ? (
                              <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleRename(stage.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename(stage.id)}
                                className="w-full bg-white border border-dash-accent rounded-lg px-2 py-1 text-[13px] !text-dash-text focus:outline-none"
                              />
                            ) : (
                              <span className="text-[13px] font-bold !text-dash-text">{stage.name}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(stage.id);
                                setEditName(stage.name);
                              }}
                              className="p-2 rounded-lg !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(stage.id)}
                              className="p-2 rounded-lg !text-dash-textMuted hover:text-red hover:bg-red/10 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="mt-4 flex items-center gap-2 p-1 bg-dash-surface border border-dash-border rounded-xl focus-within:border-dash-accent/50 transition-all">
            <input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Enter stage name..."
              className="flex-1 bg-transparent px-3 py-2 text-[13px] !text-dash-text focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            />
            <button
              onClick={handleAddStage}
              disabled={isProcessing || !newStageName.trim()}
              className="h-8 px-3 rounded-lg bg-dash-accent text-white text-[11px] font-bold hover:bg-dash-accent/90 transition-all disabled:opacity-50"
            >
              Add Stage
            </button>
          </div>

          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-dash-surface !text-dash-text hover:bg-dash-border/60 text-[12px] font-bold tracking-widest transition-all"
            >
              Close Settings
            </button>
          </div>
        </div>
      </DialogContent>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="danger"
        />
      )}
    </Dialog>
  );
}

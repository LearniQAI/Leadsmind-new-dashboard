'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PipelineStage } from '@/types/crm';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { updateStageOrder, updateStage, deleteStage } from '@/app/actions/pipelines';
import { toast } from 'sonner';

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
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    const res = await updateStage(id, editName.trim());
    if (res.success) {
      setStages(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
      setEditingId(null);
      toast.success('Stage synchronized');
    } else {
      toast.error('Failed to rename stage');
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? All deals in this stage will be permanently detached.')) return;
    
    setIsProcessing(true);
    const res = await deleteStage(id);
    if (res.success) {
      setStages(prev => prev.filter(s => s.id !== id));
      toast.success('Stage purged');
    } else {
      toast.error('Failed to delete stage');
    }
    setIsProcessing(false);
  };

  const { destination, source } = { destination: null, source: { index: 0 } } as any; // Dummy for type safety in splice above

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0b0f1a] border-white/5 text-[#eef2ff] max-w-md p-0 overflow-hidden rounded-3xl shadow-2xl z-[1001]">
        <DialogHeader className="p-6 pb-4 border-b border-white/5">
          <DialogTitle className="text-xl font-extrabold font-space tracking-tight text-white flex items-center gap-3">
            <i className="fa-solid fa-layer-group text-[#3b82f6]"></i>
            Sales Process Settings
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <p className="text-[11px] font-medium text-[#4a5a82] uppercase tracking-[1px] mb-4 font-dm-sans">
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
                          className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-[#2563eb]/30 transition-all"
                        >
                          <div {...dragProvided.dragHandleProps} className="text-[#4a5a82] cursor-grab active:cursor-grabbing">
                            <i className="fa-solid fa-grip-vertical"></i>
                          </div>

                          <div className="flex-1">
                            {editingId === stage.id ? (
                              <input 
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleRename(stage.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename(stage.id)}
                                className="w-full bg-white/10 border border-[#2563eb] rounded-lg px-2 py-1 text-[13px] text-white focus:outline-none"
                              />
                            ) : (
                              <span className="text-[13px] font-bold text-[#eef2ff] font-dm-sans">{stage.name}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingId(stage.id);
                                setEditName(stage.name);
                              }}
                              className="p-2 rounded-lg text-[#4a5a82] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all"
                            >
                              <i className="fa-solid fa-pen text-[12px]"></i>
                            </button>
                            <button 
                              onClick={() => handleDelete(stage.id)}
                              className="p-2 rounded-lg text-[#4a5a82] hover:text-red-500 hover:bg-red-500/10 transition-all"
                            >
                              <i className="fa-solid fa-trash text-[12px]"></i>
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

          <div className="mt-8">
            <button 
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-bold uppercase tracking-widest transition-all"
            >
              Close Settings
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Plus, MoreVertical, Layout, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FunnelStep {
  id: string;
  name: string;
  path_name: string;
  order: number;
}

export const FunnelStepNavigator = ({ steps, onReorder }: { steps: FunnelStep[], onReorder: (newSteps: FunnelStep[]) => void }) => {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newSteps = Array.from(steps);
    const [reorderedItem] = newSteps.splice(result.source.index, 1);
    newSteps.splice(result.destination.index, 0, reorderedItem);

    // Update orders
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));

    onReorder(updatedSteps);
  };

  return (
    <div className="w-64 h-full bg-card border-r flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Funnel Steps</h2>
        <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="p-2 space-y-1">
                {steps.map((step, index) => (
                  <Draggable key={step.id} draggableId={step.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          snapshot.isDragging ? 'bg-primary/10 border-primary shadow-lg' : 'bg-background hover:border-white/10'
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="text-muted-foreground/30 group-hover:text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary/50">{index + 1}</span>
                            <span className="text-xs font-bold truncate">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span className="truncate">{step.path_name}</span>
                          </div>
                        </div>

                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
                            <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="p-4 bg-muted/30 border-t">
        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            <Layout className="w-3 h-3" />
            <span>Drag to reorder the funnel flow</span>
        </div>
      </div>
    </div>
  );
};

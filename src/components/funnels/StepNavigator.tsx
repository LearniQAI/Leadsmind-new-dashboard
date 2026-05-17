'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  GripVertical, Plus, MoreVertical, Layout, Link as LinkIcon,
  UserPlus, ShoppingCart, CreditCard, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FunnelStep {
  id: string;
  name: string;
  path: string;
  position: number;
  type?: 'optin' | 'sales' | 'checkout' | 'thankyou';
}

interface StepNavigatorProps {
  steps: FunnelStep[];
  activeStepId?: string;
  onSelectStep?: (stepId: string) => void;
  onReorder: (newSteps: FunnelStep[]) => void;
  onAddStep?: () => void;
}

const getStepIcon = (type?: string, name?: string) => {
  const normalizedType = type?.toLowerCase() || '';
  const normalizedName = name?.toLowerCase() || '';

  if (normalizedType === 'optin' || normalizedName.includes('optin') || normalizedName.includes('lead') || normalizedName.includes('landing')) {
    return {
      icon: UserPlus,
      colorClass: 'text-[#3b82f6]',
      bgClass: 'bg-[#3b82f6]/10 border-[#3b82f6]/20'
    };
  }
  if (normalizedType === 'sales' || normalizedName.includes('sales') || normalizedName.includes('offer') || normalizedName.includes('promo')) {
    return {
      icon: ShoppingCart,
      colorClass: 'text-[#06b6d4]',
      bgClass: 'bg-[#06b6d4]/10 border-[#06b6d4]/20'
    };
  }
  if (normalizedType === 'checkout' || normalizedName.includes('checkout') || normalizedName.includes('pay') || normalizedName.includes('order')) {
    return {
      icon: CreditCard,
      colorClass: 'text-[#10b981]',
      bgClass: 'bg-[#10b981]/10 border-[#10b981]/20'
    };
  }
  if (normalizedType === 'thankyou' || normalizedName.includes('thank') || normalizedName.includes('confirm') || normalizedName.includes('done')) {
    return {
      icon: CheckCircle,
      colorClass: 'text-[#10b981]',
      bgClass: 'bg-[#10b981]/10 border-[#10b981]/20'
    };
  }

  // Default Fallback: Opt-in / Landing style
  return {
    icon: UserPlus,
    colorClass: 'text-[#3b82f6]',
    bgClass: 'bg-[#3b82f6]/10 border-[#3b82f6]/20'
  };
};

export default function StepNavigator({
  steps,
  activeStepId,
  onSelectStep,
  onReorder,
  onAddStep
}: StepNavigatorProps) {
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newSteps = Array.from(steps);
    const [reorderedItem] = newSteps.splice(result.source.index, 1);
    newSteps.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      position: index + 1
    }));

    onReorder(updatedSteps);
  };

  return (
    <div className="w-[300px] h-full bg-[#0c1535] border-r border-white/[0.05] flex flex-col select-none">
      {/* Header section */}
      <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-[#04091a]/30">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-[#3b82f6]">Funnel Lane</h2>
          <span className="text-[12px] font-extrabold text-[#eef2ff] mt-0.5">Sequential Steps</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onAddStep}
          className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[#4a5a82] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/20 transition-all"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="funnel-steps-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {steps.map((step, index) => {
                  const isActive = step.id === activeStepId;
                  const itemDesign = getStepIcon(step.type, step.name);
                  const StepIconComponent = itemDesign.icon;

                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => onSelectStep?.(step.id)}
                          className={cn(
                            "group flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200",
                            isActive 
                              ? "bg-[#2563eb]/10 border-[#2563eb]/30 shadow-md shadow-[#2563eb]/5" 
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10",
                            snapshot.isDragging && "bg-[#0b0f1a] border-[#2563eb] shadow-2xl"
                          )}
                        >
                          {/* Drag handle */}
                          <div 
                            {...provided.dragHandleProps} 
                            className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Order index badge */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-xs shrink-0 transition-all",
                            isActive ? "border-[#2563eb]/25" : "border-white/5",
                            itemDesign.bgClass
                          )}>
                            <StepIconComponent className={cn("w-4 h-4", itemDesign.colorClass)} />
                          </div>

                          {/* Text info */}
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-[#4a5a82]">{index + 1}</span>
                              <span className="text-xs font-bold text-[#eef2ff] truncate leading-none">{step.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px] text-[#4a5a82] mt-1 font-semibold">
                              <LinkIcon className="w-2.5 h-2.5 text-[#3b82f6]" />
                              <span className="truncate lowercase">{step.path}</span>
                            </div>
                          </div>

                          {/* Quick action dots */}
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/5 rounded-lg transition-all text-[#4a5a82] hover:text-[#eef2ff]">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
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
      </div>

      {/* Footer helper */}
      <div className="p-4 bg-[#04091a]/30 border-t border-white/[0.05]">
        <div className="text-[9.5px] text-[#4a5a82] font-semibold uppercase tracking-wider flex items-center gap-2">
          <Layout className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Drag steps to reorder flow</span>
        </div>
      </div>
    </div>
  );
}

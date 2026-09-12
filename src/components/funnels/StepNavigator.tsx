'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  GripVertical, Plus, MoreVertical, Layout, Link as LinkIcon,
  UserPlus, ShoppingCart, CreditCard, CheckCircle, Eye, Pencil, LayoutTemplate
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  onViewStep?: (step: FunnelStep) => void;
  onChangeTemplate?: (step: FunnelStep) => void;
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
  onAddStep,
  onViewStep,
  onChangeTemplate
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
    <div className="w-[300px] h-full bg-dash-surface border-r border-dash-border flex flex-col select-none">
      {/* Header section */}
      <div className="p-4 border-b border-dash-border flex items-center justify-between bg-dash-bg">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-dash-accent">Funnel Lane</h2>
          <span className="text-[12px] font-extrabold text-dash-text mt-0.5">Sequential Steps</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddStep}
          className="h-8 w-8 rounded-lg bg-dash-surface border border-dash-border text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 hover:border-dash-accent/20 transition-all"
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
                              ? "bg-dash-accent/10 border-dash-accent/30 shadow-md shadow-dash-accent/5"
                              : "bg-dash-bg border-dash-border hover:bg-dash-border/20 hover:border-dash-accent/20",
                            snapshot.isDragging && "bg-dash-surface border-dash-accent shadow-xl"
                          )}
                        >
                          {/* Drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="text-dash-textMuted hover:text-dash-text transition-colors cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Order index badge */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-xs shrink-0 transition-all",
                            isActive ? "border-dash-accent/25" : "border-dash-border",
                            itemDesign.bgClass
                          )}>
                            <StepIconComponent className={cn("w-4 h-4", itemDesign.colorClass)} />
                          </div>

                          {/* Text info */}
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-dash-textMuted">{index + 1}</span>
                              <span className="text-xs font-bold text-dash-text truncate leading-none">{step.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px] text-dash-textMuted mt-1 font-semibold">
                              <LinkIcon className="w-2.5 h-2.5 text-dash-accent" />
                              <span className="truncate lowercase">{step.path}</span>
                            </div>
                          </div>

                          {/* Step actions: View / Edit / Change template — no more than these 3 */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-dash-border/40 rounded-lg transition-all text-dash-textMuted hover:text-dash-text data-[state=open]:opacity-100"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 bg-dash-surface border border-dash-border p-1.5 rounded-xl shadow-xl z-[100]">
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onViewStep?.(step); }}
                                className="flex items-center gap-2.5 p-2 rounded-lg text-[11px] font-semibold text-dash-text cursor-pointer hover:bg-dash-bg focus:bg-dash-bg focus:text-dash-text"
                              >
                                <Eye size={13} /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onSelectStep?.(step.id); }}
                                className="flex items-center gap-2.5 p-2 rounded-lg text-[11px] font-semibold text-dash-text cursor-pointer hover:bg-dash-bg focus:bg-dash-bg focus:text-dash-text"
                              >
                                <Pencil size={13} /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onChangeTemplate?.(step); }}
                                className="flex items-center gap-2.5 p-2 rounded-lg text-[11px] font-semibold text-dash-text cursor-pointer hover:bg-dash-bg focus:bg-dash-bg focus:text-dash-text"
                              >
                                <LayoutTemplate size={13} /> Change template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      <div className="p-4 bg-dash-bg border-t border-dash-border">
        <div className="text-[9.5px] text-dash-textMuted font-semibold uppercase tracking-wider flex items-center gap-2">
          <Layout className="w-3.5 h-3.5 text-dash-accent" />
          <span>Drag steps to reorder flow</span>
        </div>
      </div>
    </div>
  );
}

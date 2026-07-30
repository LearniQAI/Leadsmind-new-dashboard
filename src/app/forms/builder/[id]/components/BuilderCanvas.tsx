'use client';

import React, { useState, useEffect } from 'react';
import { useFormBuilder, FieldType, FormField } from './FormBuilderContext';
import { FormCanvasField } from './FormCanvasField';
import { LayoutTemplate, Type, Mail, Phone, AlignLeft, ChevronDown, CheckSquare } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

export function BuilderCanvas() {
  const { state, dispatch } = useFormBuilder();
  const { steps, fields } = state;
  const [activeStepId, setActiveStepId] = useState<string>('');
  const [isOver, setIsOver] = useState(false);

  // Sync active step ID with steps list
  useEffect(() => {
    if (steps.length > 0) {
      const exists = steps.some(s => s.id === activeStepId);
      if (!exists) {
        setActiveStepId(steps[0].id);
      }
    } else {
      setActiveStepId('');
    }
  }, [steps, activeStepId]);

  const handleAddField = (type: FieldType, index?: number, labelOverride?: string) => {
    const defaultLabel = labelOverride || {
      text: 'Short Text',
      email: 'Email Address',
      phone: 'Phone Number',
      textarea: 'Long Text',
      dropdown: 'Dropdown Select',
      checkbox: 'Checkbox Label',
    }[type];

    const defaultPlaceholder = labelOverride ? `Enter ${labelOverride.toLowerCase()}...` : {
      text: 'Enter response...',
      email: 'Enter email...',
      phone: 'Enter phone number...',
      textarea: 'Enter long response...',
      dropdown: 'Select an option',
      checkbox: '',
    }[type];

    const stepId = activeStepId || steps[0]?.id || 'default_step';

    const newField: FormField = {
      id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      label: defaultLabel,
      placeholder: defaultPlaceholder,
      required: false,
      width: 'full',
      helpText: '',
      options: type === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] : [],
      stepId,
    };

    dispatch({ type: 'ADD_FIELD', field: newField, index });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    // Convert relative indices back to absolute indices in the global fields list
    const stepFields = fields.filter(f => f.stepId === activeStepId);
    const sourceField = stepFields[result.source.index];
    const targetField = stepFields[result.destination.index];

    if (!sourceField || !targetField) return;

    const globalSourceIndex = fields.findIndex(f => f.id === sourceField.id);
    const globalTargetIndex = fields.findIndex(f => f.id === targetField.id);

    if (globalSourceIndex !== -1 && globalTargetIndex !== -1) {
      dispatch({
        type: 'REORDER_FIELDS',
        startIndex: globalSourceIndex,
        endIndex: globalTargetIndex,
      });
    }
  };

  const handleHTML5Drop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    const type = e.dataTransfer.getData('field-type') as FieldType;
    if (!type) return;
    const labelOverride = e.dataTransfer.getData('field-label') || undefined;

    const stepFields = fields.filter(f => f.stepId === activeStepId);
    const dropY = e.clientY;
    const fieldsElements = Array.from(document.querySelectorAll('[data-rfd-draggable-id]'));

    let targetIndex = stepFields.length;
    for (let i = 0; i < fieldsElements.length; i++) {
      const rect = fieldsElements[i].getBoundingClientRect();
      const middle = rect.top + rect.height / 2;
      if (dropY < middle) {
        targetIndex = i;
        break;
      }
    }

    handleAddField(type, targetIndex, labelOverride);
  };

  const activeStepFields = fields.filter(f => f.stepId === activeStepId);

  const QUICK_ADD: { type: FieldType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Short Text', icon: <Type size={12} /> },
    { type: 'email', label: 'Email', icon: <Mail size={12} /> },
    { type: 'phone', label: 'Phone', icon: <Phone size={12} /> },
    { type: 'textarea', label: 'Long Text', icon: <AlignLeft size={12} /> },
    { type: 'dropdown', label: 'Dropdown', icon: <ChevronDown size={12} /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={12} /> },
  ];

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden bg-dash-surface"
      style={{
        backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.06) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
      onClick={() => dispatch({ type: 'SELECT_FIELD', id: null })}
    >
      {/* Steps Navigation Bar */}
      {steps.length > 1 && (
        <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-dash-border overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-bold !text-dash-textMuted mr-2">Steps:</span>
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={(e) => { e.stopPropagation(); setActiveStepId(step.id); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors motion-reduce:transition-none border",
                activeStepId === step.id
                  ? 'bg-dash-accent/10 border-dash-accent/30 text-dash-accent'
                  : 'bg-transparent border-transparent !text-dash-textMuted hover:!text-dash-text'
              )}
            >
              {idx + 1}. {step.title}
            </button>
          ))}
        </div>
      )}

      <div className="custom-scrollbar flex-1 py-10 px-5 overflow-y-auto flex justify-center">
        <div className="w-full max-w-[640px] flex flex-col">

          {activeStepFields.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
              onDragLeave={() => setIsOver(false)}
              onDrop={handleHTML5Drop}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-5 px-10 py-16 bg-white border border-dashed border-dash-border rounded-2xl shadow-sm transition-colors motion-reduce:transition-none",
                isOver && "border-dash-accent bg-dash-accent/5"
              )}
            >
              <div className="w-16 h-16 rounded-2xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                <LayoutTemplate size={28} />
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="text-[13px] font-bold !text-dash-text">This step is empty</div>
                <div className="text-xs !text-dash-textMuted max-w-[280px] leading-relaxed">
                  Drag &amp; drop fields from the left library here, or add a common field below.
                </div>
              </div>

              <div className="w-full max-w-[380px] pt-5 border-t border-dash-border flex flex-col items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">Quick add</span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_ADD.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={(e) => { e.stopPropagation(); handleAddField(type); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-dash-surface hover:bg-dash-accent/10 border border-dash-border hover:border-dash-accent/30 !text-dash-textMuted hover:!text-dash-accent rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none"
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={handleHTML5Drop}
                className={cn(
                  "transition-colors motion-reduce:transition-none rounded-2xl flex flex-col gap-4 p-3",
                  isOver ? 'border border-dashed border-dash-accent/40 bg-dash-accent/5' : 'border border-transparent'
                )}
                style={{ minHeight: 450 }}
              >
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-2 gap-4"
                    >
                      {activeStepFields.map((field, index) => (
                        <FormCanvasField
                          key={field.id}
                          field={field}
                          index={index}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <div className="mt-auto pt-6">
                  <button className="w-full py-3.5 px-6 text-[13px] font-bold rounded-xl bg-dash-accent text-white opacity-90 pointer-events-none">
                    Submit form
                  </button>
                </div>
              </div>
            </DragDropContext>
          )}

        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useFormBuilder, FieldType, FormField } from './FormBuilderContext';
import { FormCanvasField } from './FormCanvasField';
import { LayoutTemplate, Plus, ListOrdered } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';

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

  const handleAddField = (type: FieldType, index?: number) => {
    const defaultLabel = {
      text: 'Short Text',
      email: 'Email Address',
      phone: 'Phone Number',
      textarea: 'Long Text',
      dropdown: 'Dropdown Select',
      checkbox: 'Checkbox Label',
    }[type];

    const defaultPlaceholder = {
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

    handleAddField(type, targetIndex);
  };

  const activeStepFields = fields.filter(f => f.stepId === activeStepId);

  return (
    <div 
      style={{ flex: 1, background: 'var(--n900)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onClick={() => dispatch({ type: 'SELECT_FIELD', id: null })}
    >
      {/* Steps Navigation Bar */}
      {steps.length > 1 && (
        <div className="flex items-center gap-2 px-6 py-3 bg-[#080f28] border-b border-white/5 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] mr-2">Steps:</span>
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={(e) => { e.stopPropagation(); setActiveStepId(step.id); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                activeStepId === step.id
                  ? 'bg-[#2563eb]/10 border-[#2563eb]/30 text-[#60a5fa]'
                  : 'bg-transparent border-transparent text-white/40 hover:text-white/80'
              }`}
            >
              {idx + 1}. {step.title}
            </button>
          ))}
        </div>
      )}

      <div className="custom-scrollbar" style={{ flex: 1, padding: '40px 20px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column' }}>

          {activeStepFields.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
              onDragLeave={() => setIsOver(false)}
              onDrop={handleHTML5Drop}
              className={`empty-state transition-all duration-300 ${
                isOver ? 'border-[#2563eb] bg-[#2563eb]/5 scale-[0.99]' : ''
              }`}
              style={{ flex: 1, padding: '80px 40px', justifyContent: 'center' }}
            >
              <div className="empty-state__icon">
                <LayoutTemplate size={48} />
              </div>
              <div className="empty-state__title">This step is empty</div>
              <div className="empty-state__desc" style={{ maxWidth: 280, marginBottom: 12 }}>
                Drag & drop fields here, or click standard fields in the left library to add them to this step.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
                {(['text', 'email', 'phone', 'textarea', 'dropdown', 'checkbox'] as const).map(type => (
                  <button
                    key={type}
                    onClick={(e) => { e.stopPropagation(); handleAddField(type); }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={handleHTML5Drop}
                className={`transition-all duration-300 ${
                  isOver ? 'border-[#2563eb]/50 bg-[#2563eb]/2 shadow-[inset_0_0_10px_rgba(37,99,235,0.05)]' : ''
                }`}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 16, padding: 24,
                  background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 'var(--r12)', minHeight: 450
                }}
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

                <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--bdr)' }}>
                  <button className="btn-primary" style={{ width: '100%', padding: '14px 24px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900, opacity: 0.9, pointerEvents: 'none' }}>
                    Submit Form
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

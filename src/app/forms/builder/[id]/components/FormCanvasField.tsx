'use client';

import React from 'react';
import { FormField, useFormBuilder } from './FormBuilderContext';
import { FieldRenderer } from './FieldRenderer';
import { Trash2, GripVertical } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';

interface FormCanvasFieldProps {
  field: FormField;
  index: number;
}

export function FormCanvasField({ field, index }: FormCanvasFieldProps) {
  const { state, dispatch } = useFormBuilder();
  const isSelected = state.selectedFieldId === field.id;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_FIELD', id: field.id });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_FIELD', id: field.id });
  };

  return (
    <Draggable draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={handleSelect}
          className={`relative group p-5 bg-white border rounded-2xl transition-colors motion-reduce:transition-none transform cursor-pointer ${
            isSelected
              ? 'border-dash-accent shadow-md scale-[1.01]'
              : snapshot.isDragging
              ? 'border-dash-accent/60 shadow-lg scale-[1.03] rotate-[0.5deg] z-50'
              : 'border-dash-border hover:border-dash-text/20 hover:-translate-y-[2px] hover:shadow-md'
          } ${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}
        >
          {/* Drag Handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none p-1 hover:bg-dash-surface rounded cursor-grab active:cursor-grabbing !text-dash-textMuted"
          >
            <GripVertical size={16} />
          </div>

          {/* Field Render Area */}
          <div className="pl-6 pr-8">
            <FieldRenderer field={field} mode="builder" />
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none p-2 hover:bg-red/10 rounded-lg !text-dash-textMuted hover:text-red"
            title="Delete Field"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </Draggable>
  );
}

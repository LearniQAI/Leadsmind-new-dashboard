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
          className={`relative group p-5 bg-[#0c1535]/80 border rounded-2xl transition-all duration-200 cursor-pointer ${
            isSelected
              ? 'border-[#2563eb] shadow-[0_0_15px_rgba(37,99,235,0.15)] bg-[#0c1535]'
              : snapshot.isDragging
              ? 'border-[#2563eb]/50 shadow-2xl bg-[#0c1535]'
              : 'border-white/5 hover:border-white/10'
          } ${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}
        >
          {/* Drag Handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded cursor-grab active:cursor-grabbing text-white/30"
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
            className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-[#ef4444]/10 rounded-lg text-[#4a5a82] hover:text-[#ef4444]"
            title="Delete Field"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </Draggable>
  );
}

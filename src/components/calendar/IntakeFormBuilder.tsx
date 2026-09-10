'use client';

import React, { useState } from 'react';
import { DashButton, DashInput } from '@/components/dashboard-ui';
import { Plus, GripVertical, Trash2, ListChecks, Save, Loader2, MousePointer2 } from 'lucide-react';
import { saveIntakeForm } from '@/app/actions/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Field {
 id: string;
 type: 'text' | 'number' | 'select' | 'textarea';
 label: string;
 required: boolean;
}

interface IntakeFormBuilderProps {
 calendarId: string;
 initialFields: Field[];
}

export function IntakeFormBuilder({ calendarId, initialFields }: IntakeFormBuilderProps) {
 const [fields, setFields] = useState<Field[]>(initialFields);
 const [isSaving, setIsSaving] = useState(false);

 const addField = () => {
  const newField: Field = {
   id: Math.random().toString(36).substr(2, 9),
   type: 'text',
   label: 'New question',
   required: false,
  };
  setFields([...fields, newField]);
 };

 const removeField = (id: string) => {
  setFields(fields.filter(f => f.id !== id));
 };

 const updateField = (id: string, updates: Partial<Field>) => {
  setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
 };

 const handleSave = async () => {
  setIsSaving(true);
  try {
   const res = await saveIntakeForm(calendarId, fields);
   if (res.success) {
    toast.success('Intake form saved');
   } else {
    toast.error('Failed to save intake form');
   }
  } catch {
   toast.error('Something went wrong');
  } finally {
   setIsSaving(false);
  }
 };

 return (
  <div className="bg-white border border-dash-border rounded-2xl p-6 mt-5 shadow-sm">
   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
    <div>
      <div className="flex items-center gap-2 mb-1.5 text-dash-accent">
       <ListChecks className="h-4 w-4" strokeWidth={2} />
       <span className="text-[12px] font-semibold">Intake questions</span>
      </div>
      <h5 className="text-lg font-bold font-space !text-dash-text">Ask before the meeting</h5>
      <p className="text-[13px] !text-dash-textMuted mt-1">Collect a few extra details from each person when they book.</p>
    </div>
    <div className="flex gap-2 shrink-0">
      <DashButton onClick={addField} variant="secondary" size="sm">
       <Plus className="h-3.5 w-3.5" /> Add question
      </DashButton>
      <DashButton onClick={handleSave} disabled={isSaving} size="sm">
       {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="h-3.5 w-3.5" />}
       Save
      </DashButton>
    </div>
   </div>

   <div className="space-y-3">
    {fields.map((field) => (
     <div key={field.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 rounded-xl bg-dash-surface border border-dash-border group hover:border-dash-accent/30 transition-colors motion-reduce:transition-none">
       <div className="h-8 w-8 rounded-lg bg-white border border-dash-border flex items-center justify-center text-dash-textMuted opacity-60 group-hover:opacity-100 transition-opacity motion-reduce:transition-none shrink-0">
        <GripVertical className="h-4 w-4" />
       </div>

       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        <DashInput
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
          placeholder="Question label"
          className="h-10"
        />
        <div className="flex gap-2">
          <select
           value={field.type}
           onChange={(e) => updateField(field.id, { type: e.target.value as any })}
           className="flex-1 h-10 rounded-lg border border-dash-border bg-white px-3 text-[13px] text-dash-text outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-dash-accent"
          >
           <option value="text">Short text</option>
           <option value="textarea">Long text</option>
           <option value="number">Number</option>
           <option value="select">Dropdown</option>
          </select>
          <button
           type="button"
           onClick={() => updateField(field.id, { required: !field.required })}
           className={cn(
             'h-10 rounded-lg px-3 border text-[12px] font-semibold transition-colors motion-reduce:transition-none',
             field.required
               ? 'bg-dash-accent/10 text-dash-accent border-dash-accent/20'
               : 'text-dash-textMuted border-dash-border hover:text-dash-text'
           )}
          >
           Required
          </button>
          <button
           type="button"
           onClick={() => removeField(field.id)}
           className="h-10 w-10 rounded-lg text-dash-textMuted hover:text-red hover:bg-red/5 transition-colors motion-reduce:transition-none flex items-center justify-center shrink-0"
          >
           <Trash2 className="h-4 w-4" />
          </button>
        </div>
       </div>
     </div>
    ))}
   </div>

   {fields.length === 0 && (
     <div className="py-12 text-center border border-dashed border-dash-border rounded-xl bg-dash-surface">
      <MousePointer2 className="h-7 w-7 text-dash-textMuted mx-auto mb-2.5" strokeWidth={2} />
      <p className="text-[13px] font-semibold text-dash-text">No questions yet</p>
      <p className="text-[12px] text-dash-textMuted mt-0.5">Add a question to start building your intake form.</p>
     </div>
   )}
  </div>
 );
}

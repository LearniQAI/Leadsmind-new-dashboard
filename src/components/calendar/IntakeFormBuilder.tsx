'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
 Plus, 
 GripVertical, 
 Trash2, 
 Settings2, 
 FileText,
 MousePointer2,
 ListFilter,
 Save,
 Rocket,
 LayoutTemplate
} from 'lucide-react';
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
   label: 'New Question',
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
    toast.success('Intake form configuration persisted');
   } else {
    toast.error('Failed to sync intake form');
   }
  } catch {
   toast.error('Operation failed');
  } finally {
   setIsSaving(false);
  }
 };

 return (
  <div className="card__wrapper border-primary/10 mt-[20px]">
   <div className="card__title-wrap flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
    <div>
      <div className="flex items-center gap-2 mb-2">
       <ListFilter className="h-4 w-4 text-primary" />
       <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Qualitative Acquisition</span>
      </div>
      <h5 className="card__heading-title uppercase">Intake Protocol</h5>
      <p className="card__desc style_two text-sm font-medium mt-2">Design the dynamic data payload for each booking.</p>
    </div>
    <div className="flex gap-3">
      <Button 
       onClick={addField} 
       variant="outline"
       className="bg-card dark:bg-card-dark border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-xl gap-2 font-bold uppercase text-[10px] h-12 px-6 hover:bg-primary/5 transition-all"
      >
       <Plus className="h-3.5 w-3.5" />
       Add Question
      </Button>
      <Button 
       onClick={handleSave} 
       disabled={isSaving}
       className="bg-primary hover:bg-primary-dark text-white rounded-xl gap-2 font-bold uppercase text-[10px] h-12 px-8 shadow-lg shadow-primary/10"
      >
       {isSaving ? <Rocket className="h-3.5 w-3.5 animate-bounce" /> : <Save className="h-3.5 w-3.5" />}
       Sync Protocol
      </Button>
    </div>
   </div>

   <div className="space-y-4">
    {fields.map((field) => (
     <div key={field.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 rounded-xl bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark group hover:border-primary/30 transition-all duration-500">
       <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-body dark:text-body-dark opacity-20 group-hover:text-primary group-hover:opacity-100 transition-all">
        <GripVertical className="h-4 w-4" />
       </div>
       
       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <Input 
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
          className="bg-card dark:bg-card-dark border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-lg h-11 text-sm font-medium"
          placeholder="Question Label"
        />
        <div className="flex gap-2">
          <select 
           value={field.type}
           onChange={(e) => updateField(field.id, { type: e.target.value as any })}
           className="flex-1 bg-card dark:bg-card-dark border border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-lg h-11 px-4 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          >
           <option value="text">Text Input</option>
           <option value="textarea">Multi-line Area</option>
           <option value="number">Numeric Value</option>
           <option value="select">Dropdown Choice</option>
          </select>
          <Button 
           onClick={() => updateField(field.id, { required: !field.required })}
           variant="ghost"
           className={cn(
             "h-11 rounded-lg px-4 border border-border dark:border-border-dark transition-all",
             field.required ? "bg-primary/10 text-primary border-primary/20" : "text-body dark:text-body-dark opacity-30"
           )}
          >
           <span className="text-[9px] font-black uppercase tracking-widest">Req</span>
          </Button>
          <Button 
           variant="ghost" 
           onClick={() => removeField(field.id)}
           className="h-11 w-11 rounded-lg text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all p-0"
          >
           <Trash2 className="h-4 w-4" />
          </Button>
        </div>
       </div>
     </div>
    ))}
   </div>

   {fields.length === 0 && (
     <div className="p-16 text-center border border-dashed border-border dark:border-border-dark rounded-xl bg-bgBody/30">
      <MousePointer2 className="h-8 w-8 text-placeholder dark:text-placeholder-dark mx-auto mb-4 opacity-40" />
      <p className="text-[10px] font-black text-placeholder dark:text-placeholder-dark uppercase tracking-[0.4em]">Initialize acquisition schema</p>
     </div>
   )}
  </div>
 );
}

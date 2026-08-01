'use client';

import React from 'react';
import { DashInput, DashTextarea, DashFormField } from '@/components/dashboard-ui/FormField';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { getActionDef } from '@/lib/automation/actionConfigSchema';
import { TagPicker, PipelineStagePicker, MemberPicker, CoursePicker, BundlePicker, ReferenceData } from './EntityPickers';

interface StepConfigFormProps {
  type: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  referenceData: ReferenceData;
}

export function StepConfigForm({ type, config, onChange, referenceData }: StepConfigFormProps) {
  const def = getActionDef(type);
  if (!def || def.fields.length === 0) return null;

  const setField = (key: string, value: any) => onChange({ ...config, [key]: value });

  return (
    <div className="space-y-3">
      {def.fields.map((field) => {
        const value = config[field.key] ?? '';
        return (
          <DashFormField key={field.key} label={field.label} hint={field.hint} required={field.required}>
            {field.type === 'text' && (
              <DashInput value={value} placeholder={field.placeholder} onChange={(e) => setField(field.key, e.target.value)} className="h-10 text-[13px]" />
            )}
            {field.type === 'number' && (
              <DashInput type="number" value={value} onChange={(e) => setField(field.key, e.target.value === '' ? '' : Number(e.target.value))} className="h-10 text-[13px]" />
            )}
            {field.type === 'textarea' && (
              <DashTextarea value={value} placeholder={field.placeholder} onChange={(e) => setField(field.key, e.target.value)} className="text-[13px]" />
            )}
            {field.type === 'boolean' && (
              <label className="flex items-center gap-2 text-[12px] font-semibold !text-dash-text">
                <input type="checkbox" checked={!!value} onChange={(e) => setField(field.key, e.target.checked)} />
                Enabled
              </label>
            )}
            {field.type === 'select' && (
              <Select value={value || undefined} onValueChange={(v) => setField(field.key, v)}>
                <SelectTrigger className="h-10 border-dash-border rounded-xl text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  {(field.options || []).map((o) => <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {field.type === 'tag' && <TagPicker value={value} onChange={(v) => setField(field.key, v)} tags={referenceData.tags} />}
            {field.type === 'pipelineStage' && <PipelineStagePicker value={value} onChange={(v) => setField(field.key, v)} stages={referenceData.pipelineStages} />}
            {field.type === 'member' && <MemberPicker value={value} onChange={(v) => setField(field.key, v)} members={referenceData.members} />}
            {field.type === 'course' && <CoursePicker value={value} onChange={(v) => setField(field.key, v)} courses={referenceData.courses} />}
            {field.type === 'bundle' && <BundlePicker value={value} onChange={(v) => setField(field.key, v)} bundles={referenceData.bundles} />}
          </DashFormField>
        );
      })}
    </div>
  );
}

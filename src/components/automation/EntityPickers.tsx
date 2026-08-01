'use client';

import React from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export interface ReferenceData {
  tags: { id: string; name: string }[];
  pipelineStages: { id: string; name: string; pipelineName: string }[];
  members: { id: string; name: string }[];
  courses: { id: string; title: string }[];
  bundles: { id: string; name: string }[];
}

function BasePicker({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full border-dash-border rounded-xl text-[13px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-[12px] !text-dash-textMuted">None found</div>
        ) : options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Tag stores the tag NAME in step config (matches apply_tag/add_tag's real
// implementation in actions_registry.ts, which takes config.tag as a name
// string, not an id).
export function TagPicker({ value, onChange, tags }: { value: string; onChange: (v: string) => void; tags: ReferenceData['tags'] }) {
  return <BasePicker value={value} onChange={onChange} placeholder="Select a tag" options={tags.map((t) => ({ value: t.name, label: t.name }))} />;
}

export function PipelineStagePicker({ value, onChange, stages }: { value: string; onChange: (v: string) => void; stages: ReferenceData['pipelineStages'] }) {
  return <BasePicker value={value} onChange={onChange} placeholder="Select a pipeline stage" options={stages.map((s) => ({ value: s.id, label: `${s.pipelineName} — ${s.name}` }))} />;
}

export function MemberPicker({ value, onChange, members }: { value: string; onChange: (v: string) => void; members: ReferenceData['members'] }) {
  return <BasePicker value={value} onChange={onChange} placeholder="Select a team member" options={members.map((m) => ({ value: m.id, label: m.name }))} />;
}

export function CoursePicker({ value, onChange, courses }: { value: string; onChange: (v: string) => void; courses: ReferenceData['courses'] }) {
  return <BasePicker value={value} onChange={onChange} placeholder="Select a course" options={courses.map((c) => ({ value: c.id, label: c.title }))} />;
}

export function BundlePicker({ value, onChange, bundles }: { value: string; onChange: (v: string) => void; bundles: ReferenceData['bundles'] }) {
  return <BasePicker value={value} onChange={onChange} placeholder="Select a bundle" options={bundles.map((b) => ({ value: b.id, label: b.name }))} />;
}

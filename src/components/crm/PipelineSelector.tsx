'use client';

import { useRouter } from 'next/navigation';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Pipeline } from '@/types/crm.types';

interface PipelineSelectorProps {
 pipelines: Pipeline[];
 activePipelineId: string;
}

export function PipelineSelector({ pipelines, activePipelineId }: PipelineSelectorProps) {
 const router = useRouter();

 const handleValueChange = (value: string | null) => {
  if (!value) return;
  router.push(`/apps/pipelines?pipelineId=${value}`);
  router.refresh();
 };

 return (
  <Select defaultValue={activePipelineId} onValueChange={handleValueChange}>
   <SelectTrigger className="w-[200px] bg-dash-bg border-dash-border text-dash-text h-11 rounded-xl focus:ring-primary/50">
    <SelectValue placeholder="Select Pipeline" />
   </SelectTrigger>
   <SelectContent className="bg-dash-surface border-dash-border text-dash-text">
    {pipelines.map((p) => (
     <SelectItem key={p.id} value={p.id} className="focus:bg-primary/10 focus:text-primary">
      {p.name}
     </SelectItem>
    ))}
   </SelectContent>
  </Select>
 );
}

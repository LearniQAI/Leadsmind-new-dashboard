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
   <SelectTrigger className="w-[200px] bg-white/[0.03] border-white/10 text-white h-11 rounded-xl focus:ring-primary/50">
    <SelectValue placeholder="Select Pipeline" />
   </SelectTrigger>
   <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
    {pipelines.map((p) => (
     <SelectItem key={p.id} value={p.id} className="focus:bg-primary/20 focus:text-primary">
      {p.name}
     </SelectItem>
    ))}
   </SelectContent>
  </Select>
 );
}

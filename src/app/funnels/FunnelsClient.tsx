'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Layout, ArrowRight, MoreVertical, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { createFunnel } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function FunnelsClient({ initialFunnels }: { initialFunnels: any[] }) {
 const router = useRouter();

 const handleCreate = async () => {
  const name = window.prompt('Enter Funnel Name:');
  if (!name) return;

  const res = await createFunnel(name);
  if (res.error) {
   toast.error(res.error);
  } else {
   toast.success('Funnel created successfully!');
   router.refresh();
  }
 };

 return (
  <div className="space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">Marketing <span className="text-primary">Funnels</span></h1>
     <p className="text-white/40 text-sm font-medium mt-2">Design high-performance conversion pathways with neural pathing.</p>
    </div>
    <Button 
     onClick={handleCreate}
     className="bg-primary hover:bg-primary-dark text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
    >
     <Plus className="w-4 h-4 mr-2" /> New Funnel
    </Button>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-6">
    {initialFunnels.length === 0 ? (
     <div className="col-span-full py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
       <Filter className="w-8 h-8 text-white/20" />
      </div>
      <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">No Active Funnels</h3>
      <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">Initialize your first conversion node</p>
     </div>
    ) : (
     initialFunnels.map(funnel => (
      <div key={funnel.id} className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 group hover:border-primary/50 transition-all duration-500 shadow-xl shadow-black/40">
       <div className="flex justify-between items-start mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500">
         <Filter size={20} />
        </div>
        <Badge className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none ${funnel.is_published ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
         {funnel.is_published ? 'Live Node' : 'Draft'}
        </Badge>
       </div>

       <div className="mb-8">
        <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1 group-hover:text-primary transition-colors">{funnel.name}</h4>
        <div className="flex items-center gap-2 text-white/30 text-[10px] font-bold tracking-widest">
         <span className="opacity-40 uppercase">Path:</span>
         <span className="text-primary/70 lowercase">/{funnel.subdomain}</span>
        </div>
       </div>

       <div className="flex items-center justify-between pt-6 border-t border-white/5">
        <div className="flex -space-x-2">
         {[1, 2, 3].map(i => (
          <div key={i} className="w-8 h-8 rounded-full bg-[#13132b] border-2 border-[#0b0b1a] flex items-center justify-center text-[10px] font-black text-white/40">
           {i}
          </div>
         ))}
         <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-[#0b0b1a] flex items-center justify-center text-[10px] font-black text-primary">
          +
         </div>
        </div>
        <Button className="h-10 px-5 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-primary transition-all flex items-center gap-2">
         Edit <ArrowRight size={12} />
        </Button>
       </div>
      </div>
     ))
    )}
   </div>
  </div>
 );
}

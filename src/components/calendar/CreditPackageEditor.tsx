'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
 Plus, 
 CreditCard, 
 Zap,
 TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditPackage {
 id: string;
 name: string;
 credits_total: number;
 price: number;
}

interface CreditPackageEditorProps {
 calendarId: string;
}

export function CreditPackageEditor({ calendarId }: CreditPackageEditorProps) {
 const [packages, setPackages] = useState<CreditPackage[]>([
  { id: '1', name: 'Starter Node Pack', credits_total: 10, price: 49 },
  { id: '2', name: 'Growth Engine Pack', credits_total: 50, price: 199 }
 ]);

 const addPackage = () => {
  const newPkg: CreditPackage = {
   id: Math.random().toString(36).substr(2, 9),
   name: 'New Credit Tier',
   credits_total: 25,
   price: 99
  };
  setPackages([...packages, newPkg]);
 };

 return (
  <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
    <div>
      <div className="flex items-center gap-2 mb-2">
       <CreditCard className="h-4 w-4 text-primary" />
       <span className="text-[10px] font-bold text-primary">Monetization layer</span>
      </div>
      <h5 className="text-lg font-bold !text-dash-text">Value credits</h5>
      <p className="text-sm font-medium !text-dash-textMuted mt-2">Manage session monetization and token yields.</p>
    </div>
    <Button
     onClick={addPackage}
     className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold text-[10px] h-12 px-8 shadow-lg shadow-primary/10 transition-colors motion-reduce:transition-none"
    >
     <Plus className="h-3.5 w-3.5" />
     Deploy package
    </Button>
   </div>

   <div className="space-y-4">
    {packages.map((pkg) => (
     <div key={pkg.id} className="p-6 rounded-xl bg-dash-surface border border-dash-border group hover:border-primary/30 transition-all relative overflow-hidden">
       <div className="flex items-center justify-between mb-6">
        <div>
         <h6 className="text-base font-black text-dash-text uppercase tracking-tighter">{pkg.name}</h6>
         <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
          {pkg.credits_total} Intelligence Credits
         </p>
        </div>
        <div className="text-right">
         <span className="text-xl font-black text-dash-text tracking-tighter">${pkg.price}</span>
         <p className="text-[9px] font-bold text-dash-textMuted uppercase tracking-[0.2em] mt-1">One-time yield</p>
        </div>
       </div>

       <div className="flex items-center gap-3 pt-4 border-t border-dash-border opacity-40 group-hover:opacity-100 transition-opacity">
        <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[8px] font-black text-primary/60 px-3 py-1 rounded-full uppercase">AUTO-SYNC</Badge>
        <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[8px] font-black text-primary/60 px-3 py-1 rounded-full uppercase">SECURE-PAY</Badge>
       </div>
       
       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
        <CreditCard className="h-12 w-12" />
       </div>
     </div>
    ))}

    {!packages.length && (
      <div className="p-16 border border-dashed border-dash-border rounded-xl text-center bg-dash-surface/50">
       <Zap className="h-8 w-8 text-dash-textMuted mx-auto mb-4 opacity-40" />
       <p className="text-[10px] font-black text-dash-textMuted uppercase tracking-[0.4em]">No active packages</p>
      </div>
    )}
   </div>
  </div>
 );
}

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
    <div className="card__wrapper border-primary/10">
      <div className="card__title-wrap flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <CreditCard className="h-4 w-4 text-primary" />
             <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Monetization Layer</span>
           </div>
           <h5 className="card__heading-title uppercase italic">Value Credits</h5>
           <p className="card__desc style_two text-sm italic font-medium mt-2">Manage session monetization and token yields.</p>
        </div>
        <Button 
          onClick={addPackage}
          className="bg-primary hover:bg-primary-dark text-white rounded-xl gap-2 font-bold uppercase italic text-[10px] h-12 px-8 shadow-lg shadow-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Deploy Package
        </Button>
      </div>

      <div className="space-y-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className="p-6 rounded-xl bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark group hover:border-primary/30 transition-all relative overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <div>
                  <h6 className="text-base font-black text-heading dark:text-heading-dark italic uppercase tracking-tighter">{pkg.name}</h6>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                    {pkg.credits_total} Intelligence Credits
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-heading dark:text-heading-dark italic tracking-tighter">${pkg.price}</span>
                  <p className="text-[9px] font-bold text-body dark:text-body-dark opacity-30 uppercase tracking-[0.2em] mt-1">One-time yield</p>
                </div>
             </div>

             <div className="flex items-center gap-3 pt-4 border-t border-border dark:border-border-dark opacity-40 group-hover:opacity-100 transition-opacity">
                <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[8px] font-black text-primary/60 px-3 py-1 rounded-full uppercase">AUTO-SYNC</Badge>
                <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[8px] font-black text-primary/60 px-3 py-1 rounded-full uppercase">SECURE-PAY</Badge>
             </div>
             
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                <CreditCard className="h-12 w-12" />
             </div>
          </div>
        ))}

        {!packages.length && (
           <div className="p-16 border border-dashed border-border dark:border-border-dark rounded-xl text-center bg-bgBody/50 dark:bg-bgBody-dark/50">
              <Zap className="h-8 w-8 text-placeholder dark:text-placeholder-dark mx-auto mb-4 opacity-40" />
              <p className="text-[10px] font-black text-placeholder dark:text-placeholder-dark uppercase tracking-[0.4em]">No active packages</p>
           </div>
        )}
      </div>
    </div>
  );
}

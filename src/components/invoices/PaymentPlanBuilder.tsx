'use client';

import React, { useState } from 'react';
import { Layers, Calendar, Plus, Trash2, ArrowRight } from 'lucide-react';
import { PremiumInput } from '@/components/ui/premium-inputs';
import { addDays, format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface PaymentPlanBuilderProps {
  totalAmount: number;
  onPlanChange: (plan: any) => void;
}

const PaymentPlanBuilder: React.FC<PaymentPlanBuilderProps> = ({
  totalAmount,
  onPlanChange,
}) => {
  const [instalments, setInstalments] = useState(3);
  const [interval, setInterval] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const generatePlan = () => {
    const planItems = [];
    const instalmentAmount = Number((totalAmount / instalments).toFixed(2));
    
    for (let i = 1; i <= instalments; i++) {
      planItems.push({
        instalment_number: i,
        amount_due: i === instalments ? (totalAmount - (instalmentAmount * (instalments - 1))) : instalmentAmount,
        due_date: format(addDays(new Date(startDate), (i - 1) * interval), 'yyyy-MM-dd'),
        status: 'unpaid'
      });
    }
    return planItems;
  };

  const plan = generatePlan();

  return (
    <div className="space-y-6 p-6 bg-dash-surface border border-dash-border rounded-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
          <Layers className="h-5 w-5 text-dash-accent" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-dash-text font-space uppercase tracking-wide">Payment Plan</h3>
          <p className="text-[10px] text-dash-textMuted uppercase tracking-widest font-semibold">Installment splitting engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest">Instalments</label>
          <PremiumInput
            type="number"
            value={instalments}
            onChange={(e) => setInstalments(Number(e.target.value))}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest">Interval (Days)</label>
          <PremiumInput
            type="number"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest">Start Date</label>
          <PremiumInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-2 mt-6">
        <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest block mb-3">Projected Schedule</label>
        {plan.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-dash-bg border border-dash-border group animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-full bg-dash-surface flex items-center justify-center text-[10px] font-bold text-dash-textMuted border border-dash-border">
                  {item.instalment_number}
               </div>
               <div>
                  <p className="text-xs font-bold text-dash-text">Installment {item.instalment_number}</p>
                  <p className="text-[10px] text-dash-textMuted flex items-center gap-1"><Calendar size={10} /> Due {item.due_date}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-sm font-bold text-dash-accent font-space">{formatCurrency(item.amount_due)}</p>
               <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest">unpaid</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-dash-border flex justify-between items-center gap-4">
         <div className="text-[10px] text-dash-textMuted font-medium max-w-[200px]">
            This plan will generate {instalments} tracked payments across the next {instalments * interval} days.
         </div>
         <button className="btn-primary !h-10 !px-6 text-xs gap-2 shrink-0">
            Confirm Plan <ArrowRight size={14} />
         </button>
      </div>
    </div>
  );
};

export default PaymentPlanBuilder;

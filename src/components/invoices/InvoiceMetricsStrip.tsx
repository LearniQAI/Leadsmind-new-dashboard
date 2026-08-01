import React from 'react';
import { TrendingUp, AlertTriangle, Eraser } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';

interface InvoiceMetricsStripProps {
  totalCollected: number;
  totalOverdue: number;
  badDebtTotal: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

export function InvoiceMetricsStrip({ totalCollected, totalOverdue, badDebtTotal }: InvoiceMetricsStripProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pt-6">
      <DashCard padding="default" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] !text-dash-textMuted font-medium">Total collected</span>
          <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green">
            <TrendingUp size={16} />
          </div>
        </div>
        <span className="text-[28px] font-bold text-green">{formatCurrency(totalCollected)}</span>
      </DashCard>

      <DashCard padding="default" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] !text-dash-textMuted font-medium">Total overdue</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <AlertTriangle size={16} />
          </div>
        </div>
        <span className="text-[28px] font-bold text-amber-600">{formatCurrency(totalOverdue)}</span>
      </DashCard>

      <DashCard padding="default" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] !text-dash-textMuted font-medium">Bad debt written off</span>
          <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center text-red">
            <Eraser size={16} />
          </div>
        </div>
        <span className="text-[28px] font-bold text-red">{formatCurrency(badDebtTotal)}</span>
      </DashCard>
    </div>
  );
}

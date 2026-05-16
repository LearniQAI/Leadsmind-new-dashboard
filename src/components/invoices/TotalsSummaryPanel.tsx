'use client';

import React from 'react';
import { PremiumInput } from '@/components/ui/premium-inputs';
import { calculateInvoiceTotals, LineItem } from '@/lib/invoicing/calculations';
import { cn } from '@/lib/utils';

interface TotalsSummaryPanelProps {
  items: LineItem[];
  shippingCharges: number;
  adjustment: number;
  currency?: string;
  onShippingChange: (value: number) => void;
  onAdjustmentChange: (value: number) => void;
}

const TotalsSummaryPanel: React.FC<TotalsSummaryPanelProps> = ({
  items,
  shippingCharges,
  adjustment,
  currency = '$',
  onShippingChange,
  onAdjustmentChange,
}) => {
  const { subtotal, taxTotal, grandTotal } = calculateInvoiceTotals(items, shippingCharges, adjustment);

  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r12)] w-full max-w-md ml-auto">
      {/* Subtotal Row */}
      <div className="flex justify-between items-center text-sm font-dm-sans text-[var(--t2)]">
        <span>Subtotal</span>
        <span className="font-space font-semibold text-[var(--t1)]">{formatCurrency(subtotal)}</span>
      </div>

      {/* Tax Total Row */}
      <div className="flex justify-between items-center text-sm font-dm-sans text-[var(--t2)]">
        <span>Tax Total</span>
        <span className="font-space font-semibold text-[var(--t1)]">{formatCurrency(taxTotal)}</span>
      </div>

      {/* Shipping Input Row */}
      <div className="flex justify-between items-center gap-4">
        <label className="text-sm font-dm-sans text-[var(--t2)] whitespace-nowrap">Shipping Charges</label>
        <div className="relative w-32">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)] text-xs">{currency}</span>
          <PremiumInput
            type="number"
            className="h-9 pl-7 text-right text-xs"
            value={shippingCharges}
            onChange={(e) => onShippingChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Adjustment Input Row */}
      <div className="flex justify-between items-center gap-4">
        <label className="text-sm font-dm-sans text-[var(--t2)] whitespace-nowrap">Adjustment</label>
        <div className="relative w-32">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)] text-xs">{currency}</span>
          <PremiumInput
            type="number"
            className="h-9 pl-7 text-right text-xs"
            value={adjustment}
            onChange={(e) => onAdjustmentChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="h-px bg-[var(--bdr)] my-2" />

      {/* Grand Total Row */}
      <div className="flex justify-between items-center">
        <span className="text-base font-semibold font-dm-sans text-[var(--t1)]">Grand Total</span>
        <span className="text-2xl font-bold font-space text-[var(--amber)]">
          {formatCurrency(grandTotal)}
        </span>
      </div>
    </div>
  );
};

export default TotalsSummaryPanel;

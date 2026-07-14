'use client';

import React from 'react';
import { DashInput } from '@/components/dashboard-ui/FormField';
import { LineItem } from '@/lib/invoicing/calculations';
import { Plus, Trash2 } from 'lucide-react';

interface LineItemBuilderProps {
  items: (LineItem & { id: string; description: string })[];
  onItemsChange: (items: (LineItem & { id: string; description: string })[]) => void;
}

const LineItemBuilder: React.FC<LineItemBuilderProps> = ({ items, onItemsChange }) => {
  const addItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      taxRate: 0,
    };
    onItemsChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<LineItem & { description: string }>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_100px_120px_100px_120px_40px] gap-4 items-center px-4 py-2 bg-dash-surface border-b border-dash-border !text-dash-textMuted text-[11px] font-bold">
        <span>Description</span>
        <span>Quantity</span>
        <span>Rate</span>
        <span>Tax %</span>
        <span className="text-right">Amount</span>
        <span></span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_100px_120px_100px_120px_40px] gap-4 items-center group px-4 py-1"
          >
            <DashInput
              placeholder="Item description..."
              className="h-10 text-sm"
              value={item.description}
              onChange={(e) => updateItem(item.id, { description: e.target.value })}
            />
            <DashInput
              type="number"
              className="h-10 text-sm text-center"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
            />
            <DashInput
              type="number"
              className="h-10 text-sm text-right"
              value={item.rate}
              onChange={(e) => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
            />
            <DashInput
              type="number"
              className="h-10 text-sm text-center"
              value={item.taxRate}
              onChange={(e) => updateItem(item.id, { taxRate: parseFloat(e.target.value) || 0 })}
            />
            <div className="text-right font-semibold !text-dash-text">
              {(item.quantity * item.rate).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-red/10 text-red opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none hover:bg-red/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="flex items-center justify-center gap-2 py-3 mt-2 rounded-xl border border-dashed border-dash-border !text-dash-textMuted hover:text-dash-accent hover:border-dash-accent hover:bg-dash-accent/5 transition-all motion-reduce:transition-none group"
      >
        <Plus size={16} className="group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none" />
        <span className="text-sm font-semibold">Add line item</span>
      </button>
    </div>
  );
};

export default LineItemBuilder;

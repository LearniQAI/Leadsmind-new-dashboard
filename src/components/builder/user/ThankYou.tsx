"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNode, useEditor } from '@craftjs/core';
import { useSearchParams } from 'next/navigation';
import { getFunnelOrderChain } from '@/app/actions/funnelOrders';
import { ThankYouSettings } from './ThankYouSettings';

export interface ThankYouProps {
  heading: string;
  message: string;
  showOrderSummary: boolean;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  headingColor: string;
  textColor: string;
  accentColor: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' };

export const ThankYou = (allProps: ThankYouProps & any) => {
  const {
    heading, message, showOrderSummary,
    backgroundColor, borderRadius, padding, headingColor, textColor, accentColor,
    dragRef, ...props
  } = allProps;

  const { connectors: { connect, drag } } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const searchParams = useSearchParams();

  const [chain, setChain] = useState<{ id: string; amount: number; status: string }[] | null>(null);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState('ZAR');

  useEffect(() => {
    if (enabled || !showOrderSummary) return;
    const orderId = searchParams?.get('order');
    if (!orderId) return;
    getFunnelOrderChain(orderId).then((res) => {
      if (res.success) {
        setChain(res.orders || []);
        setTotal(res.total || 0);
        setCurrency(res.currency || 'ZAR');
      }
    });
  }, [enabled, showOrderSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  const symbol = CURRENCY_SYMBOL[currency] || currency || '';
  const paidOrders = (chain || []).filter((o) => o.status === 'paid');

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
          connect(ref);
          drag(ref);
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className="transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 text-center"
      style={{ backgroundColor, borderRadius: `${borderRadius}px`, padding: `${padding}px` }}
    >
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}>
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black mb-2" style={{ color: headingColor }}>{heading || 'Thank You!'}</h2>
      <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: textColor }}>{message}</p>

      {showOrderSummary && paidOrders.length > 0 && (
        <div className="mt-6 max-w-sm mx-auto p-4 rounded-2xl border text-left" style={{ borderColor: `${textColor}22` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-3 opacity-60" style={{ color: textColor }}>Order summary</div>
          {paidOrders.map((o, i) => (
            <div key={o.id} className="flex items-center justify-between text-sm py-1.5" style={{ color: textColor }}>
              <span>{i === 0 ? 'Order' : `Add-on ${i}`}</span>
              <span className="font-bold">{symbol}{Number(o.amount).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm font-black pt-2 mt-2 border-t" style={{ color: headingColor, borderColor: `${textColor}22` }}>
            <span>Total</span>
            <span>{symbol}{total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

ThankYou.craft = {
  displayName: 'Thank You',
  props: {
    heading: 'Thank You!',
    message: 'Your order is confirmed. A receipt has been sent to your email.',
    showOrderSummary: true,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 48,
    headingColor: '#111827',
    textColor: '#4b5563',
    accentColor: '#10b981',
  },
  related: {
    settings: ThankYouSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

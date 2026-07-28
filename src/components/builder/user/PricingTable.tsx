"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResponsiveValue } from '@/lib/builder/hooks';

// The non-highlighted tier's card background is a near-transparent overlay
// (rgba(255,255,255,0.03)) — effectively just whatever sits behind it — so a
// flat hardcoded default text color can't safely contrast against it on every
// page theme. Deriving from the section's own backgroundColor (which authors
// already set deliberately per page) instead of defaulting blind to white
// means a template that forgets to set textColor explicitly (this was
// happening — see ai-saas.ts) degrades gracefully instead of going invisible
// the moment it's used on a light-themed page.
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  // Perceived luminance (ITU-R BT.601)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export const PricingTable = ({
  // Templates/deserialized JSON can omit this entirely — plans.map below is
  // unguarded, so default it rather than let a bare PricingTable node crash the canvas.
  plans = [],
  primaryColor = '#2563eb',
  accentColor = '#f59e0b',
  backgroundColor = 'transparent',
  textColor,
  dragRef,
  ...props
}: any) => {
  const { connectors: { connect, drag } } = useNode();
  const resolvedTextColor = textColor
    ?? (isLightColor(backgroundColor) ? '#111827' : '#ffffff');

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
      className="flex flex-col md:grid md:grid-cols-3 gap-8 p-6 md:p-12 w-full transition-all duration-500"
      style={{ backgroundColor }}
    >
      {plans.map((plan: any, i: number) => (
        <div 
          key={i} 
          className={`relative p-8 rounded-[32px] border transition-all duration-300 ${plan.highlight ? 'shadow-2xl z-10 md:scale-105' : 'hover:border-white/20'}`}
          style={{
            backgroundColor: plan.highlight ? primaryColor : 'rgba(255,255,255,0.03)',
            borderColor: plan.highlight ? primaryColor : 'rgba(255,255,255,0.1)',
            color: plan.highlight ? '#ffffff' : resolvedTextColor
          }}
        >
          {plan.highlight && (
            <div 
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-xl animate-pulse"
              style={{ backgroundColor: accentColor, color: '#ffffff' }}
            >
              Most Popular
            </div>
          )}
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest opacity-60">{plan.name}</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                <span className="text-sm font-bold opacity-40">{plan.period}</span>
              </div>
            </div>
            
            <p className="text-sm leading-relaxed opacity-70 min-h-[40px]">{plan.description}</p>
            
            <div className="h-[1px] w-full bg-current opacity-10" />
            
            <ul className="space-y-4 py-2">
              {plan.features.map((feature: string, j: number) => (
                <li key={j} className="flex items-center gap-3 text-sm font-medium">
                  <div 
                    className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: plan.highlight ? 'rgba(255,255,255,0.2)' : `${primaryColor}20` }}
                  >
                    <Check className="h-3 w-3" style={{ color: plan.highlight ? '#ffffff' : primaryColor }} />
                  </div>
                  <span className="opacity-90">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full rounded-2xl font-black uppercase tracking-widest text-[11px] h-14 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ 
                backgroundColor: plan.highlight ? '#ffffff' : primaryColor,
                color: plan.highlight ? primaryColor : '#ffffff'
              }}
            >
              {plan.buttonText}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

import { PricingTableSettings } from './PricingTableSettings';

PricingTable.craft = {
  displayName: 'Pricing Table',
  props: {
    plans: [
      { name: 'Starter', price: '$49', period: '/mo', description: 'Small teams getting started', features: ['5 Workflows', '100 Contacts', 'Basic Analytics'], buttonText: 'Get Started', highlight: false },
      { name: 'Pro', price: '$99', period: '/mo', description: 'Growing businesses', features: ['Unlimited Workflows', '5,000 Contacts', 'Advanced Analytics', 'Priority Support'], buttonText: 'Upgrade to Pro', highlight: true },
      { name: 'Elite', price: '$249', period: '/mo', description: 'Enterprise-grade scale', features: ['Everything in Pro', 'Unlimited Contacts', 'Dedicate Manager', 'Custom API'], buttonText: 'Contact Sales', highlight: false },
    ],
    primaryColor: '#2563eb',
    accentColor: '#f59e0b',
    backgroundColor: 'transparent',
    // No fixed textColor default — PricingTable derives a safe one from
    // backgroundColor when the author hasn't set an explicit value.
  },
  related: {
    settings: PricingTableSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

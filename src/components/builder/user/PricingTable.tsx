"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PricingTable = ({ plans, dragRef, ...props }: any) => {
  const { connectors: { connect, drag } } = useNode();

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
      className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8"
    >
      {plans.map((plan: any, i: number) => (
        <div key={i} className={`relative p-8 rounded-3xl border transition-all ${plan.highlight ? 'bg-primary text-white border-primary shadow-2xl scale-105 z-10' : 'bg-card border-white/5 hover:border-primary/50'}`}>
          {plan.highlight && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                Most Popular
            </div>
          )}
          <div className="space-y-4">
            <h4 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>{plan.name}</h4>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className={`text-sm ${plan.highlight ? 'text-white/70' : 'text-muted-foreground'}`}>{plan.period}</span>
            </div>
            <p className={`text-sm ${plan.highlight ? 'text-white/80' : 'text-muted-foreground'}`}>{plan.description}</p>
            
            <ul className="space-y-3 py-6">
                {plan.features.map((feature: string, j: number) => (
                    <li key={j} className="flex items-center gap-3 text-sm">
                        <div className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${plan.highlight ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                            <Check className="h-3 w-3" />
                        </div>
                        <span className={plan.highlight ? 'text-white/90' : 'text-foreground/80'}>{feature}</span>
                    </li>
                ))}
            </ul>

            <Button className={`w-full rounded-xl font-bold h-12 ${plan.highlight ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary hover:bg-primary/90'}`}>
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
  },
  related: {
    settings: PricingTableSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

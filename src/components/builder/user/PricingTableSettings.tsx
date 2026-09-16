"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Star } from 'lucide-react';
import { ColorPicker } from '../ColorPicker';
import { PropertyGroup } from '../inspector/primitives';
import { Switch } from '@/components/ui/switch';

export const PricingTableSettings = () => {
  const {
    actions: { setProp },
    plans, plansYearly, enableBillingToggle, monthlyLabel, yearlyLabel,
    primaryColor, accentColor, backgroundColor, textColor,
  } = useNode((node) => ({
    plans: node.data.props.plans,
    plansYearly: node.data.props.plansYearly || [],
    enableBillingToggle: node.data.props.enableBillingToggle || false,
    monthlyLabel: node.data.props.monthlyLabel || 'Monthly',
    yearlyLabel: node.data.props.yearlyLabel || 'Yearly',
    primaryColor: node.data.props.primaryColor,
    accentColor: node.data.props.accentColor,
    backgroundColor: node.data.props.backgroundColor,
    textColor: node.data.props.textColor,
  }));

  const makePlanHelpers = (arrayKey: 'plans' | 'plansYearly') => ({
    update: (index: number, key: string, value: any) => {
      setProp((props: any) => {
        props[arrayKey][index][key] = value;
      });
    },
    add: () => {
      setProp((props: any) => {
        props[arrayKey].push({
          name: 'New Plan',
          price: '$0',
          period: '/mo',
          description: 'Description',
          features: ['Feature 1'],
          buttonText: 'Buy Now',
          highlight: false,
        });
      });
    },
    remove: (index: number) => {
      setProp((props: any) => {
        props[arrayKey].splice(index, 1);
      });
    },
    toggleHighlight: (index: number) => {
      setProp((props: any) => {
        props[arrayKey].forEach((p: any, idx: number) => { p.highlight = idx === index ? !p.highlight : false; });
      });
    },
  });

  const { update: updatePlan, add: addPlan, remove: removePlan, toggleHighlight: toggleMonthlyHighlight } = makePlanHelpers('plans');
  const { update: updateYearlyPlan, add: addYearlyPlan, remove: removeYearlyPlan, toggleHighlight: toggleYearlyHighlight } = makePlanHelpers('plansYearly');

  const renderPlanList = (
    list: any[],
    handlers: { update: (i: number, key: string, value: any) => void; add: () => void; remove: (i: number) => void; toggleHighlight: (i: number) => void },
    heading: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[13px] font-bold text-slate-900 block">{heading}</Label>
        <Button variant="ghost" size="icon" onClick={handlers.add} className="h-6 w-6 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {list.map((plan: any, i: number) => (
          <div key={i} className="p-4 bg-slate-100 rounded-xl border border-transparent space-y-3 relative group">
            <button
              onClick={() => handlers.remove(i)}
              className="absolute -top-2 -right-2 p-1.5 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            <div className="flex gap-2">
               <Input
                value={plan.name}
                onChange={(e) => handlers.update(i, 'name', e.target.value)}
                className="h-8 bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex-1 focus-visible:border-slate-300"
                placeholder="Plan name"
              />
              <button
                onClick={() => handlers.toggleHighlight(i)}
                className={`p-1.5 rounded-lg border transition-colors motion-reduce:transition-none ${plan.highlight ? 'bg-slate-900 border-transparent text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                title="Feature this plan"
              >
                <Star className="w-4 h-4" fill={plan.highlight ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={plan.price}
                onChange={(e) => handlers.update(i, 'price', e.target.value)}
                className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
                placeholder="Price"
              />
              <Input
                value={plan.period}
                onChange={(e) => handlers.update(i, 'period', e.target.value)}
                className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
                placeholder="Period"
              />
            </div>

            <Input
              value={plan.buttonText}
              onChange={(e) => handlers.update(i, 'buttonText', e.target.value)}
              className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
              placeholder="Button text"
            />

            <div className="pt-2 space-y-2">
               <Label className="text-[12px] font-medium text-slate-700">Features (one per line)</Label>
               <textarea
                value={plan.features.join('\n')}
                onChange={(e) => handlers.update(i, 'features', e.target.value.split('\n'))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-700 h-20 outline-none focus:border-slate-300"
               />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Label className="text-[13px] font-bold text-slate-900">Monthly / yearly toggle</Label>
        <Switch
          checked={enableBillingToggle}
          onCheckedChange={(val) => setProp((props: any) => props.enableBillingToggle = val)}
        />
      </div>

      {renderPlanList(plans, { update: updatePlan, add: addPlan, remove: removePlan, toggleHighlight: toggleMonthlyHighlight }, enableBillingToggle ? 'Monthly plans' : 'Pricing plans')}

      {enableBillingToggle && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={monthlyLabel}
              onChange={(e) => setProp((props: any) => props.monthlyLabel = e.target.value)}
              className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
              placeholder="Monthly tab label"
            />
            <Input
              value={yearlyLabel}
              onChange={(e) => setProp((props: any) => props.yearlyLabel = e.target.value)}
              className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
              placeholder="Yearly tab label"
            />
          </div>
          {renderPlanList(plansYearly, { update: updateYearlyPlan, add: addYearlyPlan, remove: removeYearlyPlan, toggleHighlight: toggleYearlyHighlight }, 'Yearly plans')}
        </>
      )}

      <PropertyGroup title="Colors" defaultOpen={false}>
        <ColorPicker
          label="Highlighted tier background"
          value={primaryColor || '#2563eb'}
          onChange={(val) => setProp((props: any) => props.primaryColor = val)}
        />
        <ColorPicker
          label='"Most popular" badge'
          value={accentColor || '#f59e0b'}
          onChange={(val) => setProp((props: any) => props.accentColor = val)}
        />
        <ColorPicker
          label="Section background"
          value={backgroundColor === 'transparent' ? '' : (backgroundColor || '')}
          onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
        />
        <ColorPicker
          label="Regular tier text (leave unset to auto-match section background)"
          value={textColor || ''}
          onChange={(val) => setProp((props: any) => props.textColor = val)}
        />
      </PropertyGroup>
    </div>
  );
};

"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Star } from 'lucide-react';

export const PricingTableSettings = () => {
    const { actions: { setProp }, plans } = useNode((node) => ({
        plans: node.data.props.plans,
    }));

    const updatePlan = (index: number, key: string, value: any) => {
        setProp((props: any) => {
            props.plans[index][key] = value;
        });
    };

    const addPlan = () => {
        setProp((props: any) => {
            props.plans.push({
                name: 'New Plan',
                price: '$0',
                period: '/mo',
                description: 'Description',
                features: ['Feature 1'],
                buttonText: 'Buy Now',
                highlight: false,
            });
        });
    };

    const removePlan = (index: number) => {
        setProp((props: any) => {
            props.plans.splice(index, 1);
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Pricing Plans</Label>
                <Button variant="ghost" size="icon" onClick={addPlan} className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-4">
                {plans.map((plan: any, i: number) => (
                    <div key={i} className="p-4 bg-muted/50 rounded-xl border border-white/5 space-y-3 relative group">
                        <button 
                            onClick={() => removePlan(i)}
                            className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>

                        <div className="flex gap-2">
                             <Input 
                                value={plan.name}
                                onChange={(e) => updatePlan(i, 'name', e.target.value)}
                                className="h-8 bg-black/20 border-white/10 text-xs font-bold flex-1"
                                placeholder="Plan Name"
                            />
                            <button 
                                onClick={() => {
                                    setProp((props: any) => {
                                        props.plans.forEach((p: any, idx: number) => p.highlight = idx === i ? !p.highlight : false);
                                    });
                                }}
                                className={`p-1.5 rounded border ${plan.highlight ? 'bg-secondary border-secondary text-secondary-foreground' : 'bg-black/20 border-white/10 text-muted-foreground'}`}
                                title="Feature this plan"
                            >
                                <Star className="w-4 h-4" fill={plan.highlight ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Input 
                                value={plan.price}
                                onChange={(e) => updatePlan(i, 'price', e.target.value)}
                                className="h-8 bg-black/20 border-white/10 text-xs"
                                placeholder="Price"
                            />
                            <Input 
                                value={plan.period}
                                onChange={(e) => updatePlan(i, 'period', e.target.value)}
                                className="h-8 bg-black/20 border-white/10 text-xs"
                                placeholder="Period"
                            />
                        </div>

                        <Input 
                            value={plan.buttonText}
                            onChange={(e) => updatePlan(i, 'buttonText', e.target.value)}
                            className="h-8 bg-black/20 border-white/10 text-xs"
                            placeholder="Button Text"
                        />

                        <div className="pt-2 space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground opacity-50">Features (one per line)</Label>
                             <textarea 
                                value={plan.features.join('\n')}
                                onChange={(e) => updatePlan(i, 'features', e.target.value.split('\n'))}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-xs h-20 outline-none"
                             />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

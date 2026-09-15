"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '../ColorPicker';
import { Package, Palette } from 'lucide-react';

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP'];

// Shared inspector for Upsell/Downsell — same fields as OrderFormSettings.tsx's
// Product tab, plus a description field and both button labels since these
// widgets present an offer with two calls to action instead of a payment form.
export const OfferWidgetSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    productName, description, price, currency, acceptButtonText, declineButtonText,
    backgroundColor, buttonBg, buttonTextColor, labelColor,
  } = props;

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="details" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Package size={14} /> Offer
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-0">
        <div className="mb-7 last:mb-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Product name</Label>
            <Input
              value={productName}
              onChange={(e) => setProp((p: any) => p.productName = e.target.value)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setProp((p: any) => p.description = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs h-20 outline-none text-slate-700 focus:border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setProp((p: any) => p.price = parseFloat(e.target.value) || 0)}
                className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Currency</Label>
              <select
                value={currency}
                onChange={(e) => setProp((p: any) => p.currency = e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] px-2 outline-none font-medium text-slate-700 focus:border-slate-300"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Accept button text</Label>
            <Input
              value={acceptButtonText}
              onChange={(e) => setProp((p: any) => p.acceptButtonText = e.target.value)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Decline button text</Label>
            <Input
              value={declineButtonText}
              onChange={(e) => setProp((p: any) => p.declineButtonText = e.target.value)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Accept redirects to a fresh, pre-filled PayFast checkout (name/email are
            reused from the original purchase — the customer only re-enters payment
            details). Decline routes to whichever step is set as this step&apos;s
            decline destination in Page settings.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
        <div className="mb-7 last:mb-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Background</Label>
            <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Text color</Label>
            <ColorPicker value={labelColor} onChange={(val) => setProp((p: any) => p.labelColor = val)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Accept button background</Label>
            <ColorPicker value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Accept button text color</Label>
            <ColorPicker value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

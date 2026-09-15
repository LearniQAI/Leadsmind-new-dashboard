"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ColorPicker } from '../ColorPicker';
import { Package, Palette } from 'lucide-react';

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP'];

export const OrderFormSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    productName, price, currency, buttonText,
    backgroundColor, buttonBg, buttonTextColor, labelColor,
  } = props;

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="details" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Package size={14} /> Product
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[12px] font-medium text-slate-700 block">Product name</Label>
          <Input
            value={productName}
            onChange={(e) => setProp((p: any) => p.productName = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-slate-700 block">Price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setProp((p: any) => p.price = parseFloat(e.target.value) || 0)}
              className="h-9 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-slate-700 block">Currency</Label>
            <select
              value={currency}
              onChange={(e) => setProp((p: any) => p.currency = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[11px] px-2 outline-none font-bold text-slate-700 focus:border-slate-300"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[12px] font-medium text-slate-700 block">Button text</Label>
          <Input
            value={buttonText}
            onChange={(e) => setProp((p: any) => p.buttonText = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
          />
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Checkout is processed via PayFast. The visitor is redirected to PayFast to pay, then returned here once complete.
        </p>
      </TabsContent>

      <TabsContent value="style" className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Background</Label>
          <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Label / text color</Label>
          <ColorPicker value={labelColor} onChange={(val) => setProp((p: any) => p.labelColor = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Button background</Label>
          <ColorPicker value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Button text color</Label>
          <ColorPicker value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

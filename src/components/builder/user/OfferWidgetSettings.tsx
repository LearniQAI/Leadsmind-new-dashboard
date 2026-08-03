"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
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
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface p-1 mb-4">
        <TabsTrigger value="details" className="text-[10px] font-bold gap-2">
          <Package size={12} /> Offer
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[10px] font-bold gap-2">
          <Palette size={12} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Product name</Label>
          <Input
            value={productName}
            onChange={(e) => setProp((p: any) => p.productName = e.target.value)}
            className="h-9 bg-white border-dash-border text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Description</Label>
          <textarea
            value={description}
            onChange={(e) => setProp((p: any) => p.description = e.target.value)}
            className="w-full bg-white border border-dash-border rounded p-2 text-xs h-20 outline-none !text-dash-text"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block">Price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setProp((p: any) => p.price = parseFloat(e.target.value) || 0)}
              className="h-9 bg-white border-dash-border text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block">Currency</Label>
            <select
              value={currency}
              onChange={(e) => setProp((p: any) => p.currency = e.target.value)}
              className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none font-bold !text-dash-text focus:border-dash-accent"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Accept button text</Label>
          <Input
            value={acceptButtonText}
            onChange={(e) => setProp((p: any) => p.acceptButtonText = e.target.value)}
            className="h-9 bg-white border-dash-border text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Decline button text</Label>
          <Input
            value={declineButtonText}
            onChange={(e) => setProp((p: any) => p.declineButtonText = e.target.value)}
            className="h-9 bg-white border-dash-border text-xs"
          />
        </div>

        <p className="text-[10px] !text-dash-textMuted leading-relaxed">
          Accept redirects to a fresh, pre-filled PayFast checkout (name/email are
          reused from the original purchase — the customer only re-enters payment
          details). Decline routes to whichever step is set as this step&apos;s
          decline destination in Page settings.
        </p>
      </TabsContent>

      <TabsContent value="style" className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Background</Label>
          <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Text color</Label>
          <ColorPicker value={labelColor} onChange={(val) => setProp((p: any) => p.labelColor = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Accept button background</Label>
          <ColorPicker value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Accept button text color</Label>
          <ColorPicker value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

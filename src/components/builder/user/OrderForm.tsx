"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { createFunnelOrder, getFunnelOrderStatus, markFunnelOrderAbandoned, getStepDeclineUrl } from '@/app/actions/funnelOrders';
import { toast } from 'sonner';
import { usePathname, useSearchParams } from 'next/navigation';
import { useBuilder } from '../BuilderContext';
import { useEditor, useNode } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderFormSettings } from './OrderFormSettings';

export interface OrderFormProps {
  productName: string;
  price: number;
  currency: string;
  buttonText: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  gap: number;
  labelColor: string;
  inputBg: string;
  inputBorderColor: string;
  inputTextColor: string;
  buttonBg: string;
  buttonTextColor: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' };

export const OrderForm = (allProps: OrderFormProps & any) => {
  const {
    productName, price, currency, buttonText,
    backgroundColor, borderRadius, padding, gap,
    labelColor, inputBg, inputBorderColor, inputTextColor,
    buttonBg, buttonTextColor,
    dragRef, ...props
  } = allProps;

  const { connectors: { connect, drag } } = useNode();
  const { websiteData } = useBuilder();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // This widget renders on the public /p/[workspaceSlug]/[subdomain]/[pageSlug]
  // route, which has no [pageId] route param (that only exists under
  // /editor/funnel/...). The step's path_name is derived from the URL itself,
  // stripping the /p/<slug>/<subdomain> prefix — same convention PublishedPageRenderer
  // already uses for its nav-link resolution.
  const stepPath = (() => {
    if (!pathname) return '/';
    const match = pathname.match(/^\/p\/[^/]+\/[^/]+(\/.*)?$/);
    const rest = match?.[1];
    return rest && rest !== '' ? rest : '/';
  })();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '' });
  const [returnState, setReturnState] = useState<'idle' | 'checking' | 'cancelled'>('idle');

  // Handles the visitor's browser landing back on this page after PayFast —
  // 'success' polls for the webhook's paid+next-step resolution (the ITN can
  // lag slightly behind the browser redirect); 'cancelled' marks the order
  // abandoned directly, since PayFast doesn't reliably send a server-to-server
  // ITN for cancellations in most flows — the redirect itself is the signal.
  useEffect(() => {
    if (enabled) return; // editor preview: query params never apply
    const payment = searchParams?.get('payment');
    const orderId = searchParams?.get('order');
    if (!payment || !orderId) return;

    if (payment === 'cancelled') {
      setReturnState('cancelled');
      markFunnelOrderAbandoned(orderId).catch(() => {});
      // Route via this step's configured decline destination if set, same as
      // Upsell/Downsell's Decline button — otherwise stay put (default: back to
      // the order form itself, per the design).
      const funnelId = websiteData?.id;
      if (funnelId) {
        getStepDeclineUrl(funnelId, stepPath).then((res) => {
          if (res.success && res.declineUrl) {
            window.location.href = res.declineUrl;
          }
        });
      }
      return;
    }

    if (payment === 'success') {
      setReturnState('checking');
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        const res = await getFunnelOrderStatus(orderId);
        if (res.success && res.order?.status === 'paid') {
          if (res.nextStepUrl) {
            window.location.href = res.nextStepUrl;
          } else {
            setReturnState('idle');
            toast.success('Payment received!');
          }
          return;
        }
        if (attempts < 8) {
          setTimeout(poll, 1500);
        } else {
          setReturnState('idle');
        }
      };
      poll();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (key: keyof typeof customer, value: string) => {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) return;

    setIsSubmitting(true);
    try {
      const funnelId = websiteData?.id;
      if (!funnelId) {
        throw new Error('Missing funnel context');
      }

      const result = await createFunnelOrder({
        funnelId,
        stepPath,
        productName,
        amount: Number(price) || 0,
        currency: currency || 'ZAR',
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      });

      if (!result.success || !result.checkoutUrl) {
        toast.error(result.error || 'Failed to start checkout');
        setIsSubmitting(false);
        return;
      }

      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while starting checkout');
      setIsSubmitting(false);
    }
  };

  const symbol = CURRENCY_SYMBOL[currency] || currency || '';

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
      className="transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50"
      style={{
        backgroundColor,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
      }}
    >
      <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: inputBorderColor }}>
        <span className="text-base font-bold" style={{ color: labelColor }}>{productName || 'Your Product'}</span>
        <span className="text-xl font-black" style={{ color: labelColor }}>{symbol}{Number(price || 0).toFixed(2)}</span>
      </div>

      {returnState === 'checking' && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          Confirming your payment...
        </div>
      )}
      {returnState === 'cancelled' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold">
          Checkout was cancelled. You can try again below.
        </div>
      )}

      <form className="flex flex-col" style={{ gap: `${gap}px` }} onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>First name</Label>
            <Input
              type="text"
              placeholder="Jane"
              required
              className="rounded-lg h-10 border"
              style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
              value={customer.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>Last name</Label>
            <Input
              type="text"
              placeholder="Doe"
              required
              className="rounded-lg h-10 border"
              style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
              value={customer.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>Email</Label>
          <Input
            type="email"
            placeholder="jane@example.com"
            required
            className="rounded-lg h-10 border"
            style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
            value={customer.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg h-12 font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-70 mt-2"
          style={{ backgroundColor: buttonBg, color: buttonTextColor }}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to secure checkout...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>{buttonText || 'Pay now'}</span>
            </div>
          )}
        </Button>
        <p className="text-[10px] text-center opacity-60" style={{ color: labelColor }}>
          Secure payment powered by PayFast
        </p>
      </form>
    </div>
  );
};

OrderForm.craft = {
  displayName: 'Order Form',
  props: {
    productName: 'Your Product',
    price: 499,
    currency: 'ZAR',
    buttonText: 'Pay now',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    gap: 16,
    labelColor: '#374151',
    inputBg: '#f9fafb',
    inputBorderColor: '#e5e7eb',
    inputTextColor: '#111827',
    buttonBg: '#10b981',
    buttonTextColor: '#ffffff',
  },

  related: {
    settings: OrderFormSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

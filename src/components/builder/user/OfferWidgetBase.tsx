"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Lock, X } from 'lucide-react';
import { createFunnelOrder, getStepDeclineUrl, getFunnelOrderStatus, markFunnelOrderAbandoned } from '@/app/actions/funnelOrders';
import { toast } from 'sonner';
import { usePathname, useSearchParams } from 'next/navigation';
import { useBuilder } from '../BuilderContext';
import { useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';

export interface OfferWidgetProps {
  productName: string;
  description: string;
  price: number;
  currency: string;
  acceptButtonText: string;
  declineButtonText: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  labelColor: string;
  descriptionColor: string;
  buttonBg: string;
  buttonTextColor: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' };

// Shared implementation for Upsell.tsx and Downsell.tsx — same "second lightweight
// PayFast checkout" shape (see Phase 1 finding: true one-click tokenized charging
// isn't wired up, so Accept still redirects to a fresh, pre-filled PayFast
// checkout rather than charging silently). Not itself a Craft.js component —
// Upsell/Downsell each wrap this with their own displayName/craft defaults.
export const OfferWidgetBase = ({
  props: allProps,
  connect,
  drag,
  dragRef,
}: {
  props: OfferWidgetProps & Record<string, any>;
  connect: (el: HTMLElement) => void;
  drag: (el: HTMLElement) => void;
  dragRef?: any;
}) => {
  const {
    productName, description, price, currency, acceptButtonText, declineButtonText,
    backgroundColor, borderRadius, padding, labelColor, descriptionColor,
    buttonBg, buttonTextColor,
    ...props
  } = allProps;

  const { websiteData } = useBuilder();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const stepPath = (() => {
    if (!pathname) return '/';
    const match = pathname.match(/^\/p\/[^/]+\/[^/]+(\/.*)?$/);
    const rest = match?.[1];
    return rest && rest !== '' ? rest : '/';
  })();

  // ?order= is always the parent order (how the visitor arrived here), for the
  // whole lifetime of this page — including after a PayFast round trip, which
  // carries this charge's own id separately as ?charge= instead of overloading
  // ?order=, so a retried Accept always links back to the true original order.
  const parentOrderId = searchParams?.get('order') || null;

  const [isProcessing, setIsProcessing] = useState<'accept' | 'decline' | null>(null);
  const [declineUrl, setDeclineUrl] = useState<string | null>(null);
  const [returnState, setReturnState] = useState<'idle' | 'checking' | 'cancelled'>('idle');

  useEffect(() => {
    if (enabled) return;
    const funnelId = websiteData?.id;
    if (!funnelId) return;
    getStepDeclineUrl(funnelId, stepPath).then((res) => {
      if (res.success) setDeclineUrl(res.declineUrl || null);
    });
  }, [enabled, websiteData?.id, stepPath]);

  // Handles the visitor's browser landing back on this page after accepting and
  // paying via PayFast — same pattern as OrderForm.tsx's return handling.
  useEffect(() => {
    if (enabled) return;
    const payment = searchParams?.get('payment');
    const chargeId = searchParams?.get('charge');
    if (!payment || !chargeId) return;

    if (payment === 'cancelled') {
      setReturnState('cancelled');
      markFunnelOrderAbandoned(chargeId).catch(() => {});
      return;
    }

    if (payment === 'success') {
      setReturnState('checking');
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        const res = await getFunnelOrderStatus(chargeId);
        if (res.success && res.order?.status === 'paid') {
          if (res.nextStepUrl) {
            window.location.href = res.nextStepUrl;
          } else {
            setReturnState('idle');
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

  const handleAccept = async () => {
    if (enabled) return;
    setIsProcessing('accept');
    try {
      const funnelId = websiteData?.id;
      if (!funnelId || !parentOrderId) {
        throw new Error('Missing order context — this offer must be reached from a completed purchase');
      }

      const result = await createFunnelOrder({
        funnelId,
        stepPath,
        parentOrderId,
        productName,
        amount: Number(price) || 0,
        currency: currency || 'ZAR',
      });

      if (!result.success || !result.checkoutUrl) {
        toast.error(result.error || 'Failed to start checkout');
        setIsProcessing(null);
        return;
      }

      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while starting checkout');
      setIsProcessing(null);
    }
  };

  const handleDecline = () => {
    if (enabled) return;
    setIsProcessing('decline');
    if (declineUrl) {
      // Carry the parent order forward (e.g. Upsell decline -> Downsell) so
      // the next offer still knows which purchase it's following on from —
      // same reasoning as nextStepUrl on the accept/payment side.
      const separator = declineUrl.includes('?') ? '&' : '?';
      const url = parentOrderId ? `${declineUrl}${separator}order=${parentOrderId}` : declineUrl;
      window.location.href = url;
    } else {
      toast.error('This step has no decline destination configured yet');
      setIsProcessing(null);
    }
  };

  const symbol = CURRENCY_SYMBOL[currency] || currency || '';

  return (
    <div
      {...props}
      ref={(ref: HTMLDivElement | null) => {
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
      style={{ backgroundColor, borderRadius: `${borderRadius}px`, padding: `${padding}px` }}
    >
      <h3 className="text-xl font-black mb-2" style={{ color: labelColor }}>{productName || 'Special Offer'}</h3>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: descriptionColor }}>{description}</p>
      <div className="text-2xl font-black mb-6" style={{ color: labelColor }}>{symbol}{Number(price || 0).toFixed(2)}</div>

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

      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          disabled={isProcessing !== null}
          onClick={handleAccept}
          className="w-full rounded-lg h-12 font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-70"
          style={{ backgroundColor: buttonBg, color: buttonTextColor }}
        >
          {isProcessing === 'accept' ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to secure checkout...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>{acceptButtonText || 'Yes, add this to my order'}</span>
            </div>
          )}
        </Button>
        <button
          type="button"
          disabled={isProcessing !== null}
          onClick={handleDecline}
          className="w-full h-10 flex items-center justify-center gap-1.5 text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
          style={{ color: labelColor }}
        >
          {isProcessing === 'decline' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          {declineButtonText || 'No thanks'}
        </button>
      </div>
      <p className="text-[10px] text-center opacity-60 mt-3" style={{ color: labelColor }}>
        Secure payment powered by PayFast
      </p>
    </div>
  );
};

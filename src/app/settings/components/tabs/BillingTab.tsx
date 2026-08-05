"use client";
import React, { useState } from 'react';
import { Users, Zap, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pricingTiers } from '@/app/(marketing)/landing/data';
import { createPaystackSubscription, cancelPaystackSubscription } from '@/app/actions/finance';

interface BillingInfo {
  planTier: string;
  stripeSubscriptionId: string | null;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
}

interface BillingTabProps {
  memberCount: number;
  billing: BillingInfo | null;
}

export default function BillingTab({ memberCount, billing }: BillingTabProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const planTier = billing?.planTier || 'spark';
  const currentTier = pricingTiers.find((t) => t.id === planTier) ?? pricingTiers[0];
  const upgradeTiers = pricingTiers.filter((t) => t.id !== 'spark' && t.id !== planTier && t.id !== 'dynasty');
  const hasActiveSubscription = !!billing?.paystackSubscriptionCode;

  async function handleUpgrade(tierId: string) {
    setLoadingTier(tierId);
    try {
      const result = await createPaystackSubscription(tierId, 'month');
      if (result.error || !result.url) {
        toast.error(result.error || 'Failed to start checkout');
        return;
      }
      window.location.href = result.url;
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const result = await cancelPaystackSubscription();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Subscription cancelled — your workspace is now on the Spark plan.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="p-8 bg-gradient-to-br from-dash-accent/10 to-dash-surface border border-dash-accent/20 rounded-3xl relative overflow-hidden group shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-dash-accent/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-dash-accent text-white font-bold text-[10px] rounded-full shadow-sm uppercase">{currentTier.name} plan</span>
            <h4 className="text-[28px] font-bold !text-dash-text tracking-tight leading-none">
              {currentTier.monthlyPrice > 0 ? `$${currentTier.monthlyPrice}/mo` : 'Free forever'}
            </h4>
            <p className="!text-dash-textMuted text-[12px] font-bold flex items-center gap-2">
              {currentTier.description}
            </p>
          </div>
          {hasActiveSubscription ? (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-white text-red-600 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 disabled:opacity-60 disabled:hover:scale-100 font-bold text-[11px] h-14 px-10 rounded-2xl shadow-sm border border-dash-border transition-all motion-reduce:transition-none flex items-center gap-2"
            >
              {cancelling && <Loader2 size={14} className="animate-spin" />}
              Cancel subscription
            </button>
          ) : (
            <span className="bg-white text-dash-accent font-bold text-[11px] h-14 px-10 rounded-2xl shadow-sm border border-dash-border flex items-center">
              Current plan
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Seats', value: `${memberCount}`, icon: <Users size={16} /> },
          { label: 'Plan', value: currentTier.name, icon: <Zap size={16} /> },
          { label: 'Billing', value: hasActiveSubscription ? 'Paystack' : billing?.stripeSubscriptionId ? 'Stripe' : 'None', icon: <CreditCard size={16} /> }
        ].map((item, idx) => (
          <div key={idx} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4 hover:border-dash-accent/30 transition-all motion-reduce:transition-none group">
            <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:bg-dash-accent/10 transition-all motion-reduce:transition-none">
              {item.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold !text-dash-textMuted mb-1">{item.label}</p>
              <p className="text-[18px] font-bold !text-dash-text">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {upgradeTiers.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-[14px] font-bold !text-dash-text">Upgrade your plan</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upgradeTiers.map((tier) => (
              <div key={tier.id} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4 hover:border-dash-accent/30 transition-all motion-reduce:transition-none">
                <div>
                  <p className="text-[14px] font-bold !text-dash-text">{tier.name}</p>
                  <p className="text-[12px] !text-dash-textMuted">{tier.description}</p>
                </div>
                <p className="text-[20px] font-bold !text-dash-text">${tier.monthlyPrice}<span className="text-[11px] font-normal">/mo</span></p>
                <button
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={loadingTier === tier.id}
                  className="w-full bg-dash-accent text-white hover:scale-[1.02] active:scale-95 motion-reduce:hover:scale-100 disabled:opacity-60 disabled:hover:scale-100 font-bold text-[11px] h-11 rounded-xl transition-all motion-reduce:transition-none flex items-center justify-center gap-2"
                >
                  {loadingTier === tier.id && <Loader2 size={14} className="animate-spin" />}
                  Upgrade to {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

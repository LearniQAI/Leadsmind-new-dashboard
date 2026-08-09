'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import ConnectionCard from '@/components/settings/ConnectionCard';
import ConnectProviderModal from '@/components/settings/ConnectProviderModal';
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations';
import { getStripeConnectAuthUrl } from '@/app/actions/stripeConnect';
import { getPaypalConnectAuthUrl } from '@/app/actions/paypalConnect';
import { toast } from 'sonner';

export default function PaymentGatewaysPage() {
  return (
    <Suspense fallback={null}>
      <PaymentGatewaysContent />
    </Suspense>
  );
}

function PaymentGatewaysContent() {
  const { workspace } = useDashboardContext() as any;
  const workspaceId = workspace?.id || null;
  const searchParams = useSearchParams();
  const router = useRouter();

  const { isConnected, getLabel, disconnect, connect, refetch } = useWorkspaceIntegrations(workspaceId);

  // Modal control (generic secret-key based gateways only — Stripe uses real OAuth below)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [connectingPaypal, setConnectingPaypal] = useState(false);

  // Reflect the Stripe Connect / PayPal Partner Referrals OAuth callbacks' redirect results
  useEffect(() => {
    if (searchParams.get('stripe_success')) {
      toast.success('Stripe connected successfully via Stripe Connect');
      refetch();
      router.replace('/finance/payment-gateways');
    } else if (searchParams.get('stripe_error')) {
      toast.error('Stripe connection failed. Please try again.');
      router.replace('/finance/payment-gateways');
    } else if (searchParams.get('paypal_success')) {
      toast.success('PayPal connected successfully via PayPal Commerce Platform');
      refetch();
      router.replace('/finance/payment-gateways');
    } else if (searchParams.get('paypal_error')) {
      toast.error('PayPal connection failed. Please try again.');
      router.replace('/finance/payment-gateways');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openConnectModal = (provider: string) => {
    setSelectedProvider(provider);
    setModalOpen(true);
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;
    try {
      await disconnect(provider);
      toast.success(`${provider} disconnected successfully`);
    } catch {
      toast.error(`Failed to disconnect ${provider}`);
    }
  };

  const handleConnected = async (label: string) => {
    setModalOpen(false);
    toast.success(`${selectedProvider} connected: ${label}`);
    refetch();
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const url = await getStripeConnectAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Unable to start Stripe Connect.');
      setConnectingStripe(false);
    }
  };

  const handleConnectPaypal = async () => {
    setConnectingPaypal(true);
    try {
      const url = await getPaypalConnectAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Unable to start PayPal Connect.');
      setConnectingPaypal(false);
    }
  };

  // PayFast's "Connect" card was removed from this page (Task 32 confirmed the per-workspace
  // connection was decorative — checkout still runs on shared platform credentials). PayFast
  // itself is untouched and still runs live elsewhere (course checkout, invoice payments,
  // funnel orders, calendar bookings) via those same shared platform credentials — this page
  // just no longer implies there's a real per-workspace "Connect" flow for it.
  // Peach Payments/SnapScan had no payment backend and were never reachable beyond this
  // "Coming Soon" card. Yoco is also removed here (still tracked separately as Task 38 —
  // OAuth Connect blocked on partner approval — can come back once that lands).
  // Paystack, Flutterwave, and Ozow (Tasks 35-37) are real bring-your-own-key integrations:
  // the workspace supplies their own credentials, a real validation call runs against the
  // provider's API before "Connected" is ever shown, and checkout/webhooks route through
  // that workspace's own account — see src/lib/paymentGateways/*.
  const gateways = [
    { name: 'Paystack', shortName: 'PS', color: '#00c3f7', logo: '/assets/images/payment-gateways/paystack.png', description: 'Card, EFT, and mobile money — checkout routes directly to your own Paystack account', comingSoon: false },
    { name: 'Flutterwave', shortName: 'FW', color: '#f5a623', logo: '/assets/images/payment-gateways/flutterwave.png', description: 'Card, mobile money, and bank transfer — checkout routes directly to your own Flutterwave account', comingSoon: false },
    { name: 'Ozow', shortName: 'OZ', color: '#00c49a', logo: '/assets/images/payment-gateways/ozow.png', description: 'Instant EFT — checkout routes directly to your own Ozow account', comingSoon: false },
  ];

  const stripeConnected = isConnected('stripe');
  const stripeLabel = getLabel('stripe');
  const paypalConnected = isConnected('paypal');
  const paypalLabel = getLabel('paypal');

  const totalConnected = [stripeConnected, paypalConnected, ...gateways.map(gw => isConnected(gw.name))].filter(Boolean).length;

  return (
    <Wrapper>
      <div className="min-h-screen bg-white px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-bold !text-dash-text tracking-tight">
              Payment <span className="bg-gradient-to-r from-dash-accent to-[#7c5cff] bg-clip-text text-transparent">Gateways</span>
            </h1>
            <p className="text-[13px] font-medium mt-1.5 !text-dash-textMuted">
              Connect payment providers to automatically mark invoices as paid
            </p>
          </div>
          <div className="flex items-center gap-2 bg-dash-accent/5 border border-dash-accent/15 rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            <span className="text-[12px] font-semibold !text-dash-text">
              {totalConnected} connected
            </span>
          </div>
        </div>

        {/* Gateways Grid */}
        <div className="flex flex-col gap-3.5">
          {/* Stripe — real Stripe Connect (OAuth), not the generic API-key modal */}
          <ConnectionCard
            name="Stripe"
            shortName="ST"
            color="#635bff"
            logo="/assets/images/payment-gateways/stripe.svg"
            description="Real Stripe Connect — checkouts route directly to your own Stripe account"
            connected={stripeConnected}
            accountLabel={stripeLabel}
            loading={connectingStripe}
            onConnect={handleConnectStripe}
            onDisconnect={() => handleDisconnect('stripe')}
          />

          {/* PayPal — real PayPal Commerce Platform (Partner Referrals onboarding), not the generic API-key modal */}
          <ConnectionCard
            name="PayPal"
            shortName="PP"
            color="#003087"
            logo="/assets/images/payment-gateways/paypal.svg"
            description="Real PayPal Commerce Platform — checkouts route directly to your own connected PayPal account"
            connected={paypalConnected}
            accountLabel={paypalLabel}
            loading={connectingPaypal}
            onConnect={handleConnectPaypal}
            onDisconnect={() => handleDisconnect('paypal')}
          />

          {gateways.map(gw => {
            const connected = isConnected(gw.name);
            const label = getLabel(gw.name);

            return (
              <ConnectionCard
                key={gw.name}
                name={gw.name}
                shortName={gw.shortName}
                color={gw.color}
                logo={gw.logo}
                description={gw.description}
                connected={connected}
                accountLabel={label}
                comingSoon={gw.comingSoon}
                onConnect={() => openConnectModal(gw.name)}
                onDisconnect={() => handleDisconnect(gw.name)}
              />
            );
          })}
        </div>

        {/* Connection Modal (secret-key based gateways) */}
        {selectedProvider && (
          <ConnectProviderModal
            provider={selectedProvider}
            category="payment_gateway"
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onConnected={handleConnected}
          />
        )}
      </div>
    </Wrapper>
  );
}

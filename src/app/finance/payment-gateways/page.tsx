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

  // PayFast checkout is genuinely live in this app (bookings, courses, funnels all process
  // real PayFast payments) but always via workspace-wide platform credentials
  // (PAYFAST_MERCHANT_ID/KEY env vars) — nothing reads this per-workspace connection back
  // out to actually process a payment yet, so its label must not imply this toggle controls
  // real processing. Peach Payments/Yoco/SnapScan still have no payment backend — comingSoon
  // disables Connect so no credential can produce a false "Connected" badge. Paystack,
  // Flutterwave, and Ozow (Tasks 35-37) are real bring-your-own-key integrations: the
  // workspace supplies their own credentials, a real validation call runs against the
  // provider's API before "Connected" is ever shown, and checkout/webhooks route through
  // that workspace's own account — see src/lib/paymentGateways/*.
  const gateways = [
    { name: 'PayFast', shortName: 'PF', color: '#00b8f0', description: 'Save your PayFast merchant details for reference — checkout currently runs on shared platform credentials, not this connection', comingSoon: false },
    { name: 'Paystack', shortName: 'PS', color: '#00c3f7', description: 'Card, EFT, and mobile money — checkout routes directly to your own Paystack account', comingSoon: false },
    { name: 'Flutterwave', shortName: 'FW', color: '#f5a623', description: 'Card, mobile money, and bank transfer — checkout routes directly to your own Flutterwave account', comingSoon: false },
    { name: 'Ozow', shortName: 'OZ', color: '#00c49a', description: 'Instant EFT — checkout routes directly to your own Ozow account', comingSoon: false },
    { name: 'Peach Payments', shortName: 'PP', color: '#ff6b35', description: 'Card and EFT reconciliation', comingSoon: true },
    { name: 'Yoco', shortName: 'YC', color: '#fd7c35', description: 'In-person card payments create invoices automatically', comingSoon: true },
    { name: 'SnapScan', shortName: 'SS', color: '#e91e63', description: 'QR code payment notifications', comingSoon: true },
  ];

  const stripeConnected = isConnected('stripe');
  const stripeLabel = getLabel('stripe');
  const paypalConnected = isConnected('paypal');
  const paypalLabel = getLabel('paypal');

  return (
    <Wrapper>
      <div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-bold !text-dash-text">
            Payment <span className="text-dash-accent">Gateways</span>
          </h1>
          <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
            Connect payment providers to automatically mark invoices as paid
          </p>
        </div>

        {/* Gateways Grid */}
        <div className="flex flex-col gap-4">
          {/* Stripe — real Stripe Connect (OAuth), not the generic API-key modal */}
          <ConnectionCard
            name="Stripe"
            shortName="ST"
            color="#635bff"
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

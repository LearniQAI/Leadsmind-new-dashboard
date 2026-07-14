'use client';

import React, { useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import ConnectionCard from '@/components/settings/ConnectionCard';
import ConnectProviderModal from '@/components/settings/ConnectProviderModal';
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations';
import { toast } from 'sonner';

export default function PaymentGatewaysPage() {
  const { workspace } = useDashboardContext() as any;
  const workspaceId = workspace?.id || null;

  const { isConnected, getLabel, disconnect, connect, refetch } = useWorkspaceIntegrations(workspaceId);

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

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

  const gateways = [
    { name: 'PayFast', shortName: 'PF', color: '#00b8f0', description: 'Automatically mark invoices paid when PayFast payment lands' },
    { name: 'Ozow', shortName: 'OZ', color: '#00c49a', description: 'Instant EFT payment notifications' },
    { name: 'Peach Payments', shortName: 'PP', color: '#ff6b35', description: 'Card and EFT reconciliation' },
    { name: 'Yoco', shortName: 'YC', color: '#fd7c35', description: 'In-person card payments create invoices automatically' },
    { name: 'SnapScan', shortName: 'SS', color: '#e91e63', description: 'QR code payment notifications' }
  ];

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
                onConnect={() => openConnectModal(gw.name)}
                onDisconnect={() => handleDisconnect(gw.name)}
              />
            );
          })}
        </div>

        {/* Connection Modal */}
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

'use client'

import React, { useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from "@/components/layouts/DashboardProvider"
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations'
import ConnectionCard from '@/components/settings/ConnectionCard'
import ConnectProviderModal from '@/components/settings/ConnectProviderModal'

export default function FinancialConnectionsPage() {
  const { workspace } = useDashboardContext()
  const workspaceId = workspace?.id || null

  const { isConnected, getLabel, connect, disconnect, loading, error } =
    useWorkspaceIntegrations(workspaceId)

  const [connectingProvider, setConnectingProvider] = useState<{
    provider: string
    category: string
  } | null>(null)

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
            Bank & <span style={{ color: '#3b82f6' }}>Payments</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1"
            style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
            Connect your bank account or payment gateway to import transactions automatically
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[76px] rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Your Bank Account
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'First National Bank', shortName: 'FNB', color: '#e60028',
                  desc: 'Import your FNB transactions daily' },
                { name: 'Absa', shortName: 'AB', color: '#dc0000',
                  desc: 'Sync your Absa account balance and transactions' },
                { name: 'Capitec Business', shortName: 'CAP', color: '#0033a0',
                  desc: 'Connect your Capitec Business account' },
                { name: 'Standard Bank', shortName: 'SB', color: '#0072bc',
                  desc: 'Link your Standard Bank account' },
                { name: 'Nedbank', shortName: 'NED', color: '#007b40',
                  desc: 'Connect your Nedbank account' },
                { name: 'Investec', shortName: 'INV', color: '#004f9f',
                  desc: 'Real-time transaction sync via Investec Open Banking' },
                { name: 'TymeBank', shortName: 'TYM', color: '#ff6600',
                  desc: 'Connect your TymeBank account' },
                { name: 'Discovery Bank', shortName: 'DB', color: '#da0000',
                  desc: 'Connect your Discovery Bank account' },
              ].map(b => (
                <ConnectionCard key={b.name}
                  name={b.name} shortName={b.shortName}
                  color={b.color} description={b.desc}
                  connected={isConnected(b.name)}
                  accountLabel={getLabel(b.name)}
                  onConnect={() => setConnectingProvider({ provider: b.name, category: 'bank' })}
                  onDisconnect={() => disconnect(b.name)} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Payment Gateways
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'PayFast', shortName: 'PF', color: '#00b8f0',
                  desc: 'Automatically mark invoices paid when PayFast payment lands' },
                { name: 'Ozow', shortName: 'OZ', color: '#00c49a',
                  desc: 'Instant EFT payment notifications' },
                { name: 'Peach Payments', shortName: 'PP', color: '#ff6b35',
                  desc: 'Card and EFT reconciliation' },
                { name: 'Yoco', shortName: 'YC', color: '#fd7c35',
                  desc: 'In-person card payments create invoices automatically' },
                { name: 'SnapScan', shortName: 'SS', color: '#e91e63',
                  desc: 'QR code payment notifications' },
              ].map(g => (
                <ConnectionCard key={g.name}
                  name={g.name} shortName={g.shortName}
                  color={g.color} description={g.desc}
                  connected={isConnected(g.name)}
                  accountLabel={getLabel(g.name)}
                  onConnect={() => setConnectingProvider({ provider: g.name, category: 'payment_gateway' })}
                  onDisconnect={() => disconnect(g.name)} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Tax & Government
            </p>
            <div className="flex flex-col gap-3">
              {[
                { name: 'SARS eFiling', shortName: 'SARS', color: '#1e5aa8',
                  desc: 'Auto-submit VAT201 and EMP201 returns directly from LeadsMind' },
                { name: 'CIPC', shortName: 'CIPC', color: '#006b3c',
                  desc: 'Company registration status and director lookups' },
              ].map(t => (
                <ConnectionCard key={t.name}
                  name={t.name} shortName={t.shortName}
                  color={t.color} description={t.desc}
                  connected={isConnected(t.name)}
                  accountLabel={getLabel(t.name)}
                  onConnect={() => setConnectingProvider({ provider: t.name, category: 'tax_government' })}
                  onDisconnect={() => disconnect(t.name)} />
              ))}
            </div>
          </>
        )}
      </div>

      {connectingProvider && (
        <ConnectProviderModal
          provider={connectingProvider.provider}
          category={connectingProvider.category}
          open={true}
          onClose={() => setConnectingProvider(null)}
          onConnected={(label) => {
            connect(connectingProvider.provider, connectingProvider.category, label)
            setConnectingProvider(null)
          }}
        />
      )}
    </Wrapper>
  )
}

'use client'

// Force Vercel trigger rebuild
import React, { useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from "@/components/layouts/DashboardProvider"
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations'
import ConnectionCard from '@/components/settings/ConnectionCard'
import ConnectProviderModal from '@/components/settings/ConnectProviderModal'

export default function IntegrationsHubPage() {
  const { workspace } = useDashboardContext()
  const workspaceId = workspace?.id || null

  const { isConnected, getLabel, connect, disconnect, loading, error } =
    useWorkspaceIntegrations(workspaceId)

  const [connectingProvider, setConnectingProvider] = useState<{
    provider: string
    category: string
  } | null>(null)

  const renderIntegrationCard = (item: {
    name: string
    shortName: string
    color: string
    desc: string
    status: 'available' | 'coming_soon'
    category: string
  }) => {
    if (item.status === 'available') {
      return (
        <ConnectionCard
          key={item.name}
          name={item.name}
          shortName={item.shortName}
          color={item.color}
          description={item.desc}
          connected={isConnected(item.name)}
          accountLabel={getLabel(item.name)}
          onConnect={() => setConnectingProvider({ provider: item.name, category: item.category })}
          onDisconnect={() => disconnect(item.name)}
        />
      )
    }

    // coming_soon: subtle dimmed card style + disabled greyed "Coming Soon" badge
    return (
      <div key={item.name} className="bg-[rgba(12,21,53,0.5)] border border-[rgba(255,255,255,0.04)]
        rounded-xl p-5 flex items-center justify-between gap-4
        opacity-50 select-none w-full transition-all duration-200">
        
        {/* Left — icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${item.color}15` }}>
            <span className="text-[12px] font-bold"
              style={{ color: item.color, fontFamily: "'Space Grotesk', sans-serif" }}>
              {item.shortName.slice(0, 4)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[#94a3c8] text-[14px] font-semibold truncate block"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {item.name}
            </span>
            <p className="text-[#4a5a82] text-[11.5px] mt-0.5 leading-snug"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {item.desc}
            </p>
          </div>
        </div>

        {/* Right — Coming Soon badge */}
        <div className="flex-shrink-0">
          <span className="bg-white/5 border border-white/10 text-gray-500 text-[11px] font-semibold rounded-lg px-3 py-1.5 cursor-not-allowed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Coming Soon
          </span>
        </div>
      </div>
    )
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
            Integrations<span style={{ color: '#3b82f6' }}> Hub</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1"
            style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
            Connect LeadsMind to the tools your business already uses
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
            {/* Email & Calendar */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Email & Calendar
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Gmail', shortName: 'GM', color: '#ea4335',
                  desc: 'Emails from clients are automatically logged on their contact record', status: 'coming_soon', category: 'email_calendar' },
                { name: 'Google Calendar', shortName: 'GC', color: '#4285f4',
                  desc: 'Your calendar syncs with LeadsMind, letting contacts book meetings directly', status: 'coming_soon', category: 'email_calendar' },
                { name: 'Outlook & Microsoft 365', shortName: 'MS', color: '#0078d4',
                  desc: 'Sync your Outlook emails and calendar events automatically', status: 'coming_soon', category: 'email_calendar' },
              ].map(item => renderIntegrationCard(item as any))}
            </div>

            {/* Team Communication */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Team Communication
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Slack', shortName: 'SL', color: '#4a154b',
                  desc: 'Get notified in Slack when leads fill in forms or buy products', status: 'coming_soon', category: 'communication' },
              ].map(item => renderIntegrationCard(item as any))}
            </div>

            {/* Automation Platforms */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Automation Platforms
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Zapier', shortName: 'ZAP', color: '#ff4a00',
                  desc: 'Connect LeadsMind to 5,000+ apps via Zapier triggers and actions', status: 'coming_soon', category: 'automation' },
                { name: 'Make.com', shortName: 'MK', color: '#6d00cc',
                  desc: 'Build advanced workflows and scenarios', status: 'coming_soon', category: 'automation' },
              ].map(item => renderIntegrationCard(item as any))}
            </div>

            {/* E-Commerce */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              E-Commerce
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Shopify', shortName: 'SH', color: '#95bf47',
                  desc: 'Sync customers, products, and order data in real time', status: 'coming_soon', category: 'ecommerce' },
                { name: 'WooCommerce', shortName: 'WC', color: '#7f54b3',
                  desc: 'Import WooCommerce order history and update contact stages', status: 'coming_soon', category: 'ecommerce' },
              ].map(item => renderIntegrationCard(item as any))}
            </div>

            {/* Marketing & Social */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Marketing & Social
            </p>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Meta Ads', shortName: 'FB', color: '#1877f2',
                  desc: 'Sync Meta Lead Ads forms directly to your LeadsMind CRM pipelines', status: 'coming_soon', category: 'marketing' },
                { name: 'Google Ads', shortName: 'GA', color: '#fbbc04',
                  desc: 'Track conversions and sync lead acquisition data', status: 'coming_soon', category: 'marketing' },
                { name: 'Mailchimp', shortName: 'MC', color: '#ffe01b',
                  desc: 'Sync contact lists and newsletter subscriptions automatically', status: 'coming_soon', category: 'marketing' },
              ].map(item => renderIntegrationCard(item as any))}
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

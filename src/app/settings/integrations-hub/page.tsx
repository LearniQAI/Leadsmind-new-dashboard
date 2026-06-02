'use client'

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
                  desc: 'Emails from clients are automatically logged on their contact record' },
                { name: 'Google Calendar', shortName: 'GC', color: '#4285f4',
                  desc: 'Your calendar syncs with LeadsMind, letting contacts book meetings directly' },
                { name: 'Outlook & Microsoft 365', shortName: 'MS', color: '#0078d4',
                  desc: 'Sync your Outlook emails and calendar events automatically' },
                { name: 'Google Drive', shortName: 'GD', color: '#34a853',
                  desc: 'Attach files from Google Drive to contacts, deals, and messages' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'email_calendar' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Team Communication */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Team Communication
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Slack', shortName: 'SL', color: '#4a154b',
                  desc: 'Get notified in Slack when leads fill in forms or buy products' },
                { name: 'Microsoft Teams', shortName: 'MT', color: '#6264a7',
                  desc: 'Send automated alerts to Teams channels' },
                { name: 'Telegram', shortName: 'TG', color: '#2ca5e0',
                  desc: 'Receive important notifications on the go via Telegram' },
                { name: 'Zoom', shortName: 'ZM', color: '#2d8cff',
                  desc: 'Auto-create Zoom meeting links for scheduled appointments' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'communication' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Automation Platforms */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Automation Platforms
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Zapier', shortName: 'ZAP', color: '#ff4a00',
                  desc: 'Connect LeadsMind to 5,000+ apps via Zapier triggers and actions' },
                { name: 'Make.com', shortName: 'MK', color: '#6d00cc',
                  desc: 'Build advanced workflows and scenarios' },
                { name: 'n8n', shortName: 'N8N', color: '#ea4b71',
                  desc: 'Workflow automation with self-hosted flexibility' },
                { name: 'Pabbly Connect', shortName: 'PAB', color: '#1da1f2',
                  desc: 'Send data to other tools with zero coding required' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'automation' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* E-Commerce */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              E-Commerce
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Shopify', shortName: 'SH', color: '#95bf47',
                  desc: 'Sync customers, products, and order data in real time' },
                { name: 'WooCommerce', shortName: 'WC', color: '#7f54b3',
                  desc: 'Import WooCommerce order history and update contact stages' },
                { name: 'Takealot', shortName: 'TA', color: '#0099cc',
                  desc: 'Sync sales and orders from South Africa\'s largest online retailer' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'ecommerce' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Marketing & Social */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Marketing & Social
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Meta Ads', shortName: 'FB', color: '#1877f2',
                  desc: 'Sync Meta Lead Ads forms directly to your LeadsMind CRM pipelines' },
                { name: 'Google Ads', shortName: 'GA', color: '#fbbc04',
                  desc: 'Track conversions and sync lead acquisition data' },
                { name: 'LinkedIn', shortName: 'LI', color: '#0a66c2',
                  desc: 'Import LinkedIn Lead Gen forms directly' },
                { name: 'TikTok', shortName: 'TT', color: '#000000',
                  desc: 'Sync TikTok Lead Generation forms' },
                { name: 'Mailchimp', shortName: 'MC', color: '#ffe01b',
                  desc: 'Sync contact lists and newsletter subscriptions automatically' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'marketing' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Analytics */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Analytics
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Google Analytics', shortName: 'GA4', color: '#e37400',
                  desc: 'Monitor website traffic patterns and conversion funnels' },
                { name: 'Meta Pixel', shortName: 'PIX', color: '#1877f2',
                  desc: 'Track visitor actions and target custom Facebook Audiences' },
                { name: 'HotJar', shortName: 'HJ', color: '#ff3c00',
                  desc: 'View heatmaps and visitor recordings on your site' },
                { name: 'Google Tag Manager', shortName: 'GTM', color: '#4285f4',
                  desc: 'Deploy tracking tags without manual code edits' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'analytics' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Courier */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Courier
            </p>
            <div className="flex flex-col gap-3">
              {[
                { name: 'The Courier Guy', shortName: 'TCG', color: '#e31e24',
                  desc: 'Book shipments and track deliveries from invoice records' },
                { name: 'DHL South Africa', shortName: 'DHL', color: '#d40511',
                  desc: 'Automate international courier shipping and updates' },
                { name: 'Skynet', shortName: 'SKY', color: '#003087',
                  desc: 'Integrate local domestic logistics and tracking' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'courier' })}
                  onDisconnect={() => disconnect(item.name)} />
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

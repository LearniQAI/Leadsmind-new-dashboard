'use client'

// Force Vercel trigger rebuild
import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from "@/components/layouts/DashboardProvider"
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations'
import ConnectionCard from '@/components/settings/ConnectionCard'
import ConnectProviderModal from '@/components/settings/ConnectProviderModal'

const CALENDAR_OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'Calendar connection was cancelled.',
  invalid_state: 'That connection link expired or was already used — please try connecting again.',
  missing_params: 'The calendar provider did not return a valid response. Please try again.',
  config_missing: 'Calendar OAuth is not configured on this environment yet.',
  connection_failed: 'Could not complete the calendar connection. Please try again.',
  oauth_error: 'The calendar provider reported an error. Please try again.',
  init_failed: 'Could not start the calendar connection. Please try again.',
}

export default function IntegrationsHubPage() {
  const { workspace } = useDashboardContext()
  const workspaceId = workspace?.id || null
  const searchParams = useSearchParams()
  const router = useRouter()

  const { isConnected, getLabel, connect, disconnect, loading, error, refetch } =
    useWorkspaceIntegrations(workspaceId)

  // Surface the result of a calendar OAuth round-trip (Task 62 — the connect
  // routes redirect back here with ?calendar_connected=… / ?calendar_error=…).
  useEffect(() => {
    const connected = searchParams.get('calendar_connected')
    const errCode = searchParams.get('calendar_error')
    if (!connected && !errCode) return

    if (connected) {
      toast.success(
        connected === 'google' ? 'Google Calendar connected — your availability now syncs.'
        : connected === 'zoom' ? 'Zoom connected — new bookings will get a real Zoom link.'
        : 'Outlook connected — your calendar and Teams meetings now sync.'
      )
      refetch()
    } else if (errCode) {
      toast.error(CALENDAR_OAUTH_ERRORS[errCode] || 'Calendar connection failed. Please try again.')
    }
    router.replace('/settings/integrations-hub')
  }, [searchParams, refetch, router])

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
      <div key={item.name} className="bg-dash-surface border border-dash-border
        rounded-xl p-5 flex items-center justify-between gap-4
        opacity-50 select-none w-full transition-all duration-200 motion-reduce:transition-none">

        {/* Left — icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${item.color}15` }}>
            <span className="text-[12px] font-bold"
              style={{ color: item.color }}>
              {item.shortName.slice(0, 4)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="!text-dash-text text-[14px] font-semibold truncate block">
              {item.name}
            </span>
            <p className="!text-dash-textMuted text-[11.5px] mt-0.5 leading-snug">
              {item.desc}
            </p>
          </div>
        </div>

        {/* Right — Coming Soon badge */}
        <div className="flex-shrink-0">
          <span className="bg-dash-border/40 border border-dash-border !text-dash-textMuted text-[11px] font-semibold rounded-lg px-3 py-1.5 cursor-not-allowed">
            Coming soon
          </span>
        </div>
      </div>
    )
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold !text-dash-text">
            Integrations<span className="text-dash-accent"> hub</span>
          </h1>
          <p className="text-[11px] font-medium mt-1 !text-dash-textMuted">
            Connect LeadsMind to the tools your business already uses
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[12px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[76px] rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : (
          <>
            {/* Email & Calendar */}
            <p className="text-[10px] font-semibold mb-3 !text-dash-textMuted">
              Email & calendar
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'Google Calendar', shortName: 'GC', color: '#4285f4',
                  desc: 'Your calendar syncs with LeadsMind, letting contacts book meetings directly', status: 'available', category: 'email_calendar' },
                // Outlook connect (Task 62) — /api/auth/microsoft/* + all sync code.
                // The Azure app registration + OUTLOOK_CLIENT_ID/OUTLOOK_CLIENT_SECRET
                // must be configured for this to complete a real connection.
                { name: 'Outlook & Microsoft 365', shortName: 'MS', color: '#0078d4',
                  desc: 'Sync your Outlook calendar, and get Microsoft Teams meeting links on bookings', status: 'available', category: 'email_calendar' },
              ].map(item => renderIntegrationCard(item as any))}
            </div>

            {/* Video conferencing */}
            <p className="text-[10px] font-semibold mb-3 !text-dash-textMuted">
              Video conferencing
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                // Task 70 — Zoom connect (/api/auth/zoom/*), token store, meeting
                // create/update/cancel and the meetingLink.ts `zoom` branch.
                // Needs a Zoom Marketplace app + ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET
                // configured to complete a real connection.
                { name: 'Zoom', shortName: 'ZM', color: '#2d8cff',
                  desc: 'Bookings on a Zoom calendar get a real Zoom link, auto-updated on reschedule', status: 'available', category: 'video_conferencing' },
                // Microsoft Teams reuses the ONE Outlook/M365 connection (Graph
                // online meetings). Connecting here routes to the Outlook OAuth
                // flow; needs OnlineMeetings.ReadWrite on the Azure app.
                { name: 'Microsoft Teams', shortName: 'MT', color: '#4b53bc',
                  desc: 'Teams meeting links via your connected Microsoft 365 account — no separate connect', status: 'available', category: 'video_conferencing' },
              ].map(item => renderIntegrationCard(item as any))}
            </div>

            {/* Automation Platforms */}
            <p className="text-[10px] font-semibold mb-3 !text-dash-textMuted">
              Automation platforms
            </p>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Zapier', shortName: 'ZAP', color: '#ff4a00',
                  desc: 'Connect LeadsMind to 5,000+ apps via Zapier triggers and actions', status: 'available', category: 'automation' },
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

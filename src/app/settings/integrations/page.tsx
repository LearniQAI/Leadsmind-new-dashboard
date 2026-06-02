'use client'

import { useState } from 'react'
import IntegrationsList from '@/components/meta/IntegrationsList'
import ConnectPlatformsModal from '@/components/meta/ConnectPlatformsModal'

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = 'facebook' | 'instagram' | 'whatsapp'

interface MetaConnection {
  platform: Platform
  connected: boolean
  accountName?: string
  accountHandle?: string
  phoneNumber?: string
  error?: string
}

// ─── Mock data (replace with real Supabase/API call later) ───────────────────

const INITIAL_CONNECTIONS: MetaConnection[] = [
  {
    platform: 'facebook',
    connected: false,
  },
  {
    platform: 'instagram',
    connected: false,
  },
  {
    platform: 'whatsapp',
    connected: false,
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MetaIntegrationsPage() {
  const [connections, setConnections] = useState<MetaConnection[]>(INITIAL_CONNECTIONS)
  const [modalOpen, setModalOpen] = useState(false)
  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all')

  // Opens the connect wizard for a specific platform
  const handleConnect = (platform: Platform) => {
    setActivePlatform(platform)
    setModalOpen(true)
  }

  // Disconnects a platform — clears its connection data
  const handleDisconnect = (platform: Platform) => {
    setConnections(prev =>
      prev.map(c =>
        c.platform === platform
          ? { platform, connected: false }
          : c
      )
    )
  }

  // Called when the modal wizard completes successfully
  const handleComplete = (result: { platform: string; assetName: string }) => {
    setConnections(prev =>
      prev.map(c => {
        if (c.platform !== result.platform) return c
        return {
          ...c,
          connected: true,
          accountName: result.assetName,
          accountHandle: result.platform === 'instagram' ? result.assetName : undefined,
          phoneNumber: result.platform === 'whatsapp' ? result.assetName : undefined,
        }
      })
    )
    setModalOpen(false)
  }

  // Reconnect = open modal for the first disconnected platform,
  // or open the full "all" wizard if all are disconnected
  const handleReconnect = () => {
    const disconnected = connections.find(c => !c.connected)
    setActivePlatform(disconnected?.platform ?? 'all')
    setModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#04091a]">
      {/* Page content — padded to account for sidebar and topbar */}
      <div className="px-6 py-6 max-w-3xl">

        {/* Main integrations list */}
        <IntegrationsList
          connections={connections}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onReconnect={handleReconnect}
        />

      </div>

      {/* Connect wizard modal */}
      <ConnectPlatformsModal
        open={modalOpen}
        platform={activePlatform}
        onClose={() => setModalOpen(false)}
        onComplete={handleComplete}
      />
    </div>
  )
}

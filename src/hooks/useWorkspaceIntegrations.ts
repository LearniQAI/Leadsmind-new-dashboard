'use client'
import { useState, useEffect, useCallback } from 'react'

interface Integration {
  provider: string
  category: string
  connected: boolean
  account_label: string | null
  connected_at: string | null
}

export function useWorkspaceIntegrations(workspaceId: string | null) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await window.fetch(`/api/settings/integrations?workspaceId=${workspaceId}`)
      const data = await res.json()
      setIntegrations(data.integrations ?? [])
    } catch {
      setError('Could not load integrations.')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetch() }, [fetch])

  const isConnected = (provider: string) =>
    integrations.find(i => i.provider === provider)?.connected ?? false

  const getLabel = (provider: string) =>
    integrations.find(i => i.provider === provider)?.account_label ?? null

  const connect = async (provider: string, category: string, accountLabel?: string) => {
    await window.fetch('/api/settings/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, provider, category, accountLabel }),
    })
    await fetch()
  }

  const disconnect = async (provider: string) => {
    await window.fetch(`/api/settings/integrations?workspaceId=${workspaceId}&provider=${provider}`, {
      method: 'DELETE',
    })
    await fetch()
  }

  return { integrations, loading, error, isConnected, getLabel, connect, disconnect, refetch: fetch }
}

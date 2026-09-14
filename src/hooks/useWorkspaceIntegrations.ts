'use client'
import { useState, useEffect, useCallback } from 'react'

interface Integration {
  provider: string
  category: string
  connected: boolean
  account_label: string | null
  connected_at: string | null
  needs_reconnect: boolean
}

export function useWorkspaceIntegrations(workspaceId: string | null) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per-provider, not global `loading` (that one only gates the initial page
  // skeleton) — lets a single card show a spinner/disable its own button
  // while its own connect/disconnect request is in flight.
  const [pendingProvider, setPendingProvider] = useState<string | null>(null)

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

  // Case-insensitive: Paystack/Flutterwave/Ozow are always stored lowercase
  // (see api/settings/integrations/route.ts) since every server-side reader
  // of those 3 queries lowercase, but this page's gateway list still passes
  // the capitalized display name ("Paystack") into isConnected/getLabel — an
  // exact-match comparison here would silently never show "Connected" for
  // them even though the row is really there.
  const isConnected = (provider: string) =>
    integrations.find(i => i.provider.toLowerCase() === provider.toLowerCase())?.connected ?? false

  const getLabel = (provider: string) =>
    integrations.find(i => i.provider.toLowerCase() === provider.toLowerCase())?.account_label ?? null

  // True only for the Microsoft Teams pseudo-row (Task 70): the underlying
  // Outlook connection exists but was made/consented before the
  // OnlineMeetings.ReadWrite scope, so Teams meeting creation would 403 even
  // though the card must not silently claim "Connect" (Outlook already
  // exists) or "Connected" (Teams doesn't actually work yet).
  const needsReconnect = (provider: string) =>
    integrations.find(i => i.provider.toLowerCase() === provider.toLowerCase())?.needs_reconnect ?? false

  // Root cause of "Disconnect does nothing, no error shown": both of these
  // previously fired the request, ignored whether it actually succeeded (a
  // non-2xx response still resolves — fetch only rejects on network failure),
  // and unconditionally refetched — which just re-displays the unchanged
  // server state with zero feedback on why nothing changed. Both now check
  // `res.ok` and throw with the server's real error message on failure, so a
  // caller can catch it and show it, instead of the failure being invisible.
  const connect = async (provider: string, category: string, accountLabel?: string) => {
    setPendingProvider(provider)
    try {
      const res = await window.fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, provider, category, accountLabel }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Could not connect ${provider}.`)
      }
      await fetch()
    } finally {
      setPendingProvider(null)
    }
  }

  const disconnect = async (provider: string) => {
    setPendingProvider(provider)
    try {
      const res = await window.fetch(`/api/settings/integrations?workspaceId=${workspaceId}&provider=${provider}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Could not disconnect ${provider}.`)
      }
      await fetch()
    } finally {
      setPendingProvider(null)
    }
  }

  const isPending = (provider: string) =>
    pendingProvider !== null && pendingProvider.toLowerCase() === provider.toLowerCase()

  return { integrations, loading, error, isConnected, getLabel, needsReconnect, isPending, connect, disconnect, refetch: fetch }
}

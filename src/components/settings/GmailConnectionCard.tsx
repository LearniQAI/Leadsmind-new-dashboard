'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import ConnectionCard from '@/components/settings/ConnectionCard'

// The signed-in user's OWN Gmail mailbox (Conversations). Unlike the other
// cards on this page it is not a workspace-level row: it reads
// /api/auth/gmail/status, which checks the caller's connection live against
// Gmail, so a grant revoked in the Google Account shows "Reconnect required"
// rather than a stale "Connected".

type GmailStatus =
  | { state: 'not_connected' }
  | { state: 'connected'; email: string | null }
  | { state: 'needs_reconnect'; email: string | null; reason: 'authorization_revoked' | 'missing_permission' }

const RECONNECT_HINTS: Record<'authorization_revoked' | 'missing_permission', string> = {
  authorization_revoked: 'Google no longer accepts this connection (access was removed or expired). Reconnect to keep using it.',
  missing_permission: 'The Gmail permission was not granted. Reconnect and tick "Read, compose and send emails".',
}

export default function GmailConnectionCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [pending, setPending] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/gmail/status', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      setStatus(await res.json())
    } catch {
      setStatus({ state: 'not_connected' })
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const handleDisconnect = async () => {
    setPending(true)
    try {
      const res = await fetch('/api/auth/gmail/disconnect', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not disconnect Gmail.')
      toast.success('Gmail disconnected.')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'Could not disconnect Gmail. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const email = status && status.state !== 'not_connected' ? status.email : null

  return (
    <ConnectionCard
      name="Gmail"
      shortName="GM"
      color="#ea4335"
      description="Connect your own Gmail inbox so you can send and receive email in Conversations"
      connected={status?.state === 'connected'}
      accountLabel={email ? `Connected as ${email}` : null}
      needsReconnect={status?.state === 'needs_reconnect'}
      reconnectHint={
        status?.state === 'needs_reconnect'
          ? `${email ? `${email}: ` : ''}${RECONNECT_HINTS[status.reason]}`
          : undefined
      }
      loading={status === null || pending}
      onConnect={() => { setPending(true); window.location.href = '/api/auth/gmail' }}
      onDisconnect={handleDisconnect}
    />
  )
}

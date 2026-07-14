'use client'

import React from 'react'
import { DashButton } from '@/components/dashboard-ui/Button'

interface ConnectionCardProps {
  name: string
  shortName: string
  description: string
  color: string
  connected?: boolean
  accountLabel?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  loading?: boolean
}

export default function ConnectionCard({
  name,
  shortName,
  description,
  color,
  connected = false,
  accountLabel,
  onConnect,
  onDisconnect,
  loading = false,
}: ConnectionCardProps) {
  return (
    <div className="bg-white border border-dash-border
      rounded-xl p-5 flex items-center justify-between gap-4
      hover:border-dash-text/15 hover:shadow-md
      transition-all duration-200 motion-reduce:transition-none w-full shadow-sm">

      {/* Left — icon + info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}1F` }}>
          <span className="text-[12px] font-bold"
            style={{ color }}>
            {shortName.slice(0, 4)}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="!text-dash-text text-[14px] font-semibold truncate">
              {name}
            </span>
            {connected && (
              <span className="bg-green/10 border border-green/20
                text-green text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                ● Connected
              </span>
            )}
          </div>
          <p className="!text-dash-textMuted text-[11.5px] mt-0.5 leading-snug">
            {connected && accountLabel ? accountLabel : description}
          </p>
        </div>
      </div>

      {/* Right — action */}
      <div className="flex-shrink-0">
        {connected ? (
          <DashButton
            onClick={onDisconnect}
            disabled={loading}
            variant="secondary"
            size="sm"
            className="bg-red/10 border-red/20 text-red hover:bg-red/20"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-red border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />}
            Disconnect
          </DashButton>
        ) : (
          <button onClick={onConnect} disabled={loading}
            className="text-white text-[11.5px] font-semibold rounded-lg px-3 py-1.5
              hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: color }}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />}
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

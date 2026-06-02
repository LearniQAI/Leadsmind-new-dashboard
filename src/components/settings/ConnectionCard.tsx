'use client'

import React from 'react'

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
    <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)]
      rounded-xl p-5 flex items-center justify-between gap-4
      hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(21,37,80,0.9)]
      transition-all duration-200 w-full">

      {/* Left — icon + info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}1F` }}>
          <span className="text-[12px] font-bold"
            style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>
            {shortName.slice(0, 4)}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#eef2ff] text-[14px] font-semibold truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {name}
            </span>
            {connected && (
              <span className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)]
                text-[#10b981] text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                ● Connected
              </span>
            )}
          </div>
          <p className="text-[#94a3c8] text-[11.5px] mt-0.5 leading-snug"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {connected && accountLabel ? accountLabel : description}
          </p>
        </div>
      </div>

      {/* Right — action */}
      <div className="flex-shrink-0">
        {connected ? (
          <button onClick={onDisconnect} disabled={loading}
            className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]
              text-[#ef4444] text-[11.5px] font-semibold rounded-lg px-3 py-1.5
              hover:bg-[rgba(239,68,68,0.18)] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />}
            Disconnect
          </button>
        ) : (
          <button onClick={onConnect} disabled={loading}
            className="text-white text-[11.5px] font-semibold rounded-lg px-3 py-1.5
              hover:opacity-90 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: color,
              fontFamily: "'DM Sans', sans-serif",
            }}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import Image from 'next/image'
import { DashButton } from '@/components/dashboard-ui/Button'

interface ConnectionCardProps {
  name: string
  shortName: string
  description: string
  color: string
  // Path to the provider's official logo (e.g. '/assets/images/payment-gateways/stripe.svg').
  // Falls back to a colored-initial tile when omitted.
  logo?: string
  connected?: boolean
  accountLabel?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  loading?: boolean
  // No backend exists yet to actually process payments through this provider —
  // disables Connect so a typed-in credential can't produce a false "Connected"
  // badge for a gateway nothing in the app can act on. Ignored if `connected` is
  // already true, so a real existing connection is never hidden.
  comingSoon?: boolean
}

export default function ConnectionCard({
  name,
  shortName,
  description,
  color,
  logo,
  connected = false,
  accountLabel,
  onConnect,
  onDisconnect,
  loading = false,
  comingSoon = false,
}: ConnectionCardProps) {
  return (
    <div className="group relative bg-white border border-dash-border/80
      rounded-2xl p-5 flex items-center justify-between gap-4
      hover:border-transparent hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.15)]
      transition-all duration-300 motion-reduce:transition-none w-full shadow-sm overflow-hidden">

      {/* Ambient hover glow tinted with the provider's brand color */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(120% 140% at 0% 0%, ${color}0D 0%, transparent 60%)` }}
      />

      {/* Left — icon + info */}
      <div className="relative flex items-center gap-4 min-w-0">
        {logo ? (
          <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-[1.04]">
            <Image src={logo} alt={`${name} logo`} width={52} height={52} className="w-full h-full object-contain drop-shadow-sm" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}1F` }}>
            <span className="text-[13px] font-bold"
              style={{ color }}>
              {shortName.slice(0, 4)}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="!text-dash-text text-[15px] font-semibold tracking-tight truncate">
              {name}
            </span>
            {connected && (
              <span className="inline-flex items-center gap-1 bg-green/10 border border-green/20
                text-green text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse motion-reduce:animate-none" />
                Connected
              </span>
            )}
          </div>
          <p className="!text-dash-textMuted text-[12px] mt-0.5 leading-snug max-w-md">
            {connected && accountLabel ? accountLabel : description}
          </p>
        </div>
      </div>

      {/* Right — action */}
      <div className="relative flex-shrink-0">
        {connected ? (
          <DashButton
            onClick={onDisconnect}
            disabled={loading}
            variant="secondary"
            size="sm"
            className="!rounded-xl bg-red/10 border-red/20 text-red hover:bg-red/20"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-red border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />}
            Disconnect
          </DashButton>
        ) : comingSoon ? (
          <button disabled
            className="!text-dash-textMuted text-[11.5px] font-semibold rounded-xl px-4 py-2 cursor-not-allowed opacity-50 border border-dash-border">
            Coming Soon
          </button>
        ) : (
          <button onClick={onConnect} disabled={loading}
            className="text-white text-[12px] font-semibold rounded-xl px-4 py-2
              shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.98]
              transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: color, boxShadow: `0 4px 14px -4px ${color}66` }}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />}
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

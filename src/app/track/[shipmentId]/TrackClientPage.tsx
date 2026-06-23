'use client'

import React, { useState } from 'react'
import { confirmReceiptAction } from '@/app/actions/shipments'

interface TrackClientPageProps {
  shipment: any
  brand: any
  events: any[]
  token: string
}

export default function TrackClientPage({
  shipment: initialShipment,
  brand,
  events: initialEvents,
  token
}: TrackClientPageProps) {
  const [shipment, setShipment] = useState(initialShipment)
  const [events, setEvents] = useState(initialEvents)
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleConfirm = async () => {
    if (!token) return
    setConfirmStatus('loading')
    try {
      const res = await confirmReceiptAction(shipment.id, token)
      if (res.success) {
        setConfirmStatus('success')
        setShipment({
          ...shipment,
          received_confirmed_at: new Date().toISOString(),
          status: 'DELIVERED',
          raw_status: 'Confirmed by recipient'
        })
        // Append a new event locally
        setEvents([
          {
            id: 'local-event',
            normalised_status: 'DELIVERED',
            raw_status: 'Confirmed by recipient',
            occurred_at: new Date().toISOString()
          },
          ...events
        ])
      } else {
        setConfirmStatus('error')
        setErrorMessage(res.error || 'Failed to confirm receipt.')
      }
    } catch (err: any) {
      console.error(err)
      setConfirmStatus('error')
      setErrorMessage('An unexpected error occurred.')
    }
  }

  const brandColor = brand.brand_colour || '#3b82f6'

  // Icon mapping helper
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <i className="fa-solid fa-circle-check text-emerald-400"></i>
      case 'OUT_FOR_DELIVERY':
        return <i className="fa-solid fa-truck-ramp-box text-amber-400"></i>
      case 'IN_TRANSIT':
        return <i className="fa-solid fa-truck-fast text-blue-400"></i>
      case 'INFO_RECEIVED':
        return <i className="fa-solid fa-file-invoice text-indigo-400"></i>
      default:
        return <i className="fa-solid fa-clock text-gray-400"></i>
    }
  }

  return (
    <div 
      className="min-h-screen bg-[#04091a] text-white py-12 px-4 sm:px-6 lg:px-8 font-dm-sans"
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header / Brand Logo */}
        <div className="flex flex-col items-center text-center space-y-4">
          {brand.logo_url ? (
            <img 
              src={brand.logo_url} 
              alt="Logo" 
              className="max-h-16 object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 text-xl font-bold font-space-grotesk tracking-tight text-white">
              <i className="fa-solid fa-cube text-[#3b82f6]"></i>
              <span>LeadsMind Tracking</span>
            </div>
          )}
          {brand.tagline && (
            <p className="text-xs text-[#94a3c8] max-w-sm italic uppercase tracking-wider">
              {brand.tagline}
            </p>
          )}
        </div>

        {/* Shipment Info Card */}
        <div className="bg-[#080f28] border border-white/5 rounded-[24px] shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Ambient Background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--brand-color)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-mono">
                Tracking Number
              </p>
              <h2 className="text-xl font-bold font-mono text-white mt-1">
                {shipment.tracking_number}
              </h2>
              {shipment.courier_slug && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-white/5 text-[#94a3c8] border border-white/5 capitalize">
                  <i className="fa-solid fa-shipping-fast text-[10px]"></i>
                  {shipment.courier_slug}
                </span>
              )}
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-mono">
                Current Status
              </p>
              <div className="flex items-center gap-2 mt-1 justify-start sm:justify-end">
                <span className="font-extrabold text-sm tracking-wide text-white capitalize bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                  {getStatusIcon(shipment.status)}
                  {shipment.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-mono">
                Estimated Delivery
              </h4>
              <p className="text-sm font-bold text-white mt-1">
                {shipment.estimated_delivery 
                  ? new Date(shipment.estimated_delivery).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })
                  : 'Pending update...'}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-mono">
                Recipient Details
              </h4>
              <p className="text-sm font-bold text-white mt-1">
                {shipment.recipient_name || 'Valued Customer'}
              </p>
              {shipment.recipient_email && (
                <p className="text-xs text-[#94a3c8] font-mono mt-0.5">
                  {shipment.recipient_email}
                </p>
              )}
            </div>
          </div>

          {/* Confirm Received Section */}
          {token && !shipment.received_confirmed_at && (
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h4 className="text-sm font-bold text-white">Have you received your package?</h4>
                  <p className="text-xs text-[#94a3c8] mt-0.5">
                    Click confirm below to confirm receipt directly to the seller.
                  </p>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={confirmStatus === 'loading'}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 shrink-0"
                  style={{
                    backgroundImage: brand.brand_colour 
                      ? `linear-gradient(135deg, ${brand.brand_colour}, ${brand.brand_colour}ee)` 
                      : undefined
                  }}
                >
                  {confirmStatus === 'loading' ? (
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      Confirming...
                    </span>
                  ) : (
                    'Confirm Received'
                  )}
                </button>
              </div>

              {confirmStatus === 'error' && (
                <p className="text-xs text-red-400 font-mono text-center">{errorMessage}</p>
              )}
            </div>
          )}

          {shipment.received_confirmed_at && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-1">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 mb-1">
                  <i className="fa-solid fa-check"></i>
                </div>
                <h4 className="text-sm font-bold text-white">Delivery Receipt Confirmed</h4>
                <p className="text-xs text-emerald-400 font-mono">
                  Confirmed by recipient at {new Date(shipment.received_confirmed_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Events Card */}
        <div className="bg-[#080f28] border border-white/5 rounded-[24px] shadow-2xl p-6 sm:p-8">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 font-space-grotesk">
            Shipment Progress & History
          </h3>

          {events.length === 0 ? (
            <div className="text-center py-8 text-[#94a3c8] text-sm">
              No delivery events logged yet. Check back soon for updates!
            </div>
          ) : (
            <div className="relative border-l-2 border-white/5 ml-4 pl-6 space-y-8">
              {events.map((event, idx) => {
                const isFirst = idx === 0
                return (
                  <div key={event.id || idx} className="relative group">
                    {/* Timeline Dot Indicator */}
                    <div 
                      className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-[#04091a] transition-all flex items-center justify-center ${
                        isFirst 
                          ? 'border-[var(--brand-color)] scale-125' 
                          : 'border-white/20'
                      }`}
                    >
                      {isFirst && (
                        <div 
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: brandColor }}
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 justify-between">
                        <h4 className={`text-sm font-bold ${isFirst ? 'text-white' : 'text-[#94a3c8]'}`}>
                          {event.normalised_status?.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-[11px] text-[#4a5a82] font-mono">
                          {new Date(event.occurred_at || event.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {event.raw_status && (
                        <p className="text-xs text-[#94a3c8] leading-relaxed">
                          {event.raw_status}
                        </p>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-[#4a5a82] font-mono mt-1">
                          <i className="fa-solid fa-location-dot text-[10px]"></i>
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-[#4a5a82] uppercase tracking-[1.5px] font-bold">
          Powered by LeadsMind Shipping Network
        </div>
      </div>
    </div>
  )
}

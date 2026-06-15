'use client'

import React, { useState } from 'react'
import {
  Package, Truck, CheckCircle, AlertCircle, Clock, Plus, Search,
  X, RefreshCw, Palette
} from 'lucide-react'
import { createShipment, getShipmentEvents, updateTrackingBrand } from '@/app/actions/shipments'
import { toast } from 'sonner'

interface ShipmentsClientProps {
  initialShipments: any[]
  brandSettings: any
  workspaceId: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  PENDING: { label: 'Pending', bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
  INFO_RECEIVED: { label: 'Info Received', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Truck },
  DELIVERED: { label: 'Delivered', bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle },
  EXCEPTION: { label: 'Exception / Delayed', bg: 'bg-red-500/10', text: 'text-red-500', icon: AlertCircle },
  FAILED_ATTEMPT: { label: 'Failed Attempt', bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle },
  RETURNED: { label: 'Returned', bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Package }
}

export default function ShipmentsClient({ initialShipments, brandSettings, workspaceId }: ShipmentsClientProps) {
  const [shipments, setShipments] = useState(initialShipments)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [selectedShipment, setSelectedShipment] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Add Shipment Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [courierSlug, setCourierSlug] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Brand Settings Modal State
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [logoUrl, setLogoUrl] = useState(brandSettings?.logo_url || '')
  const [brandColour, setBrandColour] = useState(brandSettings?.brand_colour || '#3b82f6')
  const [tagline, setTagline] = useState(brandSettings?.tagline || '')
  const [fromName, setFromName] = useState(brandSettings?.from_name || '')
  const [fromEmail, setFromEmail] = useState(brandSettings?.from_email || '')
  const [customTrackDomain, setCustomTrackDomain] = useState(brandSettings?.custom_track_domain || '')
  const [whiteLabel, setWhiteLabel] = useState(!!brandSettings?.white_label)
  const [savingBrand, setSavingBrand] = useState(false)

  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber.trim()) return
    setSubmitting(true)
    const res = await createShipment(workspaceId, {
      tracking_number: trackingNumber.trim(),
      recipient_name: recipientName.trim() || undefined,
      recipient_email: recipientEmail.trim() || undefined,
      courier_slug: courierSlug.trim() || undefined
    })
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to register shipment')
      return
    }
    toast.success('Shipment registered successfully!')
    setShipments([res.data, ...shipments])
    setShowAddModal(false)
    setTrackingNumber('')
    setRecipientName('')
    setRecipientEmail('')
    setCourierSlug('')
  }

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBrand(true)
    const res = await updateTrackingBrand(workspaceId, {
      logo_url: logoUrl.trim() || null,
      brand_colour: brandColour,
      tagline: tagline.trim() || null,
      from_name: fromName.trim() || null,
      from_email: fromEmail.trim() || null,
      custom_track_domain: customTrackDomain.trim() || null,
      white_label: whiteLabel
    })
    setSavingBrand(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to update brand settings')
      return
    }
    toast.success('Brand settings updated!')
    setShowBrandModal(false)
  }

  const handleSelectShipment = async (shipment: any) => {
    setSelectedShipment(shipment)
    setLoadingEvents(true)
    const res = await getShipmentEvents(shipment.id)
    setLoadingEvents(false)
    if (res.success) {
      setEvents(res.data || [])
    } else {
      toast.error('Failed to load tracking events')
    }
  }

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = s.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.recipient_name && s.recipient_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.recipient_email && s.recipient_email.toLowerCase().includes(search.toLowerCase()))

    if (activeTab === 'ALL') return matchesSearch
    if (activeTab === 'ACTIVE') return matchesSearch && s.active
    return matchesSearch && s.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking, recipient..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/10 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowBrandModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-medium flex items-center justify-center gap-2 text-white transition-colors"
          >
            <Palette className="w-4 h-4" /> Brand Setup
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Shipment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-4 overflow-x-auto pb-px">
        {['ALL', 'ACTIVE', 'PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Main Grid + Drawer Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Table of Shipments */}
        <div className="flex-1 w-full bg-white/5 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
          {filteredShipments.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No shipments found. Add one above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                    <th className="p-4 font-semibold">Tracking details</th>
                    <th className="p-4 font-semibold">Recipient</th>
                    <th className="p-4 font-semibold">Carrier</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredShipments.map((s) => {
                    const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDING
                    const Icon = status.icon
                    return (
                      <tr
                        key={s.id}
                        onClick={() => handleSelectShipment(s)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                          selectedShipment?.id === s.id ? 'bg-white/[0.04]' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-semibold text-white">{s.tracking_number}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Source: {s.source}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">{s.recipient_name || 'N/A'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{s.recipient_email || 'No email alerts'}</div>
                        </td>
                        <td className="p-4">
                          <span className="uppercase text-xs font-bold bg-white/10 px-2.5 py-1 rounded text-white tracking-wide">
                            {s.courier_slug || 'auto-detect'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                            <Icon className="w-3 h-3" /> {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar Event Timeline Drawer */}
        {selectedShipment && (
          <div className="w-full lg:w-96 bg-white/5 border border-white/5 rounded-xl p-6 backdrop-blur-sm shrink-0 sticky top-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h4 className="font-bold text-white text-base">Tracking Timeline</h4>
                <p className="text-xs text-gray-400 mt-0.5">{selectedShipment.tracking_number}</p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingEvents ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading timeline...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No events recorded for this shipment yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-white/10 pl-6 ml-3 space-y-6">
                {events.map((evt, idx) => {
                  const status = STATUS_CONFIG[evt.normalised_status] || STATUS_CONFIG.PENDING
                  const Icon = status.icon
                  return (
                    <div key={evt.id} className="relative">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[37px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${status.bg} ${status.text} border-2 border-[#04091a]`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${status.text}`}>{status.label}</span>
                          <span className="text-[10px] text-gray-400">{new Date(evt.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {evt.raw_status && (
                          <p className="text-sm text-white mt-1 font-medium">{evt.raw_status}</p>
                        )}
                        {evt.location && (
                          <p className="text-xs text-gray-400 mt-0.5">Location: {evt.location}</p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1">
                          {new Date(evt.occurred_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Shipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1329] border border-white/10 rounded-xl p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Register New Shipment</h3>
            <form onSubmit={handleAddShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Tracking Number *
                </label>
                <input
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Recipient Name
                </label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Recipient Email (For Alerts)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Courier Slug (Optional)
                </label>
                <select
                  value={courierSlug}
                  onChange={(e) => setCourierSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0b1329] text-sm focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="">Auto-Detect Courier</option>
                  <option value="dhl">DHL Express</option>
                  <option value="fedex">FedEx</option>
                  <option value="ups">UPS</option>
                  <option value="ram">RAM Hand-to-Hand</option>
                  <option value="the-courier-guy">The Courier Guy</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Settings Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1329] border border-white/10 rounded-xl p-6 max-w-lg w-full relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <button
              onClick={() => setShowBrandModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <Palette className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-white">Tracking & Notification Branding</h3>
            </div>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Brand Logo URL
                </label>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://yourbrand.com/logo.png"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Brand Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandColour}
                      onChange={(e) => setBrandColour(e.target.value)}
                      className="w-10 h-9 rounded border border-white/10 bg-transparent cursor-pointer"
                    />
                    <input
                      value={brandColour}
                      onChange={(e) => setBrandColour(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Custom Tracking Subdomain
                  </label>
                  <input
                    value={customTrackDomain}
                    onChange={(e) => setCustomTrackDomain(e.target.value)}
                    placeholder="track.yourdomain.com"
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Email Tagline / Tag Name
                </label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Deliveries powered by LeadsMind"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h5 className="text-sm font-semibold text-white">White Label Notifications</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Use your own domain and details to send notifications.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={whiteLabel}
                    onChange={(e) => setWhiteLabel(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-blue-500 bg-white/5"
                  />
                </div>

                {whiteLabel && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                        From Name
                      </label>
                      <input
                        required
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="e.g. Acme Shipping"
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                        From Email
                      </label>
                      <input
                        required
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="e.g. dispatch@yourdomain.com"
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBrand}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingBrand && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {savingBrand ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

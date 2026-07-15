'use client'

import React, { useState } from 'react'
import {
  Package, Truck, CheckCircle, AlertCircle, Clock, Plus, Search,
  X, RefreshCw, Palette
} from 'lucide-react'
import {
  createShipment, getShipmentEvents, updateTrackingBrand, uploadBrandLogo,
  updateShipmentStatus, syncShipmentTracking
} from '@/app/actions/shipments'
import { toast } from 'sonner'
import { DashEmptyState } from '@/components/dashboard-ui'
import { cn } from '@/lib/utils'

interface ShipmentsClientProps {
  initialShipments: any[]
  brandSettings: any
  workspaceId: string
}

// Bare-token + opacity-modifier syntax throughout (not `amber-500`/`purple-500`
// etc.) — this project's `amber`/`green`/`red`/`purple` tokens
// (tailwind.config.js) are flat hex values, not 50-900 shade scales, so
// numbered shade classes on them silently generate no CSS. The previous
// version of this map used `purple-500`, `green-500`, `red-500` and was
// quietly broken (no background tint at all) for exactly that reason.
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber/10', text: '!text-amber', icon: Clock },
  INFO_RECEIVED: { label: 'Info received', bg: 'bg-dash-accent/10', text: '!text-dash-accent', icon: Clock },
  IN_TRANSIT: { label: 'In transit', bg: 'bg-purple/10', text: '!text-purple', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: 'bg-warning/10', text: '!text-warning', icon: Truck },
  DELIVERED: { label: 'Delivered', bg: 'bg-green/10', text: '!text-green', icon: CheckCircle },
  EXCEPTION: { label: 'Exception / delayed', bg: 'bg-red/10', text: '!text-red', icon: AlertCircle },
  FAILED_ATTEMPT: { label: 'Failed attempt', bg: 'bg-red/10', text: '!text-red', icon: AlertCircle },
  RETURNED: { label: 'Returned', bg: 'bg-dash-surface', text: '!text-dash-textMuted', icon: Package }
}

// Explicit human labels for the tab bar — avoids the class of bug where a
// raw enum key (e.g. "OUT_FOR_DELIVERY") gets naively `.replace('_', ' ')`d
// (which only replaces the FIRST underscore, producing "OUT FOR_DELIVERY")
// and then force-uppercased instead of properly humanized.
const TAB_LABELS: Record<string, string> = {
  ALL: 'All',
  ACTIVE: 'Active',
  PENDING: 'Pending',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Exception',
}

export default function ShipmentsClient({ initialShipments, brandSettings, workspaceId }: ShipmentsClientProps) {
  const [shipments, setShipments] = useState(initialShipments)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [selectedShipment, setSelectedShipment] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Manual Edit / Sync State
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showStatusEdit, setShowStatusEdit] = useState(false)
  const [editStatus, setEditStatus] = useState('PENDING')
  const [editActive, setEditActive] = useState(true)
  const [editRawStatus, setEditRawStatus] = useState('')
  const [editLocation, setEditLocation] = useState('')

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
  const [recipientAlertsDisabled, setRecipientAlertsDisabled] = useState(!!brandSettings?.recipient_alerts_disabled)
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

  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', workspaceId)

      const res = await uploadBrandLogo(formData)
      if (!res.success) {
        throw new Error(res.error || 'Failed to upload logo')
      }

      if (res.publicUrl) {
        setLogoUrl(res.publicUrl);
        toast.success('Logo uploaded successfully!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

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
      white_label: whiteLabel,
      recipient_alerts_disabled: recipientAlertsDisabled
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
    setEditStatus(shipment.status)
    setEditActive(shipment.active)
    setEditRawStatus(shipment.raw_status || '')
    setEditLocation(shipment.last_location || '')
    setShowStatusEdit(false)
    setLoadingEvents(true)
    const res = await getShipmentEvents(shipment.id)
    setLoadingEvents(false)
    if (res.success) {
      setEvents(res.data || [])
    } else {
      toast.error('Failed to load tracking events')
    }
  }

  const handleManualStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShipment) return
    setUpdatingStatus(true)
    const res = await updateShipmentStatus(selectedShipment.id, {
      status: editStatus as any,
      active: editActive,
      raw_status: editRawStatus.trim() || undefined,
      location: editLocation.trim() || undefined
    })
    setUpdatingStatus(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to update status')
      return
    }
    toast.success('Shipment status updated manually!')
    setShowStatusEdit(false)

    const updatedShipments = shipments.map((s) =>
      s.id === selectedShipment.id
        ? {
            ...s,
            status: editStatus,
            active: editActive,
            raw_status: editRawStatus.trim() || 'Manually updated by admin',
            last_location: editLocation.trim() || s.last_location,
            updated_at: new Date().toISOString()
          }
        : s
    )
    setShipments(updatedShipments)

    const refreshed = updatedShipments.find((s) => s.id === selectedShipment.id)
    if (refreshed) {
      setSelectedShipment(refreshed)
      setLoadingEvents(true)
      const eventsRes = await getShipmentEvents(refreshed.id)
      setLoadingEvents(false)
      if (eventsRes.success) {
        setEvents(eventsRes.data || [])
      }
    }
  }

  const handleSyncTracking = async () => {
    if (!selectedShipment) return
    setSyncingId(selectedShipment.id)
    const res = await syncShipmentTracking(selectedShipment.id)
    setSyncingId(null)
    if (!res.success) {
      toast.error(res.error || 'Failed to sync with AfterShip')
      return
    }
    toast.success('Sync with AfterShip successful!')

    if (res.data) {
      const updatedShipments = shipments.map((s) =>
        s.id === selectedShipment.id ? res.data : s
      )
      setShipments(updatedShipments)
      setSelectedShipment(res.data)
      setEditStatus(res.data.status)
      setEditActive(res.data.active)
      setEditRawStatus(res.data.raw_status || '')
      setEditLocation(res.data.last_location || '')
    }

    setLoadingEvents(true)
    const eventsRes = await getShipmentEvents(selectedShipment.id)
    setLoadingEvents(false)
    if (eventsRes.success) {
      setEvents(eventsRes.data || [])
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-dash-border p-4 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking, recipient..."
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowBrandModal(true)}
            className="flex-1 sm:flex-initial px-4 h-9 rounded-lg border border-dash-border hover:bg-dash-surface text-sm font-medium flex items-center justify-center gap-2 !text-dash-text transition-colors motion-reduce:transition-none"
          >
            <Palette className="w-4 h-4" /> Brand setup
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial px-4 h-9 rounded-lg bg-dash-accent hover:bg-dash-accent/90 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none"
          >
            <Plus className="w-4 h-4" /> Add shipment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dash-border gap-5 overflow-x-auto no-scrollbar">
        {['ALL', 'ACTIVE', 'PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-[13px] font-bold border-b-2 transition-colors motion-reduce:transition-none whitespace-nowrap",
              activeTab === tab ? "border-dash-accent !text-dash-accent" : "border-transparent !text-dash-textMuted hover:!text-dash-text"
            )}
          >
            {TAB_LABELS[tab] ?? tab}
          </button>
        ))}
      </div>

      {/* Main Grid + Drawer Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Table of Shipments */}
        <div className="flex-1 w-full bg-white border border-dash-border rounded-xl overflow-hidden">
          {filteredShipments.length === 0 ? (
            <DashEmptyState
              icon={Package}
              title="No shipments found"
              description="Add a shipment above to start tracking deliveries."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dash-border bg-dash-surface !text-dash-textMuted">
                    <th className="p-4 font-bold text-[11px]">Tracking details</th>
                    <th className="p-4 font-bold text-[11px]">Recipient</th>
                    <th className="p-4 font-bold text-[11px]">Carrier</th>
                    <th className="p-4 font-bold text-[11px]">Status</th>
                    <th className="p-4 font-bold text-[11px]">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {filteredShipments.map((s) => {
                    return (
                      <tr
                        key={s.id}
                        onClick={() => handleSelectShipment(s)}
                        className={cn(
                          "hover:bg-dash-surface cursor-pointer transition-colors motion-reduce:transition-none",
                          selectedShipment?.id === s.id ? "bg-dash-surface" : ""
                        )}
                      >
                        <td className="p-4">
                          <div className="font-bold !text-dash-text">{s.tracking_number}</div>
                          <div className="text-xs !text-dash-textMuted mt-0.5">Source: {s.source}</div>
                        </td>
                        <td className="p-4">
                          <div className="!text-dash-text font-medium">{s.recipient_name || 'N/A'}</div>
                          <div className="text-xs !text-dash-textMuted mt-0.5">{s.recipient_email || 'No email alerts'}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-bold bg-dash-surface border border-dash-border px-2.5 py-1 rounded !text-dash-text">
                            {s.courier_slug || 'Auto-detect'}
                          </span>
                        </td>
                         <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <select
                              value={s.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value
                                const isClosed = newStatus === 'DELIVERED' || newStatus === 'RETURNED'
                                const loadingToast = toast.loading('Updating status...')
                                const res = await updateShipmentStatus(s.id, {
                                  status: newStatus as any,
                                  active: !isClosed,
                                  raw_status: `Manually set to ${newStatus} by admin`,
                                  location: s.last_location || undefined
                                })
                                toast.dismiss(loadingToast)
                                if (!res.success) {
                                  toast.error(res.error || 'Failed to update status')
                                  return
                                }
                                toast.success(`Status updated to ${newStatus}!`)

                                const updated = shipments.map((item) =>
                                  item.id === s.id
                                    ? { ...item, status: newStatus, active: !isClosed }
                                    : item
                                )
                                setShipments(updated)
                                if (selectedShipment?.id === s.id) {
                                  setSelectedShipment({ ...selectedShipment, status: newStatus, active: !isClosed })
                                  setLoadingEvents(true)
                                  const eventsRes = await getShipmentEvents(s.id)
                                  setLoadingEvents(false)
                                  if (eventsRes.success) {
                                    setEvents(eventsRes.data || [])
                                  }
                                }
                              }}
                              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-dash-border !text-dash-text focus:outline-none focus:border-dash-accent cursor-pointer"
                            >
                              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>
                                  {cfg.label}
                                </option>
                              ))}
                            </select>

                            {s.received_confirmed_at && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green/10 !text-green border border-green/20">
                                <CheckCircle className="w-2.5 h-2.5" /> Confirmed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 !text-dash-textMuted">
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
          <div className="w-full lg:w-96 bg-white border border-dash-border rounded-xl p-6 shrink-0 sticky top-6">
            <div className="flex items-center justify-between border-b border-dash-border pb-4 mb-4">
              <div>
                <h4 className="font-bold !text-dash-text text-base">Tracking timeline</h4>
                <p className="text-xs !text-dash-textMuted mt-0.5">{selectedShipment.tracking_number}</p>
                {selectedShipment.received_confirmed_at && (
                  <div className="mt-2 bg-green/10 border border-green/20 rounded-lg p-2 text-[11px] !text-green flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Confirmed at {new Date(selectedShipment.received_confirmed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Controls */}
            <div className="flex gap-2 mb-6 border-b border-dash-border pb-4">
              <button
                onClick={handleSyncTracking}
                disabled={syncingId === selectedShipment.id}
                className="flex-1 px-3 py-2 rounded-lg bg-dash-surface hover:bg-dash-border/60 border border-dash-border text-xs font-semibold !text-dash-text transition-colors motion-reduce:transition-none flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncingId === selectedShipment.id && "animate-spin motion-reduce:animate-none")} />
                {syncingId === selectedShipment.id ? 'Syncing...' : 'Sync AfterShip'}
              </button>
              <button
                onClick={() => setShowStatusEdit(!showStatusEdit)}
                className="flex-1 px-3 py-2 rounded-lg bg-dash-accent/10 hover:bg-dash-accent/20 border border-dash-accent/20 text-xs font-semibold !text-dash-accent transition-colors motion-reduce:transition-none flex items-center justify-center gap-1.5"
              >
                <Palette className="w-3.5 h-3.5" />
                {showStatusEdit ? 'Close editor' : 'Update status'}
              </button>
            </div>

            {/* Inline Manual Update Form */}
            {showStatusEdit && (
              <form onSubmit={handleManualStatusUpdate} className="mb-6 p-4 rounded-lg bg-dash-surface border border-dash-border space-y-3 animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
                <h5 className="text-xs font-bold !text-dash-text">Manually update shipment</h5>

                <div>
                  <label className="block text-[11px] font-bold !text-dash-textMuted mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-dash-border text-xs !text-dash-text focus:outline-none focus:border-dash-accent"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold !text-dash-textMuted">Active status</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-dash-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-dash-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dash-accent"></div>
                    <span className="ml-2 text-xs !text-dash-textMuted">{editActive ? 'Active' : 'Closed'}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold !text-dash-textMuted mb-1">Current location (optional)</label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Johannesburg Hub"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-dash-border text-xs !text-dash-text focus:outline-none focus:border-dash-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold !text-dash-textMuted mb-1">Status description / reason</label>
                  <input
                    value={editRawStatus}
                    onChange={(e) => setEditRawStatus(e.target.value)}
                    placeholder="e.g. Package sorted at sorting facility"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-dash-border text-xs !text-dash-text focus:outline-none focus:border-dash-accent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowStatusEdit(false)}
                    className="px-2.5 py-1.5 rounded border border-dash-border text-[11px] !text-dash-text hover:bg-dash-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-2.5 py-1.5 rounded bg-dash-accent text-white text-[11px] font-semibold hover:bg-dash-accent/90 disabled:opacity-50 flex items-center gap-1"
                  >
                    {updatingStatus && <RefreshCw className="w-3 h-3 animate-spin motion-reduce:animate-none" />}
                    Save changes
                  </button>
                </div>
              </form>
            )}

            {loadingEvents ? (
              <div className="flex items-center justify-center py-12 !text-dash-textMuted">
                <RefreshCw className="w-5 h-5 animate-spin motion-reduce:animate-none mr-2" /> Loading timeline...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 !text-dash-textMuted text-sm">
                No events recorded for this shipment yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-dash-border pl-6 ml-3 space-y-6">
                {events.map((evt) => {
                  const status = STATUS_CONFIG[evt.normalised_status] || STATUS_CONFIG.PENDING
                  const Icon = status.icon
                  return (
                    <div key={evt.id} className="relative">
                      {/* Timeline Dot */}
                      <span className={cn("absolute -left-[37px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white", status.bg, status.text)}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-xs font-bold", status.text)}>{status.label}</span>
                          <span className="text-[10px] !text-dash-textMuted">{new Date(evt.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {evt.raw_status && (
                          <p className="text-sm !text-dash-text mt-1 font-medium">{evt.raw_status}</p>
                        )}
                        {evt.location && (
                          <p className="text-xs !text-dash-textMuted mt-0.5">Location: {evt.location}</p>
                        )}
                        <p className="text-[10px] !text-dash-textMuted mt-1 opacity-70">
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
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="bg-white border border-dash-border shadow-2xl rounded-2xl p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 !text-dash-textMuted hover:!text-dash-text"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold !text-dash-text mb-4">Register new shipment</h3>
            <form onSubmit={handleAddShipment} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                  Tracking number *
                </label>
                <input
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                  Recipient name
                </label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                  Recipient email (for alerts)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                  Courier (optional)
                </label>
                <select
                  value={courierSlug}
                  onChange={(e) => setCourierSlug(e.target.value)}
                  className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                >
                  <option value="">Auto-detect courier</option>
                  <option value="dhl">DHL Express</option>
                  <option value="fedex">FedEx</option>
                  <option value="ups">UPS</option>
                  <option value="ram">RAM Hand-to-Hand</option>
                  <option value="the-courier-guy">The Courier Guy</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-dash-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 h-10 rounded-xl border border-dash-border text-sm hover:bg-dash-surface !text-dash-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 h-10 rounded-xl bg-dash-accent text-white text-sm font-semibold hover:bg-dash-accent/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />}
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Settings Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="bg-white border border-dash-border shadow-2xl rounded-2xl p-6 max-w-lg w-full relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <button
              onClick={() => setShowBrandModal(false)}
              className="absolute right-4 top-4 !text-dash-textMuted hover:!text-dash-text"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <Palette className="w-5 h-5 text-dash-accent" />
              <h3 className="text-lg font-bold !text-dash-text">Tracking &amp; notification branding</h3>
            </div>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                  Brand logo
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="logo-file-upload"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById('logo-file-upload')?.click()}
                      className="px-4 py-2 rounded-lg border border-dash-border bg-dash-surface hover:bg-dash-border/60 text-xs font-semibold !text-dash-text transition-colors motion-reduce:transition-none flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploadingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" /> : 'Choose file'}
                    </button>
                    <span className="text-xs !text-dash-textMuted">or paste URL below</span>
                  </div>

                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourbrand.com/logo.png"
                    className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                  />

                  {logoUrl && (
                    <div className="mt-2 p-2 bg-dash-surface border border-dash-border rounded-lg max-w-[120px] aspect-square flex items-center justify-center overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                    Brand color
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-dash-border bg-dash-surface flex items-center justify-center">
                      <input
                        type="color"
                        value={brandColour}
                        onChange={(e) => setBrandColour(e.target.value)}
                        className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 bg-transparent"
                        style={{
                          padding: 0,
                          border: 'none',
                          WebkitAppearance: 'none'
                        }}
                      />
                    </div>
                    <input
                      value={brandColour}
                      onChange={(e) => setBrandColour(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 px-3 h-10 rounded-lg border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                    Custom tracking subdomain
                  </label>
                  <input
                    value={customTrackDomain}
                    onChange={(e) => setCustomTrackDomain(e.target.value)}
                    placeholder="track.yourdomain.com"
                    className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                  Email tagline / tag name
                </label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Deliveries powered by LeadsMind"
                  className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                />
              </div>

              <div className="border-t border-dash-border pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold !text-dash-text">Disable recipient email alerts</h5>
                    <p className="text-xs !text-dash-textMuted mt-0.5 font-normal">Turn off automatic email updates to delivery recipients.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={recipientAlertsDisabled}
                    onChange={(e) => setRecipientAlertsDisabled(e.target.checked)}
                    className="w-4 h-4 text-dash-accent border-dash-border rounded focus:ring-dash-accent"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dash-border">
                  <div>
                    <h5 className="text-sm font-semibold !text-dash-text">White label notifications</h5>
                    <p className="text-xs !text-dash-textMuted mt-0.5">Use your own domain and details to send notifications.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={whiteLabel}
                    onChange={(e) => setWhiteLabel(e.target.checked)}
                    className="w-4 h-4 text-dash-accent border-dash-border rounded focus:ring-dash-accent"
                  />
                </div>

                {whiteLabel && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200 motion-reduce:animate-none">
                    <div>
                      <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                        From name
                      </label>
                      <input
                        required
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="e.g. Acme Shipping"
                        className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold !text-dash-text mb-1.5">
                        From email
                      </label>
                      <input
                        required
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="e.g. dispatch@yourdomain.com"
                        className="w-full px-3 h-11 rounded-xl border border-dash-border bg-white text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-dash-border">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 h-10 rounded-xl border border-dash-border text-sm hover:bg-dash-surface !text-dash-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBrand}
                  className="px-4 h-10 rounded-xl bg-dash-accent text-white text-sm font-semibold hover:bg-dash-accent/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingBrand && <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />}
                  {savingBrand ? 'Saving...' : 'Save settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

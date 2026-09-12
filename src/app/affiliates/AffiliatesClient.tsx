'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Users, Handshake, DollarSign, CheckCircle2, AlertTriangle, Clock, Plus, Search,
  X, RefreshCw, Layers, Edit, Trash, HelpCircle, Ban, ToggleLeft, ToggleRight, Copy,
  Download, Eye, Ban as ReverseIcon, ShieldCheck
} from 'lucide-react'
import {
  createProgramme, updateProgramme, deleteProgramme,
  approveAffiliate, rejectAffiliate, suspendAffiliate, deleteAffiliate,
  approvePayout, rejectPayout, updateCommissionStatus, getDecryptedPayoutBatch
} from '@/app/actions/affiliates'
import { toast } from 'sonner'

interface AffiliatesClientProps {
  initialProgrammes: any[]
  initialAffiliates: any[]
  initialCommissions: any[]
  initialPayouts: any[]
  workspaceId: string
  workspaceSlug?: string
}

export default function AffiliatesClient({
  initialProgrammes,
  initialAffiliates,
  initialCommissions,
  initialPayouts,
  workspaceId,
  workspaceSlug
}: AffiliatesClientProps) {
  const [programmes, setProgrammes] = useState(initialProgrammes)
  const [affiliates, setAffiliates] = useState(initialAffiliates)
  const [commissions, setCommissions] = useState(initialCommissions)
  const [payouts, setPayouts] = useState(initialPayouts)
  
  const [activeView, setActiveView] = useState<'programmes' | 'affiliates' | 'commissions' | 'payouts'>('programmes')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Program Modal State
  const [showProgModal, setShowProgModal] = useState(false)
  const [editingProg, setEditingProg] = useState<any>(null)
  const [progName, setProgName] = useState('')
  const [progCommissionType, setProgCommissionType] = useState('percentage')
  const [progCommissionValue, setProgCommissionValue] = useState(10)
  const [progCookieDays, setProgCookieDays] = useState(30)
  const [progApprovalMode, setProgApprovalMode] = useState('manual')
  const [twoTierEnabled, setTwoTierEnabled] = useState(false)
  const [tier2Percent, setTier2Percent] = useState(5)
  const [submittingProg, setSubmittingProg] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [headline, setHeadline] = useState('')
  const [benefits, setBenefits] = useState<string[]>([''])
  const [customQuestions, setCustomQuestions] = useState<any[]>([])
  const [terms, setTerms] = useState('')

  // Payout Approval Modal State
  const [showPayoutApprovalModal, setShowPayoutApprovalModal] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [payoutReference, setPayoutReference] = useState('')
  const [submittingPayoutApproval, setSubmittingPayoutApproval] = useState(false)

  // View Bank Details Modal State
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false)
  const [viewingBankDetails, setViewingBankDetails] = useState<any>(null)
  const [loadingBankDetails, setLoadingBankDetails] = useState(false)

  // Stats
  const totalCommissionsVal = commissions.reduce((sum, c) => sum + Number(c.amount), 0)

  const handleCopyInviteLink = (programmeId: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    const inviteLink = workspaceSlug 
      ? `${appUrl}/join/${workspaceSlug}`
      : `${appUrl}/affiliate-portal/register?programmeId=${programmeId}`
    
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast.success('Invite link copied to clipboard!')
      })
      .catch((err) => {
        toast.error('Failed to copy link: ' + (err.message || err))
      })
  }

  const handleCreateOrUpdateProg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!progName.trim()) return
    setSubmittingProg(true)

    const payload = {
      name: progName.trim(),
      commission_type: progCommissionType,
      commission_value: Number(progCommissionValue),
      cookie_days: Number(progCookieDays),
      approval_mode: progApprovalMode,
      two_tier_enabled: twoTierEnabled,
      tier2_override_percent: twoTierEnabled ? Number(tier2Percent) : 0,
      status: editingProg?.status || 'active',
      registration_settings: {
        logo_url: logoUrl.trim(),
        headline: headline.trim(),
        benefits: benefits.map(b => b.trim()).filter(Boolean),
        custom_questions: customQuestions.filter(q => q.label.trim()),
        terms: terms.trim()
      }
    }

    let res
    if (editingProg) {
      res = await updateProgramme(editingProg.id, payload)
    } else {
      res = await createProgramme(workspaceId, payload)
    }

    setSubmittingProg(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to save programme')
      return
    }

    toast.success(editingProg ? 'Programme updated successfully!' : 'Programme created successfully!')
    
    if (editingProg) {
      setProgrammes(programmes.map(p => p.id === editingProg.id ? res.data : p))
    } else {
      setProgrammes([res.data, ...programmes])
    }

    setShowProgModal(false)
    setEditingProg(null)
    setProgName('')
  }

  const handleDeleteProg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate programme? This is permanent.')) return
    const res = await deleteProgramme(id)
    if (!res.success) {
      toast.error(res.error || 'Failed to delete programme')
      return
    }
    toast.success('Programme deleted')
    setProgrammes(programmes.filter(p => p.id !== id))
  }

  const handleApproveAff = async (id: string) => {
    const res = await approveAffiliate(id)
    if (!res.success) {
      toast.error(res.error || 'Failed to approve affiliate')
      return
    }
    toast.success('Affiliate application approved!')
    setAffiliates(affiliates.map(a => a.id === id ? { ...a, status: 'approved', approved_at: new Date().toISOString() } : a))
  }

  const handleRejectAff = async (id: string) => {
    const res = await rejectAffiliate(id)
    if (!res.success) {
      toast.error(res.error || 'Failed to reject affiliate')
      return
    }
    toast.success('Affiliate application rejected')
    setAffiliates(affiliates.map(a => a.id === id ? { ...a, status: 'rejected' } : a))
  }

  const handleSuspendAff = async (id: string) => {
    const res = await suspendAffiliate(id)
    if (!res.success) {
      toast.error(res.error || 'Failed to suspend affiliate')
      return
    }
    toast.success('Affiliate suspended')
    setAffiliates(affiliates.map(a => a.id === id ? { ...a, status: 'suspended' } : a))
  }

  const handleDeleteAff = async (id: string) => {
    if (!confirm('Delete this affiliate permanently? This removes their referral data and frees their email to register again.')) return
    const res = await deleteAffiliate(id)
    if (!res.success) { toast.error(res.error || 'Failed to delete affiliate'); return }
    toast.success('Affiliate deleted')
    setAffiliates(affiliates.filter(a => a.id !== id))
  }

  // --- Commission Actions ---
  const handleUpdateCommStatus = async (id: string, nextStatus: 'approved' | 'reversed' | 'paid' | 'pending') => {
    const res = await updateCommissionStatus(id, nextStatus)
    if (!res.success) {
      toast.error(res.error || 'Failed to update commission status')
      return
    }
    toast.success(`Commission status updated to ${nextStatus}!`)
    setCommissions(commissions.map(c => c.id === id ? { ...c, status: nextStatus } : c))
  }

  // --- Payout Actions ---
  const handleViewBankDetails = async (payout: any) => {
    setLoadingBankDetails(true)
    setShowBankDetailsModal(true)
    const res = await getDecryptedPayoutBatch([payout.id])
    setLoadingBankDetails(false)
    if (res.success && res.data?.[0]) {
      setViewingBankDetails(res.data[0])
    } else {
      toast.error(res.error || 'Failed to load decrypted details')
      setShowBankDetailsModal(false)
    }
  }

  const handleApprovePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayout) return
    setSubmittingPayoutApproval(true)

    const res = await approvePayout(selectedPayout.id, payoutReference)
    setSubmittingPayoutApproval(false)

    if (!res.success) {
      toast.error(res.error || 'Failed to approve payout')
      return
    }

    toast.success('Payout marked as paid successfully!')
    setPayouts(payouts.map(p => p.id === selectedPayout.id ? {
      ...p,
      status: 'paid',
      reference: payoutReference,
      processed_at: new Date().toISOString()
    } : p))

    // Update local commissions as well
    const updatedCommIds = new Set(selectedPayout.commission_ids || [])
    setCommissions(commissions.map(c => updatedCommIds.has(c.id) ? { ...c, status: 'paid' } : c))

    setShowPayoutApprovalModal(false)
    setSelectedPayout(null)
    setPayoutReference('')
  }

  const handleRejectPayout = async (payoutId: string) => {
    if (!confirm('Are you sure you want to reject this payout request? This will release the commissions for re-requesting.')) return
    const res = await rejectPayout(payoutId)
    if (!res.success) {
      toast.error(res.error || 'Failed to reject payout')
      return
    }
    toast.success('Payout request rejected.')
    setPayouts(payouts.map(p => p.id === payoutId ? {
      ...p,
      status: 'failed',
      reference: 'Rejected by owner',
      processed_at: new Date().toISOString()
    } : p))
  }

  // Export Batch EFT CSV
  const handleExportEftBatch = async () => {
    const pendingEftPayouts = payouts.filter(p => p.status === 'requested' && p.method === 'bank_eft')
    if (pendingEftPayouts.length === 0) {
      toast.error('No pending Bank EFT payouts to export.')
      return
    }

    toast.loading('Decrypting and generating EFT batch...')
    const ids = pendingEftPayouts.map(p => p.id)
    const res = await getDecryptedPayoutBatch(ids)
    toast.dismiss()

    if (!res.success || !res.data) {
      toast.error(res.error || 'Failed to decrypt batch EFT details')
      return
    }

    // Generate CSV contents
    const headers = ['Affiliate Name', 'Email', 'Amount (ZAR)', 'Bank Name', 'Account Number', 'Branch Code', 'Account Holder']
    const rows = res.data.map(item => {
      const b = item.bank_details || {}
      return [
        item.affiliate_name,
        item.affiliate_email,
        item.amount,
        b.bank_name || 'N/A',
        b.account_number || 'N/A',
        b.branch_code || 'N/A',
        b.account_holder || 'N/A'
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `EFT_Payout_Batch_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('EFT Batch CSV exported successfully!')
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider">Programmes</span>
            <Layers className="w-5 h-5 text-dash-accent" />
          </div>
          <div className="text-2xl font-bold text-dash-text mt-2">{programmes.length}</div>
        </div>

        <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider">Affiliates</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-dash-text mt-2">{affiliates.length}</div>
        </div>

        <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider">Total Commissions</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-dash-text mt-2">R {totalCommissionsVal.toFixed(2)}</div>
        </div>

        <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider">Payout Queue</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-dash-text mt-2">
            {payouts.filter(p => p.status === 'requested').length} Requested
          </div>
        </div>
      </div>

      {/* Nav & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-dash-surface border border-dash-border p-4 rounded-xl">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {[
            { id: 'programmes', label: 'Programmes' },
            { id: 'affiliates', label: 'Affiliates' },
            { id: 'commissions', label: 'Commissions Queue' },
            { id: 'payouts', label: 'Payouts Queue' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeView === tab.id ? 'bg-dash-accent text-white' : 'text-dash-textMuted hover:text-dash-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
          {activeView === 'programmes' && (
            <>
              <Link
                href="/affiliate-marketplace"
                className="px-4 py-2 rounded-lg bg-dash-bg hover:bg-dash-border text-dash-text text-sm font-medium flex items-center justify-center gap-2 border border-dash-border transition-colors w-full sm:w-auto"
              >
                <Layers className="w-4 h-4 text-dash-accent" /> Marketplace
              </Link>
              <Link
                href="/affiliate-portal"
                className="px-4 py-2 rounded-lg bg-dash-bg hover:bg-dash-border text-dash-text text-sm font-medium flex items-center justify-center gap-2 border border-dash-border transition-colors w-full sm:w-auto"
              >
                <Handshake className="w-4 h-4 text-purple-500" /> Affiliate Portal
              </Link>
              <button
                onClick={() => {
                  setEditingProg(null)
                  setProgName('')
                  setProgCommissionType('percentage')
                  setProgCommissionValue(10)
                  setProgCookieDays(30)
                  setProgApprovalMode('manual')
                  setTwoTierEnabled(false)
                  setLogoUrl('')
                  setHeadline('')
                  setBenefits([''])
                  setCustomQuestions([])
                  setTerms('')
                  setShowProgModal(true)
                }}
                className="px-4 py-2 rounded-lg bg-dash-accent hover:opacity-90 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Create Programme
              </button>
            </>
          )}

          {activeView === 'payouts' && (
            <button
              onClick={handleExportEftBatch}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> Export EFT Batch
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden">
        {activeView === 'programmes' && (
          <div className="overflow-x-auto">
            {programmes.length === 0 ? (
              <div className="p-8 text-center text-dash-textMuted">
                No affiliate programmes created yet. Click "Create Programme" to start.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Commission structure</th>
                    <th className="p-4 font-semibold">Attribution window</th>
                    <th className="p-4 font-semibold">Approval mode</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {programmes.map((p) => (
                    <tr key={p.id} className="hover:bg-dash-bg transition-colors">
                      <td className="p-4 font-semibold text-dash-text">{p.name}</td>
                      <td className="p-4 text-dash-text">
                        {p.commission_type === 'percentage' ? `${p.commission_value}%` : `R ${p.commission_value}`}
                        {p.two_tier_enabled && (
                          <div className="text-xs text-emerald-600 mt-0.5">Tier 2: {p.tier2_override_percent}%</div>
                        )}
                      </td>
                      <td className="p-4 text-dash-textMuted">{p.cookie_days === 0 ? 'Unlimited' : `${p.cookie_days} days`}</td>
                      <td className="p-4 text-dash-textMuted uppercase text-xs font-semibold">{p.approval_mode.replace('_', ' ')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyInviteLink(p.id)}
                            className="p-1 hover:bg-dash-border rounded text-dash-textMuted hover:text-dash-accent"
                            title="Copy invite link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingProg(p)
                              setProgName(p.name)
                              setProgCommissionType(p.commission_type)
                              setProgCommissionValue(p.commission_value)
                              setProgCookieDays(p.cookie_days)
                              setProgApprovalMode(p.approval_mode)
                              setTwoTierEnabled(p.two_tier_enabled)
                              setTier2Percent(p.tier2_override_percent)
                              const settings = p.registration_settings || {}
                              setLogoUrl(settings.logo_url || '')
                              setHeadline(settings.headline || '')
                              setBenefits(settings.benefits || [''])
                              setCustomQuestions(settings.custom_questions || [])
                              setTerms(settings.terms || '')
                              setShowProgModal(true)
                            }}
                            className="p-1 hover:bg-dash-border rounded text-dash-textMuted hover:text-dash-text"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProg(p.id)}
                            className="p-1 hover:bg-dash-border rounded text-dash-textMuted hover:text-rose-600"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeView === 'affiliates' && (
          <div className="overflow-x-auto">
            {affiliates.length === 0 ? (
              <div className="p-8 text-center text-dash-textMuted">
                No affiliate applications recorded yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                    <th className="p-4 font-semibold">Affiliate</th>
                    <th className="p-4 font-semibold">Programme</th>
                    <th className="p-4 font-semibold">Referral code</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Registered</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {affiliates.map((a) => (
                    <tr key={a.id} className="hover:bg-dash-bg transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-dash-text">{a.full_name || 'N/A'}</div>
                        <div className="text-xs text-dash-textMuted mt-0.5">{a.email}</div>
                      </td>
                      <td className="p-4 text-dash-textMuted font-medium">{a.programme?.name || 'N/A'}</td>
                      <td className="p-4 text-dash-accent font-mono text-xs">{a.short_code}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          a.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                          a.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          a.status === 'suspended' ? 'bg-rose-50 text-rose-500' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-dash-textMuted">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveAff(a.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectAff(a.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {a.status === 'approved' && (
                            <button
                              onClick={() => handleSuspendAff(a.id)}
                              className="px-2 py-1 border border-dash-border hover:bg-dash-bg text-dash-textMuted rounded text-xs font-semibold flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAff(a.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeView === 'commissions' && (
          <div className="overflow-x-auto">
            {commissions.length === 0 ? (
              <div className="p-8 text-center text-dash-textMuted">
                No commissions recorded in the queue yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                    <th className="p-4 font-semibold">Affiliate</th>
                    <th className="p-4 font-semibold">Source</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Hold until</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-dash-bg transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-dash-text">{c.affiliate?.full_name || 'N/A'}</div>
                        <div className="text-xs text-dash-textMuted mt-0.5">{c.affiliate?.email}</div>
                      </td>
                      <td className="p-4 text-dash-textMuted">
                        <span className="uppercase text-xs bg-dash-border/60 px-2 py-0.5 rounded mr-2 text-dash-text">
                          {c.source_type}
                        </span>
                        {c.source_id ? `...${c.source_id.slice(-8)}` : 'N/A'}
                      </td>
                      <td className="p-4 text-emerald-600 font-bold">R {Number(c.amount).toFixed(2)}</td>
                      <td className="p-4 text-dash-textMuted">
                        {c.hold_until ? new Date(c.hold_until).toLocaleDateString() : 'Immediate'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            c.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            c.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                            c.status === 'paid' ? 'bg-blue-50 text-dash-accent' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {c.status}
                          </span>
                          {c.flagged && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 uppercase flex items-center gap-1 cursor-help"
                              title={c.flag_reason || 'Fraud flag detected'}
                            >
                              <AlertTriangle className="w-3 h-3" /> Flagged
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateCommStatus(c.id, 'approved')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                            >
                              Approve
                            </button>
                          )}
                          {['approved', 'paid'].includes(c.status) && (
                            <button
                              onClick={() => handleUpdateCommStatus(c.id, 'reversed')}
                              className="px-2 py-1 border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded text-xs font-semibold flex items-center gap-1 transition-all"
                            >
                              <ReverseIcon className="w-3.5 h-3.5" /> Reverse
                            </button>
                          )}
                          {c.status === 'reversed' && (
                            <span className="text-xs text-rose-600 font-semibold uppercase">Reversed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeView === 'payouts' && (
          <div className="overflow-x-auto">
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-dash-textMuted">
                No payout requests in the queue.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                    <th className="p-4 font-semibold">Affiliate</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Method</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Requested At</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-dash-bg transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-dash-text">{p.affiliate?.full_name || 'N/A'}</div>
                        <div className="text-xs text-dash-textMuted mt-0.5">{p.affiliate?.email}</div>
                      </td>
                      <td className="p-4 text-emerald-600 font-bold">R {Number(p.amount).toFixed(2)}</td>
                      <td className="p-4 text-dash-textMuted uppercase text-xs font-semibold">
                        {p.method.replace('_', ' ')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                          p.status === 'requested' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-dash-textMuted">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.method === 'bank_eft' && (
                            <button
                              onClick={() => handleViewBankDetails(p)}
                              className="px-2 py-1 border border-dash-border hover:bg-dash-bg text-dash-textMuted rounded text-xs font-semibold flex items-center gap-1"
                              title="View secure bank account details"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Bank
                            </button>
                          )}
                          {p.status === 'requested' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPayout(p)
                                  setPayoutReference(`EFT-${Date.now()}`)
                                  setShowPayoutApprovalModal(true)
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                              >
                                Pay
                              </button>
                              <button
                                onClick={() => handleRejectPayout(p.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Programme Modal */}
      {showProgModal && (
        <div className="fixed inset-0 bg-[#000000c1] flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dash-surface border border-dash-border rounded-xl p-6 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => {
                setShowProgModal(false)
                setEditingProg(null)
              }}
              className="absolute right-4 top-4 text-dash-textMuted hover:text-dash-text"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-dash-text mb-4">
              {editingProg ? 'Edit Affiliate Programme' : 'Create Affiliate Programme'}
            </h3>
            <form onSubmit={handleCreateOrUpdateProg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                  Programme Name *
                </label>
                <input
                  required
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="e.g. LeadsMind Partner Network"
                  className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Commission Type
                  </label>
                  <select
                    value={progCommissionType}
                    onChange={(e) => setProgCommissionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (ZAR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Commission Value
                  </label>
                  <input
                    type="number"
                    required
                    value={progCommissionValue}
                    onChange={(e) => setProgCommissionValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Cookie Attrib Window
                  </label>
                  <select
                    value={progCookieDays}
                    onChange={(e) => setProgCookieDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  >
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">365 Days</option>
                    <option value="0">Unlimited / Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Approval Mode
                  </label>
                  <select
                    value={progApprovalMode}
                    onChange={(e) => setProgApprovalMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  >
                    <option value="manual">Manual Approval</option>
                    <option value="auto_all">Auto Approve All</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-dash-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-dash-text">Two-Tier Affiliate Commissions</h5>
                    <p className="text-xs text-dash-textMuted mt-0.5">Let affiliates refer other sub-affiliates.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoTierEnabled}
                    onChange={(e) => setTwoTierEnabled(e.target.checked)}
                    className="w-4 h-4 text-dash-accent border-dash-border rounded focus:ring-dash-accent bg-dash-bg"
                  />
                </div>

                {twoTierEnabled && (
                  <div className="mt-3 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                      Sub-Affiliate Override Commission (% of parent's commission)
                    </label>
                    <input
                      type="number"
                      required
                      value={tier2Percent}
                      onChange={(e) => setTier2Percent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-dash-border pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-dash-text">Registration Page Branding</h4>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Logo URL
                  </label>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Headline
                  </label>
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Partner with us and earn"
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5 flex justify-between items-center">
                    <span>Benefits List</span>
                    <button
                      type="button"
                      onClick={() => setBenefits([...benefits, ''])}
                      className="text-[10px] text-dash-accent hover:opacity-80 font-semibold font-mono"
                    >
                      + Add Benefit
                    </button>
                  </label>
                  <div className="space-y-2">
                    {benefits.map((b, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          value={b}
                          onChange={(e) => {
                            const newB = [...benefits]
                            newB[idx] = e.target.value
                            setBenefits(newB)
                          }}
                          placeholder="e.g. 30-day cookie window"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                        />
                        {benefits.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBenefits(benefits.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-500 px-2 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5 flex justify-between items-center">
                    <span>Custom Application Questions</span>
                    <button
                      type="button"
                      onClick={() => setCustomQuestions([...customQuestions, { id: Math.random().toString(36).substr(2, 9), label: '', required: false }])}
                      className="text-[10px] text-dash-accent hover:opacity-80 font-semibold font-mono"
                    >
                      + Add Question
                    </button>
                  </label>
                  <div className="space-y-3">
                    {customQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="flex flex-col gap-2 p-2 border border-dash-border bg-dash-bg rounded-lg">
                        <div className="flex gap-2">
                          <input
                            value={q.label}
                            onChange={(e) => {
                              const newQ = [...customQuestions]
                              newQ[idx] = { ...newQ[idx], label: e.target.value }
                              setCustomQuestions(newQ)
                            }}
                            placeholder="Question Label (e.g. Website URL or Social handles)"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-dash-border bg-dash-surface text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomQuestions(customQuestions.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-500 px-2 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-dash-textMuted">
                          <input
                            type="checkbox"
                            checked={q.required || false}
                            onChange={(e) => {
                              const newQ = [...customQuestions]
                              newQ[idx] = { ...newQ[idx], required: e.target.checked }
                              setCustomQuestions(newQ)
                            }}
                            className="w-3.5 h-3.5 text-dash-accent border-dash-border rounded focus:ring-dash-accent bg-dash-bg"
                          />
                          Required question
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                    Terms & Conditions (Optional Checkbox Text)
                  </label>
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="e.g. I agree to the programme terms and privacy policy."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-dash-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowProgModal(false)
                    setEditingProg(null)
                  }}
                  className="px-4 py-2 rounded-lg border border-dash-border text-sm hover:bg-dash-bg text-dash-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProg}
                  className="px-4 py-2 rounded-lg bg-dash-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingProg && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submittingProg ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Approval Modal */}
      {showPayoutApprovalModal && (
        <div className="fixed inset-0 bg-[#000000c1] flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dash-surface border border-dash-border rounded-xl p-6 max-w-sm w-full relative">
            <button
              onClick={() => {
                setShowPayoutApprovalModal(false)
                setSelectedPayout(null)
              }}
              className="absolute right-4 top-4 text-dash-textMuted hover:text-dash-text"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-dash-text mb-4">Process Payout</h3>
            <form onSubmit={handleApprovePayoutSubmit} className="space-y-4">
              <p className="text-sm text-dash-textMuted">
                You are marking the payout of <strong>R {Number(selectedPayout?.amount).toFixed(2)}</strong> for <strong>{selectedPayout?.affiliate?.full_name}</strong> as Paid.
              </p>

              <div>
                <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                  Payment Reference (EFT Reference, Transaction ID) *
                </label>
                <input
                  required
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="e.g. EFT-19283746"
                  className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-dash-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayoutApprovalModal(false)
                    setSelectedPayout(null)
                  }}
                  className="px-4 py-2 rounded-lg border border-dash-border text-sm hover:bg-dash-bg text-dash-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayoutApproval}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingPayoutApproval && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submittingPayoutApproval ? 'Processing...' : 'Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Bank Details Modal */}
      {showBankDetailsModal && (
        <div className="fixed inset-0 bg-[#000000c1] flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dash-surface border border-dash-border rounded-xl p-6 max-w-sm w-full relative">
            <button
              onClick={() => {
                setShowBankDetailsModal(false)
                setViewingBankDetails(null)
              }}
              className="absolute right-4 top-4 text-dash-textMuted hover:text-dash-text"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-dash-text mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Bank Payout Details
            </h3>

            {loadingBankDetails ? (
              <div className="flex items-center gap-2 text-dash-textMuted py-6 justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" /> Decrypting payload...
              </div>
            ) : viewingBankDetails?.bank_details ? (
              <div className="space-y-4">
                <div className="bg-dash-bg p-4 border border-dash-border rounded-xl space-y-2.5 text-sm">
                  <div>
                    <span className="text-[10px] text-dash-textMuted block uppercase font-bold">Bank Name</span>
                    <span className="text-dash-text font-medium">{viewingBankDetails.bank_details.bank_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-dash-textMuted block uppercase font-bold">Account Number</span>
                    <span className="text-dash-text font-mono font-medium">{viewingBankDetails.bank_details.account_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-dash-textMuted block uppercase font-bold">Branch Code</span>
                    <span className="text-dash-text font-mono font-medium">{viewingBankDetails.bank_details.branch_code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-dash-textMuted block uppercase font-bold">Account Holder</span>
                    <span className="text-dash-text font-medium">{viewingBankDetails.bank_details.account_holder || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowBankDetailsModal(false)
                      setViewingBankDetails(null)
                    }}
                    className="px-4 py-2 rounded-lg bg-dash-accent text-white text-sm font-semibold hover:opacity-90"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-dash-textMuted">
                No bank account details configured or decryptable.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

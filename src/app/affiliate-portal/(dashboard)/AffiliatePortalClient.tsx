'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Link as LinkIcon, Users, DollarSign, Award, CheckCircle, Clock,
  Copy, LogOut, ExternalLink, RefreshCw, Send, ShieldAlert, Gift, Star, X, Download, ShieldCheck
} from 'lucide-react'
import { logoutAffiliate, requestPayout, updatePayoutSettings, getDecryptedPayoutDetails } from '@/app/actions/affiliates'
import { toast } from 'sonner'

interface AffiliatePortalClientProps {
  affiliate: any
  clicks: any[]
  commissions: any[]
  payouts: any[]
  leaderboard: any[]
  referrals?: any[]
}

export default function AffiliatePortalClient({
  affiliate,
  clicks,
  commissions,
  payouts,
  leaderboard,
  referrals = []
}: AffiliatePortalClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'referrals' | 'earnings' | 'leaderboard'>('overview')
  const [copied, setCopied] = useState(false)
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState(affiliate.payout_method || 'bank_eft')
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [referralSubTab, setReferralSubTab] = useState<'referrals' | 'clicks'>('referrals')

  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_number: '',
    branch_code: '',
    account_holder: ''
  })
  const [loadingBank, setLoadingBank] = useState(false)
  const [savingBank, setSavingBank] = useState(false)

  useEffect(() => {
    const fetchBankDetails = async () => {
      setLoadingBank(true)
      const res = await getDecryptedPayoutDetails()
      if (res.success && res.data) {
        setBankDetails({
          bank_name: res.data.bank_name || '',
          account_number: res.data.account_number || '',
          branch_code: res.data.branch_code || '',
          account_holder: res.data.account_holder || ''
        })
      }
      setLoadingBank(false)
    }
    fetchBankDetails()
  }, [])

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/r/${affiliate.short_code}`
    : `https://leadsmind.io/r/${affiliate.short_code}`

  // Calculate earnings
  const requestedPayoutsIds = new Set(
    payouts
      .filter(p => p.status === 'requested')
      .flatMap(p => p.commission_ids || [])
  )

  const unpaidCommissions = commissions
    .filter(c => c.status === 'approved' && !requestedPayoutsIds.has(c.id))
    .reduce((sum, c) => sum + Number(c.amount), 0)

  const pendingCommissions = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount), 0)

  const totalEarned = commissions
    .filter(c => ['approved', 'paid'].includes(c.status))
    .reduce((sum, c) => sum + Number(c.amount), 0)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await logoutAffiliate()
    toast.success('Logged out successfully')
    router.push('/affiliate-portal/login')
    router.refresh()
  }

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(payoutAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payout amount')
      return
    }
    if (amt > unpaidCommissions) {
      toast.error(`Maximum requestable payout is R ${unpaidCommissions.toFixed(2)}`)
      return
    }

    setSubmittingPayout(true)
    const res = await requestPayout(amt, payoutMethod)
    setSubmittingPayout(false)

    if (!res.success) {
      toast.error(res.error || 'Failed to request payout')
      return
    }

    toast.success('Payout request submitted successfully!')
    setShowPayoutModal(false)
    setPayoutAmount('')
    router.refresh()
  }

  const handleSavePayoutSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBank(true)
    const res = await updatePayoutSettings(payoutMethod, bankDetails)
    setSavingBank(false)

    if (res.success) {
      toast.success('Payout settings saved securely!')
      router.refresh()
    } else {
      toast.error(res.error || 'Failed to save payout settings')
    }
  }

  // Get promotional materials
  const promotionalMaterials = affiliate.programme?.registration_settings?.promotional_materials || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-dash-surface border border-dash-border p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 uppercase">
              {affiliate.status}
            </span>
            <span className="text-xs text-dash-textMuted font-medium">Programme: {affiliate.programme?.name}</span>
          </div>
          <h2 className="text-2xl font-bold text-dash-text mt-1.5">Welcome back, {affiliate.full_name || 'Partner'}</h2>
          <p className="text-sm text-dash-textMuted mt-0.5">{affiliate.email}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-dash-bg border border-dash-border rounded-xl px-4 py-2 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-dash-accent select-all">{referralLink}</span>
            <button
              onClick={handleCopyLink}
              className="text-dash-textMuted hover:text-dash-text transition-colors"
              title="Copy Referral Link"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-dash-border gap-6 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: Star },
          { id: 'links', label: 'My Links & Creatives', icon: LinkIcon },
          { id: 'referrals', label: 'Referrals & Clicks', icon: Users },
          { id: 'earnings', label: 'Earnings & Payouts', icon: DollarSign },
          { id: 'leaderboard', label: 'Leaderboard', icon: Award }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id ? 'border-dash-accent text-dash-accent' : 'border-transparent text-dash-textMuted hover:text-dash-text'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
                <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Total Clicks</span>
                <div className="text-3xl font-extrabold text-dash-text mt-2">{clicks.length}</div>
              </div>
              <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
                <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Total Earned</span>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2">R {totalEarned.toFixed(2)}</div>
              </div>
              <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
                <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Unpaid Balance</span>
                <div className="text-3xl font-extrabold text-dash-accent mt-2">R {unpaidCommissions.toFixed(2)}</div>
              </div>
              <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
                <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Pending Escrow</span>
                <div className="text-3xl font-extrabold text-amber-600 mt-2">R {pendingCommissions.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
              <h3 className="font-bold text-dash-text text-lg mb-4">Programme Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Commission Structure</span>
                  <p className="text-dash-text font-medium mt-1">
                    {affiliate.programme?.commission_type === 'percentage'
                      ? `${affiliate.programme?.commission_value}% per conversion`
                      : `R ${affiliate.programme?.commission_value} per conversion`
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Cookie Attrib Window</span>
                  <p className="text-dash-text font-medium mt-1">
                    {affiliate.programme?.cookie_days === 0 ? 'Unlimited / Lifetime' : `${affiliate.programme?.cookie_days} days`}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-dash-textMuted uppercase tracking-wider block">Currency Support</span>
                  <p className="text-dash-text font-medium mt-1">{affiliate.programme?.currency || 'ZAR'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Link Details */}
              <div className="lg:col-span-2 bg-dash-surface border border-dash-border p-6 rounded-xl space-y-6">
                <div>
                  <h3 className="font-bold text-dash-text text-lg">Referral Links</h3>
                  <p className="text-sm text-dash-textMuted mt-1">Use this link anywhere to track and claim your commissions.</p>
                </div>

                <div className="bg-dash-bg border border-dash-border rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-dash-accent uppercase tracking-wider">Your Primary Link</span>
                    <div className="text-dash-text font-mono text-sm mt-1 break-all">{referralLink}</div>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-dash-accent hover:opacity-90 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4" /> Copy Link
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dash-bg p-4 border border-dash-border rounded-xl text-center">
                    <span className="text-xs text-dash-textMuted block">Link Clicks</span>
                    <span className="text-2xl font-bold text-dash-text mt-1 block">{clicks.length}</span>
                  </div>
                  <div className="bg-dash-bg p-4 border border-dash-border rounded-xl text-center">
                    <span className="text-xs text-dash-textMuted block">Conversions</span>
                    <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                      {commissions.filter(c => c.tier === 1).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-dash-surface border border-dash-border p-6 rounded-xl flex flex-col items-center justify-center text-center">
                <h4 className="font-bold text-dash-text mb-4">Your Link QR Code</h4>
                <div className="bg-white p-3 rounded-lg border border-dash-border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralLink)}`}
                    alt="Referral QR Code"
                    className="w-36 h-36"
                  />
                </div>
                <p className="text-xs text-dash-textMuted mt-4">Scan or save this QR code to promote offline.</p>
              </div>
            </div>

            {/* Promotional Materials */}
            <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
              <h3 className="font-bold text-dash-text text-lg mb-2">Promotional Assets</h3>
              <p className="text-sm text-dash-textMuted mb-6">Download approved banners, logos, and materials provided by the program owner.</p>

              {promotionalMaterials.length === 0 ? (
                <div className="p-8 text-center text-dash-textMuted border border-dashed border-dash-border rounded-xl">
                  No promotional materials uploaded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {promotionalMaterials.map((mat: any, idx: number) => (
                    <div key={idx} className="bg-dash-bg border border-dash-border p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-dash-text text-sm">{mat.name}</h4>
                        <p className="text-xs text-dash-textMuted mt-1">{mat.description || 'No description provided'}</p>
                      </div>
                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 px-3 py-1.5 bg-dash-accent/10 hover:bg-dash-accent text-dash-accent hover:text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Asset
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
              <h3 className="font-bold text-dash-text text-lg mb-2">Promotion Swipe Content</h3>
              <p className="text-sm text-dash-textMuted mb-4">Copy these quick text descriptions to share on social media.</p>

              <div className="space-y-4">
                <div className="bg-dash-bg p-4 border border-dash-border rounded-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-dash-textMuted uppercase tracking-wider mb-2">
                    <span>Option 1: Professional</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`I'm excited to recommend ${affiliate.programme?.name || 'LeadsMind'}. Generate more business and streamline client acquisition. Sign up here: ${referralLink}`)
                        toast.success('Swipe copied!')
                      }}
                      className="text-dash-accent hover:opacity-80"
                    >
                      Copy Swipe
                    </button>
                  </div>
                  <p className="text-sm text-dash-text font-medium">
                    "I'm excited to recommend {affiliate.programme?.name || 'LeadsMind'}. Generate more business and streamline client acquisition. Sign up here: {referralLink}"
                  </p>
                </div>

                <div className="bg-dash-bg p-4 border border-dash-border rounded-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-dash-textMuted uppercase tracking-wider mb-2">
                    <span>Option 2: Direct / Casual</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Looking to boost your team's sales pipeline? Try ${affiliate.programme?.name || 'LeadsMind'} today: ${referralLink}`)
                        toast.success('Swipe copied!')
                      }}
                      className="text-dash-accent hover:opacity-80"
                    >
                      Copy Swipe
                    </button>
                  </div>
                  <p className="text-sm text-dash-text font-medium">
                    "Looking to boost your team's sales pipeline? Try {affiliate.programme?.name || 'LeadsMind'} today: {referralLink}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div className="flex border-b border-dash-border gap-4">
              <button
                onClick={() => setReferralSubTab('referrals')}
                className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                  referralSubTab === 'referrals' ? 'border-dash-accent text-dash-accent' : 'border-transparent text-dash-textMuted hover:text-dash-text'
                }`}
              >
                Referred Contacts ({referrals.length})
              </button>
              <button
                onClick={() => setReferralSubTab('clicks')}
                className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                  referralSubTab === 'clicks' ? 'border-dash-accent text-dash-accent' : 'border-transparent text-dash-textMuted hover:text-dash-text'
                }`}
              >
                Traffic Clicks ({clicks.length})
              </button>
            </div>

            {referralSubTab === 'referrals' ? (
              <div className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-dash-border">
                  <h3 className="font-bold text-dash-text text-lg">My Referrals</h3>
                  <p className="text-sm text-dash-textMuted mt-1">People who signed up using your link.</p>
                </div>
                {referrals.length === 0 ? (
                  <div className="p-8 text-center text-dash-textMuted">
                    No referrals recorded yet. Share your referral link to build your team!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                        <th className="p-4 font-semibold">Name</th>
                        <th className="p-4 font-semibold">Email</th>
                        <th className="p-4 font-semibold">Recurring Month</th>
                        <th className="p-4 font-semibold">Joined Date</th>
                        <th className="p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dash-border">
                      {referrals.map((ref) => {
                        const refComms = commissions.filter(c => c.contact_id === ref.id)
                        const isConverted = refComms.length > 0
                        const maxRecurMonth = refComms.reduce((max, c) => Math.max(max, c.recurring_month || 0), 0)

                        return (
                          <tr key={ref.id} className="hover:bg-dash-bg transition-colors">
                            <td className="p-4 text-dash-text font-medium">
                              {ref.first_name || ref.last_name ? `${ref.first_name || ''} ${ref.last_name || ''}`.trim() : 'Anonymous'}
                            </td>
                            <td className="p-4 text-dash-textMuted">{ref.email}</td>
                            <td className="p-4 text-dash-textMuted font-mono">
                              {maxRecurMonth > 0 ? `Month ${maxRecurMonth}` : 'N/A'}
                            </td>
                            <td className="p-4 text-dash-textMuted">{new Date(ref.created_at).toLocaleDateString()}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                isConverted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-dash-accent'
                              }`}>
                                {isConverted ? 'Converted' : 'Registered'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-dash-border">
                  <h3 className="font-bold text-dash-text text-lg">Click & Traffic History</h3>
                  <p className="text-sm text-dash-textMuted mt-1">Real-time log of inbound clicks associated with your referral code.</p>
                </div>
                {clicks.length === 0 ? (
                  <div className="p-8 text-center text-dash-textMuted">
                    No clicks recorded yet. Share your link to drive traffic!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                        <th className="p-4 font-semibold">User Agent / OS</th>
                        <th className="p-4 font-semibold">Landing Destination</th>
                        <th className="p-4 font-semibold">Unique</th>
                        <th className="p-4 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dash-border">
                      {clicks.map((clk) => (
                        <tr key={clk.id} className="hover:bg-dash-bg transition-colors">
                          <td className="p-4 text-dash-text font-medium truncate max-w-xs">{clk.user_agent || 'Unknown Client'}</td>
                          <td className="p-4 text-dash-accent font-mono text-xs">{clk.landing_url || '/'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              clk.is_unique ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-dash-textMuted'
                            }`}>
                              {clk.is_unique ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="p-4 text-dash-textMuted">{new Date(clk.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {/* Payout Request Card */}
            <div className="bg-dash-surface border border-dash-border p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h4 className="font-bold text-dash-text text-lg">Request Payout</h4>
                <p className="text-sm text-dash-textMuted mt-0.5">
                  Request transfer of your approved earnings.
                </p>
                <div className="text-sm text-dash-text mt-2 font-semibold">
                  Approved Balance: <span className="text-emerald-600 text-lg">R {unpaidCommissions.toFixed(2)}</span>
                </div>
              </div>
              <button
                disabled={unpaidCommissions <= 0}
                onClick={() => {
                  setPayoutAmount(unpaidCommissions.toString())
                  setShowPayoutModal(true)
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <DollarSign className="w-5 h-5" /> Request Transfer
              </button>
            </div>

            {/* Payout Bank Settings */}
            <div className="bg-dash-surface border border-dash-border p-6 rounded-xl">
              <h3 className="font-bold text-dash-text text-lg mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-dash-accent" /> Payout Settings (Encrypted)
              </h3>
              <p className="text-sm text-dash-textMuted mb-6">Manage how you receive your earnings. Bank account details are stored using secure AES-256 encryption.</p>

              {loadingBank ? (
                <div className="flex items-center gap-2 text-dash-textMuted py-4">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading secure details...
                </div>
              ) : (
                <form onSubmit={handleSavePayoutSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  <div>
                    <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                      Payout Method
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                    >
                      <option value="bank_eft">Bank EFT / Wire</option>
                      <option value="payfast">PayFast Transfer</option>
                      <option value="account_credit">Account Credit</option>
                    </select>
                  </div>

                  {payoutMethod === 'bank_eft' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          required
                          value={bankDetails.bank_name}
                          onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                          Account Number
                        </label>
                        <input
                          type="text"
                          required
                          value={bankDetails.account_number}
                          onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                          Branch Code
                        </label>
                        <input
                          type="text"
                          required
                          value={bankDetails.branch_code}
                          onChange={(e) => setBankDetails({ ...bankDetails, branch_code: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          required
                          value={bankDetails.account_holder}
                          onChange={(e) => setBankDetails({ ...bankDetails, account_holder: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 pt-4 border-t border-dash-border flex justify-end">
                    <button
                      type="submit"
                      disabled={savingBank}
                      className="px-4 py-2 bg-dash-accent hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      {savingBank && <RefreshCw className="w-4 h-4 animate-spin" />}
                      {savingBank ? 'Saving...' : 'Save secure settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Commissions List */}
            <div className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-dash-border">
                <h3 className="font-bold text-dash-text text-lg">Commissions Breakdown</h3>
              </div>
              {commissions.length === 0 ? (
                <div className="p-8 text-center text-dash-textMuted">
                  No commissions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                      <th className="p-4 font-semibold">Source</th>
                      <th className="p-4 font-semibold">Tier</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Hold status</th>
                      <th className="p-4 font-semibold">Commission status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-dash-bg transition-colors">
                        <td className="p-4 text-dash-text uppercase font-bold text-xs">{comm.source_type}</td>
                        <td className="p-4 text-dash-textMuted font-medium">Tier {comm.tier}</td>
                        <td className="p-4 text-emerald-600 font-bold">R {Number(comm.amount).toFixed(2)}</td>
                        <td className="p-4 text-dash-textMuted">
                          {comm.hold_until ? `Escrow till ${new Date(comm.hold_until).toLocaleDateString()}` : 'Immediate / Cleared'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            comm.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            comm.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                            comm.status === 'paid' ? 'bg-blue-50 text-dash-accent' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            {/* Payout Requests History */}
            <div className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-dash-border">
                <h3 className="font-bold text-dash-text text-lg">Payout Transfers History</h3>
              </div>
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-dash-textMuted">
                  No payout transfer history found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-dash-border bg-dash-bg text-dash-textMuted">
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Method</th>
                      <th className="p-4 font-semibold">Reference</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {payouts.map((pay) => (
                      <tr key={pay.id} className="hover:bg-dash-bg transition-colors">
                        <td className="p-4 text-dash-text font-bold">R {Number(pay.amount).toFixed(2)}</td>
                        <td className="p-4 text-dash-textMuted uppercase text-xs font-bold">{pay.method.replace('_', ' ')}</td>
                        <td className="p-4 text-dash-textMuted font-mono text-xs">{pay.reference || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            pay.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                            pay.status === 'requested' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="p-4 text-dash-textMuted">{new Date(pay.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden max-w-2xl mx-auto">
            <div className="p-6 border-b border-dash-border">
              <h3 className="font-bold text-dash-text text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> Programme Leaderboard
              </h3>
              <p className="text-sm text-dash-textMuted mt-1">Top performing affiliate partners in the program.</p>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-dash-textMuted">
                No approved earnings recorded for the leaderboard yet.
              </div>
            ) : (
              <div className="divide-y divide-dash-border">
                {leaderboard.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-dash-bg transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        idx === 1 ? 'bg-slate-100 text-slate-600 border border-slate-300' :
                        idx === 2 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                        'bg-dash-bg text-dash-textMuted border border-dash-border'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-dash-text">{item.name}</span>
                    </div>
                    <span className="font-bold text-emerald-600">R {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-[#000000c1] flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dash-surface border border-dash-border rounded-xl p-6 max-w-sm w-full relative">
            <button
              onClick={() => setShowPayoutModal(false)}
              className="absolute right-4 top-4 text-dash-textMuted hover:text-dash-text"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-dash-text mb-4">Request Payout</h3>
            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                  Amount (ZAR) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  max={unpaidCommissions}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                />
                <span className="text-[10px] text-dash-textMuted mt-1 block">Max requestable: R {unpaidCommissions.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-dash-textMuted uppercase tracking-wide mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-dash-border bg-dash-bg text-sm focus:outline-none focus:border-dash-accent text-dash-text"
                >
                  <option value="bank_eft">Bank EFT / Wire</option>
                  <option value="payfast">PayFast Transfer</option>
                  <option value="account_credit">Account Credit</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-dash-border">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-lg border border-dash-border text-sm hover:bg-dash-bg text-dash-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingPayout && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submittingPayout ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

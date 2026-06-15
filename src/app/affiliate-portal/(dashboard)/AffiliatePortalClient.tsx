'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Link as LinkIcon, Users, DollarSign, Award, CheckCircle, Clock,
  Copy, LogOut, ExternalLink, RefreshCw, Send, ShieldAlert, Gift, Star, X
} from 'lucide-react'
import { logoutAffiliate } from '@/app/actions/affiliates'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AffiliatePortalClientProps {
  affiliate: any
  clicks: any[]
  commissions: any[]
  payouts: any[]
  leaderboard: any[]
}

export default function AffiliatePortalClient({
  affiliate,
  clicks,
  commissions,
  payouts,
  leaderboard
}: AffiliatePortalClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'referrals' | 'earnings' | 'leaderboard'>('overview')
  const [copied, setCopied] = useState(false)
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('bank_eft')
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [submittingPayout, setSubmittingPayout] = useState(false)

  const referralLink = `${window.location.protocol}//${window.location.host}/r/${affiliate.short_code}`

  // Calcs
  const unpaidCommissions = commissions
    .filter(c => c.status === 'approved')
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
    const supabase = createClient()
    
    // Find commission IDs to link
    const eligibleComms = commissions
      .filter(c => c.status === 'approved')
      .slice(0, 50) // process max 50 at a time
    const commIds = eligibleComms.map(c => c.id)

    const { error } = await supabase.from('affiliate_payouts').insert({
      affiliate_id: affiliate.id,
      workspace_id: affiliate.workspace_id,
      amount: amt,
      currency: affiliate.programme?.currency || 'ZAR',
      method: payoutMethod,
      commission_ids: commIds,
      status: 'requested'
    })

    setSubmittingPayout(false)
    if (error) {
      toast.error(error.message || 'Failed to request payout')
      return
    }

    toast.success('Payout request submitted successfully!')
    setShowPayoutModal(false)
    setPayoutAmount('')
    router.refresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 uppercase">
              {affiliate.status}
            </span>
            <span className="text-xs text-gray-400 font-medium">Programme: {affiliate.programme?.name}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1.5">Welcome back, {affiliate.full_name || 'Partner'}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{affiliate.email}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-blue-400 select-all">{referralLink}</span>
            <button
              onClick={handleCopyLink}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy Referral Link"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-white/10 gap-6 overflow-x-auto pb-px">
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
                activeTab === tab.id ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-white'
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Clicks</span>
                <div className="text-3xl font-extrabold text-white mt-2">{clicks.length}</div>
              </div>
              <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Earned</span>
                <div className="text-3xl font-extrabold text-green-400 mt-2">R {totalEarned.toFixed(2)}</div>
              </div>
              <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Unpaid Balance</span>
                <div className="text-3xl font-extrabold text-blue-400 mt-2">R {unpaidCommissions.toFixed(2)}</div>
              </div>
              <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Pending Escrow</span>
                <div className="text-3xl font-extrabold text-yellow-500 mt-2">R {pendingCommissions.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
              <h3 className="font-bold text-white text-lg mb-4">Programme Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Commission Structure</span>
                  <p className="text-white font-medium mt-1">
                    {affiliate.programme?.commission_type === 'percentage' 
                      ? `${affiliate.programme?.commission_value}% per conversion` 
                      : `R ${affiliate.programme?.commission_value} per conversion`
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Cookie Attrib Window</span>
                  <p className="text-white font-medium mt-1">
                    {affiliate.programme?.cookie_days === 0 ? 'Unlimited / Lifetime' : `${affiliate.programme?.cookie_days} days`}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Currency Support</span>
                  <p className="text-white font-medium mt-1">{affiliate.programme?.currency || 'ZAR'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
              <h3 className="font-bold text-white text-lg mb-2">Referral Links</h3>
              <p className="text-sm text-gray-400 mb-6">Use this link anywhere to track and claim your commissions.</p>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Your Primary Link</span>
                  <div className="text-white font-mono text-sm mt-1">{referralLink}</div>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
              <h3 className="font-bold text-white text-lg mb-2">Promotion Swipe Content</h3>
              <p className="text-sm text-gray-400 mb-4">Copy these quick text descriptions to share on social media.</p>
              
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 border border-white/5 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <span>Option 1: Professional</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`I'm excited to recommend ${affiliate.programme?.name || 'LeadsMind'}. Generate more business and streamline client acquisition. Sign up here: ${referralLink}`)
                        toast.success('Swipe copied!')
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Copy Swipe
                    </button>
                  </div>
                  <p className="text-sm text-white font-medium">
                    "I'm excited to recommend {affiliate.programme?.name || 'LeadsMind'}. Generate more business and streamline client acquisition. Sign up here: {referralLink}"
                  </p>
                </div>

                <div className="bg-slate-950 p-4 border border-white/5 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <span>Option 2: Direct / Casual</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Looking to boost your team's sales pipeline? Try ${affiliate.programme?.name || 'LeadsMind'} today: ${referralLink}`)
                        toast.success('Swipe copied!')
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Copy Swipe
                    </button>
                  </div>
                  <p className="text-sm text-white font-medium">
                    "Looking to boost your team's sales pipeline? Try {affiliate.programme?.name || 'LeadsMind'} today: {referralLink}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-white/10">
              <h3 className="font-bold text-white text-lg">Click & Traffic History</h3>
              <p className="text-sm text-gray-400 mt-1">Real-time log of inbound clicks associated with your referral code.</p>
            </div>
            {clicks.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No clicks recorded yet. Share your link to drive traffic!
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                    <th className="p-4 font-semibold">User Agent / OS</th>
                    <th className="p-4 font-semibold">Landing Destination</th>
                    <th className="p-4 font-semibold">Unique</th>
                    <th className="p-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clicks.map((clk) => (
                    <tr key={clk.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 text-white font-medium truncate max-w-xs">{clk.user_agent || 'Unknown Client'}</td>
                      <td className="p-4 text-blue-400 font-mono text-xs">{clk.landing_url || '/'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          clk.is_unique ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {clk.is_unique ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{new Date(clk.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {/* Payout Request Card */}
            <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h4 className="font-bold text-white text-lg">Request Payout</h4>
                <p className="text-sm text-gray-400 mt-0.5">
                  Request transfer of your approved earnings.
                </p>
                <div className="text-sm text-white mt-2 font-semibold">
                  Approved Balance: <span className="text-green-400 text-lg">R {unpaidCommissions.toFixed(2)}</span>
                </div>
              </div>
              <button
                disabled={unpaidCommissions <= 0}
                onClick={() => {
                  setPayoutAmount(unpaidCommissions.toString())
                  setShowPayoutModal(true)
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <DollarSign className="w-5 h-5" /> Request Transfer
              </button>
            </div>

            {/* Commissions List */}
            <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-white/10">
                <h3 className="font-bold text-white text-lg">Commissions Breakdown</h3>
              </div>
              {commissions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No commissions recorded yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                      <th className="p-4 font-semibold">Source</th>
                      <th className="p-4 font-semibold">Tier</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Hold status</th>
                      <th className="p-4 font-semibold">Commission status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 text-white uppercase font-bold text-xs">{comm.source_type}</td>
                        <td className="p-4 text-gray-300 font-medium">Tier {comm.tier}</td>
                        <td className="p-4 text-green-400 font-bold">R {Number(comm.amount).toFixed(2)}</td>
                        <td className="p-4 text-gray-400">
                          {comm.hold_until ? `Escrow till ${new Date(comm.hold_until).toLocaleDateString()}` : 'Immediate / Cleared'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            comm.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                            comm.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                            comm.status === 'paid' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payout Requests History */}
            <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-white/10">
                <h3 className="font-bold text-white text-lg">Payout Transfers History</h3>
              </div>
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No payout transfer history found.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Method</th>
                      <th className="p-4 font-semibold">Reference</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payouts.map((pay) => (
                      <tr key={pay.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 text-white font-bold">R {Number(pay.amount).toFixed(2)}</td>
                        <td className="p-4 text-gray-300 uppercase text-xs font-bold">{pay.method.replace('_', ' ')}</td>
                        <td className="p-4 text-gray-400 font-mono text-xs">{pay.reference || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            pay.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                            pay.status === 'requested' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400">{new Date(pay.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm max-w-2xl mx-auto">
            <div className="p-6 border-b border-white/10">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500 animate-bounce" /> Programme Leaderboard
              </h3>
              <p className="text-sm text-gray-400 mt-1">Top performing affiliate partners in the program.</p>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No approved earnings recorded for the leaderboard yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {leaderboard.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-300/30' :
                        idx === 2 ? 'bg-amber-600/20 text-amber-500 border border-amber-600/30' :
                        'bg-white/5 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                    <span className="font-bold text-green-400">R {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1329] border border-white/10 rounded-xl p-6 max-w-sm w-full relative">
            <button
              onClick={() => setShowPayoutModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Request Payout</h3>
            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Amount (ZAR) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  max={unpaidCommissions}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Max requestable: R {unpaidCommissions.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0b1329] text-sm focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="bank_eft">Bank EFT / Wire</option>
                  <option value="payfast">PayFast Transfer</option>
                  <option value="account_credit">Account Credit</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
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

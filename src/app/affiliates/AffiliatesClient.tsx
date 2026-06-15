'use client'

import React, { useState } from 'react'
import {
  Users, Handshake, DollarSign, CheckCircle2, AlertTriangle, Clock, Plus, Search,
  X, RefreshCw, Layers, Edit, Trash, HelpCircle, Ban, ToggleLeft, ToggleRight
} from 'lucide-react'
import {
  createProgramme, updateProgramme, deleteProgramme,
  approveAffiliate, rejectAffiliate, suspendAffiliate
} from '@/app/actions/affiliates'
import { toast } from 'sonner'

interface AffiliatesClientProps {
  initialProgrammes: any[]
  initialAffiliates: any[]
  initialCommissions: any[]
  workspaceId: string
}

export default function AffiliatesClient({
  initialProgrammes,
  initialAffiliates,
  initialCommissions,
  workspaceId
}: AffiliatesClientProps) {
  const [programmes, setProgrammes] = useState(initialProgrammes)
  const [affiliates, setAffiliates] = useState(initialAffiliates)
  const [commissions, setCommissions] = useState(initialCommissions)
  
  const [activeView, setActiveView] = useState<'programmes' | 'affiliates' | 'commissions'>('programmes')
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

  // Quick stats
  const totalClicks = 0 // Resolved on click tables if joined, default placeholder or mock
  const totalCommissionsVal = commissions.reduce((sum, c) => sum + Number(c.amount), 0)

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
      status: editingProg?.status || 'active'
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

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Programmes</span>
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{programmes.length}</div>
        </div>

        <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Affiliates</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{affiliates.length}</div>
        </div>

        <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Commissions</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">R {totalCommissionsVal.toFixed(2)}</div>
        </div>

        <div className="bg-white/5 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Commission Queue</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {commissions.filter(c => c.status === 'pending').length} Pending
          </div>
        </div>
      </div>

      {/* Nav & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('programmes')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeView === 'programmes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Programmes
          </button>
          <button
            onClick={() => setActiveView('affiliates')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeView === 'affiliates' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Affiliates List
          </button>
          <button
            onClick={() => setActiveView('commissions')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeView === 'commissions' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Commissions Queue
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {activeView === 'programmes' && (
            <button
              onClick={() => {
                setEditingProg(null)
                setProgName('')
                setProgCommissionType('percentage')
                setProgCommissionValue(10)
                setProgCookieDays(30)
                setProgApprovalMode('manual')
                setTwoTierEnabled(false)
                setShowProgModal(true)
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Create Programme
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
        {activeView === 'programmes' && (
          <div className="overflow-x-auto">
            {programmes.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No affiliate programmes created yet. Click "Create Programme" to start.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Commission structure</th>
                    <th className="p-4 font-semibold">Attribution window</th>
                    <th className="p-4 font-semibold">Approval mode</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {programmes.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 font-semibold text-white">{p.name}</td>
                      <td className="p-4 text-white">
                        {p.commission_type === 'percentage' ? `${p.commission_value}%` : `R ${p.commission_value}`}
                        {p.two_tier_enabled && (
                          <div className="text-xs text-green-400 mt-0.5">Tier 2: {p.tier2_override_percent}%</div>
                        )}
                      </td>
                      <td className="p-4 text-gray-300">{p.cookie_days === 0 ? 'Unlimited' : `${p.cookie_days} days`}</td>
                      <td className="p-4 text-gray-300 uppercase text-xs font-semibold">{p.approval_mode.replace('_', ' ')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          p.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                              setShowProgModal(true)
                            }}
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProg(p.id)}
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-red-500"
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
              <div className="p-8 text-center text-gray-400">
                No affiliate applications recorded yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                    <th className="p-4 font-semibold">Affiliate</th>
                    <th className="p-4 font-semibold">Programme</th>
                    <th className="p-4 font-semibold">Referral code</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Registered</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {affiliates.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{a.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{a.email}</div>
                      </td>
                      <td className="p-4 text-gray-300 font-medium">{a.programme?.name || 'N/A'}</td>
                      <td className="p-4 text-blue-400 font-mono text-xs">{a.short_code}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          a.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          a.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          a.status === 'suspended' ? 'bg-red-500/10 text-red-400' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveAff(a.id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectAff(a.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {a.status === 'approved' && (
                            <button
                              onClick={() => handleSuspendAff(a.id)}
                              className="px-2 py-1 border border-white/10 hover:bg-white/5 text-gray-300 rounded text-xs font-semibold flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" /> Suspend
                            </button>
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

        {activeView === 'commissions' && (
          <div className="overflow-x-auto">
            {commissions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No commissions recorded in the queue yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                    <th className="p-4 font-semibold">Affiliate</th>
                    <th className="p-4 font-semibold">Source</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Hold until</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{c.affiliate?.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{c.affiliate?.email}</div>
                      </td>
                      <td className="p-4 text-gray-300">
                        <span className="uppercase text-xs bg-white/10 px-2 py-0.5 rounded mr-2 text-white">
                          {c.source_type}
                        </span>
                        {c.source_id ? `...${c.source_id.slice(-8)}` : 'N/A'}
                      </td>
                      <td className="p-4 text-green-400 font-bold">R {Number(c.amount).toFixed(2)}</td>
                      <td className="p-4 text-gray-400">
                        {c.hold_until ? new Date(c.hold_until).toLocaleDateString() : 'Immediate'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          c.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          c.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          c.status === 'paid' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {c.status}
                        </span>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1329] border border-white/10 rounded-xl p-6 max-w-md w-full relative">
            <button
              onClick={() => {
                setShowProgModal(false)
                setEditingProg(null)
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingProg ? 'Edit Affiliate Programme' : 'Create Affiliate Programme'}
            </h3>
            <form onSubmit={handleCreateOrUpdateProg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Programme Name *
                </label>
                <input
                  required
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="e.g. LeadsMind Partner Network"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Commission Type
                  </label>
                  <select
                    value={progCommissionType}
                    onChange={(e) => setProgCommissionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0b1329] text-sm focus:outline-none focus:border-blue-500 text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (ZAR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Commission Value
                  </label>
                  <input
                    type="number"
                    required
                    value={progCommissionValue}
                    onChange={(e) => setProgCommissionValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Cookie Attrib Window
                  </label>
                  <select
                    value={progCookieDays}
                    onChange={(e) => setProgCookieDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0b1329] text-sm focus:outline-none focus:border-blue-500 text-white"
                  >
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">365 Days</option>
                    <option value="0">Unlimited / Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Approval Mode
                  </label>
                  <select
                    value={progApprovalMode}
                    onChange={(e) => setProgApprovalMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0b1329] text-sm focus:outline-none focus:border-blue-500 text-white"
                  >
                    <option value="manual">Manual Approval</option>
                    <option value="auto_all">Auto Approve All</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-white">Two-Tier Affiliate Commissions</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Let affiliates refer other sub-affiliates.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoTierEnabled}
                    onChange={(e) => setTwoTierEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-blue-500 bg-white/5"
                  />
                </div>

                {twoTierEnabled && (
                  <div className="mt-3 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                      Sub-Affiliate Override Commission (% of parent's commission)
                    </label>
                    <input
                      type="number"
                      required
                      value={tier2Percent}
                      onChange={(e) => setTier2Percent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-blue-500 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowProgModal(false)
                    setEditingProg(null)
                  }}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProg}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingProg && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submittingProg ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

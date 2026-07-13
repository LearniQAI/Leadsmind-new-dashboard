'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

interface KYCCheck {
  id: string
  check_type: string
  provider: string
  status: string
  id_valid?: boolean
  name_match?: boolean
  alive_status?: string
  fraud_indicator?: boolean
  credit_score?: number
  on_sanctions_list?: boolean
  is_pep?: boolean
  notes?: string
  checked_at?: string
  created_at: string
  // New credit/debt metrics
  score?: number
  risk_band?: string
  credit_risk_grade?: string
  defaults_count?: number
  judgements_count?: number
  total_debt_exposure?: number
  monthly_repayments?: number
  raw_response?: any
  result?: string
}


interface VerificationTabProps {
  contactId: string
  workspaceId: string
  contactName: string
  contactIdNumber?: string
}

const CHECK_TYPES = [
  {
    type: 'hanis_identity',
    label: 'ID Verification',
    description: 'Verify SA ID number against Home Affairs database',
    provider: 'TransUnion',
    color: '#e4002b',
    shortName: 'ID',
    required: true,
  },
  {
    type: 'credit_score',
    label: 'Thin Credit Score',
    description: 'Quick pre-screening credit score assessment',
    provider: 'TransUnion',
    color: '#3b82f6',
    shortName: 'TCS',
    required: false,
  },
  {
    type: 'credit_report',
    label: 'Credit Report',
    description: 'Full credit bureau report — score, debt, defaults, judgements',
    provider: 'TransUnion',
    color: '#8b5cf6',
    shortName: 'CR',
    required: false,
  },
  {
    type: 'sanctions_screen',
    label: 'Sanctions Screen',
    description: 'AML and international sanctions list check',
    provider: 'AML Screen',
    color: '#ef4444',
    shortName: 'AML',
    required: true,
  },
  {
    type: 'pep_check',
    label: 'PEP Check',
    description: 'Politically Exposed Person screening',
    provider: 'PEP Screen',
    color: '#f59e0b',
    shortName: 'PEP',
    required: false,
  },
  {
    type: 'address_verification',
    label: 'Address Check',
    description: 'Verify residential address against records',
    provider: 'TransUnion',
    color: '#0057b8',
    shortName: 'ADR',
    required: false,
  },
  {
    type: 'xds_credit',
    label: 'XDS Mass Credit',
    description: 'XDS retail payment profiles and micro-lending history',
    provider: 'XDS',
    color: '#059669',
    shortName: 'XMC',
    required: false,
  },
  {
    type: 'xds_trace',
    label: 'XDS Active Trace',
    description: 'Trace verified physical addresses and contact numbers',
    provider: 'XDS',
    color: '#d97706',
    shortName: 'XTR',
    required: false,
  },
  {
    type: 'biometric',
    label: 'Biometric Liveness',
    description: 'Experian TrueID selfie match & DHA liveness check',
    provider: 'Experian',
    color: '#3b82f6',
    shortName: 'BIO',
    required: false,
  },
]

export default function VerificationTab({
  contactId,
  workspaceId,
  contactName,
  contactIdNumber,
}: VerificationTabProps) {
  const [checks, setChecks] = useState<KYCCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [runningCheck, setRunningCheck] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<string | null>(null)
  const [consentTicked, setConsentTicked] = useState(false)
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)
  const [grossIncome, setGrossIncome] = useState<number>(45000)

  const fetchChecks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/contacts/kyc?contactId=${contactId}`)
      const data = await res.json()
      setChecks(data.checks ?? [])
    } catch {
      toast.error('Failed to load verification history')
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => { fetchChecks() }, [fetchChecks])

  const getLatestCheck = (checkType: string) =>
    checks.find(c => c.check_type === checkType)

  const handleRunCheck = async (checkType: string, provider: string) => {
    setRunningCheck(checkType)
    setConfirmModal(null)
    setConsentTicked(false)
    try {
      const res = await fetch('/api/crm/contacts/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          workspaceId,
          checkType,
          provider,
          consentGiven: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${checkType === 'hanis_identity' ? 'ID Verification' : checkType} check queued successfully`)
      fetchChecks()
    } catch (err: any) {
      toast.error(err.message || 'Failed to run check')
    } finally {
      setRunningCheck(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <span className="flex items-center gap-1 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2.5 py-0.5">
            <CheckCircle size={10} /> Passed
          </span>
        )
      case 'failed':
        return (
          <span className="flex items-center gap-1 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[10px] font-semibold rounded-full px-2.5 py-0.5">
            <XCircle size={10} /> Failed
          </span>
        )
      case 'pending':
        return (
          <span className="flex items-center gap-1 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10px] font-semibold rounded-full px-2.5 py-0.5">
            <Clock size={10} /> Pending
          </span>
        )
      case 'running':
        return (
          <span className="flex items-center gap-1 bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] text-dash-accent text-[10px] font-semibold rounded-full px-2.5 py-0.5 animate-pulse">
            Running...
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h3 className="text-[16px] font-semibold !text-dash-text flex items-center gap-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <Shield size={18} className="text-dash-accent" />
          Identity & Compliance
        </h3>
        <p className="text-[12px] !text-dash-textMuted mt-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Run FICA-compliant verifications for {contactName} directly from this contact record
        </p>
      </div>

      {/* POPIA Consent Notice */}
      <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 flex gap-3">
        <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] !text-dash-textMuted leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          All verifications require the contact's explicit consent under POPIA.
          By running a check, you confirm that <strong className="!text-dash-text">{contactName}</strong> has
          verbally or in writing consented to their information being verified.
          This consent is recorded automatically with a timestamp.
        </p>
      </div>

      {/* Verification Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {CHECK_TYPES.map(checkDef => {
          const existing = getLatestCheck(checkDef.type)
          const isRunning = runningCheck === checkDef.type

          return (
            <div key={checkDef.type}
              className="bg-white border border-dash-border rounded-xl p-4 hover:border-dash-border transition-all">

              <div className="flex items-center justify-between gap-4">
                {/* Left — icon + info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${checkDef.color}1F` }}>
                    <span className="text-[10px] font-bold"
                      style={{ color: checkDef.color }}>
                      {checkDef.shortName}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold !text-dash-text"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {checkDef.label}
                      </span>
                      {checkDef.required && (
                        <span className="text-[9px] text-[#ef4444] font-bold tracking-wider">
                          FICA Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] !text-dash-textMuted mt-0.5"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {checkDef.description} — via {checkDef.provider}
                    </p>
                    {existing && (
                      <p className="text-[10px] !text-dash-textMuted mt-0.5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Last run: {new Date(existing.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right — status + action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {existing && getStatusBadge(existing.status)}

                  {isRunning ? (
                    <span className="text-[11px] !text-dash-textMuted">Running...</span>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmModal(checkDef.type)
                        setConsentTicked(false)
                      }}
                      className="text-white text-[11px] font-semibold rounded-lg px-3 py-1.5 hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: checkDef.color,
                      }}>
                      {existing ? 'Re-run' : 'Run Check'}
                    </button>
                  )}

                  {existing && (
                    <button
                      onClick={() => setExpandedCheck(expandedCheck === checkDef.type ? null : checkDef.type)}
                      className="!text-dash-textMuted hover:!text-dash-text transition-colors">
                      {expandedCheck === checkDef.type ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded result */}
              {expandedCheck === checkDef.type && existing && (
                <div className="mt-4 pt-4 border-t border-dash-border space-y-4 text-left">
                  {/* Thin Credit Score UI rendering */}
                  {checkDef.type === 'credit_score' && (
                    (() => {
                      const scoreVal = existing.score || existing.credit_score || 0;
                      const risk = existing.risk_band || existing.credit_risk_grade || 'Fair';
                      
                      const getScoreColorClass = (s: number) => {
                        if (s >= 750) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        if (s >= 680) return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
                        if (s >= 620) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        if (s >= 550) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                        return 'text-red-400 bg-red-500/10 border-red-500/20';
                      };

                      const getScoreProgressColor = (s: number) => {
                        if (s >= 750) return 'bg-emerald-500';
                        if (s >= 680) return 'bg-teal-500';
                        if (s >= 620) return 'bg-amber-500';
                        if (s >= 550) return 'bg-orange-500';
                        return 'bg-red-500';
                      };

                      return (
                        <div className="space-y-4">
                          <div className="bg-dash-surface border border-dash-border rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] !text-dash-textMuted block tracking-wider font-bold">TransUnion Credit Score</span>
                              <span className="text-[28px] font-bold !text-dash-text mt-1 block">
                                {scoreVal} <span className="text-xs !text-dash-textMuted font-normal font-sans">/ 999</span>
                              </span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg border text-[11px] font-bold ${getScoreColorClass(scoreVal)}`}>
                              {risk}
                            </span>
                          </div>
                          <div className="w-full bg-dash-surface rounded-full h-2 overflow-hidden">
                            <div className={`h-full ${getScoreProgressColor(scoreVal)} transition-all`} style={{ width: `${(scoreVal / 999) * 100}%` }} />
                          </div>
                          {existing.notes && (
                            <p className="text-[11px] !text-dash-textMuted leading-relaxed italic">
                              {existing.notes}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  )}

                  {/* Comprehensive Credit Report & Affordability Dashboard */}
                  {checkDef.type === 'credit_report' && (
                    (() => {
                      const scoreVal = existing.score || existing.credit_score || 0;
                      const risk = existing.risk_band || existing.credit_risk_grade || 'Fair';

                      const getScoreColorClass = (s: number) => {
                        if (s >= 750) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        if (s >= 680) return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
                        if (s >= 620) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        if (s >= 550) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                        return 'text-red-400 bg-red-500/10 border-red-500/20';
                      };

                      const getScoreProgressColor = (s: number) => {
                        if (s >= 750) return 'bg-emerald-500';
                        if (s >= 680) return 'bg-teal-500';
                        if (s >= 620) return 'bg-amber-500';
                        if (s >= 550) return 'bg-orange-500';
                        return 'bg-red-500';
                      };

                      return (
                        <div className="space-y-5">
                          {/* Score and Risk Header */}
                          <div className="bg-dash-surface border border-dash-border rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] !text-dash-textMuted block tracking-wider font-bold">Bureau Score (Scale 1-999)</span>
                              <span className="text-[28px] font-bold !text-dash-text mt-1 block">
                                {scoreVal} <span className="text-xs !text-dash-textMuted font-normal font-sans">/ 999</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`px-3 py-1 rounded-lg border text-[11px] font-bold inline-block ${getScoreColorClass(scoreVal)}`}>
                                {risk}
                              </span>
                              <span className="block text-[9px] !text-dash-textMuted mt-1 font-mono">Date verified: {new Date(existing.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="w-full bg-dash-surface rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${getScoreProgressColor(scoreVal)} transition-all`} style={{ width: `${(scoreVal / 999) * 100}%` }} />
                          </div>

                          {/* Financial metrics grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-dash-surface border border-dash-border rounded-xl p-3 text-left">
                              <span className="text-[9px] tracking-wider !text-dash-textMuted block font-bold">Total Debt Exposure</span>
                              <span className="text-[14px] font-bold !text-dash-text mt-1 block">
                                {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(existing.total_debt_exposure || 0)}
                              </span>
                            </div>

                            <div className="bg-dash-surface border border-dash-border rounded-xl p-3 text-left">
                              <span className="text-[9px] tracking-wider !text-dash-textMuted block font-bold">Monthly Repayments</span>
                              <span className="text-[14px] font-bold !text-dash-text mt-1 block">
                                {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(existing.monthly_repayments || 0)}
                              </span>
                            </div>

                            <div className="bg-dash-surface border border-dash-border rounded-xl p-3 text-left">
                              <span className="text-[9px] tracking-wider !text-dash-textMuted block font-bold">Defaults Count</span>
                              <span className={`text-[14px] font-bold  mt-1 block ${existing.defaults_count && existing.defaults_count > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                                {existing.defaults_count ?? 0}
                              </span>
                            </div>

                            <div className="bg-dash-surface border border-dash-border rounded-xl p-3 text-left">
                              <span className="text-[9px] tracking-wider !text-dash-textMuted block font-bold">Judgements Count</span>
                              <span className={`text-[14px] font-bold  mt-1 block ${existing.judgements_count && existing.judgements_count > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                                {existing.judgements_count ?? 0}
                              </span>
                            </div>
                          </div>

                          {/* Affordability Calculator Widget */}
                          <div className="bg-purple-950/10 border border-purple-500/10 rounded-xl p-4 text-left space-y-4">
                            <div className="flex items-center justify-between border-b border-purple-500/10 pb-2">
                              <h5 className="text-[11px] font-bold tracking-wider text-purple-400">Affordability & Debt Planner</h5>
                              <span className="text-[9px] tracking-wider !text-dash-textMuted font-semibold">Real Estate Calculator</span>
                            </div>

                            <div className="space-y-3">
                              {/* Gross Income Input */}
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <label className="text-[10px] !text-dash-textMuted font-bold block">Gross Monthly Income</label>
                                  <span className="text-[9px] !text-dash-textMuted block">Input client monthly earnings</span>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-xs !text-dash-textMuted font-bold font-mono">R</span>
                                  <input
                                    type="number"
                                    value={grossIncome}
                                    onChange={(e) => setGrossIncome(Math.max(0, Number(e.target.value)))}
                                    className="w-32 h-8 bg-white border border-purple-500/20 text-xs font-bold font-mono pl-6 pr-2 rounded-lg !text-dash-text outline-none focus:border-purple-500/40 text-right"
                                  />
                                </div>
                              </div>

                              <input
                                type="range"
                                min="10000"
                                max="150000"
                                step="1000"
                                value={grossIncome}
                                onChange={(e) => setGrossIncome(Number(e.target.value))}
                                className="w-full h-1 bg-purple-500/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />

                              {/* Calculations details */}
                              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-500/5">
                                {/* DTI Calculation */}
                                <div>
                                  <span className="text-[9px] !text-dash-textMuted tracking-wider block font-bold">Debt-to-Income (DTI) %</span>
                                  {(() => {
                                    const repayments = existing.monthly_repayments || 0;
                                    const dti = grossIncome > 0 ? (repayments / grossIncome) * 100 : 0;
                                    let dtiColor = 'text-emerald-400';
                                    let dtiText = 'Safe / Conservative';

                                    if (dti > 43) {
                                      dtiColor = 'text-red-400';
                                      dtiText = 'High Risk';
                                    } else if (dti > 36) {
                                      dtiColor = 'text-amber-400';
                                      dtiText = 'Moderate Limit';
                                    }

                                    return (
                                      <div className="mt-1">
                                        <span className={`text-[16px] font-bold  ${dtiColor}`}>{dti.toFixed(1)}%</span>
                                        <span className="block text-[8.5px] !text-dash-textMuted font-semibold tracking-wider mt-0.5">{dtiText}</span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Max bond monthly budget */}
                                <div>
                                  <span className="text-[9px] !text-dash-textMuted tracking-wider block font-bold">Max Bond Installment</span>
                                  {(() => {
                                    const repayments = existing.monthly_repayments || 0;
                                    const maxBond = Math.max(0, (grossIncome * 0.40) - repayments);
                                    return (
                                      <div className="mt-1">
                                        <span className="text-[16px] font-bold text-emerald-400 ">
                                          {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(maxBond)}
                                        </span>
                                        <span className="block text-[8.5px] !text-dash-textMuted font-semibold tracking-wider mt-0.5">At 40% income cap</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* XDS Mass-Market Credit UI rendering */}
                  {checkDef.type === 'xds_credit' && (
                    (() => {
                      const scoreVal = existing.score || existing.credit_score || 0;
                      const risk = existing.risk_band || existing.credit_risk_grade || 'Fair';
                      const accounts = existing.raw_response?.creditResult?.accounts || [];

                      const getScoreColorClass = (s: number) => {
                        if (s >= 740) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        if (s >= 670) return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
                        if (s >= 610) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        if (s >= 530) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                        return 'text-red-400 bg-red-500/10 border-red-500/20';
                      };

                      const getScoreProgressColor = (s: number) => {
                        if (s >= 740) return 'bg-emerald-500';
                        if (s >= 670) return 'bg-teal-500';
                        if (s >= 610) return 'bg-amber-500';
                        if (s >= 530) return 'bg-orange-500';
                        return 'bg-red-500';
                      };

                      return (
                        <div className="space-y-4">
                          <div className="bg-dash-surface border border-dash-border rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] !text-dash-textMuted block tracking-wider font-bold">XDS Mass-Market Score</span>
                              <span className="text-[28px] font-bold !text-dash-text mt-1 block">
                                {scoreVal} <span className="text-xs !text-dash-textMuted font-normal font-sans">/ 999</span>
                              </span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg border text-[11px] font-bold ${getScoreColorClass(scoreVal)}`}>
                              {risk}
                            </span>
                          </div>
                          <div className="w-full bg-dash-surface rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${getScoreProgressColor(scoreVal)} transition-all`} style={{ width: `${(scoreVal / 999) * 100}%` }} />
                          </div>

                          {/* Accounts Listing */}
                          <div className="space-y-2">
                            <h5 className="text-[10.5px] font-bold tracking-wider !text-dash-textMuted">Micro-Lending & Retail Accounts</h5>
                            {accounts.length === 0 ? (
                              <p className="text-[11px] !text-dash-textMuted italic">No active retail credit records found.</p>
                            ) : (
                              <div className="overflow-x-auto border border-dash-border rounded-xl bg-dash-surface">
                                <table className="w-full text-[11px] text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-dash-border !text-dash-textMuted bg-dash-surface">
                                      <th className="p-2.5 font-bold">Creditor</th>
                                      <th className="p-2.5 font-bold">Type</th>
                                      <th className="p-2.5 font-bold text-right">Balance</th>
                                      <th className="p-2.5 font-bold text-right">Installment</th>
                                      <th className="p-2.5 font-bold text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-dash-border !text-dash-text">
                                    {accounts.map((acct: any, idx: number) => {
                                      const isArrears = acct.paymentStatus === 'Arrears' || acct.paymentStatus === 'Written Off';
                                      const isPaid = acct.paymentStatus === 'Paid Up';
                                      return (
                                        <tr key={idx} className="hover:bg-dash-surface">
                                          <td className="p-2.5 font-semibold">{acct.creditorName}</td>
                                          <td className="p-2.5 !text-dash-textMuted">{acct.accountType}</td>
                                          <td className="p-2.5 text-right font-mono font-bold">
                                            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(acct.currentBalance)}
                                          </td>
                                          <td className="p-2.5 text-right font-mono !text-dash-textMuted">
                                            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(acct.monthlyInstallment)}
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${isArrears ? 'text-red-400 bg-red-500/10 border-red-500/20' : isPaid ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                                              {acct.paymentStatus}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* XDS Active Tracing UI rendering */}
                  {checkDef.type === 'xds_trace' && (
                    (() => {
                      const traceResult = existing.raw_response?.traceResult || existing.raw_response || {};
                      const addresses = traceResult.addresses || [];
                      const phones = traceResult.phones || [];

                      return (
                        <div className="space-y-4">
                          <div className="bg-dash-surface border border-dash-border rounded-xl p-3 text-left">
                            <span className="text-[10px] !text-dash-textMuted block tracking-wider font-bold">Collections Trace History</span>
                            <span className="text-[12px] !text-dash-textMuted mt-1 block">
                              Found <strong className="!text-dash-text">{addresses.length}</strong> addresses and <strong className="!text-dash-text">{phones.length}</strong> verified numbers.
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Traced Addresses */}
                            <div className="space-y-2">
                              <h5 className="text-[10.5px] font-bold tracking-wider !text-dash-textMuted  flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Verified Addresses
                              </h5>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {addresses.length === 0 ? (
                                  <p className="text-[10px] !text-dash-textMuted italic">No verified addresses found.</p>
                                ) : (
                                  addresses.map((addr: any, idx: number) => (
                                    <div key={idx} className="bg-dash-surface border border-dash-border rounded-xl p-2.5 text-[11px] leading-relaxed">
                                      <p className="!text-dash-text font-semibold">{addr.addressLine}</p>
                                      <p className="!text-dash-textMuted">{addr.city}, {addr.province}, {addr.postalCode}</p>
                                      <span className="inline-block text-[8px] !text-dash-textMuted font-mono mt-1">Verified: {addr.lastVerified}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Traced Phones */}
                            <div className="space-y-2">
                              <h5 className="text-[10.5px] font-bold tracking-wider !text-dash-textMuted  flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Contact Numbers
                              </h5>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {phones.length === 0 ? (
                                  <p className="text-[10px] !text-dash-textMuted italic">No verified phone numbers found.</p>
                                ) : (
                                  phones.map((phone: any, idx: number) => (
                                    <div key={idx} className="bg-dash-surface border border-dash-border rounded-xl p-2.5 text-[11px] flex justify-between items-center">
                                      <div>
                                        <p className="!text-dash-text font-mono font-bold">{phone.phoneNumber}</p>
                                        <span className="inline-block text-[8px] !text-dash-textMuted font-mono mt-0.5">Verified: {phone.lastVerified}</span>
                                      </div>
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded">
                                        {phone.phoneType}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* Experian TrueID Biometric UI rendering */}
                  {checkDef.type === 'biometric' && (
                    <div className="space-y-4 text-left">
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
                        {/* Simulated Selfie Capture Frame */}
                        <div className="w-16 h-16 rounded-full border-2 border-dash-accent/60 flex items-center justify-center bg-dash-surface text-blue-400 relative overflow-hidden shrink-0">
                          <svg className="w-9 h-9 opacity-40 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          </svg>
                          <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-pulse" />
                        </div>

                        <div className="flex-1 space-y-1 w-full">
                          <span className="text-[10px] !text-dash-textMuted block tracking-wider font-bold">Biometric Match & Liveness</span>
                          <span className="text-xs font-bold !text-dash-text block">
                            {existing.result || existing.notes || 'Liveness Checked'}
                          </span>
                          <div className="flex gap-2 items-center text-[10px] !text-dash-textMuted">
                            <span>Status:</span>
                            <span className={`font-bold ${existing.status === 'passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {existing.status === 'passed' ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Experian Address Geocoding UI rendering */}
                  {checkDef.type === 'address_verification' && existing.provider === 'experian' && (
                    <div className="space-y-4 text-left">
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-3">
                        <div>
                          <span className="text-[10px] !text-dash-textMuted block tracking-wider font-bold">Geocoded GPS Coordinates</span>
                          <span className="text-xs font-bold !text-dash-text block mt-1">
                            {existing.notes || 'Geocoding Verified'}
                          </span>
                        </div>
                        <div className="flex gap-4 border-t border-dash-border pt-3 text-[11px] !text-dash-textMuted font-mono">
                          <div>
                            <span className="!text-dash-textMuted block text-[9px] font-bold">Latitude</span>
                            <span className="!text-dash-text font-bold">{existing.raw_response?.geocodeResult?.coordinates?.latitude || existing.raw_response?.latitude || '-26.1314'}</span>
                          </div>
                          <div>
                            <span className="!text-dash-textMuted block text-[9px] font-bold">Longitude</span>
                            <span className="!text-dash-text font-bold">{existing.raw_response?.geocodeResult?.coordinates?.longitude || existing.raw_response?.longitude || '28.0673'}</span>
                          </div>
                          <div>
                            <span className="!text-dash-textMuted block text-[9px] font-bold">Accuracy</span>
                            <span className="text-emerald-400 font-bold">HIGH</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard checks fallback layout rendering */}
                  {checkDef.type !== 'credit_score' && checkDef.type !== 'credit_report' && checkDef.type !== 'xds_credit' && checkDef.type !== 'xds_trace' && checkDef.type !== 'biometric' && !(checkDef.type === 'address_verification' && existing.provider === 'experian') && (
                    <>
                      {existing.notes && (
                        <p className="text-[11.5px] !text-dash-textMuted"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {existing.notes}
                        </p>
                      )}
                      {existing.id_valid !== undefined && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="!text-dash-textMuted">ID Valid:</span>
                          <span className={existing.id_valid ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                            {existing.id_valid ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {existing.credit_score !== undefined && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="!text-dash-textMuted">Credit Score:</span>
                          <span className="!text-dash-text font-semibold">{existing.credit_score}</span>
                        </div>
                      )}
                      {existing.on_sanctions_list !== undefined && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="!text-dash-textMuted">On Sanctions List:</span>
                          <span className={existing.on_sanctions_list ? 'text-[#ef4444]' : 'text-[#10b981]'}>
                            {existing.on_sanctions_list ? 'Yes — Flag for review' : 'No'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Verification History */}
      {checks.length > 0 && (
        <div>
          <h4 className="text-[13px] font-semibold !text-dash-text mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Verification History
          </h4>
          <div className="bg-white border border-dash-border rounded-xl divide-y divide-dash-border">
            {checks.map(check => (
              <div key={check.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium !text-dash-text"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {CHECK_TYPES.find(c => c.type === check.check_type)?.label ?? check.check_type}
                  </span>
                  <span className="text-[10px] !text-dash-textMuted">via {check.provider}</span>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(check.status)}
                  <span className="text-[10px] !text-dash-textMuted"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {new Date(check.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-dash-border rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            {(() => {
              const checkDef = CHECK_TYPES.find(c => c.type === confirmModal)!
              return (
                <>
                  <h3 className="text-[17px] font-semibold !text-dash-text mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Run {checkDef.label}?
                  </h3>
                  <p className="text-[12px] !text-dash-textMuted mb-3 leading-relaxed"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    This will run a {checkDef.provider} {checkDef.label} check on {contactName}.
                    The result will be saved on this contact record with a timestamp.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={consentTicked}
                      onChange={e => setConsentTicked(e.target.checked)}
                      className="mt-0.5 accent-dash-accent"
                    />
                    <span className="text-[12px] !text-dash-textMuted leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      I confirm that <strong className="!text-dash-text">{contactName}</strong> has
                      explicitly consented to this verification check.
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setConfirmModal(null); setConsentTicked(false) }}
                      className="flex-1 py-2.5 border border-dash-border rounded-lg !text-dash-textMuted text-[13px] font-semibold hover:!text-dash-text transition-all"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRunCheck(confirmModal, checkDef.provider)}
                      disabled={!consentTicked}
                      className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: consentTicked ? checkDef.color : undefined,
                      }}>
                      Run Check
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import React, { useEffect, useState } from 'react'
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
    type: 'credit_report',
    label: 'Credit Report',
    description: 'Full credit bureau report — score, defaults, judgements',
    provider: 'Experian',
    color: '#ff6200',
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

  const fetchChecks = async () => {
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
  }

  useEffect(() => { fetchChecks() }, [contactId])

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
          <span className="flex items-center gap-1 bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] text-[#3b82f6] text-[10px] font-semibold rounded-full px-2.5 py-0.5 animate-pulse">
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
        <h3 className="text-[16px] font-semibold text-[#eef2ff] flex items-center gap-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <Shield size={18} className="text-[#3b82f6]" />
          Identity & Compliance
        </h3>
        <p className="text-[12px] text-[#4a5a82] mt-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Run FICA-compliant verifications for {contactName} directly from this contact record
        </p>
      </div>

      {/* POPIA Consent Notice */}
      <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 flex gap-3">
        <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#94a3c8] leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          All verifications require the contact's explicit consent under POPIA.
          By running a check, you confirm that <strong className="text-[#eef2ff]">{contactName}</strong> has
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
              className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.13)] transition-all">

              <div className="flex items-center justify-between gap-4">
                {/* Left — icon + info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${checkDef.color}1F` }}>
                    <span className="text-[10px] font-bold"
                      style={{ color: checkDef.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {checkDef.shortName}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#eef2ff]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {checkDef.label}
                      </span>
                      {checkDef.required && (
                        <span className="text-[9px] text-[#ef4444] font-bold uppercase tracking-wider">
                          FICA Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-[#94a3c8] mt-0.5"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {checkDef.description} — via {checkDef.provider}
                    </p>
                    {existing && (
                      <p className="text-[10px] text-[#4a5a82] mt-0.5"
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
                    <span className="text-[11px] text-[#4a5a82]">Running...</span>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmModal(checkDef.type)
                        setConsentTicked(false)
                      }}
                      className="text-white text-[11px] font-semibold rounded-lg px-3 py-1.5 hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: checkDef.color,
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                      {existing ? 'Re-run' : 'Run Check'}
                    </button>
                  )}

                  {existing && (
                    <button
                      onClick={() => setExpandedCheck(expandedCheck === checkDef.type ? null : checkDef.type)}
                      className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                      {expandedCheck === checkDef.type ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded result */}
              {expandedCheck === checkDef.type && existing && (
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-2">
                  {existing.notes && (
                    <p className="text-[11.5px] text-[#94a3c8]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {existing.notes}
                    </p>
                  )}
                  {existing.id_valid !== undefined && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[#4a5a82]">ID Valid:</span>
                      <span className={existing.id_valid ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                        {existing.id_valid ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                  {existing.credit_score !== undefined && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[#4a5a82]">Credit Score:</span>
                      <span className="text-[#eef2ff] font-semibold">{existing.credit_score}</span>
                    </div>
                  )}
                  {existing.on_sanctions_list !== undefined && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[#4a5a82]">On Sanctions List:</span>
                      <span className={existing.on_sanctions_list ? 'text-[#ef4444]' : 'text-[#10b981]'}>
                        {existing.on_sanctions_list ? 'Yes — Flag for review' : 'No'}
                      </span>
                    </div>
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
          <h4 className="text-[13px] font-semibold text-[#eef2ff] mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Verification History
          </h4>
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl divide-y divide-[rgba(255,255,255,0.04)]">
            {checks.map(check => (
              <div key={check.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-[#eef2ff]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {CHECK_TYPES.find(c => c.type === check.check_type)?.label ?? check.check_type}
                  </span>
                  <span className="text-[10px] text-[#4a5a82]">via {check.provider}</span>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(check.status)}
                  <span className="text-[10px] text-[#4a5a82]"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#080f28] border border-[rgba(255,255,255,0.13)] rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            {(() => {
              const checkDef = CHECK_TYPES.find(c => c.type === confirmModal)!
              return (
                <>
                  <h3 className="text-[17px] font-semibold text-[#eef2ff] mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Run {checkDef.label}?
                  </h3>
                  <p className="text-[12px] text-[#94a3c8] mb-3 leading-relaxed"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    This will run a {checkDef.provider} {checkDef.label} check on {contactName}.
                    The result will be saved on this contact record with a timestamp.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={consentTicked}
                      onChange={e => setConsentTicked(e.target.checked)}
                      className="mt-0.5 accent-[#2563eb]"
                    />
                    <span className="text-[12px] text-[#94a3c8] leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      I confirm that <strong className="text-[#eef2ff]">{contactName}</strong> has
                      explicitly consented to this verification check.
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setConfirmModal(null); setConsentTicked(false) }}
                      className="flex-1 py-2.5 border border-[rgba(255,255,255,0.07)] rounded-lg text-[#4a5a82] text-[13px] font-semibold hover:text-[#eef2ff] transition-all"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRunCheck(confirmModal, checkDef.provider)}
                      disabled={!consentTicked}
                      className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: consentTicked ? checkDef.color : undefined,
                        fontFamily: "'DM Sans', sans-serif",
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

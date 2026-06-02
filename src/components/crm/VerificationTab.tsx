'use client';

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Play, CheckCircle2, XCircle, AlertCircle, RefreshCw, Eye, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationTabProps {
  contactId: string;
  workspaceId: string;
  contactName?: string;
}

interface VerificationRecord {
  id: string;
  verification_type: string;
  provider: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'manual_review';
  result: any;
  notes: string | null;
  consent_given: boolean;
  consent_given_at: string;
  created_at: string;
}

interface VerificationTypeConfig {
  type: string;
  title: string;
  description: string;
  provider: string;
  abbrev: string;
  color: string;
}

const CHECK_TYPES: VerificationTypeConfig[] = [
  {
    type: 'id_check',
    title: 'ID Verification',
    description: 'Verify SA ID number against Home Affairs',
    provider: 'TransUnion',
    abbrev: 'ID',
    color: '#e4002b',
  },
  {
    type: 'credit_report',
    title: 'Credit Report',
    description: 'Full credit bureau report — score, defaults, judgements',
    provider: 'Experian',
    abbrev: 'CR',
    color: '#ff6200',
  },
  {
    type: 'sanctions_screen',
    title: 'Sanctions Screen',
    description: 'AML and international sanctions list check',
    provider: 'AML Screen',
    abbrev: 'SS',
    color: '#ef4444',
  },
  {
    type: 'pep_check',
    title: 'PEP Check',
    description: 'Politically Exposed Person screening',
    provider: 'PEP Screen',
    abbrev: 'PEP',
    color: '#f59e0b',
  },
  {
    type: 'address_check',
    title: 'Address Check',
    description: 'Verify residential address against records',
    provider: 'TransUnion',
    abbrev: 'AC',
    color: '#0057b8',
  },
];

export default function VerificationTab({ contactId, workspaceId, contactName = 'this contact' }: VerificationTabProps) {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);

  // Modals state
  const [selectedCheck, setSelectedCheck] = useState<VerificationTypeConfig | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [runningCheckType, setRunningCheckType] = useState<string | null>(null);
  
  const [viewingResult, setViewingResult] = useState<VerificationRecord | null>(null);

  const fetchVerifications = async () => {
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/verifications`);
      if (!res.ok) throw new Error('Failed to fetch verifications');
      const json = await res.json();
      setVerifications(json.verifications || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [contactId]);

  const handleRunCheck = async () => {
    if (!selectedCheck) return;
    if (!consentChecked) {
      toast.error('You must confirm consent to proceed.');
      return;
    }

    const checkType = selectedCheck.type;
    setRunningCheckType(checkType);
    setSelectedCheck(null);

    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          verificationType: checkType,
          provider: selectedCheck.provider,
          consentGiven: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to initiate verification');

      toast.info('Verification initiated. Status is pending provider response.');
      fetchVerifications();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setRunningCheckType(null);
      setConsentChecked(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this verification record?')) return;
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/verifications?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete verification');
      toast.success('Verification record deleted');
      fetchVerifications();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting verification');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Passed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Failed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full">
            <RefreshCw size={11} className="animate-spin" /> Running
          </span>
        );
      case 'manual_review':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full">
            ● Manual Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-t3 text-[10.5px] font-bold px-2 py-0.5 rounded-full">
            ○ Pending
          </span>
        );
    }
  };

  const getLatestRecordForType = (type: string) => {
    return verifications.find(v => v.verification_type === type);
  };

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Identity & Compliance
        </h2>
        <p className="text-[12px] text-[#4a5a82] mt-0.5">
          Run FICA-compliant verifications directly from this contact record
        </p>
      </div>

      {/* Consent Notice */}
      <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="text-[#f59e0b] w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#94a3c8] leading-relaxed">
          All verifications require the contact's consent. By running a check, you confirm the contact has given explicit consent for their information to be verified. This is recorded automatically.
        </p>
      </div>

      {/* Verification Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {CHECK_TYPES.map(cfg => {
          const latest = getLatestRecordForType(cfg.type);
          const isRunning = runningCheckType === cfg.type;

          return (
            <div
              key={cfg.type}
              className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex items-center justify-between hover:border-[rgba(255,255,255,0.13)] transition-all"
            >
              {/* Info Left */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[12px] shadow-lg border border-white/5 shrink-0"
                  style={{ backgroundColor: `${cfg.color}1F`, color: cfg.color }}
                >
                  {cfg.abbrev}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#eef2ff] text-[13px] font-semibold truncate">
                      {cfg.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-t3">
                      {cfg.provider}
                    </span>
                  </div>
                  <p className="text-[#94a3c8] text-[11px] mt-0.5 leading-snug truncate">
                    {cfg.description}
                  </p>
                </div>
              </div>

              {/* Action/Status Right */}
              <div className="shrink-0 pl-3">
                {latest ? (
                  <div className="flex items-center gap-2">
                    {getStatusBadge(latest.status)}
                    <button
                      onClick={() => openConnectModalOrCheck(cfg)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-t1 border border-white/5 text-[10.5px] font-bold rounded-lg transition-all"
                    >
                      Run Again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedCheck(cfg)}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-500/50 text-white text-[11px] font-bold rounded-lg transition-all"
                  >
                    {isRunning ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : (
                      <Play size={11} fill="currentColor" />
                    )}
                    Run Check
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verification History */}
      <div>
        <h3 className="text-[14px] font-semibold text-[#eef2ff] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Verification History
        </h3>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-white/[0.02] border border-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : verifications.length === 0 ? (
          <div className="text-center py-8 bg-white/[0.01] border border-white/5 rounded-xl p-6 text-t3">
            <Shield size={24} className="mx-auto mb-2 text-[#4a5a82]" />
            <p className="text-[12px] text-[#4a5a82]">
              No verifications run yet for this contact.
            </p>
          </div>
        ) : (
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden divide-y divide-white/[0.03]">
            {verifications.map(v => {
              const cfg = CHECK_TYPES.find(c => c.type === v.verification_type);
              return (
                <div key={v.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                  {/* Left Type Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-[10px]"
                      style={{ backgroundColor: cfg ? `${cfg.color}1F` : '#ffffff1F', color: cfg ? cfg.color : '#fff' }}
                    >
                      {cfg?.abbrev || 'VC'}
                    </div>
                    <div>
                      <span className="text-[12px] font-bold text-[#eef2ff] block">
                        {cfg?.title || v.verification_type}
                      </span>
                      <span className="text-[10px] text-t4 block mt-0.5">
                        Provider: {v.provider} • Consent recorded
                      </span>
                    </div>
                  </div>

                  {/* Middle Status/Date */}
                  <div className="flex items-center gap-4">
                    {getStatusBadge(v.status)}
                    <span className="text-[11px] text-[#4a5a82] font-semibold">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Right Action */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingResult(v)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-t1 border border-white/5 text-[10.5px] font-bold rounded-lg transition-all"
                    >
                      <Eye size={12} /> View Result
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-[#ef4444] rounded-lg transition-colors border border-red-500/20"
                      title="Delete Record"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
              <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Run {selectedCheck.title}?
              </h3>
              <button
                onClick={() => {
                  setSelectedCheck(null);
                  setConsentChecked(false);
                }}
                className="text-t3 hover:text-t1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[12px] text-[#94a3c8] leading-relaxed">
                This will run a <strong>{selectedCheck.provider} {selectedCheck.title}</strong> check on <strong>{contactName}</strong>. By proceeding, you confirm this contact has given their explicit consent.
              </p>

              <label className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 accent-[#2563eb]"
                />
                <span className="text-[11.5px] text-[#eef2ff] leading-snug">
                  I confirm <strong>{contactName}</strong> has given explicit consent for this check.
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCheck(null);
                    setConsentChecked(false);
                  }}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 text-[11px] font-bold rounded-xl text-t3 hover:text-t1 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunCheck}
                  disabled={!consentChecked}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-500/50 disabled:opacity-50 text-[11px] font-bold rounded-xl text-white transition-colors"
                >
                  Run Check
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Result Modal */}
      {viewingResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
              <div>
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Verification Details
                </h3>
                <span className="text-[10px] text-t4 block mt-0.5">
                  ID: {viewingResult.id}
                </span>
              </div>
              <button
                onClick={() => setViewingResult(null)}
                className="text-t3 hover:text-t1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto common-scrollbar">
              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div>
                  <span className="text-[#4a5a82] font-semibold block uppercase tracking-[0.5px] text-[9.5px]">Type</span>
                  <span className="text-[#eef2ff] font-medium block mt-0.5 capitalize">
                    {viewingResult.verification_type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[#4a5a82] font-semibold block uppercase tracking-[0.5px] text-[9.5px]">Provider</span>
                  <span className="text-[#eef2ff] font-medium block mt-0.5">
                    {viewingResult.provider}
                  </span>
                </div>
                <div>
                  <span className="text-[#4a5a82] font-semibold block uppercase tracking-[0.5px] text-[9.5px]">Status</span>
                  <span className="block mt-0.5">{getStatusBadge(viewingResult.status)}</span>
                </div>
                <div>
                  <span className="text-[#4a5a82] font-semibold block uppercase tracking-[0.5px] text-[9.5px]">Run Date</span>
                  <span className="text-[#eef2ff] font-medium block mt-0.5">
                    {new Date(viewingResult.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {viewingResult.notes && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[11.5px] leading-relaxed flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{viewingResult.notes}</span>
                </div>
              )}

              {/* JSON result output */}
              <div>
                <span className="text-[#4a5a82] font-semibold block uppercase tracking-[0.5px] text-[9.5px] mb-1.5">JSON Payload Result</span>
                <pre className="bg-[#070d24] border border-white/5 rounded-xl p-4 text-[11px] text-[#94a3c8] font-mono overflow-x-auto max-h-[200px]">
                  {JSON.stringify(viewingResult.result || {}, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingResult(null)}
                  className="px-5 py-2 bg-white/5 hover:bg-white/10 text-[11px] font-bold rounded-xl text-t1 transition-colors border border-white/5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function openConnectModalOrCheck(cfg: VerificationTypeConfig) {
    setSelectedCheck(cfg);
  }
}

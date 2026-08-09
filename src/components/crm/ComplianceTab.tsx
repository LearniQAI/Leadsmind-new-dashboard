'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Signature,
  RefreshCw,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Loader2,
  Check,
  Circle,
  CheckCircle2,
  FileText,
  Upload,
  Download,
  AlertCircle,
  UserX,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { invokeRightToErasure, ErasureReceipt } from '@/app/actions/popia';
import { ErasureReceiptModal } from '@/components/crm/ErasureReceiptModal';
import { BeneficialOwnershipTab } from '@/components/crm/BeneficialOwnershipTab';

interface KYCCheck {
  id: string;
  check_type: string;
  provider: string;
  status: string;
  id_valid?: boolean;
  name_match?: boolean;
  alive_status?: string;
  fraud_indicator?: boolean;
  credit_score?: number;
  on_sanctions_list?: boolean;
  is_pep?: boolean;
  aml_match_level?: 'STRONG_MATCH' | 'MEDIUM_MATCH' | 'WEAK_MATCH' | 'NO_MATCH';
  aml_match_details?: any;
  notes?: string;
  checked_by?: string;
  checked_at?: string;
  created_at: string;
  score?: number;
  risk_band?: string;
  credit_risk_grade?: string;
  defaults_count?: number;
  judgements_count?: number;
  total_debt_exposure?: number;
  monthly_repayments?: number;
  raw_response?: any;
  result?: string;
}

interface KYCDocument {
  id: string;
  document_type: string;
  file_url: string;
  expiry_date?: string;
  retention_delete_after: string;
  created_at: string;
}

// None of these providers are live against production credentials yet — every
// environment ships sandbox mode + placeholder keys, so results would be
// simulated data rather than a real TransUnion/Refinitiv/XDS response. Shown
// as "Coming soon" rather than wired up, matching how unbuilt integrations
// are represented elsewhere (e.g. Payment Gateways).
const CHECK_TYPES = [
  { type: 'hanis_identity', label: 'ID Verification', description: 'Verify SA ID number against Home Affairs database', provider: 'TransUnion', color: '#e4002b', shortName: 'ID', required: true },
  { type: 'credit_score', label: 'Thin Credit Score', description: 'Quick pre-screening credit score assessment', provider: 'TransUnion', color: '#3b82f6', shortName: 'TCS', required: false },
  { type: 'credit_report', label: 'Credit Report', description: 'Full credit bureau report — score, debt, defaults, judgements', provider: 'TransUnion', color: '#8b5cf6', shortName: 'CR', required: false },
  { type: 'sanctions_screen', label: 'Sanctions Screen', description: 'AML and international sanctions list check', provider: 'AML Screen', color: '#ef4444', shortName: 'AML', required: true },
  { type: 'pep_check', label: 'PEP Check', description: 'Politically Exposed Person screening', provider: 'PEP Screen', color: '#f59e0b', shortName: 'PEP', required: false },
  { type: 'address_verification', label: 'Address Check', description: 'Verify residential address against records', provider: 'TransUnion', color: '#0057b8', shortName: 'ADR', required: false },
  { type: 'xds_credit', label: 'XDS Mass Credit', description: 'XDS retail payment profiles and micro-lending history', provider: 'XDS', color: '#059669', shortName: 'XMC', required: false },
  { type: 'xds_trace', label: 'XDS Active Trace', description: 'Trace verified physical addresses and contact numbers', provider: 'XDS', color: '#d97706', shortName: 'XTR', required: false },
  { type: 'biometric', label: 'Biometric Liveness', description: 'Experian TrueID selfie match & DHA liveness check', provider: 'Experian', color: '#3b82f6', shortName: 'BIO', required: false },
];

interface ComplianceTabProps {
  contact: Contact;
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-[13px] font-bold !text-dash-text">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ComplianceTab({ contact: initialContact }: ComplianceTabProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [contact, setContact] = useState<Contact>(initialContact);
  const [checks, setChecks] = useState<KYCCheck[]>([]);
  const [kycDocs, setKycDocs] = useState<KYCDocument[]>([]);
  const [consentRecord, setConsentRecord] = useState<any>(null);
  const [riskRating, setRiskRating] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  // ID inline edit
  const [isEditingId, setIsEditingId] = useState(false);
  const [idInput, setIdInput] = useState(contact.id_number || '');

  // Consent dispatch
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<'email' | 'whatsapp' | 'sms'>('email');
  const [selectedChecks, setSelectedChecks] = useState<string[]>(['hanis_identity', 'credit_report', 'sanctions_screen']);

  // Document vault
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [selectedUploadDocType, setSelectedUploadDocType] = useState('green_id');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Erasure
  const [erasing, setErasing] = useState(false);
  const [receipt, setReceipt] = useState<ErasureReceipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: updatedContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact.id)
        .single();

      if (updatedContact) {
        setContact(updatedContact);
        setIdInput(updatedContact.id_number || '');
      }

      const res = await fetch(`/api/crm/contacts/kyc?contactId=${contact.id}`);
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
      }

      const { data: consent } = await supabase
        .from('kyc_consent')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setConsentRecord(consent);

      const { data: docs } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });
      setKycDocs(docs || []);

      const { data: rating } = await supabase
        .from('kyc_risk_ratings')
        .select('*')
        .eq('contact_id', contact.id)
        .maybeSingle();
      setRiskRating(rating || null);
    } catch (err) {
      console.error('Error fetching compliance details:', err);
    }
  }, [contact.id, supabase]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Compliance records refreshed');
  };

  const handleSaveId = async () => {
    if (!idInput.trim()) {
      toast.error('Please enter a valid ID number');
      return;
    }
    setRunningAction('save_id');
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ id_number: idInput.trim(), updated_at: new Date().toISOString() })
        .eq('id', contact.id);
      if (error) throw error;
      toast.success('Contact ID number saved successfully.');
      setIsEditingId(false);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update ID number');
    } finally {
      setRunningAction(null);
    }
  };

  const handleSendRequest = async () => {
    setRunningAction('consent');
    try {
      const res = await fetch('/api/kyc/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          workspaceId: contact.workspace_id,
          checkTypes: selectedChecks,
          channel: dispatchChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Consent request successfully sent via ${dispatchChannel.toUpperCase()}!`);
      setShowRequestModal(false);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch request.');
    } finally {
      setRunningAction(null);
    }
  };

  const handleUploadKycDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('contactId', contact.id);
    formData.append('workspaceId', contact.workspace_id);
    formData.append('documentType', selectedUploadDocType);
    formData.append('file', uploadFile);
    try {
      const res = await fetch('/api/kyc/documents/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast.success('Vault uploaded & encrypted document successfully.');
      setUploadFile(null);
      const fileInput = document.getElementById('kyc-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setShowUploadDrawer(false);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Vault document upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleErasure = async () => {
    const email = contact.email || 'this contact';
    const confirmed = window.confirm(
      `WARNING: You are executing a POPIA Right-to-Erasure request for ${email}.\n\n` +
      `This will:\n` +
      `- Cancel all running sequence executions.\n` +
      `- Remove the contact from enrollment queues.\n` +
      `- Add their email to the workspace global suppression block list.\n` +
      `- Permanently anonymize CRM fields.\n\n` +
      `Are you sure you want to proceed? This is irreversible.`
    );
    if (!confirmed) return;

    setErasing(true);
    try {
      const res = await invokeRightToErasure(contact.id);
      if (res.success && res.data) {
        setReceipt(res.data);
        setShowReceipt(true);
        toast.success('POPIA Erasure request successfully executed.');
        await fetchData();
      } else {
        toast.error(res.error || 'Failed to process erasure request.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An unexpected error occurred.');
    } finally {
      setErasing(false);
    }
  };

  const latestAmlCheck = useMemo(() => checks.find(c => c.check_type === 'sanctions_screen'), [checks]);
  const latestIdCheck = useMemo(() => checks.find(c => c.check_type === 'hanis_identity'), [checks]);

  const isAddressExpired = useMemo(() => {
    const utilityBill = kycDocs.find(d => d.document_type === 'utility_bill');
    if (!utilityBill) return false;
    if (utilityBill.expiry_date) {
      return new Date(utilityBill.expiry_date).getTime() < Date.now();
    }
    return false;
  }, [kycDocs]);

  const panelStatus = useMemo(() => {
    if (riskRating) {
      if (riskRating.overall_rating === 'red') return { label: 'High risk lock', glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.25)] border-[#ef4444]/30 bg-[#ef4444]/10', icon: <AlertTriangle className="h-9 w-9 text-[#ef4444]" /> };
      if (riskRating.overall_rating === 'amber') return { label: 'Action required', glowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.25)] border-[#f59e0b]/30 bg-[#f59e0b]/10', icon: <Clock className="h-9 w-9 text-[#f59e0b]" /> };
      if (riskRating.overall_rating === 'green') return { label: 'FICA verified', glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.25)] border-[#10b981]/30 bg-[#10b981]/10', icon: <CheckCircle className="h-9 w-9 text-[#10b981]" /> };
      if (riskRating.overall_rating === 'grey') return { label: 'Unverified', glowClass: 'shadow-[0_0_15px_rgba(74,90,130,0.15)] border-dash-border bg-dash-surface', icon: <Shield className="h-9 w-9 !text-dash-textMuted" /> };
    }
    if (contact.kyc_risk_flag === 'HIGH' || latestIdCheck?.fraud_indicator || latestIdCheck?.alive_status === 'DECEASED' || latestAmlCheck?.aml_match_level === 'STRONG_MATCH') {
      return { label: 'High risk lock', glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.25)] border-[#ef4444]/30 bg-[#ef4444]/10', icon: <AlertTriangle className="h-9 w-9 text-[#ef4444]" /> };
    }
    if (contact.kyc_id_verified && !isAddressExpired) {
      return { label: 'FICA verified', glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.25)] border-[#10b981]/30 bg-[#10b981]/10', icon: <CheckCircle className="h-9 w-9 text-[#10b981]" /> };
    }
    return { label: 'Unverified', glowClass: 'shadow-[0_0_15px_rgba(74,90,130,0.15)] border-dash-border bg-dash-surface', icon: <Shield className="h-9 w-9 !text-dash-textMuted" /> };
  }, [contact, latestIdCheck, latestAmlCheck, isAddressExpired, riskRating]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span className="flex items-center gap-1 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2.5 py-0.5"><CheckCircle size={10} /> Passed</span>;
      case 'failed':
        return <span className="flex items-center gap-1 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[10px] font-semibold rounded-full px-2.5 py-0.5"><XCircle size={10} /> Failed</span>;
      case 'pending':
        return <span className="flex items-center gap-1 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10px] font-semibold rounded-full px-2.5 py-0.5"><Clock size={10} /> Pending</span>;
      default:
        return null;
    }
  };

  const getLatestCheck = (checkType: string) => checks.find(c => c.check_type === checkType);

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-dash-textMuted" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Status overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold !text-dash-textMuted tracking-[1.5px]">KYC status</span>
            <div className="flex items-center gap-1">
              <a href={`/api/kyc/reports/download/${contact.id}`} target="_blank" rel="noopener noreferrer" className="!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface p-1.5 rounded-lg transition-all" title="Export FICA Audit PDF">
                <FileText className="h-3.5 w-3.5" />
              </a>
              <button onClick={handleRefresh} disabled={refreshing} className="!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface p-1.5 rounded-lg transition-all" title="Refresh">
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>
          <div className={cn('w-16 h-16 rounded-full border flex items-center justify-center mb-3', panelStatus.glowClass)}>
            {panelStatus.icon}
          </div>
          <h3 className="text-[14px] font-bold !text-dash-text">{panelStatus.label}</h3>
          {riskRating?.requires_edd && (
            <div className="w-full mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2 items-start text-left">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[9.5px] !text-dash-textMuted leading-tight">Corporate Beneficial Ownership validation pending.</span>
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white border border-dash-border rounded-2xl p-6 shadow-sm space-y-4">
          <span className="text-[10px] font-bold !text-dash-textMuted tracking-[1.5px]">Checkpoints</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-dash-border rounded-xl p-3 bg-dash-surface">
              <span className="text-[10px] !text-dash-textMuted block mb-1.5">POPIA consent</span>
              {consentRecord?.status === 'obtained' ? (
                <span className="text-[#10b981] font-bold flex items-center gap-1 text-[12px]"><Check className="h-3 w-3" /> Obtained</span>
              ) : consentRecord?.status === 'pending' ? (
                <span className="text-[#f59e0b] font-bold flex items-center gap-1 text-[12px] animate-pulse"><Clock className="h-3 w-3" /> Pending</span>
              ) : (
                <span className="!text-dash-textMuted font-bold text-[12px]">None</span>
              )}
            </div>
            <div className="border border-dash-border rounded-xl p-3 bg-dash-surface">
              <span className="text-[10px] !text-dash-textMuted block mb-1.5">Identity</span>
              {latestIdCheck?.status === 'passed' ? (
                <span className="text-[#10b981] font-bold flex items-center gap-1 text-[12px]"><Check className="h-3 w-3" /> Validated</span>
              ) : latestIdCheck?.status === 'failed' ? (
                <span className="text-[#ef4444] font-bold flex items-center gap-1 text-[12px]"><XCircle className="h-3 w-3" /> Failed</span>
              ) : (
                <span className="!text-dash-textMuted font-bold text-[12px]">Unrun</span>
              )}
            </div>
            <div className="border border-dash-border rounded-xl p-3 bg-dash-surface">
              <span className="text-[10px] !text-dash-textMuted block mb-1.5">AML screening</span>
              {latestAmlCheck?.status === 'passed' ? (
                <span className="text-[#10b981] font-bold flex items-center gap-1 text-[12px]"><Check className="h-3 w-3" /> Passed</span>
              ) : latestAmlCheck?.status === 'failed' ? (
                <span className="text-[#ef4444] font-bold flex items-center gap-1 text-[12px]"><XCircle className="h-3 w-3" /> Blocked</span>
              ) : (
                <span className="!text-dash-textMuted font-bold text-[12px]">Unrun</span>
              )}
            </div>
          </div>

          {/* ID number */}
          <div className="border border-dash-border rounded-xl p-3 bg-dash-surface">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] !text-dash-textMuted">Identity proof (SA ID number)</span>
              {!isEditingId && (
                <button onClick={() => setIsEditingId(true)} className="text-[9px] text-dash-accent font-bold hover:underline">
                  {contact.id_number ? 'Edit' : 'Add ID'}
                </button>
              )}
            </div>
            {isEditingId ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={idInput}
                  onChange={e => setIdInput(e.target.value)}
                  placeholder="South African ID Number"
                  className="flex-1 h-8 bg-white border border-dash-border text-[11px] px-2.5 rounded-lg outline-none focus:border-dash-accent/40 transition-all font-mono"
                />
                <button onClick={() => setIsEditingId(false)} className="h-8 px-3 border border-dash-border rounded-lg text-[10px] !text-dash-textMuted hover:!text-dash-text transition-all">Cancel</button>
                <button onClick={handleSaveId} disabled={runningAction === 'save_id'} className="h-8 px-3 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center">
                  {runningAction === 'save_id' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </button>
              </div>
            ) : (
              <div className="text-[12px] font-bold font-mono !text-dash-text">
                {contact.id_number || <span className="text-[#ef4444] text-[10px] font-normal italic">ID Missing! Add first</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POPIA consent */}
      <SectionCard
        title="POPIA consent"
        action={
          <DashButton variant="secondary" size="sm" onClick={() => setShowRequestModal(true)} disabled={contact.first_name === 'ANONYMIZED'}>
            <Signature size={12} />
            {consentRecord ? 'Re-request consent' : 'Request consent'}
          </DashButton>
        }
      >
        {consentRecord ? (
          <div className="flex items-center gap-4 text-[12px]">
            {consentRecord.status === 'obtained' ? (
              <DashStatusPill variant="success">Obtained</DashStatusPill>
            ) : consentRecord.status === 'pending' ? (
              <DashStatusPill variant="info" className="motion-safe:animate-pulse">Pending</DashStatusPill>
            ) : (
              <DashStatusPill variant="danger">{consentRecord.status}</DashStatusPill>
            )}
            {consentRecord.status === 'obtained' && (
              <span className="!text-dash-textMuted font-mono text-[11px]">
                Given {new Date(consentRecord.consent_given_at).toLocaleDateString()} · IP {consentRecord.ip_address || 'N/A'}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[12px] !text-dash-textMuted italic">No consent request has been sent yet.</p>
        )}
      </SectionCard>

      {/* Verification checks */}
      <SectionCard title="Verification checks">
        <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 flex gap-3 mb-4">
          <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] !text-dash-textMuted leading-relaxed">
            These bureau integrations (TransUnion, XDS, Refinitiv, Experian) are not yet connected to production credentials, so they're shown as
            <strong className="!text-dash-text"> coming soon</strong> rather than runnable — no simulated results are presented as real checks.
            Any results below are from prior test runs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {CHECK_TYPES.map(checkDef => {
            const existing = getLatestCheck(checkDef.type);
            return (
              <div key={checkDef.type} className="border border-dash-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${checkDef.color}1F` }}>
                      <span className="text-[10px] font-bold" style={{ color: checkDef.color }}>{checkDef.shortName}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold !text-dash-text">{checkDef.label}</span>
                        {checkDef.required && <span className="text-[9px] text-[#ef4444] font-bold tracking-wider">FICA Required</span>}
                      </div>
                      <p className="text-[11.5px] !text-dash-textMuted mt-0.5">{checkDef.description} — via {checkDef.provider}</p>
                      {existing && <p className="text-[10px] !text-dash-textMuted mt-0.5">Last run: {new Date(existing.created_at).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {existing && getStatusBadge(existing.status)}
                    <span className="bg-dash-border/40 border border-dash-border !text-dash-textMuted text-[10.5px] font-semibold rounded-lg px-3 py-1.5 cursor-not-allowed">
                      Coming soon
                    </span>
                    {existing && (
                      <button onClick={() => setExpandedCheck(expandedCheck === checkDef.type ? null : checkDef.type)} className="!text-dash-textMuted hover:!text-dash-text transition-colors">
                        {expandedCheck === checkDef.type ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {expandedCheck === checkDef.type && existing && (
                  <div className="mt-4 pt-4 border-t border-dash-border space-y-2 text-left">
                    {existing.notes && <p className="text-[11.5px] !text-dash-textMuted italic">{existing.notes}</p>}
                    {existing.id_valid !== undefined && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="!text-dash-textMuted">ID Valid:</span>
                        <span className={existing.id_valid ? 'text-[#10b981]' : 'text-[#ef4444]'}>{existing.id_valid ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {(existing.score || existing.credit_score) !== undefined && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="!text-dash-textMuted">Score:</span>
                        <span className="!text-dash-text font-semibold">{existing.score || existing.credit_score}</span>
                      </div>
                    )}
                    {existing.on_sanctions_list !== undefined && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="!text-dash-textMuted">On Sanctions List:</span>
                        <span className={existing.on_sanctions_list ? 'text-[#ef4444]' : 'text-[#10b981]'}>{existing.on_sanctions_list ? 'Yes — Flag for review' : 'No'}</span>
                      </div>
                    )}
                    {existing.aml_match_level && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="!text-dash-textMuted">Match Level:</span>
                        <span className="!text-dash-text">{existing.aml_match_level}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* FICA Document Vault */}
      <SectionCard
        title="FICA document vault"
        action={
          <button onClick={() => setShowUploadDrawer(!showUploadDrawer)} className="text-xs text-dash-accent font-bold hover:underline">
            {showUploadDrawer ? 'Cancel' : 'Upload'}
          </button>
        }
      >
        {showUploadDrawer && (
          <form onSubmit={handleUploadKycDoc} className="p-3 border border-dash-border rounded-xl bg-dash-surface space-y-3 mb-4">
            <div>
              <label className="text-[9px] !text-dash-textMuted font-bold tracking-wider block mb-1">Doc Type</label>
              <select value={selectedUploadDocType} onChange={e => setSelectedUploadDocType(e.target.value)} className="w-full h-8 bg-white border border-dash-border text-[11px] px-2.5 rounded-lg !text-dash-text outline-none focus:border-dash-accent/40">
                <option value="green_id">Green Barcoded ID</option>
                <option value="smart_id">Smart ID Card</option>
                <option value="passport">Passport</option>
                <option value="utility_bill">Proof of Address / Utility Bill</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] !text-dash-textMuted font-bold tracking-wider block mb-1">File</label>
              <input id="kyc-file-input" type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} accept=".pdf,.png,.jpg,.jpeg" className="w-full text-xs !text-dash-textMuted file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#3b82f6]/10 file:text-dash-accent file:cursor-pointer" />
            </div>
            <button type="submit" disabled={uploadingDoc || !uploadFile} className="w-full h-8 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1">
              {uploadingDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Upload className="h-3 w-3" /> Encrypt & Upload</>}
            </button>
          </form>
        )}

        {isAddressExpired && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2 text-[10.5px] text-[#ef4444] leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>FICA WARNING: Proof of Address is expired (&gt;3 months old). Request renewal.</span>
          </div>
        )}

        {kycDocs.length === 0 ? (
          <div className="py-4 text-center border border-dashed border-dash-border rounded-xl text-[10.5px] !text-dash-textMuted">No encrypted files vaulted.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {kycDocs.map(doc => {
              const docTypeLabel = doc.document_type === 'green_id' ? 'Green ID Book' : doc.document_type === 'smart_id' ? 'Smart ID Card' : doc.document_type === 'passport' ? 'Passport' : 'Utility Bill (PoA)';
              const docExpiry = doc.expiry_date ? new Date(doc.expiry_date) : null;
              const isDocExpired = docExpiry ? docExpiry.getTime() < Date.now() : false;
              return (
                <div key={doc.id} className="flex items-center justify-between p-2.5 border border-dash-border rounded-xl bg-dash-surface">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-dash-accent shrink-0" />
                    <div className="text-left leading-tight">
                      <span className="block text-[11px] font-bold !text-dash-text truncate max-w-[140px]">{docTypeLabel}</span>
                      <span className="text-[9px] !text-dash-textMuted font-mono block mt-0.5">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.document_type === 'utility_bill' && (
                      <span className={cn('text-[8.5px] font-bold px-1.5 py-0.5 rounded border tracking-wider', isDocExpired ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-green-500/15 text-[#10b981] border-green-500/20')}>
                        {isDocExpired ? 'Expired' : 'Active'}
                      </span>
                    )}
                    <a href={`/api/kyc/documents/download?id=${doc.id}`} className="!text-dash-textMuted hover:!text-dash-text p-1 rounded transition-colors" title="Decrypt & Download">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Beneficial ownership */}
      <SectionCard title="Beneficial ownership">
        <BeneficialOwnershipTab contact={contact} />
      </SectionCard>

      {/* Compliance audit history */}
      <SectionCard title="Compliance audit history">
        {checks.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-dash-border rounded-xl">
            <Shield className="h-6 w-6 !text-dash-textMuted mx-auto mb-2 opacity-30" />
            <span className="text-[11px] !text-dash-textMuted tracking-wider block">No runs recorded</span>
          </div>
        ) : (
          <div className="border border-dash-border rounded-xl divide-y divide-dash-border">
            {checks.map(check => (
              <div key={check.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium !text-dash-text">{CHECK_TYPES.find(c => c.type === check.check_type)?.label ?? check.check_type}</span>
                  <span className="text-[10px] !text-dash-textMuted">via {check.provider}</span>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(check.status)}
                  <span className="text-[10px] !text-dash-textMuted">{new Date(check.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Danger zone */}
      <div className="border border-red-500/20 bg-red-500/[0.03] rounded-2xl p-6">
        <h4 className="text-[13px] font-bold !text-dash-text mb-1">Danger zone</h4>
        <p className="text-[12px] !text-dash-textMuted mb-4 leading-relaxed max-w-lg">
          Permanently anonymize this contact's CRM record under a POPIA right-to-erasure request. This cancels running sequences, suppresses future
          outreach, and is irreversible.
        </p>
        <DashButton
          variant="ghost"
          size="sm"
          className="!text-red-600 !border-red-500/30 hover:!bg-red-500/10"
          onClick={handleErasure}
          disabled={erasing || contact.first_name === 'ANONYMIZED'}
        >
          {erasing ? (
            <><Loader2 size={12} className="animate-spin" /> Erasing…</>
          ) : contact.first_name === 'ANONYMIZED' ? (
            <><UserX size={12} /> POPIA erased</>
          ) : (
            <><UserX size={12} /> Right to erasure (POPIA)</>
          )}
        </DashButton>
      </div>

      <ErasureReceiptModal isOpen={showReceipt} onOpenChange={setShowReceipt} receipt={receipt} />

      {/* Consent dispatch modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-dash-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <div>
              <h3 className="text-[16px] font-bold !text-dash-text tracking-tight">Request explicit POPIA consent</h3>
              <p className="text-[12px] !text-dash-textMuted mt-1 leading-relaxed">
                Generate a secure, tracked link for <strong className="!text-dash-text">{contact.first_name} {contact.last_name || ''}</strong> to sign under South African POPIA regulations.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold !text-dash-textMuted">Dispatch channel</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'sms', label: 'SMS', icon: MessageSquare },
                ].map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setDispatchChannel(ch.id as any)}
                    className={cn(
                      'h-10 rounded-xl border flex flex-col items-center justify-center text-[11px] font-bold transition-colors',
                      dispatchChannel === ch.id ? 'bg-purple-600/10 border-purple-500 text-purple-600' : 'bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text'
                    )}
                  >
                    <ch.icon size={13} className="mb-0.5" />
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold !text-dash-textMuted">Verifications scope</label>
              <div className="space-y-1.5">
                {[
                  { id: 'hanis_identity', label: 'ID / HANIS verification' },
                  { id: 'credit_report', label: 'Credit report verification' },
                  { id: 'sanctions_screen', label: 'Sanctions screening (AML)' },
                  { id: 'pep_check', label: 'Politically exposed person (PEP)' },
                  { id: 'address_verification', label: 'Address verification' },
                ].map(chk => {
                  const active = selectedChecks.includes(chk.id);
                  return (
                    <button
                      key={chk.id}
                      type="button"
                      onClick={() => setSelectedChecks(active ? selectedChecks.filter(c => c !== chk.id) : [...selectedChecks, chk.id])}
                      className={cn(
                        'w-full h-9 px-4 rounded-xl border flex items-center justify-between text-[11.5px] font-semibold transition-colors',
                        active ? 'bg-purple-600/5 border-purple-500/20 !text-dash-text' : 'bg-white border-dash-border !text-dash-textMuted hover:!text-dash-text'
                      )}
                    >
                      <span>{chk.label}</span>
                      {active ? <CheckCircle2 size={12} className="text-purple-600" /> : <Circle size={12} className="text-dash-border" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <DashButton variant="secondary" size="default" className="flex-1" onClick={() => setShowRequestModal(false)}>Cancel</DashButton>
              <DashButton
                variant="primary"
                size="default"
                className="flex-1 bg-purple-600 hover:bg-purple-500 shadow-none hover:translate-y-0"
                onClick={handleSendRequest}
                disabled={selectedChecks.length === 0 || runningAction === 'consent'}
              >
                {runningAction === 'consent' ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} /> Dispatch request</>}
              </DashButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

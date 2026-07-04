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
  Phone,
  MessageSquare,
  UserCheck,
  Send,
  Loader2,
  Lock,
  Plus,
  Check,
  FileText,
  Upload,
  Download,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Contact } from '@/types/crm';
import { toast } from 'sonner';

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
}

interface KYCDocument {
  id: string;
  document_type: string;
  file_url: string;
  expiry_date?: string;
  retention_delete_after: string;
  created_at: string;
}

interface KycStatusPanelProps {
  contact: Contact;
}

export function KycStatusPanel({ contact: initialContact }: KycStatusPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Local state for contact details to update UI immediately
  const [contact, setContact] = useState<Contact>(initialContact);
  const [checks, setChecks] = useState<KYCCheck[]>([]);
  const [kycDocs, setKycDocs] = useState<KYCDocument[]>([]);
  const [consentRecord, setConsentRecord] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [riskRating, setRiskRating] = useState<any>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [consentTicked, setConsentTicked] = useState(false);
  
  // Consent Request form states
  const [showConsentQuickDispatch, setShowConsentQuickDispatch] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<'email' | 'whatsapp' | 'sms'>('email');
  const [selectedConsentChecks, setSelectedConsentChecks] = useState<string[]>([
    'hanis_identity',
    'sanctions_screen',
  ]);

  // ID inline edit state
  const [isEditingId, setIsEditingId] = useState(false);
  const [idInput, setIdInput] = useState(contact.id_number || '');

  // KYC Document Uploader states
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [selectedUploadDocType, setSelectedUploadDocType] = useState<string>('green_id');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Fetch all KYC checks, consent record, and documents
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch contact record directly to sync FICA states
      const { data: updatedContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact.id)
        .single();

      if (updatedContact) {
        setContact(updatedContact);
        setIdInput(updatedContact.id_number || '');
      }

      // 2. Fetch checks and consent logs from API
      const res = await fetch(`/api/crm/contacts/kyc?contactId=${contact.id}`);
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
      }

      // 3. Fetch latest consent configuration/record
      const { data: consent } = await supabase
        .from('kyc_consent')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setConsentRecord(consent);

      // 4. Fetch encrypted FICA documents from database
      const { data: docs } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });

      setKycDocs(docs || []);

      // 5. Fetch centralized KYC risk rating record
      const { data: rating } = await supabase
        .from('kyc_risk_ratings')
        .select('*')
        .eq('contact_id', contact.id)
        .maybeSingle();

      setRiskRating(rating || null);
    } catch (err) {
      console.error('Error fetching KYC details:', err);
    }
  }, [contact.id, supabase]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));

    // Get currently authenticated operator
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });
  }, [contact.id, supabase, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('KYC records refreshed');
  };

  // Inline ID Save
  const handleSaveId = async () => {
    if (!idInput.trim()) {
      toast.error('Please enter a valid ID number');
      return;
    }
    setRunningAction('save_id');
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ 
          id_number: idInput.trim(), 
          updated_at: new Date().toISOString() 
        })
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

  // Dispatch POPIA Consent request
  const handleDispatchConsent = async () => {
    setRunningAction('consent');
    try {
      const res = await fetch('/api/kyc/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          workspaceId: contact.workspace_id,
          checkTypes: selectedConsentChecks,
          channel: dispatchChannel
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send request');

      toast.success(`Consent request successfully sent via ${dispatchChannel.toUpperCase()}!`);
      setShowConsentQuickDispatch(false);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send consent request.');
    } finally {
      setRunningAction(null);
    }
  };

  // Upload FICA Document
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
      const res = await fetch('/api/kyc/documents/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      toast.success(`Vault uploaded & encrypted document successfully.`);
      setUploadFile(null);
      // Reset HTML file input element
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

  // Trigger Identity Check or AML Scan
  const handleRunCheck = async (checkType: 'hanis_identity' | 'sanctions_screen') => {
    if (!consentTicked) {
      toast.error('You must tick the POPIA Consent verification box.');
      return;
    }
    
    setRunningAction(checkType);
    try {
      const res = await fetch('/api/crm/contacts/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          workspaceId: contact.workspace_id,
          checkType,
          provider: checkType === 'hanis_identity' ? 'TransUnion' : 'Refinitiv',
          consentGiven: true,
          checkedBy: currentUser?.email || 'CRM Portal User'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');

      toast.success(`${checkType === 'hanis_identity' ? 'Identity verification' : 'AML Sanctions screening'} completed successfully.`);
      setConsentTicked(false);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Verification execution halted.');
    } finally {
      setRunningAction(null);
    }
  };

  // Calculate overall KYC Status & Theme values
  const latestAmlCheck = useMemo(() => checks.find(c => c.check_type === 'sanctions_screen'), [checks]);
  const latestIdCheck = useMemo(() => checks.find(c => c.check_type === 'hanis_identity'), [checks]);

  const isAmlExpired = useMemo(() => {
    if (!latestAmlCheck) return false;
    const lastRun = new Date(latestAmlCheck.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastRun.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  }, [latestAmlCheck]);

  // Check if utility bill (Proof of Address) is expired (> 3 months old)
  const isAddressExpired = useMemo(() => {
    const utilityBill = kycDocs.find(d => d.document_type === 'utility_bill');
    if (!utilityBill) return false;
    // Database trigger computes expiry_date precisely as created_at + 3 months
    if (utilityBill.expiry_date) {
      return new Date(utilityBill.expiry_date).getTime() < Date.now();
    }
    // Fallback age verification calculation
    const lastRun = new Date(utilityBill.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastRun.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 90; // older than 3 months (90 days)
  }, [kycDocs]);

  const panelStatus = useMemo(() => {
    // 0. Centralized automated risk ratings check (Sprint 10 priority)
    if (riskRating) {
      if (riskRating.overall_rating === 'red') {
        return {
          state: 'red',
          label: 'HIGH RISK LOCK',
          color: '#ef4444',
          glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.25)] border-[#ef4444]/30 bg-[#ef4444]/10',
          icon: <AlertTriangle className="h-10 w-10 text-[#ef4444]" />
        };
      }
      if (riskRating.overall_rating === 'amber') {
        return {
          state: 'orange',
          label: 'ACTION REQUIRED',
          color: '#f59e0b',
          glowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.25)] border-[#f59e0b]/30 bg-[#f59e0b]/10',
          icon: <Clock className="h-10 w-10 text-[#f59e0b]" />
        };
      }
      if (riskRating.overall_rating === 'green') {
        return {
          state: 'green',
          label: 'FICA VERIFIED',
          color: '#10b981',
          glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.25)] border-[#10b981]/30 bg-[#10b981]/10',
          icon: <CheckCircle className="h-10 w-10 text-[#10b981]" />
        };
      }
      if (riskRating.overall_rating === 'grey') {
        return {
          state: 'grey',
          label: 'UNVERIFIED',
          color: '#4a5a82',
          glowClass: 'shadow-[0_0_15px_rgba(74,90,130,0.15)] border-white/5 bg-white/[0.02]',
          icon: <Shield className="h-10 w-10 text-[#4a5a82]" />
        };
      }
    }

    // 1. Red (High Risk)
    if (
      contact.kyc_risk_flag === 'HIGH' || 
      latestIdCheck?.fraud_indicator || 
      latestIdCheck?.alive_status === 'DECEASED' ||
      latestAmlCheck?.aml_match_level === 'STRONG_MATCH'
    ) {
      return {
        state: 'red',
        label: 'HIGH RISK LOCK',
        color: '#ef4444',
        glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.25)] border-[#ef4444]/30 bg-[#ef4444]/10',
        icon: <AlertTriangle className="h-10 w-10 text-[#ef4444]" />
      };
    }

    // 2. Green (Verified)
    if (contact.kyc_id_verified && !isAddressExpired) {
      return {
        state: 'green',
        label: 'FICA VERIFIED',
        color: '#10b981',
        glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.25)] border-[#10b981]/30 bg-[#10b981]/10',
        icon: <CheckCircle className="h-10 w-10 text-[#10b981]" />
      };
    }

    // 3. Orange (Expired or Action Needed)
    if (
      isAmlExpired || 
      isAddressExpired ||
      latestIdCheck?.status === 'pending' || 
      latestAmlCheck?.status === 'pending' || 
      latestAmlCheck?.status === 'manual_review' ||
      consentRecord?.status === 'pending' ||
      (consentRecord?.status === 'obtained' && !latestIdCheck)
    ) {
      return {
        state: 'orange',
        label: 'ACTION REQUIRED',
        color: '#f59e0b',
        glowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.25)] border-[#f59e0b]/30 bg-[#f59e0b]/10',
        icon: <Clock className="h-10 w-10 text-[#f59e0b]" />
      };
    }

    // 4. Grey (Unverified / No checks run)
    return {
      state: 'grey',
      label: 'UNVERIFIED',
      color: '#4a5a82',
      glowClass: 'shadow-[0_0_15px_rgba(74,90,130,0.15)] border-white/5 bg-white/[0.02]',
      icon: <Shield className="h-10 w-10 text-[#4a5a82]" />
    };
  }, [contact, latestIdCheck, latestAmlCheck, isAmlExpired, isAddressExpired, consentRecord, riskRating]);

  return (
    <div className="w-full lg:w-[320px] shrink-0 space-y-6">
      {/* Unified Status Header Panel */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Panel Header */}
        <div className="w-full flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">KYC Status Board</span>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`/api/kyc/reports/download/${contact.id}`}
              className="text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 p-1.5 rounded-lg transition-all"
              title="Export FICA Audit PDF"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="h-3.5 w-3.5" />
            </a>
            <button 
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 p-1.5 rounded-lg transition-all"
              title="Refresh Status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Glow Badge Ring */}
        <div className={`w-20 h-20 rounded-full border flex items-center justify-center mb-4 transition-all duration-500 relative z-10 ${panelStatus.glowClass}`}>
          {panelStatus.icon}
        </div>

        <h3 className="text-[16px] font-bold uppercase tracking-widest text-[#eef2ff] font-space-grotesk">
          {panelStatus.label}
        </h3>
        
        {/* Explanatory subtitle */}
        <p className="text-[11px] text-[#4a5a82] font-dm-sans mt-2 max-w-[200px] leading-relaxed">
          {panelStatus.state === 'green' && `FICA checks completed successfully on ${contact.kyc_id_verified_at ? new Date(contact.kyc_id_verified_at).toLocaleDateString() : 'N/A'}.`}
          {panelStatus.state === 'red' && 'Account compliance lockout triggered. Deal progress suspended.'}
          {panelStatus.state === 'orange' && (
            isAddressExpired 
              ? 'Utility bill Proof of Address has expired (>3 months old).' 
              : isAmlExpired 
              ? 'Compliance period expired (30d limit exceeded).' 
              : 'Initial consent acquired. Run HANIS verification to unlock.'
          )}
          {panelStatus.state === 'grey' && 'No identity verifications have been initialized yet.'}
        </p>

        {/* EDD Required Alert */}
        {riskRating?.requires_edd && (
          <div className="w-full mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2 items-start text-left shadow-lg">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">EDD REQUIRED</span>
              <p className="text-[9.5px] text-[#94a3c8] leading-tight font-dm-sans">
                Corporate Beneficial Ownership validation pending.
              </p>
            </div>
          </div>
        )}
 
        {/* Mini Checkpoints Checklist */}
        <div className="w-full mt-6 space-y-3 text-left border-t border-white/5 pt-5 relative z-10">
          {/* 1. Consent Checkpoint */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#94a3c8] font-dm-sans">POPIA Consent</span>
            {consentRecord?.status === 'obtained' ? (
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Obtained
              </span>
            ) : consentRecord?.status === 'pending' ? (
              <span className="text-[#f59e0b] font-bold flex items-center gap-1 animate-pulse">
                <Clock className="h-3 w-3" /> Pending
              </span>
            ) : (
              <span className="text-[#4a5a82] font-bold">None</span>
            )}
          </div>

          {/* 2. ID Checkpoint */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#94a3c8] font-dm-sans">Identity (HANIS)</span>
            {latestIdCheck?.status === 'passed' ? (
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Validated
              </span>
            ) : latestIdCheck?.status === 'failed' ? (
              <span className="text-[#ef4444] font-bold flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </span>
            ) : latestIdCheck?.status === 'pending' || latestIdCheck?.status === 'running' ? (
              <span className="text-[#f59e0b] font-bold flex items-center gap-1">
                Running...
              </span>
            ) : (
              <span className="text-[#4a5a82] font-bold">Unrun</span>
            )}
          </div>

          {/* 3. Sanctions / AML Checkpoint */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#94a3c8] font-dm-sans">AML screening</span>
            {latestAmlCheck?.status === 'passed' ? (
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Passed
              </span>
            ) : latestAmlCheck?.status === 'failed' ? (
              <span className="text-[#ef4444] font-bold flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Blocked
              </span>
            ) : latestAmlCheck?.status === 'manual_review' ? (
              <span className="text-[#f59e0b] font-bold flex items-center gap-1">
                Review Required
              </span>
            ) : (
              <span className="text-[#4a5a82] font-bold">Unrun</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Triggers Panel */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl space-y-4">
        <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">KYC Control Deck</h4>

        {/* ID Number Section */}
        <div className="border border-white/5 rounded-xl p-3 bg-white/[0.01]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#4a5a82] font-dm-sans uppercase">Identity Proof</span>
            {!isEditingId && (
              <button 
                onClick={() => setIsEditingId(true)}
                className="text-[9px] text-[#3b82f6] font-bold hover:underline"
              >
                {contact.id_number ? 'Edit ID' : 'Add ID'}
              </button>
            )}
          </div>

          {isEditingId ? (
            <div className="space-y-2 mt-2">
              <input
                type="text"
                value={idInput}
                onChange={e => setIdInput(e.target.value)}
                placeholder="South African ID Number"
                className="w-full h-8 bg-white/[0.03] border border-white/5 text-[11px] px-2.5 rounded-lg outline-none focus:border-[#3b82f6]/40 transition-all font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingId(false)}
                  className="flex-1 h-7 border border-white/5 rounded-lg text-[10px] text-[#4a5a82] hover:text-[#eef2ff] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveId}
                  disabled={runningAction === 'save_id'}
                  className="flex-1 h-7 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center"
                >
                  {runningAction === 'save_id' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[12px] font-bold font-mono text-[#eef2ff]">
              {contact.id_number ? contact.id_number : (
                <span className="text-[#ef4444] text-[10px] font-normal italic uppercase">ID Missing! Add first</span>
              )}
            </div>
          )}
        </div>

        {/* Verification Trigger Actions */}
        <div className="space-y-2.5">
          {/* Action 1: Dispatch POPIA Consent */}
          <div className="border border-white/5 rounded-xl overflow-hidden transition-all bg-white/[0.01]">
            <button
              onClick={() => setShowConsentQuickDispatch(!showConsentQuickDispatch)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Signature className="h-4 w-4 text-purple-400" />
                <div className="text-left">
                  <span className="block text-[11.5px] font-bold text-[#eef2ff] font-dm-sans">POPIA Consent</span>
                  <span className="block text-[9px] text-[#4a5a82] font-dm-sans mt-0.5">Send validation request to client</span>
                </div>
              </div>
              <Plus className={`h-4 w-4 text-[#4a5a82] transition-transform ${showConsentQuickDispatch ? 'rotate-45 text-purple-400' : ''}`} />
            </button>

            {showConsentQuickDispatch && (
              <div className="p-4 border-t border-white/5 space-y-4 bg-[#0a1230]">
                {/* Channels selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#4a5a82] uppercase font-bold tracking-wider">Channel</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'email', icon: <Mail className="h-3 w-3" />, label: 'Email' },
                      { id: 'whatsapp', icon: <MessageSquare className="h-3 w-3" />, label: 'WA' },
                      { id: 'sms', icon: <Phone className="h-3 w-3 text-[10px]" />, label: 'SMS' }
                    ].map(ch => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setDispatchChannel(ch.id as any)}
                        className={`h-8 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                          dispatchChannel === ch.id
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            : 'bg-white/[0.01] border-white/5 text-[#4a5a82] hover:text-[#94a3c8]'
                        }`}
                      >
                        {ch.icon}
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scopes checklist */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#4a5a82] uppercase font-bold tracking-wider">Scope</label>
                  <div className="space-y-1">
                    {[
                      { id: 'hanis_identity', label: 'ID / HANIS Check' },
                      { id: 'credit_report', label: 'Credit Report' },
                      { id: 'sanctions_screen', label: 'Sanctions (AML)' }
                    ].map(chk => {
                      const active = selectedConsentChecks.includes(chk.id);
                      return (
                        <button
                          key={chk.id}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setSelectedConsentChecks(selectedConsentChecks.filter(c => c !== chk.id));
                            } else {
                              setSelectedConsentChecks([...selectedConsentChecks, chk.id]);
                            }
                          }}
                          className={`w-full h-7 px-2.5 rounded-lg border flex items-center justify-between text-[10.5px] transition-all ${
                            active
                              ? 'bg-purple-500/5 border-purple-500/15 text-[#eef2ff]'
                              : 'bg-white/[0.01] border-white/5 text-[#4a5a82]'
                          }`}
                        >
                          <span>{chk.label}</span>
                          <Check className={`h-3 w-3 transition-opacity ${active ? 'opacity-100 text-purple-400' : 'opacity-10'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={handleDispatchConsent}
                  disabled={runningAction === 'consent' || selectedConsentChecks.length === 0}
                  className="w-full h-8 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20"
                >
                  {runningAction === 'consent' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Dispatch Consent
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Compliance Consent Confirmation Tickbox for real-time checks */}
          <div className="p-3 border border-[#f59e0b]/15 bg-[#f59e0b]/5 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentTicked}
                onChange={e => setConsentTicked(e.target.checked)}
                className="mt-0.5 accent-[#2563eb] rounded h-3.5 w-3.5 border-white/10"
              />
              <span className="text-[10px] text-[#94a3c8] leading-relaxed font-dm-sans">
                I confirm client has explicitly consented to identity & sanctions verification under POPIA.
              </span>
            </label>
          </div>

          {/* Action 2: Verify Identity */}
          <button
            onClick={() => handleRunCheck('hanis_identity')}
            disabled={
              runningAction !== null || 
              !contact.id_number || 
              !consentTicked || 
              contact.first_name === 'ANONYMIZED'
            }
            className="w-full h-10 bg-[#2563eb] hover:bg-[#2563eb]/95 disabled:bg-white/5 disabled:text-[#4a5a82] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#2563eb]/10"
          >
            {runningAction === 'hanis_identity' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Verify Identity (HANIS)
              </>
            )}
          </button>

          {/* Action 3: Screen AML */}
          <button
            onClick={() => handleRunCheck('sanctions_screen')}
            disabled={
              runningAction !== null || 
              !consentTicked || 
              contact.first_name === 'ANONYMIZED'
            }
            className="w-full h-10 bg-red-600 hover:bg-red-500 disabled:bg-white/5 disabled:text-[#4a5a82] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-500/10"
          >
            {runningAction === 'sanctions_screen' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Trigger AML Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secure FICA Document Vault Drawer */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">FICA Document Vault</h4>
          <button 
            onClick={() => setShowUploadDrawer(!showUploadDrawer)}
            className="text-xs text-[#3b82f6] font-bold hover:underline flex items-center gap-0.5"
          >
            {showUploadDrawer ? 'Cancel' : 'Upload'}
          </button>
        </div>

        {/* Upload Form inside Drawer */}
        {showUploadDrawer && (
          <form onSubmit={handleUploadKycDoc} className="p-3 border border-white/5 rounded-xl bg-white/[0.01] space-y-3 animate-in fade-in slide-in-from-top-1.5">
            <div>
              <label className="text-[9px] text-[#4a5a82] uppercase font-bold tracking-wider block mb-1">Doc Type</label>
              <select
                value={selectedUploadDocType}
                onChange={e => setSelectedUploadDocType(e.target.value)}
                className="w-full h-8 bg-[#04091a] border border-white/5 text-[11px] px-2.5 rounded-lg text-white font-dm-sans outline-none focus:border-[#3b82f6]/40"
              >
                <option value="green_id">Green Barcoded ID</option>
                <option value="smart_id">Smart ID Card</option>
                <option value="passport">Passport</option>
                <option value="utility_bill">Proof of Address / Utility Bill</option>
              </select>
            </div>
            
            <div>
              <label className="text-[9px] text-[#4a5a82] uppercase font-bold tracking-wider block mb-1">File</label>
              <input
                id="kyc-file-input"
                type="file"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                accept=".pdf,.png,.jpg,.jpeg"
                className="w-full text-xs text-[#4a5a82] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#3b82f6]/10 file:text-[#3b82f6] file:cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={uploadingDoc || !uploadFile}
              className="w-full h-8 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1"
            >
              {uploadingDoc ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Upload className="h-3 w-3" />
                  Encrypt & Upload
                </>
              )}
            </button>
          </form>
        )}

        {/* Warning banner for address expiry */}
        {isAddressExpired && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2 text-[10.5px] text-[#ef4444] leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />
            <span>FICA WARNING: Proof of Address is expired (&gt;3 months old). Request renewal.</span>
          </div>
        )}

        {/* Document List */}
        {kycDocs.length === 0 ? (
          <div className="py-4 text-center border border-dashed border-white/5 rounded-xl text-[10.5px] text-[#4a5a82]">
            No encrypted files vaulted.
          </div>
        ) : (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 common-scrollbar">
            {kycDocs.map(doc => {
              const docTypeLabel = 
                doc.document_type === 'green_id' ? 'Green ID Book' :
                doc.document_type === 'smart_id' ? 'Smart ID Card' :
                doc.document_type === 'passport' ? 'Passport' : 'Utility Bill (PoA)';
              
              const docExpiry = doc.expiry_date ? new Date(doc.expiry_date) : null;
              const isDocExpired = docExpiry ? docExpiry.getTime() < Date.now() : false;

              return (
                <div key={doc.id} className="flex items-center justify-between p-2.5 border border-white/5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-[#3b82f6] shrink-0" />
                    <div className="text-left leading-tight">
                      <span className="block text-[11px] font-bold text-[#eef2ff] font-dm-sans truncate max-w-[140px]">{docTypeLabel}</span>
                      <span className="text-[9px] text-[#4a5a82] font-mono block mt-0.5">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {doc.document_type === 'utility_bill' && (
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        isDocExpired ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-green-500/15 text-[#10b981] border-green-500/20'
                      }`}>
                        {isDocExpired ? 'Expired' : 'Active'}
                      </span>
                    )}
                    
                    <a
                      href={`/api/kyc/documents/download?id=${doc.id}`}
                      className="text-[#4a5a82] hover:text-[#eef2ff] p-1 rounded transition-colors"
                      title="Decrypt & Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chronological Expandable Audit History Timeline */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl flex flex-col">
        <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans mb-5">Compliance Audit History</h4>
        
        {checks.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-white/5 rounded-xl">
            <Shield className="h-6 w-6 text-[#4a5a82] mx-auto mb-2 opacity-30" />
            <span className="text-[11px] text-[#4a5a82] uppercase tracking-wider block">No runs recorded</span>
          </div>
        ) : (
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 common-scrollbar">
            {checks.map((check, index) => {
              const isExpanded = expandedCheckId === check.id;
              
              // Resolve label & colors
              let typeLabel = 'Consent Log';
              let typeColor = 'text-purple-400 border-purple-500/20 bg-purple-500/5';
              if (check.check_type === 'hanis_identity') {
                typeLabel = 'ID Check';
                typeColor = 'text-[#3b82f6] border-[#3b82f6]/20 bg-[#3b82f6]/5';
              } else if (check.check_type === 'sanctions_screen') {
                typeLabel = 'AML Scan';
                typeColor = 'text-red-400 border-red-500/20 bg-red-500/5';
              }

              return (
                <div key={check.id} className="relative pl-5 border-l border-white/5">
                  {/* Timeline bullet dot */}
                  <div className={`absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full border ${
                    check.status === 'passed' ? 'bg-[#10b981] border-[#10b981]' : 
                    check.status === 'failed' ? 'bg-[#ef4444] border-[#ef4444]' : 'bg-[#f59e0b] border-[#f59e0b]'
                  }`} />

                  {/* Header Row */}
                  <div 
                    onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
                    className="flex flex-col cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wide font-dm-sans ${typeColor}`}>
                        {typeLabel}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <span className={`text-[9.5px] font-black uppercase tracking-tighter ${
                          check.status === 'passed' ? 'text-[#10b981]' :
                          check.status === 'failed' ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                        }`}>
                          {check.status === 'passed' ? 'Passed' : 
                           check.status === 'failed' ? 'Failed' : check.status}
                        </span>
                        {isExpanded ? <ChevronUp className="h-3 w-3 text-[#4a5a82]" /> : <ChevronDown className="h-3 w-3 text-[#4a5a82]" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-[#4a5a82] font-dm-sans">
                        by {check.checked_by ? check.checked_by.split('@')[0] : 'System'}
                      </span>
                      <span className="text-[10px] text-[#4a5a82] font-mono">
                        {new Date(check.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detail Box */}
                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-lg border border-white/5 bg-[#0a1230] text-[11px] text-[#94a3c8] space-y-2 animate-in fade-in slide-in-from-top-1">
                      {check.notes && <p className="font-dm-sans leading-relaxed text-white/70 italic">"{check.notes}"</p>}
                      
                      <div className="space-y-1.5 font-mono text-[10px] border-t border-white/5 pt-2">
                        <div><span className="text-[#4a5a82]">Provider:</span> <span className="text-[#eef2ff]">{check.provider}</span></div>
                        
                        {/* ID Verification specific fields */}
                        {check.check_type === 'hanis_identity' && (
                          <>
                            <div>
                              <span className="text-[#4a5a82]">ID Valid:</span>{' '}
                              <span className={check.id_valid ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                                {check.id_valid ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#4a5a82]">Name Match:</span>{' '}
                              <span className={check.name_match ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                                {check.name_match ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#4a5a82]">Alive Status:</span>{' '}
                              <span className={check.alive_status === 'ALIVE' ? 'text-[#10b981]' : 'text-[#ef4444] font-bold'}>
                                {check.alive_status || 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#4a5a82]">Fraud Flag:</span>{' '}
                              <span className={check.fraud_indicator ? 'text-[#ef4444] font-bold animate-pulse' : 'text-[#10b981]'}>
                                {check.fraud_indicator ? 'YES' : 'No'}
                              </span>
                            </div>
                          </>
                        )}

                        {/* AML Screening specific fields */}
                        {check.check_type === 'sanctions_screen' && (
                          <>
                            <div>
                              <span className="text-[#4a5a82]">Match Level:</span>{' '}
                              <span className={
                                check.aml_match_level === 'STRONG_MATCH' ? 'text-[#ef4444] font-bold' : 
                                check.aml_match_level === 'MEDIUM_MATCH' ? 'text-[#f59e0b]' : 'text-[#10b981]'
                              }>
                                {check.aml_match_level || 'NO_MATCH'}
                              </span>
                            </div>
                            {check.aml_match_details && check.aml_match_details.matchedProfiles && check.aml_match_details.matchedProfiles.length > 0 && (
                              <div className="border-t border-white/5 mt-1 pt-1.5 space-y-1">
                                <span className="text-[#4a5a82] block text-[9.5px]">Matches:</span>
                                {check.aml_match_details.matchedProfiles.slice(0, 2).map((prof: any, i: number) => (
                                  <div key={i} className="bg-black/20 p-1.5 rounded text-[9.5px] border border-white/[0.02] text-white/50">
                                    <span className="font-bold text-[#eef2ff] block truncate">{prof.name || 'Sanction Name'}</span>
                                    <span className="text-red-400/80 block text-[8px] uppercase tracking-wide mt-0.5">{prof.category || 'List Match'} (Conf: {prof.confidence}%)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="text-[9px] text-[#4a5a82] pt-1.5 border-t border-white/5">
                          ID: {check.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

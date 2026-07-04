'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users, 
  Network, 
  ShieldAlert, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Upload, 
  X,
  Building,
  ArrowRight,
  GitBranch,
  ShieldAlert as ShieldIcon
} from 'lucide-react';
import { 
  searchCIPC, 
  getBeneficialOwners, 
  linkCIPCDirectors, 
  addBeneficialOwner, 
  deleteBeneficialOwner, 
  updateEddStatus,
  uploadBeneficialOwnershipForm
} from '@/app/actions/cipcLookup';
import { getWorkspaceContacts } from '@/app/actions/propertyDeals';
import { toast } from 'sonner';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

interface BeneficialOwner {
  id: string;
  relationship_type: 'shareholder' | 'director' | 'trustee' | 'other';
  share_percentage: number;
  is_active: boolean;
  owner_contact: Contact & {
    kyc_risk_ratings?: {
      overall_rating: 'green' | 'amber' | 'red' | 'grey';
      fica_complete: boolean;
    };
  };
}

interface BeneficialOwnershipTabProps {
  contact: Contact;
}

export function BeneficialOwnershipTab({ contact }: BeneficialOwnershipTabProps) {
  const [owners, setOwners] = useState<BeneficialOwner[]>([]);
  const [requiresEdd, setRequiresEdd] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search CIPC states
  const [cipcQuery, setCipcQuery] = useState('');
  const [cipcResults, setCipcResults] = useState<any[]>([]);
  const [isSearchingCipc, setIsSearchingCipc] = useState(false);

  // Manual Link states
  const [workspaceContacts, setWorkspaceContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [relationshipType, setRelationshipType] = useState<'shareholder' | 'director' | 'trustee' | 'other'>('shareholder');
  const [sharePercentage, setSharePercentage] = useState<number>(0);
  const [isLinkingOwner, setIsLinkingOwner] = useState(false);

  // Upload states
  const [uploadFilename, setUploadFilename] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Load B2B data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ownerRes, contacts] = await Promise.all([
        getBeneficialOwners(contact.id),
        getWorkspaceContacts()
      ]);

      if (ownerRes.success) {
        setOwners(ownerRes.data || []);
        setRequiresEdd(ownerRes.requiresEdd || false);
        setDocuments(ownerRes.documents || []);
      } else {
        toast.error(ownerRes.error || 'Failed to load beneficial owners');
      }
      setWorkspaceContacts(contacts || []);
    } catch {
      toast.error('Error loading tab information');
    } finally {
      setLoading(false);
    }
  }, [contact.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CIPC Search trigger
  const handleCipcSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cipcQuery.trim()) return;

    setIsSearchingCipc(true);
    try {
      const res = await searchCIPC(cipcQuery);
      if (res.success && res.data) {
        setCipcResults(res.data);
        if (res.data.length === 0) {
          toast.info('No South African company matches found in CIPC registry');
        }
      } else {
        toast.error(res.error || 'CIPC lookup failed');
      }
    } catch {
      toast.error('CIPC search failed');
    } finally {
      setIsSearchingCipc(false);
    }
  };

  // Link CIPC Directors automatically
  const handleLinkCipc = async (comp: any) => {
    try {
      const res = await linkCIPCDirectors(contact.id, comp.companyName, comp.directors);
      if (res.success) {
        toast.success(`CIPC registry linked: ${comp.directors.length} directors linked and KYC tasks spawned!`);
        setCipcResults([]);
        setCipcQuery('');
        await loadData();
      } else {
        toast.error(res.error || 'Failed to link CIPC directors');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error linking CIPC records');
    }
  };

  // Manual ownership linkage
  const handleAddManualOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      toast.error('Please select an individual contact');
      return;
    }

    setIsLinkingOwner(true);
    try {
      const res = await addBeneficialOwner(
        contact.id,
        selectedContactId,
        relationshipType,
        sharePercentage
      );
      if (res.success) {
        toast.success('Beneficial owner linked successfully');
        setSelectedContactId('');
        setSharePercentage(0);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to link beneficial owner');
      }
    } catch {
      toast.error('Error linking owner');
    } finally {
      setIsLinkingOwner(false);
    }
  };

  // Remove owner linkage
  const handleDeleteOwner = async (id: string) => {
    try {
      const res = await deleteBeneficialOwner(id, contact.id);
      if (res.success) {
        toast.success('Linkage removed successfully');
        await loadData();
      } else {
        toast.error(res.error || 'Failed to remove link');
      }
    } catch {
      toast.error('Error removing link');
    }
  };

  // Manual toggle of EDD Status
  const handleToggleEdd = async () => {
    try {
      const res = await updateEddStatus(contact.id, !requiresEdd);
      if (res.success) {
        toast.success(`EDD requirement ${!requiresEdd ? 'enabled' : 'disabled'}`);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to update EDD status');
      }
    } catch {
      toast.error('Error updating EDD status');
    }
  };

  // Simulate document uploader
  const handleUploadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFilename) {
      toast.error('Please enter a filename to simulate upload');
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadBeneficialOwnershipForm(contact.id, uploadFilename);
      if (res.success) {
        toast.success('Beneficial ownership declaration form uploaded to vault!');
        setUploadFilename('');
        await loadData();
      } else {
        toast.error(res.error || 'Failed to upload document');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-[#4a5a82]">Loading corporate directories and ownership structures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#eef2ff]">
      
      {/* EDD ALERTS STATUS BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        <div className="md:col-span-2">
          {requiresEdd ? (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
              <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-amber-500 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-space-grotesk uppercase tracking-wider text-amber-400">
                  Enhanced Due Diligence (EDD) Required
                </h4>
                <p className="text-[11px] font-dm-sans text-[#94a3c8] leading-relaxed">
                  Enhanced compliance rules are flagged for this corporate entity. Ensure all linked directors' FICA verification sub-tasks are complete and the official Beneficial Ownership declaration form is uploaded.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex gap-4 items-start shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-500 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-space-grotesk uppercase tracking-wider text-emerald-400">
                  Standard Compliance Status
                </h4>
                <p className="text-[11px] font-dm-sans text-[#94a3c8] leading-relaxed">
                  Standard verification checks apply. To enforce B2B diligence protocols, link CIPC directory records or add major stakeholders (&gt;25% share) to toggle EDD.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleToggleEdd}
          className={`h-11 rounded-xl font-bold font-dm-sans text-xs transition-all border flex items-center justify-center gap-2 ${requiresEdd ? 'bg-white/5 border-white/5 text-[#eef2ff] hover:bg-white/10' : 'bg-[#e4002b]/10 border-[#e4002b]/20 text-red-400 hover:bg-[#e4002b]/20'}`}
        >
          <ShieldAlert className="w-4 h-4" />
          {requiresEdd ? 'Disable EDD Flag' : 'Enforce EDD Compliance'}
        </button>
      </div>

      {/* CIPC SEARCH WIDGET */}
      <div className="bg-[#080f28]/70 border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-wider flex items-center gap-2 text-[#3b82f6]">
            <Search className="w-4 h-4" /> CIPC Corporate Directory Lookup (SA)
          </h3>
          <p className="text-[11.5px] text-[#4a5a82] font-dm-sans mt-1">
            Query the CIPC registry by business registration number or company name to fetch executive directors and automate B2B KYC routing.
          </p>
        </div>

        <form onSubmit={handleCipcSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Zafro Logistics or 2019/382910/07"
            value={cipcQuery}
            onChange={(e) => setCipcQuery(e.target.value)}
            className="flex-1 h-10 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs text-[#eef2ff] focus:outline-none focus:border-[#3b82f6] font-dm-sans"
          />
          <button
            type="submit"
            disabled={isSearchingCipc}
            className="px-5 h-10 rounded-lg bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-xs font-bold font-dm-sans transition-all flex items-center gap-1.5 shrink-0"
          >
            {isSearchingCipc ? 'Searching...' : 'Lookup CIPC'}
          </button>
        </form>

        {cipcResults.length > 0 && (
          <div className="border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
            {cipcResults.map((comp) => (
              <div key={comp.registrationNumber} className="p-4 bg-white/[0.01] flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#eef2ff]">{comp.companyName}</div>
                  <div className="text-[10.5px] text-[#94a3c8] font-mono">{comp.registrationNumber} • Registered {comp.registrationDate}</div>
                  <div className="text-[9.5px] text-[#4a5a82]">{comp.physicalAddress}</div>
                  
                  {/* Directors list preview */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {comp.directors.map((d: any) => (
                      <span key={d.name} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-[#94a3c8] font-dm-sans">
                        👤 {d.name} ({d.role})
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleLinkCipc(comp)}
                  className="px-4 h-9 bg-emerald-500 text-slate-950 hover:bg-emerald-600 rounded-lg text-xs font-bold font-dm-sans transition-all flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Link CIPC Directors
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BENEFICIAL OWNERSHIP TREE AND LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* The Mapping Tree View */}
        <div className="lg:col-span-2 bg-[#080f28]/70 border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-wider flex items-center gap-2 text-[#eef2ff]">
            <Network className="w-4 h-4 text-blue-400" /> Beneficial Owner Mapping Layer
          </h3>

          <div className="border border-white/5 rounded-xl p-4 bg-[#04091a]/30 relative">
            
            {/* TREE STRUCTURAL VISUAL */}
            <div className="flex flex-col gap-6 relative">
              {/* Root Node: Parent Company */}
              <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 px-4 py-3 rounded-lg max-w-sm relative z-10 shadow-lg">
                <Building className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold font-space-grotesk tracking-wide text-blue-400">CORPORATE HOLDING</h4>
                  <p className="text-[13px] font-bold text-[#eef2ff] font-dm-sans">{contact.first_name} {contact.last_name}</p>
                </div>
              </div>

              {owners.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#4a5a82] italic">
                  No linked beneficial owners, shareholders, or active trustees. Link CIPC records or select below.
                </div>
              ) : (
                <div className="pl-6 border-l-2 border-white/5 ml-6 space-y-4 relative">
                  {owners.map((owner) => {
                    const rating = owner.owner_contact.kyc_risk_ratings?.overall_rating || 'grey';
                    const isMajorShareholder = owner.share_percentage >= 25;

                    return (
                      <div key={owner.id} className="flex items-start gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-3 shadow relative group">
                        
                        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-xs text-[#4a5a82] shrink-0 font-space-grotesk">
                          {owner.relationship_type[0].toUpperCase()}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-[#eef2ff]">
                                {owner.owner_contact.first_name} {owner.owner_contact.last_name}
                              </span>
                              <span className="text-[10px] text-[#4a5a82] uppercase ml-2 font-mono">
                                • {owner.relationship_type}
                              </span>
                            </div>
                            
                            {/* KYC status tag */}
                            <div>
                              {rating === 'green' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">FICA verified</span>}
                              {rating === 'amber' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">medium risk</span>}
                              {rating === 'red' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">high risk</span>}
                              {rating === 'grey' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/5 text-[#94a3c8] border border-white/5 uppercase">unverified</span>}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10.5px]">
                            <div className="flex items-center gap-2 text-[#94a3c8] font-dm-sans">
                              <span>Share Ownership: <strong className="text-white font-space-grotesk">{owner.share_percentage}%</strong></span>
                              {isMajorShareholder && (
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-[#e4002b]/10 text-red-400 border border-[#e4002b]/20">
                                  MAJOR SHAREHOLDER (&gt;25% VOTING WEIGHT)
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={() => handleDeleteOwner(owner.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity p-1"
                              title="Delete linkage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* MANUAL LINKER SECTION */}
          <form onSubmit={handleAddManualOwner} className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                Select Individual Contact
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs text-[#eef2ff] focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="">-- Choose Contact --</option>
                {workspaceContacts.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                Ownership %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={sharePercentage}
                onChange={(e) => setSharePercentage(Number(e.target.value))}
                className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-[#3b82f6] font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLinkingOwner}
              className="w-full h-9 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-xs font-bold rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Link Owner
            </button>
          </form>

        </div>

        {/* Beneficial Ownership Form Storage */}
        <div className="bg-[#080f28]/70 border border-white/5 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-wider flex items-center gap-2 text-[#eef2ff]">
              <FileText className="w-4 h-4 text-emerald-400" /> Beneficial Ownership Vault
            </h3>

            <p className="text-[11.5px] text-[#4a5a82] font-dm-sans leading-relaxed">
              Upload completed Beneficial Ownership Declaration forms to satisfy EDD requirements for South African business entities.
            </p>

            <form onSubmit={handleUploadForm} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                  Form Filename
                </label>
                <input
                  type="text"
                  placeholder="e.g. zafro_beneficial_owners.pdf"
                  value={uploadFilename}
                  onChange={(e) => setUploadFilename(e.target.value)}
                  className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full h-9 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-600 disabled:bg-emerald-600/35 text-xs font-bold font-dm-sans transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Simulate Form Upload
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[1px] text-[#4a5a82] font-space-grotesk">Uploaded Ownership Declarations</h4>
            <div className="max-h-[160px] overflow-y-auto space-y-2 common-scrollbar">
              {documents.length === 0 ? (
                <p className="text-[10px] text-[#4a5a82] italic">No beneficial ownership forms uploaded.</p>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="bg-white/[0.01] border border-white/5 p-2 rounded-lg flex items-center justify-between text-[11px] font-dm-sans">
                    <div className="truncate pr-2">
                      <div className="font-semibold text-[#eef2ff] truncate">{doc.file_url.split('/').pop()}</div>
                      <div className="text-[9px] text-[#4a5a82] mt-0.5">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</div>
                    </div>
                    <a
                      href={`/api/kyc/documents/download?id=${doc.id}`}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-emerald-400"
                      title="Download PDF"
                    >
                      <Upload className="w-3.5 h-3.5 transform rotate-180" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

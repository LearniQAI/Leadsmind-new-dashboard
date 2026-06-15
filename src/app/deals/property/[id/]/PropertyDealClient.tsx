'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Link2, 
  Share2, 
  DollarSign, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  ArrowRight, 
  Copy,
  Clock,
  User,
  Shield,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { updateDealStage } from '@/app/actions/pipelines';
import { 
  updatePropertyDealContacts, 
  dispatchFundsDeclaration, 
  createConveyancingShare,
  getPropertyDeal
} from '@/app/actions/propertyDeals';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  kyc_risk_ratings?: {
    overall_rating: 'green' | 'amber' | 'red' | 'grey';
    fica_complete: boolean;
    fica_completed_at?: string;
  };
}

interface PropertyDealClientProps {
  initialDeal: any;
  initialBuyer: any;
  initialSeller: any;
  initialShares: any[];
  initialDeclarations: any[];
  stages: any[];
  contacts: any[];
}

export default function PropertyDealClient({
  initialDeal,
  initialBuyer,
  initialSeller,
  initialShares,
  initialDeclarations,
  stages,
  contacts
}: PropertyDealClientProps) {
  const router = useRouter();
  const [deal, setDeal] = useState(initialDeal);
  const [buyer, setBuyer] = useState<Contact | null>(initialBuyer);
  const [seller, setSeller] = useState<Contact | null>(initialSeller);
  const [shares, setShares] = useState(initialShares);
  const [declarations, setDeclarations] = useState(initialDeclarations);

  // Form states
  const [selectedBuyerId, setSelectedBuyerId] = useState(buyer?.id || '');
  const [selectedSellerId, setSelectedSellerId] = useState(seller?.id || '');
  
  const [fundsPhone, setFundsPhone] = useState(buyer?.phone || '');
  const [fundsAmount, setFundsAmount] = useState(deal.value || 0);
  const [isDispatchingFunds, setIsDispatchingFunds] = useState(false);

  const [attorneyName, setAttorneyName] = useState('');
  const [attorneyEmail, setAttorneyEmail] = useState('');
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isUpdatingContacts, setIsUpdatingContacts] = useState(false);

  // Refresh helper
  const refreshData = async () => {
    const res = await getPropertyDeal(deal.id);
    if (res.success && res.deal) {
      setDeal(res.deal);
      setBuyer(res.buyer);
      setSeller(res.seller);
      setShares(res.shares || []);
      setDeclarations(res.declarations || []);
      setSelectedBuyerId(res.buyer?.id || '');
      setSelectedSellerId(res.seller?.id || '');
      if (res.buyer && !fundsPhone) {
        setFundsPhone(res.buyer.phone || '');
      }
    }
  };

  // Stage change trigger
  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetStageId = e.target.value;
    if (targetStageId === deal.stage_id) return;

    const originalStageId = deal.stage_id;
    const originalStage = deal.stage;

    // Optimistically update
    const targetStage = stages.find(s => s.id === targetStageId);
    setDeal(prev => ({ ...prev, stage_id: targetStageId, stage: targetStage }));

    try {
      const res = await updateDealStage(deal.id, targetStageId, 0);
      if (!res.success) {
        toast.error(res.error || 'Failed to update deal stage');
        // Rollback
        setDeal(prev => ({ ...prev, stage_id: originalStageId, stage: originalStage }));
      } else {
        toast.success(`Pipeline stage updated to "${targetStage?.name}"`);
        await refreshData();
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during stage transition');
      // Rollback
      setDeal(prev => ({ ...prev, stage_id: originalStageId, stage: originalStage }));
    }
  };

  // Update contacts binding
  const handleUpdateContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContacts(true);
    try {
      const res = await updatePropertyDealContacts(
        deal.id,
        selectedBuyerId || null,
        selectedSellerId || null
      );
      if (res.success) {
        toast.success('Deal buyer and seller linked successfully');
        await refreshData();
      } else {
        toast.error(res.error || 'Failed to update linked contacts');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating contacts');
    } finally {
      setIsUpdatingContacts(false);
    }
  };

  // Dispatch digital declaration via WhatsApp
  const handleDispatchDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) {
      toast.error('Please link a Buyer contact to the transaction first');
      return;
    }
    if (!fundsPhone) {
      toast.error('Please enter a WhatsApp phone number');
      return;
    }

    setIsDispatchingFunds(true);
    try {
      const res = await dispatchFundsDeclaration(deal.id, buyer.id, fundsPhone);
      if (res.success && res.token) {
        const portalUrl = `${window.location.origin}/portal/funds-declaration/${res.token}`;
        toast.success('Funds declaration token generated!');
        
        // Copy to clipboard
        navigator.clipboard.writeText(portalUrl).catch(() => {});
        
        // Open WhatsApp link in new window
        const messageText = `Hi ${buyer.first_name}, in compliance with FICA, please complete your cash source of funds declaration for the transaction "${deal.title}" here: ${portalUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(fundsPhone)}&text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');

        await refreshData();
      } else {
        toast.error(res.error || 'Failed to generate declaration');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error generating declaration');
    } finally {
      setIsDispatchingFunds(false);
    }
  };

  // Create attorney conveyancing secure folder
  const handleCreateConveyancingShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attorneyName || !attorneyEmail) {
      toast.error('Please enter the Attorney Name and Email');
      return;
    }

    setIsCreatingShare(true);
    try {
      const res = await createConveyancingShare(deal.id, attorneyName, attorneyEmail);
      if (res.success && res.token) {
        const portalUrl = `${window.location.origin}/portal/conveyancing/${res.token}`;
        toast.success(`Secure conveyancing share link generated for ${attorneyName}`);
        
        // Copy to clipboard
        navigator.clipboard.writeText(portalUrl).catch(() => {});
        
        setAttorneyName('');
        setAttorneyEmail('');
        await refreshData();
      } else {
        toast.error(res.error || 'Failed to create share link');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error generating sharing link');
    } finally {
      setIsCreatingShare(false);
    }
  };

  // Helper to copy links
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  // Compliance blocker check
  const buyerRating = buyer?.kyc_risk_ratings?.overall_rating || 'grey';
  const sellerRating = seller?.kyc_risk_ratings?.overall_rating || 'grey';
  const isBuyerGreen = buyerRating === 'green';
  const isSellerGreen = sellerRating === 'green';

  const showComplianceWarning = !isBuyerGreen || !isSellerGreen;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-6 py-6 space-y-6 text-[#eef2ff]">
      
      {/* Top Banner Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-[#3b82f6]">
              Real Estate Pipeline
            </span>
            <span className="text-[11.5px] font-bold text-[#10b981] font-space-grotesk bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              PPRA / EAAB Compliance Panel
            </span>
          </div>
          <h1 className="text-2xl font-bold font-space-grotesk tracking-tight">
            {deal.title}
          </h1>
          <p className="text-xs text-[#4a5a82] font-dm-sans">
            Ref ID: <span className="font-mono text-[11px] text-[#94a3c8]">{deal.id}</span> • Deal Value: <span className="text-emerald-400 font-bold font-space-grotesk">${deal.value?.toLocaleString()}</span>
          </p>
        </div>

        {/* Tactical Stage Selection */}
        <div className="flex items-center gap-3">
          <div className="bg-[#080f28] border border-white/5 rounded-lg px-3 py-1.5 flex flex-col">
            <span className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] font-space-grotesk">Transaction Stage</span>
            <select
              value={deal.stage_id}
              onChange={handleStageChange}
              className="bg-transparent text-sm font-bold text-[#eef2ff] border-none focus:outline-none cursor-pointer pr-5 font-dm-sans"
            >
              {stages.map((st: any) => (
                <option key={st.id} value={st.id} className="bg-[#04091a] text-[#eef2ff]">
                  {st.name}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => router.push('/pipelines')}
            className="h-10 px-4 rounded-[8px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-xs font-bold font-dm-sans flex items-center gap-2 transition-all"
          >
            Back to Kanban
          </button>
        </div>
      </div>

      {/* COMPLIANCE ALERT BOX */}
      {showComplianceWarning && (
        <div className="relative overflow-hidden bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start shadow-xl shadow-amber-500/5">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-amber-500" />
          <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-amber-500 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold font-space-grotesk uppercase tracking-wider text-amber-400">
              Active Warning: Compliance Block In Effect
            </h4>
            <p className="text-xs font-dm-sans text-[#94a3c8] leading-relaxed">
              {!isBuyerGreen && !isSellerGreen && (
                <span>KYC incomplete for both <strong>{buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Buyer'}</strong> and <strong>{seller ? `${seller.first_name} ${seller.last_name}` : 'Seller'}</strong>.</span>
              )}
              {!isBuyerGreen && isSellerGreen && (
                <span>KYC incomplete for Buyer: <strong>{buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Unassigned'}</strong> — identity verification required before submitting offer.</span>
              )}
              {isBuyerGreen && !isSellerGreen && (
                <span>KYC incomplete for Seller: <strong>{seller ? `${seller.first_name} ${seller.last_name}` : 'Unassigned'}</strong> — identity verification required before submitting offer.</span>
              )}
              <br />
              <span className="text-[#a5b4fc] font-semibold mt-1 block">
                The database trigger will block stage progression to "Offer to Purchase Submitted" or "Under Contract" until both profiles display a FICA Verified Green status.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* DUAL KYC MONITORING ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Buyer KYC Dial */}
        <div className={`bg-[#080f28]/70 border ${buyerRating === 'green' ? 'border-emerald-500/20 shadow-emerald-950/10' : 'border-white/5'} rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between`}>
          {buyerRating === 'green' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
          )}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-[0.5px]">Buyer KYC status</h3>
                  <p className="text-[10px] text-[#4a5a82] font-mono">ROLE: TRANSACTING CLIENT</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                {buyerRating === 'green' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1 shadow-lg shadow-emerald-500/5 animate-pulse">
                    <CheckCircle className="w-3.5 h-3.5" /> FICA VERIFIED (GREEN)
                  </span>
                )}
                {buyerRating === 'amber' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> MEDIUM RISK (AMBER)
                  </span>
                )}
                {buyerRating === 'red' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> HIGH RISK (RED)
                  </span>
                )}
                {buyerRating === 'grey' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/5 border border-white/5 text-[#94a3c8] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> UNVERIFIED (GREY)
                  </span>
                )}
              </div>
            </div>

            {buyer ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-2 text-xs font-dm-sans">
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">Full Name:</span>
                  <span className="font-bold text-[#eef2ff]">{buyer.first_name} {buyer.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">Email:</span>
                  <span className="text-[#94a3c8]">{buyer.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">Mobile No:</span>
                  <span className="text-[#94a3c8]">{buyer.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">FICA Verified At:</span>
                  <span className="text-[#94a3c8]">{buyer.kyc_risk_ratings?.fica_completed_at ? new Date(buyer.kyc_risk_ratings.fica_completed_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-lg p-6 text-center text-xs text-[#4a5a82] font-dm-sans">
                No buyer contact linked to this property transaction record.
              </div>
            )}
          </div>
        </div>

        {/* Seller KYC Dial */}
        <div className={`bg-[#080f28]/70 border ${sellerRating === 'green' ? 'border-emerald-500/20 shadow-emerald-950/10' : 'border-white/5'} rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between`}>
          {sellerRating === 'green' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
          )}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-[0.5px]">Seller KYC status</h3>
                  <p className="text-[10px] text-[#4a5a82] font-mono">ROLE: TRANSACTING OWNER</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                {sellerRating === 'green' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1 shadow-lg shadow-emerald-500/5 animate-pulse">
                    <CheckCircle className="w-3.5 h-3.5" /> FICA VERIFIED (GREEN)
                  </span>
                )}
                {sellerRating === 'amber' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> MEDIUM RISK (AMBER)
                  </span>
                )}
                {sellerRating === 'red' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> HIGH RISK (RED)
                  </span>
                )}
                {sellerRating === 'grey' && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/5 border border-white/5 text-[#94a3c8] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> UNVERIFIED (GREY)
                  </span>
                )}
              </div>
            </div>

            {seller ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-2 text-xs font-dm-sans">
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">Full Name:</span>
                  <span className="font-bold text-[#eef2ff]">{seller.first_name} {seller.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">Email:</span>
                  <span className="text-[#94a3c8]">{seller.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">Mobile No:</span>
                  <span className="text-[#94a3c8]">{seller.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4a5a82]">FICA Verified At:</span>
                  <span className="text-[#94a3c8]">{seller.kyc_risk_ratings?.fica_completed_at ? new Date(seller.kyc_risk_ratings.fica_completed_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-lg p-6 text-center text-xs text-[#4a5a82] font-dm-sans">
                No seller contact linked to this property transaction record.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BINDING FORM PANEL */}
      <div className="bg-[#080f28]/70 border border-white/5 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-wider mb-4 flex items-center gap-2 text-[#3b82f6]">
          <Link2 className="w-4 h-4" /> Dual Contact Linkage Settings
        </h3>
        
        <form onSubmit={handleUpdateContacts} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div>
            <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] block mb-2 font-space-grotesk">
              Assign Buyer (Contact)
            </label>
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="w-full h-10 px-3 bg-[#04091a] border border-white/5 rounded-[8px] text-xs text-[#eef2ff] focus:outline-none focus:border-[#3b82f6] font-dm-sans"
            >
              <option value="">-- Select Buyer Contact --</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.email || 'No Email'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] block mb-2 font-space-grotesk">
              Assign Seller (Contact)
            </label>
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="w-full h-10 px-3 bg-[#04091a] border border-white/5 rounded-[8px] text-xs text-[#eef2ff] focus:outline-none focus:border-[#3b82f6] font-dm-sans"
            >
              <option value="">-- Select Seller Contact --</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.email || 'No Email'})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isUpdatingContacts}
            className="w-full h-10 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 disabled:bg-[#2563eb]/50 text-xs font-bold font-dm-sans transition-all flex items-center justify-center gap-2"
          >
            {isUpdatingContacts ? 'Linking...' : 'Apply Linked Entities'}
          </button>
        </form>
      </div>

      {/* COMPLIANCE TOOL SUITES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SOURCE OF FUNDS DISPATCH WORKSPACE */}
        <div className="bg-[#080f28]/70 border border-white/5 rounded-xl p-5 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-wider flex items-center gap-2 text-[#eef2ff]">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Source of Funds WhatsApp declarations
            </h3>
            
            <p className="text-[11.5px] text-[#4a5a82] font-dm-sans leading-relaxed">
              Generate a digital compliance form to capture source of funds declarations for cash transactions. Sends a secure link directly to the buyer's mobile number via WhatsApp.
            </p>

            <form onSubmit={handleDispatchDeclaration} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                    WhatsApp Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +27721234567"
                    value={fundsPhone}
                    onChange={(e) => setFundsPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                    Transaction Value
                  </label>
                  <input
                    type="number"
                    value={fundsAmount}
                    onChange={(e) => setFundsAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isDispatchingFunds || !buyer}
                className="w-full h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-600/35 text-xs font-bold font-dm-sans transition-all flex items-center justify-center gap-2 text-slate-950"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Declaration via WhatsApp
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[1px] text-[#4a5a82] font-space-grotesk">Recent Dispatched Declarations</h4>
            <div className="max-h-[140px] overflow-y-auto space-y-2 common-scrollbar">
              {declarations.length === 0 ? (
                <p className="text-[10px] text-[#4a5a82] italic">No funds declarations dispatched yet.</p>
              ) : (
                declarations.map((dec: any) => (
                  <div key={dec.id} className="bg-white/[0.01] border border-white/5 p-2 rounded-lg flex items-center justify-between text-[11px] font-dm-sans">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#eef2ff]">Status:</span>
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase ${dec.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {dec.status}
                        </span>
                      </div>
                      {dec.status === 'submitted' && (
                        <div className="text-[10px] text-[#94a3c8] mt-0.5">
                          Source: <span className="text-[#a5b4fc] font-bold capitalize">{dec.funds_source?.replace('_', ' ')}</span> • Amt: <span className="text-[#10b981] font-bold font-space-grotesk">${dec.amount?.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="text-[9px] text-[#4a5a82] mt-0.5">Sent at: {new Date(dec.whatsapp_sent_at).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/portal/funds-declaration/${dec.token}`)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#94a3c8]"
                      title="Copy sharing link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CONVEYANCING ATTORNEY DATA EXCHANGE */}
        <div className="bg-[#080f28]/70 border border-white/5 rounded-xl p-5 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-space-grotesk uppercase tracking-wider flex items-center gap-2 text-[#eef2ff]">
              <Share2 className="w-4 h-4 text-blue-400" /> Conveyancing Attorney Portal
            </h3>
            
            <p className="text-[11.5px] text-[#4a5a82] font-dm-sans leading-relaxed">
              Securely share verified client FICA folders directly with external legal firms. Creates a tokenized workspace permitting access to verified ID copies, passports, and utility proof of address.
            </p>

            <form onSubmit={handleCreateConveyancingShare} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                    Attorney / Firm Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bowmans Law"
                    value={attorneyName}
                    onChange={(e) => setAttorneyName(e.target.value)}
                    className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-blue-500 font-dm-sans"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1px] block mb-1.5 font-space-grotesk">
                    Attorney Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="attorney@firm.co.za"
                    value={attorneyEmail}
                    onChange={(e) => setAttorneyEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-[#04091a] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-blue-500 font-dm-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingShare || !buyer || !seller}
                className="w-full h-9 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-600/35 text-xs font-bold font-dm-sans transition-all flex items-center justify-center gap-2 text-white"
              >
                <Share2 className="w-3.5 h-3.5" /> Generate Secure Sharing Link
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[1px] text-[#4a5a82] font-space-grotesk">Active Exchange Links (FICA Shares)</h4>
            <div className="max-h-[140px] overflow-y-auto space-y-2 common-scrollbar">
              {shares.length === 0 ? (
                <p className="text-[10px] text-[#4a5a82] italic">No conveyancing attorney portals generated yet.</p>
              ) : (
                shares.map((sh: any) => {
                  const isExpired = new Date(sh.expires_at) < new Date();
                  return (
                    <div key={sh.id} className="bg-white/[0.01] border border-white/5 p-2 rounded-lg flex items-center justify-between text-[11px] font-dm-sans">
                      <div>
                        <div className="font-semibold text-[#eef2ff]">{sh.attorney_name}</div>
                        <div className="text-[10px] text-[#94a3c8] mt-0.5">{sh.attorney_email}</div>
                        <div className="text-[9px] text-[#4a5a82] mt-0.5">Expires: {new Date(sh.expires_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/portal/conveyancing/${sh.token}`)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#94a3c8]"
                          title="Copy portal URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/portal/conveyancing/${sh.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-blue-400"
                          title="Preview attorney portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

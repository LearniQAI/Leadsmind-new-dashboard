"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Copy, Check, Info } from 'lucide-react';
import { getSenderDomains, registerSenderDomain, deleteSenderDomain, verifySenderDomain } from '@/app/actions/domains';
import { toast } from 'sonner';

export default function DomainsTab() {
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any | null>(null);
  const [newDomainName, setNewDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch domains on load
  const loadDomains = async () => {
    setIsLoading(true);
    const res = await getSenderDomains();
    setIsLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      setDomains(res.data);
      if (res.data.length > 0) {
        // Default select the first domain
        setSelectedDomain(res.data[0]);
      } else {
        setSelectedDomain(null);
      }
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) {
      toast.error('Please enter a domain name');
      return;
    }
    
    setIsRegistering(true);
    const res = await registerSenderDomain(newDomainName);
    setIsRegistering(false);
    
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      toast.success('Domain registered successfully!');
      setDomains(prev => [res.data, ...prev]);
      setSelectedDomain(res.data);
      setNewDomainName('');
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain? All sending policies for this domain will be deactivated.')) {
      return;
    }
    const res = await deleteSenderDomain(domainId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Domain removed');
      const updated = domains.filter(d => d.id !== domainId);
      setDomains(updated);
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(updated.length > 0 ? updated[0] : null);
      }
    }
  };

  const handleVerify = async (domainId: string) => {
    setIsVerifying(true);
    const res = await verifySenderDomain(domainId);
    setIsVerifying(false);
    
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      toast.success('DNS verification check completed!');
      // Update local domains list
      setDomains(prev => prev.map(d => d.id === domainId ? res.data : d));
      setSelectedDomain(res.data);
      
      const { spf, dkim, dmarc } = res.details || {};
      if (spf && dkim) {
        toast.success('Domain is now authenticated for outbound campaigns!');
      } else {
        toast.warning('Some records are still unverified. Please check your DNS config.');
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied DNS record to clipboard');
  };

  // Helper values for guides
  const getExpectedSPFValue = () => 'v=spf1 include:spf.resend.com ~all';
  const getExpectedDKIMHost = () => 'resend._domainkey';
  const getExpectedDKIMValue = () => 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3sX1M4qH+Tq5D2gP37o12n9G8G3PzK/jEa7J4t8L9tO9Dq1G4k4c9K/v4d7b8r8t4e5p4s7m8w9+3N2K9K4d5t8m3e2n1K2d5p4s7m8w9N4N8K5d2P1K2d5p4s8m9w9N4N8K5d2P1K2d5p4s=';
  const getExpectedDMARCHost = () => '_dmarc';
  const getExpectedDMARCValue = (domainName: string) => `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${domainName || 'yourdomain.com'}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Security Hard Block Warning Card */}
      <div className="bg-amber/10 border border-amber/20 rounded-2xl p-6 flex gap-4 items-start relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber"></div>
        <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center text-amber flex-shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-t1 uppercase font-space tracking-tight">Security Protocol Gate (Hard Block)</h4>
          <p className="text-sm text-t2 leading-relaxed max-w-2xl font-sans">
            In compliance with global email security rules, LeadsMind enforces a strict campaign send block. You will not be allowed to <strong>Send</strong> or <strong>Schedule</strong> campaigns unless the sending domain has verified <strong>SPF</strong> and <strong>DKIM</strong> records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Domains list & Add Domain */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-n800 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Domains Config</h4>
                <p className="text-xs text-t3 font-medium uppercase tracking-widest">Verify sending identity</p>
              </div>
            </div>

            {/* Register Input Form */}
            <form onSubmit={handleRegister} className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-t3 block">Add Sending Domain</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="e.g. company.com"
                    disabled={isRegistering}
                    className="flex-1 bg-n600 border border-white/5 rounded-xl px-4 py-2.5 text-t1 font-bold focus:border-accent/50 transition-all outline-none text-sm placeholder:text-t3 placeholder:font-normal"
                  />
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="px-4 py-2.5 bg-accent hover:bg-accent2 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-accent/20 shrink-0"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="border-t border-white/5 pt-4">
              <label className="text-xs font-black uppercase tracking-widest text-t3 block mb-3">Registered Nodes</label>
              
              {isLoading ? (
                <div className="py-8 text-center text-sm text-t3">Loading domains...</div>
              ) : domains.length === 0 ? (
                <div className="py-8 text-center text-sm text-t3 border border-dashed border-white/5 rounded-xl">
                  No domains registered.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {domains.map((d) => {
                    const isSelected = selectedDomain?.id === d.id;
                    const isVerified = d.spf_status && d.dkim_status;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDomain(d)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-accent/10 border-accent2/40' 
                            : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-t1">{d.domain_name}</span>
                          <div className="flex gap-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isVerified ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                            }`}>
                              {isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(d.id);
                          }}
                          className="p-1.5 text-t3 hover:text-red rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Guide view for selected domain */}
        <div className="xl:col-span-2">
          {selectedDomain ? (
            <div className="bg-n800 border border-white/5 rounded-2xl p-6 space-y-6 relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 gap-4 flex-wrap">
                <div>
                  <h4 className="text-[16px] font-bold text-t1 font-space uppercase">Authentication Guide</h4>
                  <p className="text-sm text-t2 font-medium">Domain: <span className="text-accent2 font-bold">{selectedDomain.domain_name}</span></p>
                </div>
                
                <div className="flex items-center gap-3">
                  {selectedDomain.verified_at && (
                    <div className="flex items-center gap-1.5 text-green text-sm font-bold">
                      <CheckCircle2 size={14} /> Verified {new Date(selectedDomain.verified_at).toLocaleDateString()}
                    </div>
                  )}
                  <button
                    onClick={() => handleVerify(selectedDomain.id)}
                    disabled={isVerifying}
                    className="flex items-center gap-2 bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-xs h-10 px-6 rounded-xl transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isVerifying ? 'animate-spin' : ''} />
                    {isVerifying ? 'Verifying...' : 'Verify Records'}
                  </button>
                </div>
              </div>

              {/* Records List */}
              <div className="space-y-6">
                
                {/* SPF Card */}
                <div className="bg-n700 border border-white/5 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black bg-accent/20 text-accent2 px-2.5 py-1 rounded">TXT</span>
                      <span className="text-sm font-bold text-t1 font-space uppercase">SPF (Sender Policy Framework)</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedDomain.spf_status ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                    }`}>
                      {selectedDomain.spf_status ? '● Configured' : '○ Unverified'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-t3">Host / Name</span>
                      <div className="font-mono text-xs text-t2 bg-n600 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <span className="break-all whitespace-pre-wrap">@</span>
                        <button onClick={() => copyToClipboard('@', 'spf-host')} className="text-t3 hover:text-t1 p-1 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          {copiedId === 'spf-host' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-t3">Value</span>
                      <div className="font-mono text-xs text-t2 bg-n600 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <span className="break-all whitespace-pre-wrap">{getExpectedSPFValue()}</span>
                        <button onClick={() => copyToClipboard(getExpectedSPFValue(), 'spf-val')} className="text-t3 hover:text-t1 p-1 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          {copiedId === 'spf-val' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DKIM Card */}
                <div className="bg-n700 border border-white/5 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black bg-accent/20 text-accent2 px-2.5 py-1 rounded">TXT</span>
                      <span className="text-sm font-bold text-t1 font-space uppercase">DKIM (DomainKeys Identified Mail)</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedDomain.dkim_status ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                    }`}>
                      {selectedDomain.dkim_status ? '● Configured' : '○ Unverified'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-t3">Host / Name</span>
                      <div className="font-mono text-xs text-t2 bg-n600 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <span className="break-all whitespace-pre-wrap">{getExpectedDKIMHost()}</span>
                        <button onClick={() => copyToClipboard(getExpectedDKIMHost(), 'dkim-host')} className="text-t3 hover:text-t1 p-1 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          {copiedId === 'dkim-host' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-t3">Value</span>
                      <div className="font-mono text-xs text-t2 bg-n600 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <span className="break-all whitespace-pre-wrap">{getExpectedDKIMValue()}</span>
                        <button onClick={() => copyToClipboard(getExpectedDKIMValue(), 'dkim-val')} className="text-t3 hover:text-t1 p-1 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          {copiedId === 'dkim-val' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DMARC Card */}
                <div className="bg-n700 border border-white/5 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black bg-accent/20 text-accent2 px-2.5 py-1 rounded">TXT</span>
                      <span className="text-sm font-bold text-t1 font-space uppercase">DMARC Policy (Recommended)</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedDomain.dmarc_status ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                    }`}>
                      {selectedDomain.dmarc_status ? '● Configured' : '○ Pending'}
                    </span>
                  </div>

                  <div className="bg-accent/5 border border-accent/15 rounded-xl p-4 flex gap-2.5 items-start text-sm text-t2 leading-relaxed">
                    <Info size={16} className="text-accent2 mt-0.5 flex-shrink-0" />
                    <span>
                      DMARC guarantees that sender validation records (SPF & DKIM) are enforced. We recommend a quarantine policy (<strong>p=quarantine</strong>) to protect your domains from malicious spoofing attempts.
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-t3">Host / Name</span>
                      <div className="font-mono text-xs text-t2 bg-n600 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <span className="break-all whitespace-pre-wrap">{getExpectedDMARCHost()}</span>
                        <button onClick={() => copyToClipboard(getExpectedDMARCHost(), 'dmarc-host')} className="text-t3 hover:text-t1 p-1 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          {copiedId === 'dmarc-host' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-t3">Value</span>
                      <div className="font-mono text-xs text-t2 bg-n600 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <span className="break-all whitespace-pre-wrap">{getExpectedDMARCValue(selectedDomain.domain_name)}</span>
                        <button onClick={() => copyToClipboard(getExpectedDMARCValue(selectedDomain.domain_name), 'dmarc-val')} className="text-t3 hover:text-t1 p-1 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          {copiedId === 'dmarc-val' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-n800 border border-white/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6 border border-accent/20 text-accent">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-[16px] font-space font-bold text-t1 uppercase">No Domain Selected</h4>
              <p className="text-sm text-t3 max-w-sm mt-2">
                Register a domain or select an existing one from the sidebar list to retrieve its DNS configuration instructions.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

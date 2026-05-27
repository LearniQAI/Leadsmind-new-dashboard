"use client";
import React, { useState, useEffect } from 'react';
import { Search, Brain, Plus, Building, Globe, Zap, Clock, ArrowRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ResearchPortalClientProps {
  workspaceId: string;
  initialReports: any[];
}

export default function ResearchPortalClient({
  workspaceId,
  initialReports
}: ResearchPortalClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [reports, setReports] = useState<any[]>(initialReports);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  // Form inputs
  const [domain, setDomain] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');

  useEffect(() => {
    async function loadContacts() {
      try {
        const { data } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .eq('workspace_id', workspaceId)
          .limit(50);
        
        if (data) setContacts(data);
      } catch (err) {
        console.error('Error loading contacts:', err);
      }
    }
    loadContacts();
  }, [workspaceId]);

  const handleRunCompanyResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      toast.error('Please enter a target company domain first');
      return;
    }

    setLoading(true);
    toast.info('Autonomous research agent dispatched to scan target domain...');
    try {
      const response = await fetch('/api/v1/ai/research/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContactId ? [selectedContactId] : ['test-contact-id'], // Fallback
          workspaceId,
          domain: domain.trim()
        })
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Research lookup failed');

      toast.success('Company intelligence report compiled successfully.');
      
      // Reload reports
      const { data } = await supabase
        .from('ai_research_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (data) setReports(data);
      setDomain('');
      setSelectedContactId('');
    } catch (err: any) {
      console.error(err);
      toast.error(`Research failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getWarmthBadge = (score: number) => {
    if (score >= 80) return 'bg-[#10b981]/15 border-[#10b981]/25 text-[#34d399]';
    if (score >= 60) return 'bg-[#8b5cf6]/15 border-[#8b5cf6]/25 text-[#a78bfa]';
    if (score >= 40) return 'bg-[#f59e0b]/15 border-[#f59e0b]/25 text-[#fbbf24]';
    return 'bg-white/5 border-white/10 text-t3';
  };

  const filteredReports = reports.filter(r => 
    r.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.company_domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#04091a] text-white p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-[22px] font-space font-black uppercase tracking-tight leading-none mb-1 text-t1">
            AI Customer <span className="text-[#3b82f6]">Research Agent</span>
          </h1>
          <p className="text-[11px] font-medium text-t3 uppercase tracking-wider">
            Compile company profiles and individual prospect insights on demand
          </p>
        </div>

        <button
          onClick={() => router.push('/ai-studio')}
          className="h-9 px-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-t2 hover:text-white text-xs font-bold transition-all"
        >
          Back to AI Dashboard
        </button>
      </div>

      {/* Grid: Left 1/3 Trigger form, Right 2/3 List of past reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Research compiler form */}
        <div className="bg-[#080f28] border border-white/5 rounded-3xl p-6 space-y-6 h-fit sticky top-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accentg text-accent2 flex items-center justify-center">
              <Brain size={16} />
            </div>
            <div>
              <h4 className="text-[13px] font-space font-bold text-t1 uppercase">Intelligence Lookup</h4>
              <p className="text-[10px] text-t3 uppercase font-medium tracking-wide">Trigger autonomous search loop</p>
            </div>
          </div>

          <form onSubmit={handleRunCompanyResearch} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Company Web Domain</label>
              <input
                type="text"
                placeholder="e.g. zafrologistics.co.za"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-[#04091a] border border-white/5 rounded-xl px-4 py-3 text-t1 focus:border-accent/50 transition-all outline-none text-sm font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Link CRM Contact (Optional)</label>
              <select
                value={selectedContactId}
                onChange={(e) => {
                  setSelectedContactId(e.target.value);
                  const selectedContact = contacts.find(c => c.id === e.target.value);
                  if (selectedContact && selectedContact.email) {
                    const guessedDomain = selectedContact.email.split('@')[1];
                    if (guessedDomain && !domain) {
                      setDomain(guessedDomain);
                    }
                  }
                }}
                className="w-full bg-[#04091a] border border-white/5 rounded-xl px-4 py-3 text-t1 focus:border-accent/50 transition-all outline-none text-sm font-semibold"
              >
                <option value="">-- Select Contact to Enrich --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name || ''} {c.last_name || ''} ({c.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
                  Searching Web...
                </>
              ) : (
                <>
                  <Zap size={12} />
                  Compile AI Intelligence Report
                </>
              )}
            </button>
          </form>
        </div>

        {/* List of past reports */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t4" size={16} />
            <input
              type="text"
              placeholder="Search past company intelligence records by domain or brand name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080f28] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-t1 focus:border-accent/50 transition-all outline-none text-sm"
            />
          </div>

          {/* Grid list */}
          {filteredReports.length === 0 ? (
            <div className="py-20 bg-[#080f28] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Building size={32} className="text-t4 opacity-40" />
              <p className="text-xs text-t3">No matching intelligence records found in search index.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => router.push(`/ai-studio/research/${report.contact_id || report.id}`)}
                  className="bg-[#080f28] border border-white/5 hover:border-accent/30 rounded-2xl p-5 flex flex-col justify-between hover:bg-[#0c1535]/30 cursor-pointer group transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-t3">
                          {report.research_type === 'contact_enrichment' ? <User size={14} /> : <Building size={14} />}
                        </div>
                        <div>
                          <h5 className="text-[13px] font-space font-bold text-t1 uppercase leading-none">
                            {report.company_name || 'Enriched Business'}
                          </h5>
                          <span className="text-[9px] text-t4 font-mono font-medium tracking-wide uppercase">
                            {report.research_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {report.lead_score !== null && (
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getWarmthBadge(report.lead_score)}`}>
                          {report.lead_score} pts
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-t3">
                      <Globe size={11} />
                      <span className="font-mono text-t2">{report.company_domain}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.03] pt-3 mt-4 text-[10px] text-t4">
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{new Date(report.created_at).toLocaleDateString('en-ZA')}</span>
                    </div>
                    <span className="text-accent2 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold uppercase">
                      Inspect Brief
                      <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

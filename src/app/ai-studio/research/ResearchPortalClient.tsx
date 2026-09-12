"use client";
import React, { useState, useEffect } from 'react';
import { Search, Brain, Plus, Building, Globe, Zap, Clock, ArrowRight, User, Loader2 } from 'lucide-react';
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
    if (score >= 80) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (score >= 60) return 'bg-purple-50 border-purple-200 text-purple-700';
    if (score >= 40) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-dash-surface border-dash-border text-dash-textMuted';
  };

  const filteredReports = reports.filter(r =>
    r.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.company_domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text p-8 space-y-8 animate-in fade-in duration-300">

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dash-border pb-6">
        <div>
          <h1 className="text-[22px] font-space font-black uppercase tracking-tight leading-none mb-1 text-dash-text">
            AI Customer <span className="text-dash-accent">Research Agent</span>
          </h1>
          <p className="text-[11px] font-medium text-dash-textMuted uppercase tracking-wider">
            Compile company profiles and individual prospect insights on demand
          </p>
        </div>

        <button
          onClick={() => router.push('/ai-studio')}
          className="h-9 px-4 rounded-lg bg-dash-surface border border-dash-border hover:bg-dash-border/40 text-dash-textMuted hover:text-dash-text text-xs font-bold transition-all"
        >
          Back to AI Dashboard
        </button>
      </div>

      {/* Grid: Left 1/3 Trigger form, Right 2/3 List of past reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Research compiler form */}
        <div className="bg-white border border-dash-border rounded-3xl p-6 space-y-6 h-fit sticky top-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-dash-accent/10 text-dash-accent flex items-center justify-center">
              <Brain size={16} />
            </div>
            <div>
              <h4 className="text-[13px] font-space font-bold text-dash-text uppercase">Intelligence Lookup</h4>
              <p className="text-[10px] text-dash-textMuted uppercase font-medium tracking-wide">Trigger autonomous search loop</p>
            </div>
          </div>

          <form onSubmit={handleRunCompanyResearch} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted">Company Web Domain</label>
              <input
                type="text"
                placeholder="e.g. zafrologistics.co.za"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-dash-text focus:border-dash-accent/50 transition-all outline-none text-sm font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted">Link CRM Contact (Optional)</label>
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
                className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-dash-text focus:border-dash-accent/50 transition-all outline-none text-sm font-semibold"
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
              className="w-full bg-dash-accent hover:bg-dash-accent/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dash-textMuted" size={16} />
            <input
              type="text"
              placeholder="Search past company intelligence records by domain or brand name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-dash-border rounded-2xl pl-11 pr-4 py-3.5 text-dash-text focus:border-dash-accent/50 transition-all outline-none text-sm shadow-sm"
            />
          </div>

          {/* Grid list */}
          {filteredReports.length === 0 ? (
            <div className="py-20 bg-white border border-dash-border rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3 shadow-sm">
              <Building size={32} className="text-dash-textMuted opacity-40" />
              <p className="text-xs text-dash-textMuted">No matching intelligence records found in search index.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => router.push(`/ai-studio/research/${report.contact_id || report.id}`)}
                  className="bg-white border border-dash-border hover:border-dash-accent/30 rounded-2xl p-5 flex flex-col justify-between hover:bg-dash-surface/60 cursor-pointer group transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted">
                          {report.research_type === 'contact_enrichment' ? <User size={14} /> : <Building size={14} />}
                        </div>
                        <div>
                          <h5 className="text-[13px] font-space font-bold text-dash-text uppercase leading-none">
                            {report.company_name || 'Enriched Business'}
                          </h5>
                          <span className="text-[9px] text-dash-textMuted font-mono font-medium tracking-wide uppercase">
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

                    <div className="flex items-center gap-1 text-[11px] text-dash-textMuted">
                      <Globe size={11} />
                      <span className="font-mono text-dash-text/80">{report.company_domain}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-dash-border pt-3 mt-4 text-[10px] text-dash-textMuted">
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{new Date(report.created_at).toLocaleDateString('en-ZA')}</span>
                    </div>
                    <span className="text-dash-accent group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold uppercase">
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

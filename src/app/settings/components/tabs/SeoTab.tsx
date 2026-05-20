"use client";

import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, TrendingUp, Plus, Trash2, CheckCircle, RefreshCw, 
  BarChart2, Calendar, FileText, ChevronRight, ExternalLink, Play, AlertCircle, Users, Star, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getGoogleAuthUrl, getSeoProject, updateSeoProjectDomain, getTrackedKeywords, 
  addTrackedKeyword, deleteTrackedKeyword, getContentPipeline, addPipelineItem, 
  updatePipelineStatus, deletePipelineItem, getSeoMetricsSummary,
  updateSeoProjectCompetitors, triggerDataForSeoSync, triggerCompetitorKeywordsWeekly
} from '@/app/actions/seo';

export default function SeoTab() {
  // Database States
  const [project, setProject] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [pipelineItems, setPipelineItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  // UI Interactive States
  const [domainInput, setDomainInput] = useState('');
  const [competitorsInput, setCompetitorsInput] = useState('');
  const [gbpInput, setGbpInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [targetUrlInput, setTargetUrlInput] = useState('');
  const [pipelineKeywordInput, setPipelineKeywordInput] = useState('');
  const [pipelineTitleInput, setPipelineTitleInput] = useState('');
  const [pipelineDateInput, setPipelineDateInput] = useState('');
  const [pipelineStatusInput, setPipelineStatusInput] = useState<'Idea' | 'Research' | 'Approved' | 'Outlined' | 'Writing' | 'Review' | 'Scheduled' | 'Published'>('Idea');

  // Loading/Processing states
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isSavingCompetitors, setIsSavingCompetitors] = useState(false);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [isAddingPipeline, setIsAddingPipeline] = useState(false);
  const [isSyncingGSC, setIsSyncingGSC] = useState(false);
  const [isSyncingRanks, setIsSyncingRanks] = useState(false);
  const [isSyncingCompetitorKeywords, setIsSyncingCompetitorKeywords] = useState(false);

  // Load everything on mount
  useEffect(() => {
    loadAllSeoData();
  }, []);

  const loadAllSeoData = async () => {
    setIsLoading(true);
    try {
      const [projectRes, keywordsRes, pipelineRes, metricsRes] = await Promise.all([
        getSeoProject(),
        getTrackedKeywords(),
        getContentPipeline(),
        getSeoMetricsSummary()
      ]);

      if (projectRes.data) {
        setProject(projectRes.data);
        setDomainInput(projectRes.data.domain_url || '');
        setCompetitorsInput(projectRes.data.competitor_domains?.join(', ') || '');
        setGbpInput(projectRes.data.google_business_profile || '');
      }
      if (keywordsRes.data) setKeywords(keywordsRes.data);
      if (pipelineRes.data) setPipelineItems(pipelineRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
    } catch (err: any) {
      console.error('Error loading SEO metrics:', err.message);
      toast.error('Failed to load SEO configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth onboarding redirection trigger
  const handleConnectGSC = async () => {
    try {
      const authRes = await getGoogleAuthUrl();
      if (authRes.error) {
        toast.error(authRes.error);
        return;
      }
      if (authRes.data) {
        toast.info('Redirecting to Google authorization protocols...');
        window.location.href = authRes.data;
      }
    } catch (err: any) {
      toast.error(err.message || 'OAuth initialization failed.');
    }
  };

  // Domain update
  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) {
      toast.error('Please input a valid domain name.');
      return;
    }

    setIsSavingDomain(true);
    const res = await updateSeoProjectDomain(domainInput);
    setIsSavingDomain(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('SEO target domain saved successfully.');
      setProject(res.data);
      loadAllSeoData();
    }
  };

  // Competitors update
  const handleSaveCompetitors = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompetitors(true);
    const domainList = competitorsInput
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const res = await updateSeoProjectCompetitors(domainList, gbpInput);
    setIsSavingCompetitors(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Competitor domains and GBP Profile saved successfully.');
      loadAllSeoData();
    }
  };

  // Add keyword
  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordInput.trim()) {
      toast.error('Please enter a target keyword.');
      return;
    }

    setIsAddingKeyword(true);
    const res = await addTrackedKeyword(keywordInput, targetUrlInput);
    setIsAddingKeyword(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Keyword "${keywordInput}" added successfully.`);
      setKeywordInput('');
      setTargetUrlInput('');
      loadAllSeoData();
    }
  };

  // Delete keyword
  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this keyword from SERP tracking?')) return;
    const res = await deleteTrackedKeyword(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Keyword removed successfully.');
      loadAllSeoData();
    }
  };

  // Add Content Pipeline Item
  const handleAddPipelineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineKeywordInput.trim()) {
      toast.error('Please specify a keyword for the content card.');
      return;
    }

    setIsAddingPipeline(true);
    const res = await addPipelineItem(
      pipelineKeywordInput,
      pipelineStatusInput,
      pipelineTitleInput || undefined,
      pipelineDateInput || undefined
    );
    setIsAddingPipeline(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Content card for "${pipelineKeywordInput}" queued.`);
      setPipelineKeywordInput('');
      setPipelineTitleInput('');
      setPipelineDateInput('');
      setPipelineStatusInput('Idea');
      loadAllSeoData();
    }
  };

  // Update Pipeline Item status
  const handleUpdatePipelineStatus = async (id: string, newStatus: any) => {
    const res = await updatePipelineStatus(id, newStatus);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Content pipeline state updated.');
      loadAllSeoData();
    }
  };

  // Delete Pipeline Item
  const handleDeletePipelineItem = async (id: string) => {
    if (!confirm('Permanently remove this content card?')) return;
    const res = await deletePipelineItem(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Pipeline item deleted.');
      loadAllSeoData();
    }
  };

  // Manual Trigger Cron Sync to backfill/update stats on demand
  const handleManualSync = async () => {
    setIsSyncingGSC(true);
    toast.info('Connecting to API node to retrieve South African GSC click logs...');
    try {
      const response = await fetch('/api/cron/gsc-sync');
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('South African search telemetry synced successfully!');
        loadAllSeoData();
      } else {
        throw new Error(data.error || 'Sync request failed.');
      }
    } catch (err: any) {
      toast.error(`Sync error: ${err.message}`);
    } finally {
      setIsSyncingGSC(false);
    }
  };

  // Manual trigger for DataForSEO rank sync
  const handleSyncRanks = async () => {
    setIsSyncingRanks(true);
    toast.info('Initiating DataForSEO Live Advanced SERP organic search checking...');
    try {
      const res = await triggerDataForSeoSync();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`DataForSEO sync completed! Scanned ${res.count} keyword positions.`);
        loadAllSeoData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync failed.');
    } finally {
      setIsSyncingRanks(false);
    }
  };

  // Manual trigger for competitor organic keywords scan
  const handleSyncCompetitorKeywords = async () => {
    setIsSyncingCompetitorKeywords(true);
    toast.info('Running weekly Domain Organic Keywords API scan for competitors...');
    try {
      const res = await triggerCompetitorKeywordsWeekly();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Weekly competitor keywords scan complete! Found ${res.count} rankings.`);
        loadAllSeoData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Competitor keywords scan failed.');
    } finally {
      setIsSyncingCompetitorKeywords(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="animate-spin text-accent" size={32} />
        <p className="text-t3 font-medium uppercase tracking-widest text-[11px]">Syncing with Supabase Ledger...</p>
      </div>
    );
  }

  // Compute local SERP feature metrics from rankLogs
  const latestRankByKeyword = new Map<string, any>();
  if (metrics?.rankLogs) {
    // Sort ascending by date, so later dates overwrite
    const sortedLogs = [...metrics.rankLogs].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedLogs.forEach((log: any) => {
      latestRankByKeyword.set(log.keyword, log);
    });
  }
  const latestRanks = Array.from(latestRankByKeyword.values());

  const totalFeaturedSnippets = latestRanks.filter((r: any) => r.featured_snippet).length;
  const totalLocalPacks = latestRanks.filter((r: any) => r.local_pack).length;
  const totalKeywordsWithPAA = latestRanks.length;
  const avgPAAQuestions = totalKeywordsWithPAA > 0 
    ? (latestRanks.reduce((acc: number, r: any) => acc + (r.people_also_ask_count || 0), 0) / totalKeywordsWithPAA).toFixed(1)
    : '0.0';

  // Map of keyword to latest rank logs for the table
  const latestRankLogMap = new Map<string, any>();
  if (metrics?.rankLogs) {
    const sortedLogs = [...metrics.rankLogs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sortedLogs.forEach((log: any) => {
      if (!latestRankLogMap.has(log.keyword)) {
        latestRankLogMap.set(log.keyword, log);
      }
    });
  }

  const pipelineStages: ('Idea' | 'Research' | 'Approved' | 'Outlined' | 'Writing' | 'Review' | 'Scheduled' | 'Published')[] = [
    'Idea', 'Research', 'Approved', 'Outlined', 'Writing', 'Review', 'Scheduled', 'Published'
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* 1. Core Domain Target Configuration Card */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Globe size={20} />
          </div>
          <div>
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">SEO TARGET PROPERTIES</h4>
            <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Workspace Domain Configuration</p>
          </div>
        </div>

        <form onSubmit={handleSaveDomain} className="grid gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-t3">Active Project Domain</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-t3" size={16} />
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. mybusiness.co.za"
                  className="w-full bg-n600 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-t1 font-bold focus:border-accent/50 transition-all outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingDomain}
                className="bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] px-8 rounded-xl shadow-lg shadow-accent/20 transition-all disabled:opacity-50 h-[46px]"
              >
                {isSavingDomain ? 'Updating...' : 'Save Domain'}
              </button>
            </div>
            <p className="text-[10px] text-t3 font-medium leading-relaxed">
              * Configure your clean domain (without https://) so search indexes match GSC properties correctly.
            </p>
          </div>
        </form>
      </div>

      {/* 1b. Competitor and Google Business Profile Registry Card */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple"></div>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center text-purple">
            <Users size={20} />
          </div>
          <div>
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">COMPETITOR INTELLIGENCE & LOCAL SEO</h4>
            <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Alternative Domains & GBP Match</p>
          </div>
        </div>

        <form onSubmit={handleSaveCompetitors} className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-t3">Competitor Domains (Up to 5)</label>
              <input
                type="text"
                value={competitorsInput}
                onChange={(e) => setCompetitorsInput(e.target.value)}
                placeholder="e.g. competitor1.co.za, competitor2.co.za"
                className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold focus:border-purple/50 transition-all outline-none text-sm"
              />
              <p className="text-[9px] text-t3">Separate multiple domains with commas.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-t3">Google Business Profile Name</label>
              <input
                type="text"
                value={gbpInput}
                onChange={(e) => setGbpInput(e.target.value)}
                placeholder="e.g. LeadsMind Johannesburg"
                className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold focus:border-purple/50 transition-all outline-none text-sm"
              />
              <p className="text-[9px] text-t3">GBP name to detect in Local Map Pack organic pins.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingCompetitors}
              className="bg-purple hover:bg-purple/80 text-white font-black uppercase tracking-widest text-[11px] px-8 py-3 rounded-xl shadow-lg shadow-purple/20 transition-all disabled:opacity-50"
            >
              {isSavingCompetitors ? 'Saving...' : 'Save Competitors'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Google Search Console OAuth Connection & Metrics Averages */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent2"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent2/10 flex items-center justify-center text-accent2">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-space font-bold text-t1 uppercase">GOOGLE SEARCH CONSOLE</h4>
              <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">South Africa Telemetry Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {project?.gsc_connected && (
              <button
                onClick={handleManualSync}
                disabled={isSyncingGSC}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-t2 hover:text-t1 rounded-xl text-[11px] font-bold transition-all border border-white/5 uppercase tracking-widest"
              >
                <RefreshCw size={12} className={isSyncingGSC ? 'animate-spin text-accent' : ''} />
                Sync Telemetry
              </button>
            )}
            <button
              onClick={handleConnectGSC}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                project?.gsc_connected 
                  ? 'bg-green/10 text-green border border-green/20 hover:bg-green/20' 
                  : 'bg-accent hover:bg-accent2 text-white shadow-lg shadow-accent/20'
              }`}
            >
              <CheckCircle size={14} />
              {project?.gsc_connected ? 'Connected (Re-auth)' : 'Connect GSC'}
            </button>
          </div>
        </div>

        {/* Sync telemetry highlights */}
        {project?.gsc_connected ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
              <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">30-Day Clicks (ZAF)</p>
              <h3 className="text-2xl font-space font-bold text-t1">{project.cached_gsc_clicks}</h3>
              <p className="text-[9px] text-green font-semibold">● Active Sync</p>
            </div>
            <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
              <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">30-Day Impressions</p>
              <h3 className="text-2xl font-space font-bold text-t1">{project.cached_gsc_impressions}</h3>
              <p className="text-[9px] text-accent2 font-semibold">● Clean Telemetry</p>
            </div>
            <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
              <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Average CTR</p>
              <h3 className="text-2xl font-space font-bold text-amber">{(project.cached_gsc_ctr * 100).toFixed(2)}%</h3>
              <p className="text-[9px] text-t3 font-medium uppercase tracking-widest">South African queries</p>
            </div>
            <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
              <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Average Position</p>
              <h3 className="text-2xl font-space font-bold text-purple">{project.cached_gsc_position.toFixed(1)}</h3>
              <p className="text-[9px] text-t3 font-medium uppercase tracking-widest">Avg SERP Ranking</p>
            </div>
          </div>
        ) : (
          <div className="bg-n600/30 border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle size={28} className="text-amber" />
            <div>
              <h5 className="text-[13px] font-bold text-t1 uppercase">Telemetry Not Linked</h5>
              <p className="text-[11px] text-t3 max-w-md mt-1">
                Link your Google Search Console to dynamically fetch South African clicks, impressions, and keyword rankings automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2b. Live SERP Feature Averages & Sync Controllers */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent2"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div>
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">SERP TELEMETRY ENGINE</h4>
            <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">DataForSEO Organic Features Status</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncRanks}
              disabled={isSyncingRanks}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent2 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20"
            >
              <RefreshCw size={12} className={isSyncingRanks ? 'animate-spin' : ''} />
              {isSyncingRanks ? 'Checking SERPs...' : 'Sync Rank Telemetry'}
            </button>

            <button
              onClick={handleSyncCompetitorKeywords}
              disabled={isSyncingCompetitorKeywords}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-t2 hover:text-t1 rounded-xl text-[11px] font-bold border border-white/5 uppercase tracking-widest transition-all"
            >
              <Calendar size={12} className={isSyncingCompetitorKeywords ? 'animate-spin text-purple' : ''} />
              {isSyncingCompetitorKeywords ? 'Scanning...' : 'Weekly Competitor Scan'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-amber bg-amber/10 p-1.5 rounded-lg">
              <Star size={16} />
            </div>
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Featured Snippets Owned</p>
            <h3 className="text-2xl font-space font-bold text-amber">{totalFeaturedSnippets}</h3>
            <p className="text-[9px] text-t3">Target queries holding Rank #1 snippet</p>
          </div>

          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-green bg-green/10 p-1.5 rounded-lg">
              <MapPin size={16} />
            </div>
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">GBP Map Pack Presence</p>
            <h3 className="text-2xl font-space font-bold text-green">{totalLocalPacks}</h3>
            <p className="text-[9px] text-t3">Keywords where your GBP name is pinned</p>
          </div>

          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-purple bg-purple/10 p-1.5 rounded-lg">
              <Search size={16} />
            </div>
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Average PAA Questions</p>
            <h3 className="text-2xl font-space font-bold text-purple">{avgPAAQuestions}</h3>
            <p className="text-[9px] text-t3">Average question cards surfaced on SERPs</p>
          </div>
        </div>
      </div>

      {/* 2c. SA Competitor Gap Comparison Card */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber"></div>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center text-amber">
            <TrendingUp size={20} />
          </div>
          <div>
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">SA COMPETITOR KEYWORD GAP</h4>
            <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Competitor ranks ≤ 20, Client does not rank</p>
          </div>
        </div>

        {metrics?.gapAnalysis?.length > 0 ? (
          <div className="border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-n600 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-t3">
                  <th className="px-5 py-3.5">Keyword</th>
                  <th className="px-5 py-3.5">Threat Domain</th>
                  <th className="px-5 py-3.5 text-center">Competitor Rank</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {metrics.gapAnalysis.map((gap: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors font-medium">
                    <td className="px-5 py-3.5 text-t1 font-bold font-space">{gap.keyword}</td>
                    <td className="px-5 py-3.5 text-t2 font-mono text-[11px]">{gap.competitor_domain}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber/10 text-amber rounded text-[11px] font-bold">
                        Rank #{gap.competitor_rank}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setPipelineKeywordInput(gap.keyword);
                          setPipelineTitleInput(`SEO Capture Campaign: ${gap.keyword}`);
                          toast.info(`Pre-filled Content Pipeline form for "${gap.keyword}". Create your campaign card below.`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-amber text-black hover:bg-amber/80 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ml-auto shadow-md"
                      >
                        <Plus size={10} />
                        Queue Editorial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-n600/10 border border-dashed border-white/5 rounded-xl py-8 flex flex-col items-center justify-center text-center space-y-2">
            <AlertCircle className="text-t3" size={24} />
            <h5 className="text-[12px] font-bold text-t2 uppercase">No Competitor Gaps Found</h5>
            <p className="text-[11px] text-t3 max-w-sm">No competitor domains rank in the top 20 for keywords you aren't indexing.</p>
          </div>
        )}
      </div>

      {/* 3. Tracked Keywords & SERP Monitor */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple"></div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center text-purple">
              <Search size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-space font-bold text-t1 uppercase">KEYWORD SERP MONITOR</h4>
              <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Active Search Target Queries</p>
            </div>
          </div>
        </div>

        {/* Add keyword form */}
        <form onSubmit={handleAddKeyword} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-n600/40 p-4 border border-white/5 rounded-xl">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Keyword</label>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="e.g. CRM software South Africa"
              className="w-full bg-n900 border border-white/5 rounded-lg px-3 py-2 text-t1 text-[12px] font-semibold focus:border-accent/40 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Target URL (Optional)</label>
            <input
              type="text"
              value={targetUrlInput}
              onChange={(e) => setTargetUrlInput(e.target.value)}
              placeholder="e.g. /features/crm"
              className="w-full bg-n900 border border-white/5 rounded-lg px-3 py-2 text-t1 text-[12px] font-semibold focus:border-accent/40 outline-none"
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={isAddingKeyword || !project}
              className="w-full bg-purple hover:bg-purple/80 text-white font-black uppercase tracking-widest text-[10px] h-[34px] px-6 rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              {isAddingKeyword ? 'Adding...' : 'Add Keyword'}
            </button>
          </div>
        </form>

        {/* Keywords list */}
        {keywords.length > 0 ? (
          <div className="border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-n600 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-t3">
                  <th className="px-5 py-3.5">Keyword</th>
                  <th className="px-5 py-3.5">Target Landing URL</th>
                  <th className="px-5 py-3.5 text-center">Your Rank</th>
                  <th className="px-5 py-3.5 text-left">Competitor Ranks</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {keywords.map((kw) => {
                  const latestLog = latestRankLogMap.get(kw.keyword);
                  const clientRank = latestLog ? latestLog.rank : null;
                  const hasSnippet = latestLog ? latestLog.featured_snippet : false;
                  const hasMapPack = latestLog ? latestLog.local_pack : false;
                  const compRanks = latestLog ? latestLog.competitor_ranks : {};

                  return (
                    <tr key={kw.id} className="hover:bg-white/[0.02] transition-colors font-medium">
                      <td className="px-5 py-3.5 text-t1 font-bold font-space">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            {kw.keyword}
                            {hasSnippet && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-amber/10 text-amber text-[8px] font-black rounded uppercase tracking-wider gap-0.5" title="Owns Featured Snippet">
                                🌟 Snippet
                              </span>
                            )}
                            {hasMapPack && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-green/10 text-green text-[8px] font-black rounded uppercase tracking-wider gap-0.5" title="GBP in Local Map Pack">
                                📍 Map Pack
                              </span>
                            )}
                          </span>
                          {latestLog?.ranking_url && (
                            <a 
                              href={latestLog.ranking_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-accent hover:underline flex items-center gap-1 mt-0.5 font-normal"
                            >
                              <ExternalLink size={8} /> View SERP landing page
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-t2 font-mono text-[11px]">{kw.target_url || '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          clientRank !== null 
                            ? 'bg-accent/10 text-accent border border-accent/20' 
                            : 'bg-white/[0.02] text-t3 border border-white/5'
                        }`}>
                          {clientRank !== null ? `RANK #${clientRank}` : 'UNRANKED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-left max-w-[180px] overflow-hidden truncate">
                        {project?.competitor_domains?.length > 0 ? (
                          <div className="flex flex-col gap-1 text-[10px] text-t3">
                            {project.competitor_domains.map((comp: string) => {
                              const r = compRanks?.[comp];
                              return (
                                <div key={comp} className="flex justify-between gap-2 border-b border-white/[0.02] pb-0.5">
                                  <span className="truncate">{comp}:</span>
                                  <span className={r ? 'text-amber font-bold' : 'text-t3'}>{r ? `#${r}` : '—'}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-t3 italic">No competitors</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setPipelineKeywordInput(kw.keyword);
                              setPipelineTitleInput(`SEO Article: ${kw.keyword}`);
                              toast.info(`Pre-filled content pipeline card for "${kw.keyword}". Scroll to Content Pipeline below.`);
                            }}
                            className="p-1.5 text-t3 hover:text-accent hover:bg-accent/10 border border-transparent hover:border-accent/10 rounded-lg transition-all"
                            title="Send to Content Pipeline"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteKeyword(kw.id)}
                            className="p-1.5 text-t3 hover:text-red hover:bg-red/10 border border-transparent hover:border-red/10 rounded-lg transition-all"
                            title="Remove Keyword"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-n600/10 border border-dashed border-white/5 rounded-xl py-12 flex flex-col items-center justify-center text-center space-y-2">
            <Search className="text-t3" size={24} />
            <h5 className="text-[12px] font-bold text-t2 uppercase">No tracked keywords</h5>
            <p className="text-[11px] text-t3 max-w-sm">Add target search keywords above to begin indexing search impressions.</p>
          </div>
        )}
      </div>

      {/* 4. Content Pipeline Manager */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber"></div>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center text-amber">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">SEO CONTENT PIPELINE</h4>
            <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">8-Stage Structural Editorial Workflow</p>
          </div>
        </div>

        {/* Content Pipeline Form */}
        <form onSubmit={handleAddPipelineItem} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-n600/40 p-4 border border-white/5 rounded-xl text-[12px]">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Keyword</label>
            <input
              type="text"
              value={pipelineKeywordInput}
              onChange={(e) => setPipelineKeywordInput(e.target.value)}
              placeholder="e.g. Sales Funnels guide"
              className="w-full bg-n900 border border-white/5 rounded-lg px-3 py-2 text-t1 text-[12px] font-semibold focus:border-accent/40 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Article Working Title</label>
            <input
              type="text"
              value={pipelineTitleInput}
              onChange={(e) => setPipelineTitleInput(e.target.value)}
              placeholder="e.g. Complete Guide to Sales Funnels"
              className="w-full bg-n900 border border-white/5 rounded-lg px-3 py-2 text-t1 text-[12px] font-semibold focus:border-accent/40 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Workflow Stage</label>
            <select
              value={pipelineStatusInput}
              onChange={(e: any) => setPipelineStatusInput(e.target.value)}
              className="w-full bg-n900 border border-white/5 rounded-lg px-3 py-2.5 text-t1 text-[11px] font-bold focus:border-accent/40 outline-none uppercase tracking-wider"
            >
              {pipelineStages.map((stage) => (
                <option key={stage} value={stage}>{stage.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={isAddingPipeline || !project}
              className="w-full bg-amber hover:bg-amber/80 text-white font-black uppercase tracking-widest text-[10px] h-[34px] px-6 rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              {isAddingPipeline ? 'Create Card' : 'Create Card'}
            </button>
          </div>
        </form>

        {/* Content Pipeline Cards List */}
        {pipelineItems.length > 0 ? (
          <div className="grid gap-3">
            {pipelineItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-n600/30 border border-white/5 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 h-full w-0.5 bg-amber/50"></div>
                <div className="space-y-1">
                  <span className="text-[9px] text-t3 font-black uppercase tracking-widest">Keyword: {item.keyword}</span>
                  <h4 className="text-[13px] font-space font-bold text-t1 uppercase leading-tight">{item.title || 'Untitled Campaign Card'}</h4>
                  <p className="text-[10px] text-t3 font-medium">Created: {new Date(item.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-t3 font-bold uppercase tracking-widest block text-right">Update Workflow Stage</label>
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdatePipelineStatus(item.id, e.target.value as any)}
                      className="bg-n900 border border-white/5 text-amber text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-accent/40"
                    >
                      {pipelineStages.map((stage) => (
                        <option key={stage} value={stage}>{stage.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={() => handleDeletePipelineItem(item.id)}
                    className="p-2 text-t3 hover:text-red hover:bg-red/10 border border-transparent hover:border-red/10 rounded-lg transition-all self-end"
                    title="Delete Card"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-n600/10 border border-dashed border-white/5 rounded-xl py-12 flex flex-col items-center justify-center text-center space-y-2">
            <FileText className="text-t3" size={24} />
            <h5 className="text-[12px] font-bold text-t2 uppercase">Content pipeline empty</h5>
            <p className="text-[11px] text-t3 max-w-sm">Construct editorial workflow stages to schedule publications.</p>
          </div>
        )}
      </div>

    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, TrendingUp, Plus, Trash2, CheckCircle, RefreshCw, 
  BarChart2, Calendar, FileText, ChevronRight, ChevronLeft, ExternalLink, Play, 
  AlertCircle, AlertTriangle, Info, Users, Star, MapPin, ShieldCheck, Activity
} from 'lucide-react';
import { 
  getGoogleAuthUrl, getSeoProject, updateSeoProjectDomain, getTrackedKeywords, 
  addTrackedKeyword, deleteTrackedKeyword, getContentPipeline, addPipelineItem, 
  updatePipelineStatus, deletePipelineItem, getSeoMetricsSummary,
  updateSeoProjectCompetitors, triggerDataForSeoSync, triggerCompetitorKeywordsWeekly,
  updatePipelineItemCost, runPipelineAutomation, runRevenueRollup, getRevenueAttributionMetrics,
  triggerSiteHealthCrawl, getLatestSiteHealthCrawl
} from '@/app/actions/seo';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function SeoTab() {
  // Database States
  const [project, setProject] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [pipelineItems, setPipelineItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueAttribution, setRevenueAttribution] = useState<any[]>([]);
  const [latestCrawl, setLatestCrawl] = useState<any>(null);
  const [isCrawlingHealth, setIsCrawlingHealth] = useState(false);

  // UI Interactive States
  const [domainInput, setDomainInput] = useState('');
  const [competitorsInput, setCompetitorsInput] = useState('');
  const [gbpInput, setGbpInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [targetUrlInput, setTargetUrlInput] = useState('');
  const [pipelineKeywordInput, setPipelineKeywordInput] = useState('');
  const [pipelineTitleInput, setPipelineTitleInput] = useState('');
  const [pipelineDateInput, setPipelineDateInput] = useState('');
  const [pipelineStatusInput, setPipelineStatusInput] = useState<'Idea' | 'Research' | 'Approved' | 'Outlined' | 'Writing' | 'Review' | 'Scheduled' | 'Published' | 'Indexing' | 'ranking_11_50'>('Idea');

  // Loading/Processing states
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isSavingCompetitors, setIsSavingCompetitors] = useState(false);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [isAddingPipeline, setIsAddingPipeline] = useState(false);
  const [isSyncingGSC, setIsSyncingGSC] = useState(false);
  const [isSyncingRanks, setIsSyncingRanks] = useState(false);
  const [isSyncingCompetitorKeywords, setIsSyncingCompetitorKeywords] = useState(false);
  const [isRunningRollup, setIsRunningRollup] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  // Load everything on mount
  useEffect(() => {
    loadAllSeoData();
  }, []);

  const loadAllSeoData = async () => {
    setIsLoading(true);
    try {
      const [projectRes, keywordsRes, pipelineRes, metricsRes, revRes] = await Promise.all([
        getSeoProject(),
        getTrackedKeywords(),
        getContentPipeline(),
        getSeoMetricsSummary(),
        getRevenueAttributionMetrics()
      ]);

      if (projectRes.data) {
        setProject(projectRes.data);
        setDomainInput(projectRes.data.domain_url || '');
        setCompetitorsInput(projectRes.data.competitor_domains?.join(', ') || '');
        setGbpInput(projectRes.data.google_business_profile || '');

        // Fetch latest crawl results
        try {
          const crawlRes = await getLatestSiteHealthCrawl(projectRes.data.id);
          if (crawlRes && crawlRes.data) {
            setLatestCrawl(crawlRes.data);
          } else {
            setLatestCrawl(null);
          }
        } catch (crawlErr: any) {
          console.error('Failed fetching latest health crawl:', crawlErr);
        }
      }
      if (keywordsRes.data) setKeywords(keywordsRes.data);
      if (pipelineRes.data) setPipelineItems(pipelineRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (revRes.data) setRevenueAttribution(revRes.data);
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
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Keyword?',
      description: 'Are you sure you want to delete this keyword from SERP tracking?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const res = await deleteTrackedKeyword(id);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Keyword removed successfully.');
          loadAllSeoData();
        }
      }
    });
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
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Pipeline Item?',
      description: 'Permanently remove this content card?',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        const res = await deletePipelineItem(id);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Pipeline item deleted.');
          loadAllSeoData();
        }
      }
    });
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

  const handleRunRollup = async () => {
    setIsRunningRollup(true);
    toast.info('Calculating closed-loop revenue metrics and RPV indexes...');
    try {
      const res = await runRevenueRollup();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Daily revenue attribution rollup calculated successfully.');
        loadAllSeoData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Rollup failed.');
    } finally {
      setIsRunningRollup(false);
    }
  };

  const handleRunPipelineAutomation = async () => {
    setIsRunningAutomation(true);
    toast.info('Running GSC performance & SERP tracking auto-promotions...');
    try {
      const res = await runPipelineAutomation();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Pipeline automation and promotion scan completed.');
        loadAllSeoData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Automation failed.');
    } finally {
      setIsRunningAutomation(false);
    }
  };

  const handleTriggerHealthCrawl = async () => {
    if (!project?.id || !project?.domain_url) {
      toast.error('Please configure your SEO target domain first.');
      return;
    }
    setIsCrawlingHealth(true);
    toast.info('Starting onsite SEO crawler & Core Web Vitals checks. This may take up to 30 seconds...');
    try {
      const res = await triggerSiteHealthCrawl(project.id, project.domain_url);
      if (res.error) {
        toast.error(`Crawl failed: ${res.error}`);
      } else {
        toast.success('Site health crawl and metrics captured successfully!');
        setLatestCrawl(res.data);
        loadAllSeoData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Onsite health crawl failed.');
    } finally {
      setIsCrawlingHealth(false);
    }
  };

  const KANBAN_COLUMNS = [
    { id: 'research', title: 'Research', stages: ['Idea', 'Research'], defaultStage: 'Idea' },
    { id: 'outlining', title: 'Outlining', stages: ['Approved', 'Outlined'], defaultStage: 'Approved' },
    { id: 'writing', title: 'Writing', stages: ['Writing'], defaultStage: 'Writing' },
    { id: 'review', title: 'Review', stages: ['Review', 'Scheduled'], defaultStage: 'Review' },
    { id: 'published', title: 'Published', stages: ['Published'], defaultStage: 'Published' },
    { id: 'ranking', title: 'Ranking', stages: ['Indexing', 'ranking_11_50'], defaultStage: 'Indexing' }
  ];

  const handleShiftColumn = async (id: string, currentStatus: string, direction: 'left' | 'right') => {
    const colIdx = KANBAN_COLUMNS.findIndex(col => col.stages.includes(currentStatus));
    if (colIdx === -1) return;

    let targetColIdx = colIdx;
    if (direction === 'left' && colIdx > 0) {
      targetColIdx = colIdx - 1;
    } else if (direction === 'right' && colIdx < KANBAN_COLUMNS.length - 1) {
      targetColIdx = colIdx + 1;
    }

    if (targetColIdx !== colIdx) {
      const targetStage = KANBAN_COLUMNS[targetColIdx].defaultStage;
      const res = await updatePipelineStatus(id, targetStage as any);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Moved item to ${KANBAN_COLUMNS[targetColIdx].title}`);
        loadAllSeoData();
      }
    }
  };

  const getRankBadgeProps = (rank: number | null) => {
    if (rank === null) {
      return {
        className: 'bg-red-500/10 text-red-400 border border-red-500/20',
        label: 'UNRANKED'
      };
    }
    if (rank >= 1 && rank <= 3) {
      return {
        className: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
        label: `RANK #${rank}`
      };
    }
    if (rank >= 4 && rank <= 10) {
      return {
        className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        label: `RANK #${rank}`
      };
    }
    if (rank >= 11 && rank <= 20) {
      return {
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        label: `RANK #${rank}`
      };
    }
    if (rank >= 21 && rank <= 50) {
      return {
        className: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
        label: `RANK #${rank}`
      };
    }
    return {
      className: 'bg-red-500/10 text-red-400 border border-red-500/20',
      label: `RANK #${rank}`
    };
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

  // Compute Phase 3 closed-loop revenue metrics
  let totalWonRevenue = 0;
  let totalContentCost = 0;
  let totalVisitors = 0;
  let weightedRpv = 0;
  let aggregateRoi = 0;

  if (revenueAttribution && revenueAttribution.length > 0) {
    // Group by keyword to get latest rollup per keyword
    const latestRollupByKeyword = new Map<string, any>();
    const sortedRollups = [...revenueAttribution].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedRollups.forEach((item: any) => {
      latestRollupByKeyword.set(item.keyword, item);
    });

    const uniqueRollups = Array.from(latestRollupByKeyword.values());
    uniqueRollups.forEach((item: any) => {
      totalWonRevenue += Number(item.total_revenue || 0);
      totalContentCost += Number(item.total_cost || 0);
      totalVisitors += Number(item.total_visitors || 0);
    });

    if (totalVisitors > 0) {
      weightedRpv = totalWonRevenue / totalVisitors;
    }
    if (totalContentCost > 0) {
      aggregateRoi = ((totalWonRevenue - totalContentCost) / totalContentCost) * 100;
    }
  }

  const pipelineStages: ('Idea' | 'Research' | 'Approved' | 'Outlined' | 'Writing' | 'Review' | 'Scheduled' | 'Published' | 'Indexing' | 'ranking_11_50')[] = [
    'Idea', 'Research', 'Approved', 'Outlined', 'Writing', 'Review', 'Scheduled', 'Published', 'Indexing', 'ranking_11_50'
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* SEO & Technical Health Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Domain & Crawler Controller */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Activity size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Onsite Health Audit</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-t1 uppercase font-space truncate" title={project?.domain_url || 'Domain Not Configured'}>
                {project?.domain_url || 'No Domain Configured'}
              </h3>
              <p className="text-[9px] text-t3 font-medium uppercase tracking-widest mt-0.5">
                {latestCrawl ? `Last Scanned: ${new Date(latestCrawl.created_at).toLocaleDateString()}` : 'Never Scanned'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTriggerHealthCrawl}
            disabled={isCrawlingHealth || !project?.domain_url}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-accent hover:bg-accent2 disabled:bg-white/5 disabled:text-t3 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] py-2.5 rounded-xl transition-all shadow-lg shadow-accent/10"
          >
            <RefreshCw size={12} className={isCrawlingHealth ? 'animate-spin' : ''} />
            {isCrawlingHealth ? 'Auditing...' : 'Run Health Audit'}
          </button>
        </div>

        {/* Card 2: Composite Health Score */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-green">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Composite Health</span>
              </div>
              <h3 className="text-3xl font-space font-bold mt-2 text-t1">
                {latestCrawl ? `${latestCrawl.health_score}/100` : '--'}
              </h3>
            </div>
            {latestCrawl && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                latestCrawl.health_score >= 80 ? 'bg-green/10 text-green' :
                latestCrawl.health_score >= 50 ? 'bg-amber/10 text-amber' : 'bg-red/10 text-red'
              }`}>
                {latestCrawl.health_score >= 80 ? 'OPTIMAL' :
                 latestCrawl.health_score >= 50 ? 'WARNING' : 'CRITICAL'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-white/5 pt-3 mt-2 text-t3 font-medium">
            <div className="flex justify-between">
              <span>Pages:</span>
              <span className="text-t2 font-bold">{latestCrawl ? latestCrawl.pages_crawled : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>Errors:</span>
              <span className={`font-bold ${latestCrawl?.pages_with_errors?.length > 0 ? 'text-red' : 'text-t2'}`}>
                {latestCrawl ? latestCrawl.pages_with_errors?.length : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Redirects:</span>
              <span className="text-t2 font-bold">{latestCrawl ? latestCrawl.redirect_chains?.length : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>Missing Alt:</span>
              <span className="text-t2 font-bold">
                {latestCrawl ? latestCrawl.missing_alts?.reduce((acc: number, curr: any) => acc + (curr.images?.length || 0), 0) : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Core Web Vitals (Desktop) */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-purple font-black uppercase tracking-widest block">PageSpeed Desktop</span>
              <h3 className="text-3xl font-space font-bold mt-1 text-t1">
                {latestCrawl?.desktop_performance ? `${latestCrawl.desktop_performance}` : '--'}
              </h3>
            </div>
            {latestCrawl?.desktop_performance && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                latestCrawl.desktop_performance >= 90 ? 'bg-green/10 text-green' :
                latestCrawl.desktop_performance >= 50 ? 'bg-amber/10 text-amber' : 'bg-red/10 text-red'
              }`}>
                {latestCrawl.desktop_performance >= 90 ? 'FAST' :
                 latestCrawl.desktop_performance >= 50 ? 'AVERAGE' : 'SLOW'}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] border-t border-white/5 pt-3 mt-2 text-t3">
            <div className="flex justify-between">
              <span>FCP:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.desktop_fcp ? `${latestCrawl.desktop_fcp}s` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.desktop_lcp ? `${latestCrawl.desktop_lcp}s` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.desktop_cls ? `${latestCrawl.desktop_cls}` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>TBT:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.desktop_tbt ? `${latestCrawl.desktop_tbt}ms` : '--'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Core Web Vitals (Mobile) */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-amber font-black uppercase tracking-widest block">PageSpeed Mobile</span>
              <h3 className="text-3xl font-space font-bold mt-1 text-t1">
                {latestCrawl?.mobile_performance ? `${latestCrawl.mobile_performance}` : '--'}
              </h3>
            </div>
            {latestCrawl?.mobile_performance && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                latestCrawl.mobile_performance >= 90 ? 'bg-green/10 text-green' :
                latestCrawl.mobile_performance >= 50 ? 'bg-amber/10 text-amber' : 'bg-red/10 text-red'
              }`}>
                {latestCrawl.mobile_performance >= 90 ? 'FAST' :
                 latestCrawl.mobile_performance >= 50 ? 'AVERAGE' : 'SLOW'}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] border-t border-white/5 pt-3 mt-2 text-t3">
            <div className="flex justify-between">
              <span>FCP:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.mobile_fcp ? `${latestCrawl.mobile_fcp}s` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.mobile_lcp ? `${latestCrawl.mobile_lcp}s` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.mobile_cls ? `${latestCrawl.mobile_cls}` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>TBT:</span>
              <span className="text-t2 font-bold font-mono">{latestCrawl?.mobile_tbt ? `${latestCrawl.mobile_tbt}ms` : '--'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onsite Crawl Issues Checklist */}
      {latestCrawl && latestCrawl.issues_list && latestCrawl.issues_list.length > 0 && (
        <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red"></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center text-red">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-space font-bold text-t1 uppercase">ON-SITE SEO CHECKLIST & VULNERABILITIES</h4>
              <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">
                Itemized issues linkable to Content Studio editor fix recommendations
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {latestCrawl.issues_list.map((issue: any, index: number) => {
              const isCritical = issue.type === 'critical';
              const isWarning = issue.type === 'warning';
              
              return (
                <div 
                  key={index} 
                  className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all bg-n600/30 ${
                    isCritical ? 'border-red-500/20' : isWarning ? 'border-amber-500/20' : 'border-white/5'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 shrink-0 ${isCritical ? 'text-red' : isWarning ? 'text-amber' : 'text-accent'}`}>
                      {isCritical ? <AlertCircle size={16} /> : isWarning ? <AlertTriangle size={16} /> : <Info size={16} />}
                    </div>
                    <div className="space-y-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        isCritical ? 'text-red' : isWarning ? 'text-amber' : 'text-accent'
                      }`}>
                        {issue.type.toUpperCase()}
                      </span>
                      <p className="text-[12px] font-space font-bold text-t1 uppercase leading-snug">
                        {issue.message}
                      </p>
                      {issue.pageUrl && (
                        <p className="text-[10px] text-t3 font-mono break-all font-medium">
                          Page: {issue.pageUrl}
                        </p>
                      )}
                      <p className="text-[11px] text-t3 leading-relaxed">
                        <strong className="text-t2">Recommended Fix: </strong> {issue.fix}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <a
                      href={issue.contentStudioLinkId ? `/blog/editor/${issue.contentStudioLinkId}` : '/blog/manage'}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 border rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                        issue.contentStudioLinkId 
                          ? 'bg-accent/15 hover:bg-accent/25 text-accent border-accent/25' 
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-t2 border-white/5'
                      }`}
                    >
                      {issue.contentStudioLinkId ? (
                        <>
                          Fix in Content Studio
                          <ExternalLink size={10} />
                        </>
                      ) : (
                        'Open Content Studio'
                      )}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* 2d. CRM Revenue Attribution & Closed-loop ROI Dashboard */}
      <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="absolute top-0 left-0 w-1 h-full bg-green"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center text-green">
              <BarChart2 size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-space font-bold text-t1 uppercase">CRM REVENUE ATTRIBUTION</h4>
              <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Closed-loop ROI & Keyword Monetization</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunPipelineAutomation}
              disabled={isRunningAutomation}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-t2 hover:text-t1 rounded-xl text-[11px] font-bold border border-white/5 uppercase tracking-widest transition-all"
            >
              <RefreshCw size={12} className={isRunningAutomation ? 'animate-spin text-amber' : ''} />
              {isRunningAutomation ? 'Promoting...' : 'Run Pipeline Automation'}
            </button>
            
            <button
              onClick={handleRunRollup}
              disabled={isRunningRollup}
              className="flex items-center gap-2 px-4 py-2.5 bg-green hover:bg-green/80 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green/20"
            >
              <Play size={12} className={isRunningRollup ? 'animate-spin' : ''} />
              {isRunningRollup ? 'Calculating...' : 'Run Revenue Rollup'}
            </button>
          </div>
        </div>

        {/* Revenue Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Total Won Revenue</p>
            <h3 className="text-2xl font-space font-bold text-t1">R {totalWonRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-green font-semibold">● CRM Won Deals</p>
          </div>
          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Total Content Cost</p>
            <h3 className="text-2xl font-space font-bold text-t1">R {totalContentCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-amber font-semibold">● Production Cost</p>
          </div>
          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Revenue per Visitor (RPV)</p>
            <h3 className="text-2xl font-space font-bold text-accent">R {weightedRpv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-t3 font-medium uppercase tracking-widest">Total Value / Click</p>
          </div>
          <div className="bg-n600/50 border border-white/5 rounded-xl p-5 space-y-1">
            <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Aggregate SEO ROI</p>
            <h3 className={`text-2xl font-space font-bold ${aggregateRoi >= 0 ? 'text-green' : 'text-red'}`}>
              {aggregateRoi.toFixed(2)}%
            </h3>
            <p className="text-[9px] text-t3 font-medium uppercase tracking-widest">Pipeline Cost vs Return</p>
          </div>
        </div>

        {/* Detailed Keyword Rollup Table */}
        {revenueAttribution.length > 0 ? (
          <div className="border border-white/5 rounded-xl overflow-hidden pt-2">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-n600 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-t3">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Keyword</th>
                  <th className="px-5 py-3.5 text-center">Visitors (Clicks)</th>
                  <th className="px-5 py-3.5 text-center">Won Deals</th>
                  <th className="px-5 py-3.5 text-right">Revenue</th>
                  <th className="px-5 py-3.5 text-right">Content Cost</th>
                  <th className="px-5 py-3.5 text-center">RPV</th>
                  <th className="px-5 py-3.5 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {revenueAttribution.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors font-medium">
                    <td className="px-5 py-3.5 text-t3 font-mono text-[11px]">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-t1 font-bold font-space">{item.keyword}</td>
                    <td className="px-5 py-3.5 text-center text-t2">{item.total_visitors}</td>
                    <td className="px-5 py-3.5 text-center text-t2">
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-green/10 text-green rounded text-[11px] font-bold">
                        {item.won_deals_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-t1 font-mono">R {Number(item.total_revenue).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right text-t2 font-mono">R {Number(item.total_cost).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-center text-accent font-mono">R {Number(item.rpv).toFixed(2)}</td>
                    <td className={`px-5 py-3.5 text-right font-mono font-bold ${Number(item.roi) >= 0 ? 'text-green' : 'text-red'}`}>
                      {Number(item.roi).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-n600/10 border border-dashed border-white/5 rounded-xl py-8 flex flex-col items-center justify-center text-center space-y-2">
            <AlertCircle className="text-t3" size={24} />
            <h5 className="text-[12px] font-bold text-t2 uppercase">No Attribution Rollup Logs</h5>
            <p className="text-[11px] text-t3 max-w-sm">No keyword organic contacts have closed won deals. Trigger a daily rollup to scan.</p>
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
                        {(() => {
                          const badge = getRankBadgeProps(clientRank);
                          return (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
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
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin">
            {KANBAN_COLUMNS.map((col) => {
              const colItems = pipelineItems.filter(item => col.stages.includes(item.status));
              return (
                <div key={col.id} className="min-w-[280px] max-w-[320px] flex-1 bg-n900/60 border border-white/5 rounded-2xl p-4 flex flex-col space-y-4">
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <h5 className="text-[12px] font-space font-extrabold text-t1 uppercase">{col.title}</h5>
                      <p className="text-[8px] text-t3 tracking-wider font-semibold uppercase">{col.stages.join(' / ')}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-white/5 text-t3 px-2 py-0.5 rounded-full">
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                    {colItems.length > 0 ? (
                      colItems.map((item) => (
                        <div 
                          key={item.id} 
                          className={`bg-n800 border rounded-xl p-4 flex flex-col gap-3 hover:border-white/10 transition-all relative overflow-hidden group ${
                            item.is_stuck ? 'border-amber/30 shadow-lg shadow-amber/5' : 'border-white/5'
                          }`}
                        >
                          <div className={`absolute top-0 left-0 h-full w-1 ${item.is_stuck ? 'bg-amber' : 'bg-amber/50'}`}></div>
                          
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[9px] text-t3 font-black uppercase tracking-widest truncate max-w-[150px]" title={item.keyword}>
                              {item.keyword}
                            </span>
                            <button
                              onClick={() => handleDeletePipelineItem(item.id)}
                              className="text-t3 hover:text-red p-1 rounded hover:bg-red/10 transition-all"
                              title="Delete Card"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Card Title */}
                          <div className="space-y-1">
                            <h6 className="text-[12px] font-space font-bold text-t1 uppercase leading-snug">
                              {item.title || 'Untitled Campaign'}
                            </h6>
                            <p className="text-[9px] text-t3 font-medium">
                              Created: {new Date(item.created_at).toLocaleDateString()}
                            </p>
                            {item.is_stuck && (
                              <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber/10 text-amber text-[8px] font-black rounded border border-amber/20 uppercase tracking-widest animate-pulse">
                                ⚠️ STUCK (&gt;21 DAYS)
                              </div>
                            )}
                          </div>

                          {/* Card Controls */}
                          <div className="pt-2 border-t border-white/5 space-y-2.5">
                            {/* Inline cost */}
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[9px] text-t3 font-bold uppercase tracking-widest">Cost (ZAR)</label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-t3 font-mono text-[9px]">R</span>
                                <input
                                  type="number"
                                  defaultValue={item.cost || 0}
                                  onBlur={async (e) => {
                                    const newCost = parseFloat(e.target.value) || 0;
                                    if (newCost !== item.cost) {
                                      const res = await updatePipelineItemCost(item.id, newCost);
                                      if (res.error) {
                                        toast.error(res.error);
                                      } else {
                                        toast.success(`Updated cost for "${item.keyword}" to R${newCost}`);
                                        loadAllSeoData();
                                      }
                                    }
                                  }}
                                  className="bg-n900 border border-white/5 text-t1 font-mono text-[9px] pl-5 pr-1 py-1 rounded outline-none w-20 text-right focus:border-accent/40"
                                />
                              </div>
                            </div>

                            {/* Workflow Stage */}
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[9px] text-t3 font-bold uppercase tracking-widest">Stage</label>
                              <select
                                value={item.status}
                                onChange={(e) => handleUpdatePipelineStatus(item.id, e.target.value as any)}
                                className="bg-n900 border border-white/5 text-amber text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded outline-none cursor-pointer focus:border-accent/40 w-28"
                              >
                                {pipelineStages.map((stage) => (
                                  <option key={stage} value={stage}>{stage.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>

                            {/* Quick Shift Arrows */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[8px] text-t3 font-semibold uppercase">Shift Stage</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleShiftColumn(item.id, item.status, 'left')}
                                  disabled={col.id === 'research'}
                                  className="p-1 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:text-accent disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-t3 transition-all text-t3"
                                  title="Shift Left"
                                >
                                  <ChevronLeft size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShiftColumn(item.id, item.status, 'right')}
                                  disabled={col.id === 'ranking'}
                                  className="p-1 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:text-accent disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-t3 transition-all text-t3"
                                  title="Shift Right"
                                >
                                  <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 py-12 flex flex-col items-center justify-center text-center border border-dashed border-white/5 rounded-xl text-t3 text-[10px] space-y-1">
                        <span>Empty Stage</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-n600/10 border border-dashed border-white/5 rounded-xl py-12 flex flex-col items-center justify-center text-center space-y-2">
            <FileText className="text-t3" size={24} />
            <h5 className="text-[12px] font-bold text-t2 uppercase">Content pipeline empty</h5>
            <p className="text-[11px] text-t3 max-w-sm">Construct editorial workflow stages to schedule publications.</p>
          </div>
        )}
      </div>
      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="danger"
        />
      )}
    </div>
  );
}

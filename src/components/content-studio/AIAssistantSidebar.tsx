'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkGrammarAndStyle } from '@/app/actions/grammarChecker';
import { scanOriginality } from '@/app/actions/plagiarismChecker';
import type { PlagiarismMatch } from '@/app/actions/plagiarismChecker';
import { analyzeContentSEO } from '@/app/actions/seoChecker';
import type { SeoMetric, KeywordDensity } from '@/app/actions/seoChecker';
import {
  sendDocumentToContact,
  saveAsContentTemplate
} from '@/app/actions/contentStudio';
import { searchContacts } from '@/app/actions/contacts';
import { createSocialPost } from '@/app/actions/social';
import { createPost, updatePost } from '@/app/actions/blog';
import { Instagram, Facebook, Twitter, Linkedin } from '@/components/icons/BrandIcons';
import { toast } from 'sonner';
import {
  Sliders,
  Sparkles,
  Loader2,
  BookOpen,
  Send,
  Copy,
  Download,
  Search,
  Mail,
  Globe,
  FilePenLine,
  LayoutTemplate,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface LinterIssue {
  id: string;
  offset: number;
  length: number;
  message: string;
  shortMessage: string;
  severity: 'error' | 'style' | 'clarity';
  ruleId: string;
  replacements: { value: string }[];
}

interface AIAssistantSidebarProps {
  editor: {
    getText: () => string;
    getHTML: () => string;
    commands?: {
      setContent: (html: string) => any;
    };
  } | null;
  title: string;
  workspaceId: string;
  docId?: string;
  contentType: 'blog' | 'social' | 'email' | 'other';
  tabsToShow?: ('grammar' | 'plagiarism' | 'seo' | 'publish')[];
  defaultTab?: 'grammar' | 'plagiarism' | 'seo' | 'publish';
  onClose?: () => void;
}

export default function AIAssistantSidebar({
  editor,
  title,
  workspaceId,
  docId,
  contentType,
  tabsToShow = ['grammar', 'plagiarism', 'seo', 'publish'],
  defaultTab = 'grammar',
  onClose
}: AIAssistantSidebarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'grammar' | 'plagiarism' | 'seo' | 'publish'>(defaultTab);

  // Grammar checking states
  const [issues, setIssues] = useState<LinterIssue[]>([]);
  const [dismissedIssueIds, setDismissedIssueIds] = useState<Set<string>>(new Set());
  const [ignoredRules, setIgnoredRules] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState({
    overallScore: 100,
    tone: 'Professional',
    readabilityGrade: '8th Grade'
  });
  const [isChecking, setIsChecking] = useState(false);

  // Plagiarism States
  const [plagiarismMatches, setPlagiarismMatches] = useState<PlagiarismMatch[]>([]);
  const [originalityScore, setOriginalityScore] = useState<number | null>(null);
  const [plagiarizedScore, setPlagiarizedScore] = useState<number | null>(null);
  const [aiCredits, setAiCredits] = useState<number>(100);
  const [plagiarismProgress, setPlagiarismProgress] = useState<number>(0);
  const [isPlagiarismScanning, setIsPlagiarismScanning] = useState<boolean>(false);
  const [plagiarismScanError, setPlagiarismScanError] = useState<string | null>(null);

  // SEO Score States
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState('');
  const [targetCountry, setTargetCountry] = useState('US');
  const [seoScore, setSeoScore] = useState<number | null>(null);
  const [seoMetrics, setSeoMetrics] = useState<SeoMetric[]>([]);
  const [seoDensity, setSeoDensity] = useState<KeywordDensity[]>([]);
  const [seoBenchmarks, setSeoBenchmarks] = useState<any>(null);
  const [isSeoAnalyzing, setIsSeoAnalyzing] = useState(false);
  const [seoMetaDescription, setSeoMetaDescription] = useState('');
  const [seoScanError, setSeoScanError] = useState<string | null>(null);

  // Publish & Distribution states
  const [socialPlatforms, setSocialPlatforms] = useState<string[]>([]);
  const [socialSchedule, setSocialSchedule] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [isSocialQueuing, setIsSocialQueuing] = useState(false);
  const [isBlogSaving, setIsBlogSaving] = useState(false);
  const [isContactSending, setIsContactSending] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const activeIssues = issues.filter(issue => 
    !dismissedIssueIds.has(issue.id) && 
    !ignoredRules.has(issue.ruleId)
  );

  const runGrammarCheck = async () => {
    if (!editor) return;
    setIsChecking(true);
    try {
      const res = await checkGrammarAndStyle(docId || '', editor.getText());
      if (res.data) {
        const mapped = (res.data.matches || []).map((m: any, index: number) => ({
          ...m,
          id: `${m.ruleId}-${m.offset}-${index}`
        }));
        setIssues(mapped);
        setMetrics({
          overallScore: res.data.metrics.overallScore,
          tone: res.data.metrics.tone,
          readabilityGrade: res.data.metrics.readabilityGrade
        });
      }
    } catch (e) {
      toast.error('Grammar check failed.');
    } finally {
      setIsChecking(false);
    }
  };

  const runPlagiarismScan = async () => {
    if (!editor) return;
    setIsPlagiarismScanning(true);
    setPlagiarismScanError(null);
    setPlagiarismProgress(10);
    
    const interval = setInterval(() => {
      setPlagiarismProgress(p => (p >= 90 ? 90 : p + 10));
    }, 1500);

    try {
      const res = await scanOriginality(docId || '', editor.getText());
      clearInterval(interval);
      setPlagiarismProgress(100);
      
      if (res.error) {
        setPlagiarismScanError(res.error);
      } else if (res.data) {
        setOriginalityScore(res.data.originalityScore);
        setPlagiarizedScore(res.data.plagiarizedScore);
        setPlagiarismMatches(res.data.matches);
        setAiCredits(res.data.creditsRemaining);
      }
    } catch (e: any) {
      clearInterval(interval);
      setPlagiarismScanError('Originality scan failed. Please try again.');
    } finally {
      setIsPlagiarismScanning(false);
    }
  };

  const runSeoAnalysis = async () => {
    if (!editor) return;
    if (!primaryKeyword.trim()) {
      setSeoScanError('Please enter a target primary keyword first.');
      return;
    }
    setIsSeoAnalyzing(true);
    setSeoScanError(null);
    try {
      const secondaries = secondaryKeywordsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await analyzeContentSEO({
        documentId: docId || '',
        title: title || 'Untitled',
        html: editor.getHTML(),
        plainText: editor.getText(),
        primaryKeyword,
        secondaryKeywords: secondaries,
        country: targetCountry,
        isSocial: contentType === 'social',
        metaDescription: seoMetaDescription
      });

      if (res.error) {
        setSeoScanError(res.error);
      } else if (res.data) {
        setSeoScore(res.data.seoScore);
        setSeoMetrics(res.data.metrics);
        setSeoDensity(res.data.density);
        setSeoBenchmarks(res.data.benchmarks);
        setAiCredits(res.data.creditsRemaining);
      }
    } catch (err) {
      setSeoScanError('SEO Analysis failed.');
    } finally {
      setIsSeoAnalyzing(false);
    }
  };

  const handleSearchContacts = async (q: string) => {
    if (!q.trim()) {
      setContactResults([]);
      return;
    }
    const res = await searchContacts(q);
    if (res.success && res.data) {
      setContactResults(res.data);
    }
  };

  const handleQueueSocialPost = async () => {
    if (!editor) return;
    setIsSocialQueuing(true);
    try {
      const res = await createSocialPost({
        platforms: socialPlatforms,
        content: editor.getText(),
        scheduled_at: socialSchedule || undefined
      });
      if (res.error) {
        toast.error(`Social queuing failed: ${res.error}`);
      } else {
        toast.success(socialSchedule ? 'Social post scheduled successfully!' : 'Social post queued successfully!');
        setSocialPlatforms([]);
        setSocialSchedule('');
      }
    } catch (e: any) {
      toast.error('Failed to queue social post.');
    } finally {
      setIsSocialQueuing(false);
    }
  };

  const handleSaveToBlog = async () => {
    if (!editor) return;
    setIsBlogSaving(true);
    try {
      const text = editor.getText();
      const html = editor.getHTML();
      const createRes = await createPost({ title: title || 'Untitled Blog Draft' });
      if (createRes.error) {
        toast.error(`Blog draft creation failed: ${createRes.error}`);
      } else if (createRes.data) {
        const blogPostId = createRes.data.id;
        const updateRes = await updatePost(blogPostId, {
          body_html: html,
          body_plain: text,
          summary: seoMetaDescription || text.substring(0, 150)
        });
        if (updateRes.error) {
          toast.error(`Blog draft details save failed: ${updateRes.error}`);
        } else {
          toast.success('Blog draft created successfully!', {
            action: {
              label: 'Edit Draft',
              onClick: () => router.push(`/blog/editor/${blogPostId}`)
            }
          });
        }
      }
    } catch (e: any) {
      toast.error('Failed to save blog draft.');
    } finally {
      setIsBlogSaving(false);
    }
  };

  const handleSendToContact = async () => {
    if (!editor) return;
    if (!selectedContactId) return;
    setIsContactSending(true);
    try {
      const res = await sendDocumentToContact(
        selectedContactId,
        customEmailSubject || title || 'New document outline',
        editor.getText()
      );
      if (res.error) {
        toast.error(`Email send failed: ${res.error}`);
      } else {
        toast.success('Email successfully sent to contact!');
        setContactQuery('');
        setSelectedContactId('');
        setCustomEmailSubject('');
      }
    } catch (e: any) {
      toast.error('Failed to send email.');
    } finally {
      setIsContactSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.getHTML());
      toast.success('Clean HTML content copied to clipboard!');
    } catch (e) {
      toast.error('Copy to clipboard failed.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!editor) return;
    setIsPdfDownloading(true);
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'Document Output', html: editor.getHTML() })
      });

      if (!response.ok) throw new Error('PDF render failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'document').toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (e: any) {
      toast.error('Failed to generate PDF.');
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editor) return;
    setIsTemplateSaving(true);
    try {
      const res = await saveAsContentTemplate({
        title: `${title || 'Untitled'} Template`,
        body_html: editor.getHTML(),
        body_plain: editor.getText()
      });
      if (res.error) {
        toast.error(`Save template failed: ${res.error}`);
      } else {
        toast.success('Saved template inside My Custom Templates!');
      }
    } catch (e: any) {
      toast.error('Failed to save template.');
    } finally {
      setIsTemplateSaving(false);
    }
  };

  return (
    <div className="w-full bg-[#080f28] border border-white/10 rounded-xl overflow-hidden flex flex-col shrink-0 text-white font-dm-sans">
      {onClose && (
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-white/10 bg-white/5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">AI Content Assistant</span>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-5 h-5 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white text-xs transition"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Header Tab toggles */}
      <div 
        className="grid gap-0.5 bg-white/5 p-1 border-b border-white/10 select-none" 
        style={{ gridTemplateColumns: `repeat(${tabsToShow.length}, minmax(0, 1fr))` }}
      >
        {tabsToShow.map((tab) => {
          const isSelected = activeTab === tab;
          let label = 'Tab';
          let icon = <Sliders className="w-4 h-4" />;
          
          if (tab === 'grammar') { label = 'Gram'; icon = <Sparkles className="w-4 h-4" />; }
          else if (tab === 'plagiarism') { label = 'Plag'; icon = <BookOpen className="w-4 h-4" />; }
          else if (tab === 'seo') { label = 'SEO'; icon = <Sliders className="w-4 h-4" />; }
          else if (tab === 'publish') { label = 'Pub'; icon = <Send className="w-4 h-4" />; }

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                isSelected ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content area */}
      <div className="p-5 overflow-y-auto flex-1 h-[600px] text-xs">
        
        {/* Grammar Tab */}
        {activeTab === 'grammar' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Grammar Checker</h4>
              <button
                onClick={runGrammarCheck}
                disabled={isChecking || !editor}
                className="bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-[10px] font-bold px-2.5 py-1 rounded"
              >
                {isChecking ? 'Checking...' : 'Run Audit'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#04091a] border border-white/5 p-2 rounded text-center">
                <span className="text-[8px] text-white/30 block uppercase font-bold">Score</span>
                <span className="text-sm font-black font-mono text-emerald-400">{metrics.overallScore}</span>
              </div>
              <div className="bg-[#04091a] border border-white/5 p-2 rounded text-center truncate">
                <span className="text-[8px] text-white/30 block uppercase font-bold">Tone</span>
                <span className="text-[10px] font-bold text-blue-400">{metrics.tone}</span>
              </div>
              <div className="bg-[#04091a] border border-white/5 p-2 rounded text-center">
                <span className="text-[8px] text-white/30 block uppercase font-bold">Readability</span>
                <span className="text-[10px] font-bold text-purple-400">{metrics.readabilityGrade}</span>
              </div>
            </div>

            <div className="space-y-2">
              {activeIssues.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-[10px] uppercase font-bold">No issues found. Copy looks solid!</div>
              ) : (
                activeIssues.map((issue) => (
                  <div key={issue.id} className="bg-[#04091a] border border-white/5 p-3 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        issue.severity === 'error' ? 'bg-red-500/10 text-red-400' : issue.severity === 'style' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/70 leading-normal">{issue.message}</p>
                    {issue.replacements.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {issue.replacements.slice(0, 3).map((r, rIdx) => (
                          <button
                            key={rIdx}
                            onClick={() => {
                              if (editor && editor.commands && (editor as any).chain) {
                                // If standard Tiptap, replace is done inside editor extension or parent
                                toast.info(`Fix with: "${r.value}"`);
                              } else if (editor && (editor as any).applyFix) {
                                (editor as any).applyFix(issue, r.value);
                              }
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                          >
                            {r.value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Plagiarism Tab */}
        {activeTab === 'plagiarism' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Originality Scanner</h4>
              <button
                onClick={runPlagiarismScan}
                disabled={isPlagiarismScanning || !editor}
                className="bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-[10px] font-bold px-2.5 py-1 rounded"
              >
                {isPlagiarismScanning ? 'Scanning...' : 'Scan Originality'}
              </button>
            </div>

            {originalityScore !== null && (
              <div className="bg-[#04091a] border border-white/5 p-3 rounded-lg text-center space-y-1">
                <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider block">Originality Score</span>
                <span className={`text-xl font-mono font-black ${
                  originalityScore >= 80 ? 'text-emerald-400' : originalityScore >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {originalityScore}%
                </span>
              </div>
            )}

            {isPlagiarismScanning && (
              <div className="space-y-1.5 py-2">
                <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase">
                  <span>Running Scan...</span>
                  <span>{plagiarismProgress}%</span>
                </div>
                <div className="w-full bg-[#04091a] h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-primary h-full transition-all duration-500" style={{ width: `${plagiarismProgress}%` }} />
                </div>
              </div>
            )}

            {plagiarismScanError && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-[9.5px]">
                {plagiarismScanError}
              </div>
            )}

            <div className="space-y-2">
              {plagiarismMatches.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-[10px] uppercase font-bold">Originality scan clean.</div>
              ) : (
                plagiarismMatches.map((m, idx) => (
                  <div key={idx} className="bg-[#04091a] border border-white/5 p-3 rounded-lg space-y-1">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-[10px] font-black text-rose-400">{m.percentage}% Matched</span>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline truncate max-w-[120px]">
                        {m.title || 'Source'}
                      </a>
                    </div>
                    <p className="text-[9.5px] text-white/60 leading-normal font-light italic mt-1">
                      "{m.snippet}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#04091a] border border-white/5 p-3.5 rounded-lg space-y-3">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">SEO Target Parameters</h4>
              
              <div className="space-y-1">
                <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Primary Keyword</label>
                <input
                  type="text"
                  placeholder="Primary Keyword"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary placeholder-white/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Secondaries (comma separated)</label>
                <input
                  type="text"
                  placeholder="Secondary Keywords"
                  value={secondaryKeywordsInput}
                  onChange={(e) => setSecondaryKeywordsInput(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary placeholder-white/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block mb-0.5">Country</label>
                  <select
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full bg-[#080f28] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="US">US</option>
                    <option value="ZA">ZA</option>
                    <option value="GB">GB</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={runSeoAnalysis}
                    disabled={isSeoAnalyzing || !primaryKeyword.trim() || !editor}
                    className="bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 shadow-md shadow-primary/20"
                  >
                    {isSeoAnalyzing ? 'Analyzing...' : 'Scan SEO'}
                  </button>
                </div>
              </div>
            </div>

            {seoScore !== null && (
              <div className="space-y-3">
                <div className="bg-[#04091a] border border-white/5 p-3 rounded text-center">
                  <span className="text-[8px] text-white/30 uppercase font-bold tracking-widest block mb-1">SEO Score</span>
                  <span className={`text-xl font-mono font-black ${
                    seoScore >= 80 ? 'text-emerald-400' : seoScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {seoScore}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {seoMetrics.map((m, idx) => (
                    <div key={idx} className="bg-[#04091a] border border-white/5 p-2 rounded flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${m.passed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div>
                        <span className="font-bold text-[9.5px] text-white/95 block">{m.name}</span>
                        <span className="text-[8.5px] text-white/50 leading-normal">{m.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Publish Tab */}
        {activeTab === 'publish' && (
          <div className="space-y-4 animate-fade-in">
            {/* Social Media Distribution Card */}
            <div className="bg-[#04091a] border border-white/5 p-3.5 rounded-lg space-y-2.5">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-primary" /> Post to Social Media
              </h4>
              
              <div className="flex gap-2">
                {[
                  { id: 'facebook', icon: <Facebook className="w-3.5 h-3.5 stroke-current" />, color: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2]' },
                  { id: 'instagram', icon: <Instagram className="w-3.5 h-3.5 stroke-current" />, color: 'hover:bg-[#E4405F]/10 hover:text-[#E4405F]' },
                  { id: 'twitter', icon: <Twitter className="w-3.5 h-3.5 stroke-current" />, color: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]' },
                  { id: 'linkedin', icon: <Linkedin className="w-3.5 h-3.5 stroke-current" />, color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]' }
                ].map((p) => {
                  const selected = socialPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSocialPlatforms(prev =>
                          prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                        );
                      }}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                        selected 
                          ? 'bg-primary text-white shadow-md shadow-primary/20' 
                          : 'bg-[#080f28] border border-white/10 text-white/40'
                      } ${p.color}`}
                    >
                      {p.icon}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Schedule Posting</label>
                <input
                  type="datetime-local"
                  value={socialSchedule}
                  onChange={(e) => setSocialSchedule(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleQueueSocialPost}
                disabled={isSocialQueuing || socialPlatforms.length === 0 || !editor}
                className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-1.5 px-3 rounded transition flex items-center justify-center gap-1"
              >
                {isSocialQueuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Queue Social Post
              </button>
            </div>

            {/* Email Campaign Card */}
            <div className="bg-[#04091a] border border-white/5 p-3.5 rounded-lg space-y-2.5">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" /> Send as Email Campaign
              </h4>
              
              <div className="space-y-1">
                <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Campaign Name</label>
                <input
                  type="text"
                  placeholder="Campaign Name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary placeholder-white/15"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const name = campaignName || title || 'New Campaign';
                  const text = editor?.getText() || '';
                  const prefillSubject = title || 'Check this out!';
                  router.push(`/campaigns?prefill_name=${encodeURIComponent(name)}&prefill_subject=${encodeURIComponent(prefillSubject)}&prefill_body=${encodeURIComponent(text)}`);
                  toast.success('Redirecting to email wizard...');
                }}
                className="w-full bg-primary hover:bg-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded transition flex items-center justify-center gap-1 shadow-md shadow-primary/20"
              >
                <LayoutTemplate className="w-3 h-3" />
                Configure Email Wizard
              </button>
            </div>

            {/* Save to Blog Card */}
            {contentType !== 'blog' && (
              <div className="bg-[#04091a] border border-white/5 p-3.5 rounded-lg space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1">
                  <FilePenLine className="w-3.5 h-3.5 text-primary" /> Save to Blog
                </h4>
                <button
                  type="button"
                  onClick={handleSaveToBlog}
                  disabled={isBlogSaving || !editor}
                  className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-1.5 px-3 rounded transition flex items-center justify-center gap-1 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                  {isBlogSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Create Blog Draft
                </button>
              </div>
            )}

            {/* Send to Contact Card */}
            <div className="bg-[#04091a] border border-white/5 p-3.5 rounded-lg space-y-2.5">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-primary" /> Send to Contact
              </h4>

              <div className="space-y-1 relative">
                <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Search Contact</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type name or email..."
                    value={contactQuery}
                    onChange={(e) => {
                      setContactQuery(e.target.value);
                      handleSearchContacts(e.target.value);
                    }}
                    className="w-full bg-[#080f28] border border-white/10 rounded pl-7 pr-2 py-1 text-xs text-white outline-none focus:border-primary placeholder-white/15"
                  />
                  <Search className="w-3 h-3 text-white/20 absolute left-2 top-2" />
                </div>

                {contactResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#080f28] border border-white/10 rounded max-h-40 overflow-y-auto py-1 shadow-xl">
                    {contactResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedContactId(c.id);
                          setContactQuery(`${c.first_name || ''} ${c.last_name || ''} (${c.email})`);
                          setContactResults([]);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-white hover:bg-primary/10 transition flex flex-col"
                      >
                        <span className="font-bold">{c.first_name || ''} {c.last_name || ''}</span>
                        <span className="text-[9px] text-white/40">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Subject</label>
                <input
                  type="text"
                  placeholder="Subject line"
                  value={customEmailSubject}
                  onChange={(e) => setCustomEmailSubject(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary placeholder-white/15"
                />
              </div>

              <button
                type="button"
                onClick={handleSendToContact}
                disabled={isContactSending || !selectedContactId || !editor}
                className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-1.5 px-3 rounded transition flex items-center justify-center gap-1 disabled:cursor-not-allowed shadow-md shadow-primary/20"
              >
                {isContactSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                Send to Contact
              </button>
            </div>

            {/* Utility Actions Card */}
            <div className="bg-[#04091a] border border-white/5 p-3.5 rounded-lg space-y-2.5">
              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Utility Actions</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={!editor}
                  className="bg-[#080f28] border border-white/10 hover:border-primary/30 text-white p-2 rounded flex flex-col items-center justify-center text-center gap-1 group disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-primary transition" />
                  <span className="text-[9px] font-bold">Copy HTML</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isPdfDownloading || !editor}
                  className="bg-[#080f28] border border-white/10 hover:border-primary/30 text-white p-2 rounded flex flex-col items-center justify-center text-center gap-1 group disabled:opacity-50"
                >
                  {isPdfDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Download className="w-3.5 h-3.5 text-white/40 group-hover:text-primary transition" />}
                  <span className="text-[9px] font-bold">Download PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isTemplateSaving || !editor}
                className="w-full bg-[#080f28] border border-white/10 hover:border-primary/30 text-white text-xs font-bold py-1.5 px-3 rounded transition flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isTemplateSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <LayoutTemplate className="w-3.5 h-3.5 text-white/40" />}
                Save as Content Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

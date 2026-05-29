'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import {
  getDocuments,
  createDocument,
  updateDocument,
  createDocumentVersion,
  getDocumentVersions,
  sendDocumentToContact,
  saveAsContentTemplate
} from '@/app/actions/contentStudio';
import { checkGrammarAndStyle } from '@/app/actions/grammarChecker';
import { scanOriginality, paraphraseText, getWorkspaceCredits } from '@/app/actions/plagiarismChecker';
import type { PlagiarismMatch } from '@/app/actions/plagiarismChecker';
import { analyzeContentSEO } from '@/app/actions/seoChecker';
import type { SeoMetric, KeywordDensity } from '@/app/actions/seoChecker';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { searchContacts, getContact } from '@/app/actions/contacts';
import { createSocialPost } from '@/app/actions/social';
import { createPost, updatePost } from '@/app/actions/blog';
import { Instagram, Facebook, Twitter, Linkedin } from '@/components/icons/BrandIcons';
import {
  Sliders,
  Sparkles,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  FilePenLine,
  LayoutTemplate,
  Send,
  Copy,
  Download,
  Search,
  Mail,
  Globe,
  History,
  Settings,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkle,
  Loader2,
  BookOpen,
  ChevronDown
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

const linterPluginKey = new PluginKey('linter');

const LinterExtension = Extension.create({
  name: 'linter',

  addOptions() {
    return {
      issues: [] as LinterIssue[],
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: linterPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            return oldState.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            const doc = state.doc;
            const decos: Decoration[] = [];

            options.issues.forEach((issue) => {
              const start = issue.offset + 1;
              const end = start + issue.length;

              if (start >= 1 && end <= doc.content.size) {
                let borderClass = 'border-b-2 border-red-500 bg-red-500/10 cursor-pointer';
                if (issue.severity === 'style') {
                  borderClass = 'border-b-2 border-yellow-500 bg-yellow-500/10 cursor-pointer';
                } else if (issue.severity === 'clarity') {
                  borderClass = 'border-b-2 border-blue-500 bg-blue-500/10 cursor-pointer';
                }

                decos.push(
                  Decoration.inline(start, end, {
                    class: borderClass,
                    title: issue.message,
                    'data-issue-id': issue.id,
                  })
                );
              }
            });

            return DecorationSet.create(doc, decos);
          },
        },
      }),
    ];
  },
});

const plagiarismPluginKey = new PluginKey('plagiarism');

const PlagiarismExtension = Extension.create({
  name: 'plagiarism',

  addOptions() {
    return {
      matches: [] as PlagiarismMatch[],
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: plagiarismPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            return oldState.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            const doc = state.doc;
            const decos: Decoration[] = [];

            options.matches.forEach((match) => {
              const start = match.offset + 1;
              const end = start + match.length;

              if (start >= 1 && end <= doc.content.size) {
                decos.push(
                  Decoration.inline(start, end, {
                    class: 'border-b-2 border-orange-500 bg-orange-500/10 cursor-pointer',
                    title: `Match: ${match.title} (${match.percentage}%)`,
                    'data-plagiarism-offset': match.offset,
                  })
                );
              }
            });

            return DecorationSet.create(doc, decos);
          },
        },
      }),
    ];
  },
});


interface Document {
  id: string;
  title: string;
  body_html: string;
  body_plain: string;
  content_type: string;
  target_platform: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Version {
  id: string;
  document_id: string;
  title: string;
  body_html: string;
  body_plain: string;
  created_at: string;
}

interface WorkspaceProps {
  initialDocument: Document | null;
  initialVersions: Version[];
}

const QUICK_START_TEMPLATES = {
  blog_post: {
    name: 'Blog Post Blueprint',
    outline: `<h1>[Blog Title Here]</h1>\n<h2>1. Introduction</h2>\n<p>[Insert scroll-stopping hook. Outline what the reader will learn in this article and establish context.]</p>\n<h2>2. Key Section 1: The Core Concept</h2>\n<p>[Detail the first core point. Provide statistics, proof, or examples.]</p>\n<h2>3. Key Section 2: Actionable Strategy</h2>\n<p>[Provide steps or direct actions. Guide the reader on implementation.]</p>\n<h2>4. Key Section 3: Industry Best Practices</h2>\n<p>[Detail recommendations, mistakes to avoid, and expert insight.]</p>\n<h2>5. Conclusion</h2>\n<p>[Summarize key takeaways. Close with a summary statement.]</p>\n<p>👉 <strong>CTA:</strong> <a href="#">[Click here to download the checklist]</a></p>`
  },
  social_instagram: {
    name: 'Instagram Post Structure',
    outline: `<p>🚨 <strong>[SCROLL-STOPPING HOOK LINE HERE]</strong> 🚨</p>\n<p>[Write 2–4 lines of highly engaging core copy here. Keep it punchy and break up text for mobile scanning.]</p>\n<p>👉 <strong>CTA:</strong> [Click link in bio to read full details / save this post for later!]</p>\n<p>.</p>\n<p>.</p>\n<p>#marketing #growth #leadgeneration #strategy #leadsmind</p>`
  },
  social_linkedin: {
    name: 'LinkedIn Professional Post',
    outline: `<p>🚀 <strong>[STRONG OPENING STATEMENT OR INSIGHT]</strong></p>\n<p>[Paragraph 1: Share a quick lesson or story that challenges industry status quo.]</p>\n<p>[Paragraph 2: Provide a specific metric, result, or takeaway from your work.]</p>\n<p>[Paragraph 3: Connect this back to the reader's current challenges.]</p>\n<p>💬 <strong>[Engagement Question for Comments]</strong> (e.g. How are you handling this in your business?)</p>\n<p>👉 <strong>CTA:</strong> <a href="#">[Visit our website to schedule a call]</a></p>`
  },
  social_facebook: {
    name: 'Facebook Conversational Opener',
    outline: `<p>👋 Hey everyone, [write a friendly, conversational opener here].</p>\n<p>[State the core message or story. Keep the tone social, approachable, and shareable.]</p>\n<p>📊 <strong>Question for the community:</strong> [Insert poll question or conversation prompt.]</p>\n<p>👉 Learn more: <a href="#">[Insert Link Here]</a></p>`
  },
  social_twitter: {
    name: 'Twitter/X Micro-Thread',
    outline: `<h2>Tweet 1: The Hook 🧵</h2>\n<p>[High-impact single hook statement. Present a counter-intuitive finding or huge result. 280-char limit.]</p>\n<h2>Tweet 2: The Context</h2>\n<p>[Set up the problem. What makes this a recurring issue for most teams?]</p>\n<h2>Tweet 3: Step-by-Step Resolution</h2>\n<p>[Provide 3 quick bulleted tips or takeaways.]</p>\n<h2>Tweet 4: The Core Lesson</h2>\n<p>[Summarize the main takeaway. Keep it highly quote-worthy.]</p>\n<h2>Tweet 5: The Call to Action</h2>\n<p>[Direct readers to your main resource link or profile follow. 👉 <a href="#">[Link]</a>]</p>`
  },
  email_marketing: {
    name: 'Email Campaign Outline',
    outline: `<p><strong>Subject Line:</strong> [Insert Compelling Subject Line here]</p>\n<p><strong>Preview Text:</strong> [Insert interesting curiosity hook here]</p>\n<hr />\n<p>Hi {{first_name}},</p>\n<p>[Greeting & hook statement. Relate to the subscriber's current situation or reference a recent trend.]</p>\n<p>[Body Copy: Deliver value, show evidence, or describe the main benefit of your offer.]</p>\n<p>👉 <strong><a href="#">[CTA Action Button / Link Here]</a></strong></p>\n<p>Best regards,</p>\n<p>[Your Name / LeadsMind Team]</p>`
  },
  newsletter: {
    name: 'Newsletter Editorial Blueprint',
    outline: `<p><strong>Subject Line:</strong> [Weekly Roundup] - [Main Topic]</p>\n<p><strong>Preview Text:</strong> [A single sentence summary of the top news inside]</p>\n<hr />\n<p>Welcome to our weekly newsletter!</p>\n<p><strong>📰 Today's Featured Stories:</strong></p>\n<h3>1. The Big Trend</h3>\n<p>[Brief explanation of the main industry event or insight from the week.]</p>\n<h3>2. Resource Spotlight</h3>\n<p>[Share a helpful tool, article, or video with a short description.]</p>\n<hr />\n<p>💡 <em>Quick Tip:</em> [One actionable takeaway for the day.]</p>\n<p>👉 <strong>Join the community:</strong> <a href="#">[Read more on our blog]</a></p>`
  },
  ad_copy: {
    name: 'AIDA Ad Copy Structure',
    outline: `<p><strong>[ATTENTION HEADLINE]:</strong> [High-converting headline targeting consumer pain point]</p>\n<p><strong>[Expansion Subheadline]:</strong> [Subheadline elaborating on the core promise]</p>\n<p><strong>[Benefit-Driven Body Text]:</strong> [Outline 3 key benefits using checkmarks/emojis]</p>\n<p>✅ Benefit 1: [Quick description]</p>\n<p>✅ Benefit 2: [Quick description]</p>\n<p>✅ Benefit 3: [Quick description]</p>\n<p>👉 <strong>CTA:</strong> <a href="#">[Click "Learn More" to claim your free trial]</a></p>`
  },
  sms: {
    name: 'SMS Strict Cap Framework',
    outline: `<p>[URGENT NOTICE / EVENT]: [Clear singular value proposition. Keep text extremely brief to fit the strict 160-character limit.]</p>\n<p>👉 Act now: <a href="#">[Link]</a></p>`
  },
  press_release: {
    name: 'Standard Press Release dateline',
    outline: `<h1>[FOR IMMEDIATE RELEASE: PRESS RELEASE TITLE]</h1>\n<p><strong>DATELINE:</strong> [City, State] - [Date]</p>\n<p><strong>[INTRO PARAGRAPH]:</strong> [Summarize the who, what, when, where, and why of the announcement in 2-3 sentences.]</p>\n<h2>The Details</h2>\n<p>[Provide context and background on the announcement.]</p>\n<blockquote>"[Insert quote from executive, customer, or industry expert here.]"</blockquote>\n<p>[Additional details / company background info.]</p>\n<p><strong>Corporate Boilerplate:</strong> [Standard paragraph describing the company's history and mission.]</p>\n<p><strong>Media Contact:</strong> [Name, Email, Phone Number]</p>`
  },
  whatsapp: {
    name: 'WhatsApp Message Framework',
    outline: `<p>📲 <strong>[Friendly Alert / Announcement]</strong></p>\n<p>Hey {{first_name}}, [write an approachable message detailing a special update or offer. Use emojis for high engagement.]</p>\n<p>👉 Reply "YES" or click here: <a href="#">[Action Link]</a></p>\n<p><em>To opt-out, reply STOP.</em></p>`
  },
  generic: {
    name: 'Generic Layout framework',
    outline: `<h2>[Document Title]</h2>\n<p><strong>Why this matters:</strong></p>\n<p>[Provide brief background context.]</p>\n<ul>\n  <li>Key Point 1: [Details]</li>\n  <li>Key Point 2: [Details]</li>\n  <li>Key Point 3: [Details]</li>\n</ul>\n<p>👉 <strong>CTA:</strong> <a href="#">[Insert link]</a></p>`
  }
};

function findProseMirrorPos(doc: any, targetOffset: number): number {
  let count = 0;
  let resolvedPos = 1;

  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const len = node.text.length;
      if (targetOffset >= count && targetOffset <= count + len) {
        resolvedPos = pos + (targetOffset - count);
        return false;
      }
      count += len;
    } else if (node.isBlock) {
      if (pos > 0 && count > 0) {
        count += 1;
      }
    }
    return true;
  });

  return resolvedPos;
}

function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

export default function ContentStudioWorkspaceClient({
  initialDocument,
  initialVersions
}: WorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillContactId = searchParams.get('prefill_contact_id');
  const [docId, setDocId] = useState<string | null>(initialDocument?.id || null);
  const [title, setTitle] = useState(initialDocument?.title || '');
  const [contentType, setContentType] = useState(initialDocument?.content_type || 'blog');
  const [targetPlatform, setTargetPlatform] = useState(initialDocument?.target_platform || 'custom');
  const [status, setStatus] = useState(initialDocument?.status || 'draft');

  const [versions, setVersions] = useState<Version[]>(initialVersions);
  const [activeTab, setActiveTab] = useState<'templates' | 'versions' | 'settings' | 'grammar' | 'plagiarism' | 'seo' | 'publish'>('templates');
  
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readTime, setReadTime] = useState(1);

  // Grammar checking states
  const [issues, setIssues] = useState<LinterIssue[]>([]);
  const [dismissedIssueIds, setDismissedIssueIds] = useState<Set<string>>(new Set());
  const [ignoredRules, setIgnoredRules] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState({
    overallScore: 100,
    tone: 'Conversational',
    readabilityGrade: '8th Grade',
    gradeLevel: 8.0
  });
  const [isChecking, setIsChecking] = useState(false);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedGrammarCheck = useDebouncedCallback((text: string) => {
    runGrammarCheck(text);
  }, 800);

  const runPlagiarismScanWithConfirm = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Scan Originality?',
      description: 'Web plagiarism scanning uses Serper.dev Google search queries. Running this scan will deduct 5 AI credits from your balance. Would you like to proceed?',
      confirmLabel: 'Confirm Scan',
      onConfirm: () => {
        setConfirmConfig(null);
        runPlagiarismScan();
      }
    });
  };

  // Plagiarism States
  const [plagiarismMatches, setPlagiarismMatches] = useState<PlagiarismMatch[]>([]);
  const [originalityScore, setOriginalityScore] = useState<number | null>(null);
  const [plagiarizedScore, setPlagiarizedScore] = useState<number | null>(null);
  const [aiCredits, setAiCredits] = useState<number>(100);
  const [plagiarismProgress, setPlagiarismProgress] = useState<number>(0);
  const [isPlagiarismScanning, setIsPlagiarismScanning] = useState<boolean>(false);
  const [plagiarismScanError, setPlagiarismScanError] = useState<string | null>(null);

  // Paraphrasing States
  const [isParaphraseModalOpen, setIsParaphraseModalOpen] = useState(false);
  const [selectedParaphraseText, setSelectedParaphraseText] = useState('');
  const [paraphraseMode, setParaphraseMode] = useState<'standard' | 'formal' | 'simple' | 'creative'>('standard');
  const [paraphraseOptions, setParaphraseOptions] = useState<string[]>([]);
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  const [paraphraseError, setParaphraseError] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

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
  const [seoProfile, setSeoProfile] = useState<'blog_post' | 'product_page' | 'landing_page' | 'local_business'>('blog_post');
  const [openPaaIndex, setOpenPaaIndex] = useState<number | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram' | 'linkedin' | 'twitter'>('facebook');

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
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);

  // Load custom templates
  useEffect(() => {
    async function loadTemplates() {
      const res = await getDocuments({ status: 'template' });
      if (res.data) {
        setCustomTemplates(res.data);
      }
    }
    loadTemplates();
  }, [docId]);

  // Handle prefill contact context on mount
  useEffect(() => {
    if (prefillContactId) {
      const fetchPrefillContact = async () => {
        try {
          const res = await getContact(prefillContactId);
          if (res.success && res.data) {
            const c = res.data;
            setSelectedContactId(c.id);
            setContactQuery(`${c.first_name || ''} ${c.last_name || ''} (${c.email || ''})`.trim());
            setActiveTab('publish');
            toast.success(`Prefilled contact: ${c.first_name || ''} ${c.last_name || ''}`);
          }
        } catch (err) {
          console.error('Failed to fetch prefilled contact:', err);
        }
      };
      fetchPrefillContact();
    }
  }, [prefillContactId]);

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
      toast.error(e.message || 'Failed to queue social post.');
    } finally {
      socialSchedule ? null : null; // NOP
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
      toast.error(e.message || 'Failed to save blog draft.');
    } finally {
      setIsBlogSaving(false);
    }
  };

  const handleSendToContact = async () => {
    if (!editor) return;
    if (!selectedContactId) {
      toast.error('Please select a contact first.');
      return;
    }
    setIsContactSending(true);
    try {
      const text = editor.getText();
      const res = await sendDocumentToContact(
        selectedContactId,
        customEmailSubject || title || 'New document outline',
        text
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
      toast.error(e.message || 'Failed to send email to contact.');
    } finally {
      setIsContactSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!editor) return;
    try {
      const html = editor.getHTML();
      await navigator.clipboard.writeText(html);
      toast.success('Clean HTML content copied to clipboard!');
    } catch (e) {
      toast.error('Copy to clipboard failed.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!editor) return;
    setIsPdfDownloading(true);
    try {
      const html = editor.getHTML();
      const docTitle = title || 'Document Outline';
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, html })
      });

      if (!response.ok) {
        throw new Error('PDF render failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF outline downloaded successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate PDF.');
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editor) return;
    setIsTemplateSaving(true);
    try {
      const text = editor.getText();
      const html = editor.getHTML();
      const res = await saveAsContentTemplate({
        title: `${title || 'Untitled'} Template`,
        body_html: html,
        body_plain: text
      });
      if (res.error) {
        toast.error(`Save template failed: ${res.error}`);
      } else {
        toast.success('Saved template inside My Custom Templates!');
        if (res.data) {
          setCustomTemplates(prev => [res.data, ...prev]);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save template.');
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const handleLoadCustomTemplate = (template: any) => {
    if (!editor) return;
    const needsConfirm = editor.getText().trim() !== '';
    const action = () => {
      editor.commands.setContent(template.body_html);
      setTitle(template.title);
      setHasChanges(true);
      toast.success('Custom template loaded!');
    };

    if (needsConfirm) {
      setConfirmConfig({
        isOpen: true,
        title: 'Load Template?',
        description: 'This outline template will replace current canvas text. Proceed?',
        confirmLabel: 'Proceed',
        onConfirm: action
      });
    } else {
      action();
    }
  };

  const runSeoAnalysis = async () => {
    if (!editor) return;
    const text = editor.getText();
    const html = editor.getHTML();
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
        title: title || 'Untitled Outline',
        html,
        plainText: text,
        primaryKeyword,
        secondaryKeywords: secondaries,
        country: targetCountry,
        isSocial: contentType === 'social',
        metaDescription: seoMetaDescription,
        targetPlatform,
        seoProfile
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
      setSeoScanError('SEO Analysis failed. Please try again.');
    } finally {
      setIsSeoAnalyzing(false);
    }
  };

  const activeIssues = issues.filter(issue => 
    !dismissedIssueIds.has(issue.id) && 
    !ignoredRules.has(issue.ruleId)
  );

  const runGrammarCheck = async (textToCheck?: string) => {
    if (!editor) return;
    const text = textToCheck !== undefined ? textToCheck : editor.getText();
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      if (trimmed.length === 0) {
        setIssues([]);
        setMetrics({
          overallScore: 100,
          tone: 'Conversational',
          readabilityGrade: 'Elementary',
          gradeLevel: 1.0
        });
      }
      return;
    }
    setIsChecking(true);
    try {
      const res = await checkGrammarAndStyle(docId || '', text);
      if (res.data) {
        const mapped = (res.data.matches || []).map((m: any, index: number) => ({
          ...m,
          id: `${m.ruleId}-${m.offset}-${index}`
        }));
        setIssues(mapped);
        setMetrics({
          overallScore: res.data.metrics.overallScore,
          tone: res.data.metrics.tone,
          readabilityGrade: res.data.metrics.readabilityGrade,
          gradeLevel: res.data.metrics.gradeLevel || 8.0
        });
      }
    } catch (err) {
      console.error('Failed to run grammar check:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary hover:underline cursor-pointer' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full my-4 border border-white/10 mx-auto block' } }),
      LinterExtension.configure({ issues: [] }),
      PlagiarismExtension.configure({ matches: [] })
    ],
    content: initialDocument?.body_html || '<p>Start typing document outline canvases here...</p>',
    onUpdate: ({ editor }) => {
      setHasChanges(true);
      const plain = editor.getText();
      const words = plain.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(plain.length);
      setReadTime(Math.max(1, Math.ceil(words / 225)));

      // Debounce grammar checker by 800ms
      debouncedGrammarCheck(plain);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[460px] p-6 focus:outline-none text-white/90 font-dm-sans leading-relaxed text-sm',
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const offsetStr = target.getAttribute('data-plagiarism-offset');
        if (offsetStr) {
          const offset = parseInt(offsetStr, 10);
          const matchCard = document.querySelector(`[data-card-offset="${offset}"]`);
          if (matchCard) {
            matchCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            matchCard.classList.add('ring-2', 'ring-orange-500/50', 'bg-orange-500/5');
            setTimeout(() => matchCard.classList.remove('ring-2', 'ring-orange-500/50', 'bg-orange-500/5'), 2000);
          }
          return true;
        }
        return false;
      },
      // Paste parser filter to strip word/google doc styles
      transformPastedHTML(html) {
        return html
          .replace(/ style="[^"]*"/gi, '')
          .replace(/ class="[^"]*"/gi, '')
          .replace(/<o:p>[^<]*<\/o:p>/gi, '')
          .replace(/<font[^>]*>/gi, '')
          .replace(/<\/font>/gi, '');
      }
    }
  });

  // Sync active issues into Tiptap LinterExtension options
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const { extensionManager } = editor;
      const linter = extensionManager.extensions.find(ext => ext.name === 'linter');
      if (linter) {
        linter.options.issues = activeIssues;
        editor.view.dispatch(editor.state.tr);
      }
    }
  }, [activeIssues, editor]);

  // Sync active plagiarism highlights into Tiptap PlagiarismExtension options
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const { extensionManager } = editor;
      const plag = extensionManager.extensions.find(ext => ext.name === 'plagiarism');
      if (plag) {
        plag.options.matches = plagiarismMatches;
        editor.view.dispatch(editor.state.tr);
      }
    }
  }, [plagiarismMatches, editor]);

  // Load initial AI credits
  useEffect(() => {
    const loadCredits = async () => {
      const res = await getWorkspaceCredits();
      if (res && res.data !== undefined) {
        setAiCredits(res.data);
      }
    };
    loadCredits();
  }, []);

  // Initial check on mount/load
  useEffect(() => {
    if (editor) {
      const timer = setTimeout(() => {
        runGrammarCheck();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [editor, docId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, []);

  const handleSelectIssue = (issue: LinterIssue) => {
    if (!editor) return;
    const doc = editor.state.doc;
    const from = findProseMirrorPos(doc, issue.offset);
    const to = findProseMirrorPos(doc, issue.offset + issue.length);
    editor.commands.setTextSelection({ from, to });
    editor.commands.focus();
    const tr = editor.state.tr.scrollIntoView();
    editor.view.dispatch(tr);
  };

  const handleApplyFix = (issue: LinterIssue, replacement: string) => {
    if (!editor) return;
    const doc = editor.state.doc;
    const from = findProseMirrorPos(doc, issue.offset);
    const to = findProseMirrorPos(doc, issue.offset + issue.length);
    editor.chain()
      .focus()
      .insertContentAt({ from, to }, replacement)
      .run();

    setIssues(prev => prev.filter(i => i.id !== issue.id));

    debouncedGrammarCheck(editor.getText());
  };

  const handleDismissIssue = (issueId: string) => {
    setDismissedIssueIds(prev => {
      const next = new Set(prev);
      next.add(issueId);
      return next;
    });
  };

  const handleIgnoreRule = (ruleId: string) => {
    setIgnoredRules(prev => {
      const next = new Set(prev);
      next.add(ruleId);
      return next;
    });
  };

  // Plagiarism check actions
  const runPlagiarismScan = async () => {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) {
      setPlagiarismScanError('Cannot scan empty canvas text.');
      return;
    }
    
    setIsPlagiarismScanning(true);
    setPlagiarismScanError(null);
    setPlagiarismProgress(0);

    const totalTimeMs = 15000;
    const intervalMs = 300;
    const step = 95 / (totalTimeMs / intervalMs);

    const progressInterval = setInterval(() => {
      setPlagiarismProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return Math.min(95, prev + step);
      });
    }, intervalMs);

    try {
      const res = await scanOriginality(docId || '', text);
      clearInterval(progressInterval);
      
      if (res.error) {
        setPlagiarismScanError(res.error);
        setPlagiarismProgress(0);
      } else if (res.data) {
        setPlagiarismProgress(100);
        setOriginalityScore(res.data.originalityScore);
        setPlagiarizedScore(res.data.plagiarizedScore);
        setPlagiarismMatches(res.data.matches);
        setAiCredits(res.data.creditsRemaining);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setPlagiarismScanError('Originality scan failed. Please try again.');
      setPlagiarismProgress(0);
    } finally {
      setIsPlagiarismScanning(false);
    }
  };

  // Re-scan a single snippet to save credit costs
  const runSnippetReScan = async (match: PlagiarismMatch) => {
    if (!editor) return;
    toast.loading('Re-evaluating section...', { id: 'rescan' });
    try {
      const { scanSnippetOriginality } = await import('@/app/actions/plagiarismChecker');
      const res = await scanSnippetOriginality(match.snippet);
      
      if (res.error) {
        toast.error(res.error, { id: 'rescan' });
      } else if (res.data) {
        const newMatches = res.data.matches || [];
        setPlagiarismMatches(prev => {
          const filtered = prev.filter(m => m.offset !== match.offset);
          const mappedNew = newMatches.map(m => ({
            ...m,
            offset: match.offset + m.offset
          }));
          const updated = [...filtered, ...mappedNew];
          
          // Recompute overall score based on the updated matches
          const cleanText = editor.getText().trim();
          const highlightedRanges: { start: number; end: number }[] = [];
          updated.forEach(u => {
            highlightedRanges.push({ start: u.offset, end: u.offset + u.length });
          });
          highlightedRanges.sort((a, b) => a.start - b.start);
          const mergedRanges: { start: number; end: number }[] = [];
          if (highlightedRanges.length > 0) {
            let current = highlightedRanges[0];
            for (let i = 1; i < highlightedRanges.length; i++) {
              const next = highlightedRanges[i];
              if (next.start <= current.end) {
                current.end = Math.max(current.end, next.end);
              } else {
                mergedRanges.push(current);
                current = next;
              }
            }
            mergedRanges.push(current);
          }
          const totalMatchedChars = mergedRanges.reduce((acc, r) => acc + (r.end - r.start), 0);
          const plagScore = Math.min(100, Math.round((totalMatchedChars / cleanText.length) * 100) || 0);
          setPlagiarizedScore(plagScore);
          setOriginalityScore(100 - plagScore);
          
          return updated;
        });
        toast.success('Section re-evaluated successfully!', { id: 'rescan' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Re-evaluation failed.', { id: 'rescan' });
    }
  };

  const handleSelectPlagiarismMatch = (match: PlagiarismMatch) => {
    if (!editor) return;
    const doc = editor.state.doc;
    const from = findProseMirrorPos(doc, match.offset);
    const to = findProseMirrorPos(doc, match.offset + match.length);
    editor.commands.setTextSelection({ from, to });
    editor.commands.focus();
    const tr = editor.state.tr.scrollIntoView();
    editor.view.dispatch(tr);
  };

  const handleInsertCitation = (match: PlagiarismMatch) => {
    if (!editor) return;
    const attribution = ` [Source: ${match.title}](${match.url})`;
    editor.chain()
      .focus()
      .insertContent(attribution)
      .run();
  };

  // Paraphrasing action handlers
  const handleOpenParaphraseModal = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ');
    if (!selected.trim()) return;

    setSelectedParaphraseText(selected);
    setSelectionRange({ from, to });
    setParaphraseOptions([]);
    setParaphraseError(null);
    setIsParaphraseModalOpen(true);
    runParaphrase(selected, 'standard');
  };

  const runParaphrase = async (text: string, mode: 'standard' | 'formal' | 'simple' | 'creative') => {
    setParaphraseMode(mode);
    setIsParaphrasing(true);
    setParaphraseError(null);
    try {
      const res = await paraphraseText(text, mode);
      if (res.error) {
        setParaphraseError(res.error);
      } else if (res.data) {
        setParaphraseOptions(res.data);
      }
    } catch (err) {
      setParaphraseError('Failed to generate rewrite options.');
    } finally {
      setIsParaphrasing(false);
    }
  };

  const handleInsertParaphrase = (option: string) => {
    if (!editor || !selectionRange) return;
    editor.chain()
      .focus()
      .insertContentAt({ from: selectionRange.from, to: selectionRange.to }, option)
      .run();
    setIsParaphraseModalOpen(false);
  };

  // Load word counts initial
  useEffect(() => {
    if (editor) {
      const plain = editor.getText();
      const words = plain.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(plain.length);
      setReadTime(Math.max(1, Math.ceil(words / 225)));
    }
  }, [editor]);

  // Escape key fullscreen toggle listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Document Title edits trigger change state
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setHasChanges(true);
  };

  // ContentType selector edits trigger change state
  const handleContentTypeChange = (val: string) => {
    setContentType(val);
    setHasChanges(true);
  };

  // Platform Selector edits trigger change state
  const handlePlatformChange = (val: string) => {
    setTargetPlatform(val);
    setHasChanges(true);
  };

  // Status Selector edits trigger change state
  const handleStatusChange = (val: string) => {
    setStatus(val);
    setHasChanges(true);
  };

  // Manual save trigger
  const handleManualSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    setSaveStatus('Saving outline...');
    try {
      const html = editor.getHTML();
      const plain = editor.getText();

      if (!docId) {
        // Create new document
        const res = await createDocument({
          title: title.trim() || 'Untitled Outline',
          content_type: contentType,
          target_platform: targetPlatform,
          body_html: html,
          body_plain: plain,
          status: status
        });

        if (res.error) {
          setSaveStatus(`Save failed: ${res.error}`);
        } else if (res.data) {
          setDocId(res.data.id);
          setHasChanges(false);
          const now = new Date().toLocaleTimeString();
          setSaveStatus(`Saved at ${now}`);
          router.replace(`/content-studio/${res.data.id}`);

          // Take initial version snapshot
          const vRes = await createDocumentVersion(res.data.id, {
            title: res.data.title,
            body_html: res.data.body_html,
            body_plain: res.data.body_plain
          });
          if (vRes.data) {
            setVersions([vRes.data]);
          }
        }
      } else {
        // Update existing document
        const res = await updateDocument(docId, {
          title: title.trim() || 'Untitled Outline',
          content_type: contentType,
          target_platform: targetPlatform,
          body_html: html,
          body_plain: plain,
          status: status
        });

        if (res.error) {
          setSaveStatus(`Save failed: ${res.error}`);
        } else {
          setHasChanges(false);
          const now = new Date().toLocaleTimeString();
          setSaveStatus(`Saved at ${now}`);

          // Take version snapshot
          const vRes = await createDocumentVersion(docId, {
            title: title.trim() || 'Untitled Outline',
            body_html: html,
            body_plain: plain
          });
          if (vRes.data) {
            setVersions(prev => [vRes.data, ...prev].slice(0, 10));
          }
        }
      }
    } catch (e: any) {
      setSaveStatus('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Background Auto-Save triggers every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasChanges && editor && docId) {
        setSaveStatus('Autosaving draft...');
        try {
          const html = editor.getHTML();
          const plain = editor.getText();

          const res = await updateDocument(docId, {
            title: title.trim() || 'Untitled Outline',
            content_type: contentType,
            target_platform: targetPlatform,
            body_html: html,
            body_plain: plain,
            status: status
          });

          if (!res.error) {
            setHasChanges(false);
            const now = new Date().toLocaleTimeString();
            setSaveStatus(`Autosaved at ${now}`);

            // Take version snapshot
            const vRes = await createDocumentVersion(docId, {
              title: title.trim() || 'Untitled Outline',
              body_html: html,
              body_plain: plain
            });
            if (vRes.data) {
              setVersions(prev => [vRes.data, ...prev].slice(0, 10));
            }
          }
        } catch (error) {
          setSaveStatus('Autosave failed.');
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasChanges, editor, docId, title, contentType, targetPlatform, status]);

  // Load structural template
  const handleLoadTemplate = (type: keyof typeof QUICK_START_TEMPLATES) => {
    if (!editor) return;
    
    const isEmpty = editor.getText().trim() === '' || editor.getText().trim() === 'Start typing document outline canvases here...';
    const action = () => {
      const tpl = QUICK_START_TEMPLATES[type];
      editor.commands.setContent(tpl.outline);
      setTitle(tpl.name);
      
      const isSocialType = type.startsWith('social_');
      setContentType(isSocialType ? 'social' : type);
      
      if (type === 'social_instagram') setTargetPlatform('instagram');
      else if (type === 'social_linkedin') setTargetPlatform('linkedin');
      else if (type === 'social_facebook') setTargetPlatform('facebook');
      else if (type === 'social_twitter') setTargetPlatform('twitter');
      else if (type === 'whatsapp') setTargetPlatform('custom');
      
      setHasChanges(true);
    };

    if (!isEmpty) {
      setConfirmConfig({
        isOpen: true,
        title: 'Load Template?',
        description: 'This outline template will replace current canvas text. Proceed?',
        confirmLabel: 'Proceed',
        onConfirm: action
      });
    } else {
      action();
    }
  };

  // Rollback version handler
  const handleRollbackVersion = (version: Version) => {
    if (!editor) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Restore Version?',
      description: 'Revert the outline canvas to this snapshot version?',
      confirmLabel: 'Restore',
      onConfirm: () => {
        editor.commands.setContent(version.body_html);
        setTitle(version.title);
        setHasChanges(true);
        setSaveStatus(`Restored to snapshot version`);
        toast.success('Snapshot restored!');
      }
    });
  };

  return (
    <MetaData pageTitle={docId ? "Edit Outline Canvas" : "New Outline Canvas"}>
      <Wrapper>
        <div className={`flex flex-col min-h-screen bg-[#04091a] relative ${isFullscreen ? 'p-0' : ''}`}>
          
          {/* Main workspace header bar */}
          {!isFullscreen && (
            <div className="border-b border-white/10 bg-[#080f28]">
              <div className="max-w-7xl mx-auto w-full px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/content-studio')}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="font-space-grotesk text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                      Outline <span className="text-primary">Canvas</span>
                    </h1>
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold mt-0.5">
                      Structured text editor & writing assistant
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {saveStatus && (
                    <span className="text-xs text-white/50 bg-[#0c1535] border border-white/5 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {saveStatus}
                    </span>
                  )}
                  <button
                    onClick={handleManualSave}
                    disabled={isSaving}
                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-1.5 disabled:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Editor Grid split screen panel workspace */}
          <div className={`flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full relative ${isFullscreen ? 'max-w-none p-0' : ''}`}>
            
            {/* Left Panel: Canvas Editor content box */}
            <div className={`flex-1 flex flex-col bg-[#080f28] border border-white/10 rounded-xl overflow-hidden ${isFullscreen ? 'border-none rounded-none fixed inset-0 z-[9999] p-6' : 'min-h-[550px]'}`}>
              
              {/* Top toolbar selector area */}
              <div className="bg-[#0c1535] border-b border-white/10 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                
                <div className={contentType === 'social' ? 'md:col-span-6' : 'md:col-span-9'}>
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Master the LeadsMind Marketing Suite)"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full bg-transparent text-white font-space-grotesk font-bold text-sm sm:text-base outline-none placeholder-white/20"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={contentType}
                    onChange={(e) => handleContentTypeChange(e.target.value)}
                    className="w-full bg-[#04091a] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                  >
                    <option value="blog_post">Blog Post</option>
                    <option value="social">Social Media Post</option>
                    <option value="email_marketing">Email Marketing</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="ad_copy">Ad Copy</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="press_release">Press Release</option>
                    <option value="generic">Generic Outline</option>
                  </select>
                </div>

                {contentType === 'social' && (
                  <div className="md:col-span-3">
                    <select
                      value={targetPlatform}
                      onChange={(e) => handlePlatformChange(e.target.value)}
                      className="w-full bg-[#04091a] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="all">All Platforms</option>
                    </select>
                  </div>
                )}

              </div>

              {/* Text formatting editor toolbar */}
              <div className="bg-[#0c1535]/50 border-b border-white/10 p-3 flex flex-wrap items-center justify-between gap-2.5 select-none">
                
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg">
                    <button
                      onClick={() => editor?.chain().focus().undo().run()}
                      disabled={!editor?.can().undo()}
                      className="p-1 rounded text-white/50 hover:text-white disabled:opacity-30"
                      title="Undo"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().redo().run()}
                      disabled={!editor?.can().redo()}
                      className="p-1 rounded text-white/50 hover:text-white disabled:opacity-30"
                      title="Redo"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg">
                    <button
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={`p-1 rounded transition ${editor?.isActive('bold') ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={`p-1 rounded transition ${editor?.isActive('italic') ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      className={`p-1 rounded transition ${editor?.isActive('underline') ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                      title="Underline"
                    >
                      <UnderlineIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg">
                    <button
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={`p-1 rounded transition ${editor?.isActive('bulletList') ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      className={`p-1 rounded transition ${editor?.isActive('orderedList') ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                      title="Ordered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                      className={`p-1 rounded transition ${editor?.isActive('blockquote') ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                      title="Blockquote"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isFullscreen && saveStatus && (
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono mr-2">
                      {saveStatus}
                    </span>
                  )}
                  {isFullscreen && (
                    <button
                      onClick={handleManualSave}
                      className="bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-blue-600 transition flex items-center gap-1 shadow-lg"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                  )}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>

              </div>

              {/* Main text area component */}
              <div className="flex-1 overflow-y-auto bg-[#04091a]/40 max-h-[600px] relative">
                {editor && (
                  <BubbleMenu editor={editor}>
                    <div className="flex items-center gap-1.5 bg-[#080f28] border border-white/15 p-1 px-2 rounded-lg shadow-xl select-none">
                      <button
                        onClick={handleOpenParaphraseModal}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-primary hover:bg-blue-600 rounded-md transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Paraphrase Selection
                      </button>
                    </div>
                  </BubbleMenu>
                )}
                <EditorContent editor={editor} />
              </div>

              {/* Canvas footer metrics panel */}
              <div className="bg-[#0c1535] border-t border-white/10 px-4 py-2 flex items-center justify-between text-[10px] font-bold text-white/40 tracking-wider">
                <div className="flex items-center gap-4 uppercase font-mono">
                  <span>Words: <span className="text-white/80">{wordCount}</span></span>
                  <span>Characters: <span className="text-white/80">{charCount}</span></span>
                  <span>Read Time: <span className="text-white/80">{readTime} Min</span></span>
                </div>
                <div className="flex items-center gap-1 text-emerald-500 uppercase tracking-widest text-[9px] font-extrabold select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>SYNC STATE STABLE</span>
                </div>
              </div>

            </div>

            {/* Right Panel: Collapsible Tab panel details */}
            {!isFullscreen && (
              <div className="w-full lg:w-[350px] bg-[#080f28] border border-white/10 rounded-xl overflow-hidden flex flex-col shrink-0">
                
                {/* Header Tab toggles */}
                <div className="grid grid-cols-7 gap-0.5 bg-white/5 p-1 border-b border-white/10 select-none">
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'templates' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    Tpl
                  </button>

                  <button
                    onClick={() => setActiveTab('grammar')}
                    className={`relative py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'grammar' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <div className="relative">
                      <Sparkles className="w-4 h-4" />
                      {activeIssues.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[7px] font-bold px-0.8 py-0.2 rounded-full min-w-[12px] text-center border border-[#080f28]">
                          {activeIssues.length}
                        </span>
                      )}
                    </div>
                    Gram
                  </button>

                  <button
                    onClick={() => setActiveTab('plagiarism')}
                    className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'plagiarism' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Plag
                  </button>

                  <button
                    onClick={() => setActiveTab('publish')}
                    className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'publish' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Pub
                  </button>

                  <button
                    onClick={() => setActiveTab('seo')}
                    className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'seo' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    SEO
                  </button>

                  <button
                    onClick={() => setActiveTab('versions')}
                    className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'versions' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Hist
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`py-2 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'settings' ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Set
                  </button>
                </div>

                {/* Tab content area */}
                <div className="p-5 flex-1 overflow-y-auto">

                  {/* Templates Tab */}
                  {activeTab === 'templates' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Quick-Start Templates</h4>
                        <p className="text-[9.5px] text-white/30 leading-normal">
                          Populate structured frameworks to guide content creation.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 pb-4">
                        {[
                          { id: 'blog_post', name: 'Standard Blog Post', desc: 'H1, Intro, 3x H2 sections, Conclusion, CTA' },
                          { id: 'social_instagram', name: 'Instagram Post', desc: 'Emoji hook, 2-4 lines core copy, CTA, Hashtags' },
                          { id: 'social_linkedin', name: 'LinkedIn Post', desc: 'Opening statement, 3-5 short paragraphs, question, CTA' },
                          { id: 'social_facebook', name: 'Facebook Post', desc: 'Conversational opener, core message, poll/question, link' },
                          { id: 'social_twitter', name: 'Twitter/X Post', desc: 'High-impact hook or 5-tweet micro-thread structure' },
                          { id: 'email_marketing', name: 'Email Marketing', desc: 'Subject line + Preview, greeting, core message, CTA, sign-off' },
                          { id: 'newsletter', name: 'Newsletter', desc: 'Weekly roundup: editorial hook, featured stories, tips' },
                          { id: 'ad_copy', name: 'Ad Copy (AIDA)', desc: 'Attention headline, subheadline, benefits, clear CTA' },
                          { id: 'sms', name: 'SMS (Strict Cap)', desc: '160 character limit, value proposition, link placeholder' },
                          { id: 'press_release', name: 'Press Release', desc: 'Headline, Dateline, 5Ws intro, quote, boilerplate, contact' },
                          { id: 'whatsapp', name: 'WhatsApp Alert', desc: 'Friendly announcement, value proposition, opt-out option' },
                          { id: 'generic', name: 'Generic Outline', desc: 'Simple headline hook, benefits, CTA links' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleLoadTemplate(t.id as any)}
                            className="w-full bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-primary/[0.03] text-left p-3 rounded-lg flex flex-col gap-1 transition group"
                          >
                            <span className="text-[11px] font-bold text-white group-hover:text-primary transition flex items-center gap-1">
                              <Sparkle className="w-3 h-3 text-purple-400 shrink-0" />
                              {t.name}
                            </span>
                            <span className="text-[9px] text-white/40 leading-normal">{t.desc}</span>
                          </button>
                        ))}
                      </div>

                      {customTemplates.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-white/10">
                          <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">My Custom Templates</h4>
                          <div className="space-y-2">
                            {customTemplates.map((template) => (
                              <button
                                key={template.id}
                                onClick={() => handleLoadCustomTemplate(template)}
                                className="w-full bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-primary/[0.03] text-left p-3 rounded-lg flex flex-col gap-1 transition group"
                              >
                                <span className="text-[11px] font-bold text-white group-hover:text-primary transition flex items-center gap-1">
                                  <LayoutTemplate className="w-3 h-3 text-blue-400 shrink-0" />
                                  {template.title}
                                </span>
                                <span className="text-[9px] text-white/40 leading-normal truncate">
                                  {template.body_plain || 'Empty template body'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grammar Tab */}
                  {activeTab === 'grammar' && (
                    <div className="space-y-5 animate-fade-in">
                      
                      {/* Telemetry Metrics Header */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Telemetry & Metrics</h4>
                        <div className="grid grid-cols-3 gap-2">
                          
                          {/* Overall Score */}
                          <div className="bg-[#04091a] border border-white/5 p-2.5 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">Score</span>
                            <span className={`text-sm font-black font-mono ${
                              metrics.overallScore >= 80 ? 'text-emerald-400' : metrics.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {metrics.overallScore}
                            </span>
                            <span className="text-[8px] text-white/30 uppercase mt-0.5 font-semibold">Overall</span>
                          </div>

                          {/* Tone Badge */}
                          <div className="bg-[#04091a] border border-white/5 p-2.5 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">Tone</span>
                            <span className="text-[10.5px] font-black text-purple-400 truncate max-w-full">
                              {metrics.tone}
                            </span>
                            <span className="text-[8px] text-white/30 uppercase mt-0.5 font-semibold">Detected</span>
                            {(() => {
                              const expectedTones: Record<string, string[]> = {
                                blog_post: ['Conversational', 'Informational', 'Persuasive'],
                                social: ['Friendly', 'Conversational', 'Confident', 'Urgent', 'Persuasive'],
                                email_marketing: ['Persuasive', 'Conversational', 'Urgent', 'Confident'],
                                newsletter: ['Informational', 'Conversational', 'Friendly'],
                                ad_copy: ['Persuasive', 'Urgent', 'Confident'],
                                sms: ['Urgent', 'Conversational', 'Friendly'],
                                press_release: ['Formal', 'Informational'],
                                whatsapp: ['Conversational', 'Friendly', 'Urgent'],
                                generic: ['Formal', 'Conversational', 'Confident', 'Friendly', 'Empathetic', 'Urgent', 'Persuasive', 'Informational']
                              };
                              const isToneAligned = !metrics.tone || (expectedTones[contentType] || expectedTones['generic']).includes(metrics.tone);
                              return (
                                <span className={`text-[7px] font-extrabold uppercase mt-1 px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                  isToneAligned ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                }`} title={isToneAligned ? 'Tone aligns with content type' : `Expected: ${(expectedTones[contentType] || expectedTones['generic']).join(', ')}`}>
                                  {isToneAligned ? '✓ Aligned' : '⚠ Mismatch'}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Readability Box */}
                          <div className="bg-[#04091a] border border-white/5 p-2.5 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">Readability</span>
                            <span className={`text-[10px] font-black truncate max-w-full ${
                              (metrics.gradeLevel || 8.0) <= 8 ? 'text-emerald-400' : (metrics.gradeLevel || 8.0) <= 11 ? 'text-amber-400' : 'text-red-400'
                             }`}>
                               Grade {metrics.gradeLevel || '6-8'}
                            </span>
                            <span className="text-[8px] text-white/30 uppercase mt-0.5 font-semibold">
                              {(metrics.gradeLevel || 8.0) <= 8 ? 'Easy (6-8)' : (metrics.gradeLevel || 8.0) <= 11 ? 'Medium (9-11)' : 'Hard (12+)'}
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* Issue Cards Grouped and Sorted */}
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Grammar Issues ({activeIssues.length})</h4>
                          {isChecking && (
                            <span className="flex items-center gap-1 text-[9px] text-primary font-bold">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking...
                            </span>
                          )}
                        </div>

                        {activeIssues.length > 0 ? (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {/* Grouping issues: Errors, then Style, then Clarity */}
                            {(['error', 'style', 'clarity'] as const).map((sev) => {
                              const groupIssues = activeIssues.filter(i => i.severity === sev);
                              if (groupIssues.length === 0) return null;

                              return (
                                <div key={sev} className="space-y-2">
                                  <div className="text-[8.5px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5 pt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      sev === 'error' ? 'bg-red-500 animate-pulse' : sev === 'style' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`} />
                                    {sev === 'error' ? 'Errors & Spelling' : sev === 'style' ? 'Style & Tone' : 'Clarity & Wordiness'}
                                  </div>

                                  {groupIssues.map((issue) => (
                                    <div
                                      key={issue.id}
                                      className="bg-[#04091a] border border-white/5 rounded-lg p-3 space-y-2.5 hover:border-white/15 transition cursor-pointer"
                                      onClick={() => handleSelectIssue(issue)}
                                    >
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                          <span className="text-[10.5px] font-bold text-white block">
                                            {issue.shortMessage}
                                          </span>
                                          <p className="text-[9.5px] text-white/60 leading-normal mt-0.5">
                                            {issue.message}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Suggestions */}
                                      {issue.replacements && issue.replacements.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                          {issue.replacements.map((rep, idx) => (
                                            <button
                                              key={idx}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleApplyFix(issue, rep.value);
                                              }}
                                              className="bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-white text-[9.5px] font-bold px-2 py-1 rounded transition flex items-center gap-1"
                                            >
                                              <span>Fix to</span>
                                              <span className="underline font-mono">{rep.value}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}

                                      {/* Action Buttons */}
                                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-white/5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDismissIssue(issue.id);
                                          }}
                                          className="text-[9px] font-bold text-white/40 hover:text-white/80 px-2 py-1 rounded hover:bg-white/5 transition"
                                        >
                                          Dismiss
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleIgnoreRule(issue.ruleId);
                                          }}
                                          className="text-[9px] font-bold text-white/40 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition"
                                        >
                                          Ignore Rule
                                        </button>
                                      </div>

                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-[#04091a] border border-white/5 rounded-lg p-5 text-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-white/80">No issues found</p>
                            <p className="text-[9px] text-white/40 mt-0.5 leading-normal">
                              Your outline matches professional, style, and clarity guidelines.
                            </p>
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                  {/* Plagiarism Tab */}
                  {activeTab === 'plagiarism' && (
                    <div className="space-y-5 animate-fade-in text-xs font-dm-sans">
                      
                      {/* Telemetry Metrics Header */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Telemetry & Metrics</h4>
                        <div className="grid grid-cols-2 gap-2">
                          
                          {/* Originality Score */}
                          <div className="bg-[#04091a] border border-white/5 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">Originality</span>
                            {originalityScore !== null ? (
                              <span className={`text-lg font-black font-mono ${
                                originalityScore >= 80 ? 'text-emerald-400' : originalityScore >= 50 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {originalityScore}%
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-white/30 italic">Not Scanned</span>
                            )}
                            <span className="text-[8px] text-white/30 uppercase mt-0.5 font-semibold">Score</span>
                          </div>

                          {/* AI Credits remaining */}
                          <div className="bg-[#04091a] border border-white/5 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">AI Balance</span>
                            <span className="text-lg font-black text-purple-400 font-mono">
                              {aiCredits}
                            </span>
                            <span className="text-[8px] text-white/30 uppercase mt-0.5 font-semibold">Credits</span>
                          </div>

                        </div>
                      </div>

                      {/* Plagiarism scan trigger / progress area */}
                      <div className="space-y-3 pt-1">
                        {isPlagiarismScanning ? (
                          <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
                              <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                Running Originality Check...
                              </span>
                              <span>{Math.round(plagiarismProgress)}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-1.5 transition-all duration-300"
                                style={{ width: `${plagiarismProgress}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-white/30 italic text-center">
                              Scanning public web indices and internal published databases (Takes 15-45s)
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={runPlagiarismScanWithConfirm}
                              className="w-full bg-primary hover:bg-blue-600 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Scan Originality
                            </button>
                            <div className="flex justify-between text-[9px] text-white/30 font-bold uppercase px-1">
                              <span>Cost: 5 AI Credits</span>
                              <span>Starts in 15s</span>
                            </div>
                          </div>
                        )}

                        {plagiarismScanError && (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10.5px] p-2.5 rounded-lg leading-normal">
                            {plagiarismScanError}
                          </div>
                        )}
                      </div>

                      {/* Plagiarism Status Verdict Badge */}
                      {originalityScore !== null && (
                        <div className={`border p-3 rounded-lg flex items-center justify-between transition ${
                          originalityScore >= 90 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : originalityScore >= 75 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          <div className="flex items-center gap-2 text-left">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="text-[10px] font-bold block uppercase tracking-wider">
                                {originalityScore >= 90 ? 'Publish Ready' : originalityScore >= 75 ? 'Review Recommended' : 'Significant Overlap Detected'}
                              </span>
                              <span className="text-[9px] text-white/40 block leading-tight">
                                {originalityScore >= 90 ? 'Content is highly unique and safe to publish.' : originalityScore >= 75 ? 'Some overlap detected. Review suggested.' : 'High duplication. Paraphrasing is highly recommended.'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono">{originalityScore}%</span>
                        </div>
                      )}

                      {/* Plagiarism Match list */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">
                          Match Sources ({plagiarismMatches.length})
                        </h4>

                        {plagiarismMatches.length > 0 ? (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {/* Primary Competitor Alert card */}
                            {(() => {
                              const highestMatch = [...plagiarismMatches].sort((a, b) => b.percentage - a.percentage)[0];
                              if (!highestMatch) return null;
                              return (
                                <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3 space-y-2 relative shadow-lg">
                                  <span className="absolute -top-2 right-3 bg-red-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Primary Competitor Alert
                                  </span>
                                  <div className="flex justify-between items-start gap-1">
                                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                      Top Match ({highestMatch.sourceType})
                                    </span>
                                    <span className="text-[10px] font-bold font-mono text-red-500">
                                      {highestMatch.percentage}%
                                    </span>
                                  </div>
                                  <div className="min-w-0" onClick={() => handleSelectPlagiarismMatch(highestMatch)}>
                                    <span className="text-[10.5px] font-bold text-white block truncate cursor-pointer hover:underline">
                                      {highestMatch.title}
                                    </span>
                                    <a href={highestMatch.url} target="_blank" rel="noreferrer" className="text-[9px] text-primary hover:underline truncate block">
                                      {highestMatch.url}
                                    </a>
                                    <p className="text-[9.5px] text-white/50 italic leading-normal mt-1.5 border-l-2 border-red-500 pl-2">
                                      "{highestMatch.snippet}"
                                    </p>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <button onClick={() => runSnippetReScan(highestMatch)} className="text-[9px] font-bold text-amber-400 hover:text-white bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded transition">
                                      Re-scan Section
                                    </button>
                                    <button onClick={() => handleInsertCitation(highestMatch)} className="text-[9px] font-bold text-primary hover:text-white bg-primary/10 border border-primary/20 px-2 py-0.5 rounded transition">
                                      Cite Source
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Normal list of matches (excluding the top alert from visual duplication if you wish, or list all) */}
                            {plagiarismMatches.map((match, idx) => (
                              <div
                                key={idx}
                                data-card-offset={match.offset}
                                className="bg-[#04091a] border border-white/5 rounded-lg p-3 space-y-2 hover:border-white/10 transition cursor-pointer"
                                onClick={() => handleSelectPlagiarismMatch(match)}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    match.sourceType === 'internal' 
                                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                      : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                  }`}>
                                    {match.sourceType} Match
                                  </span>
                                  <span className="text-[10px] font-bold font-mono text-red-400">
                                    {match.percentage}%
                                  </span>
                                </div>

                                <div className="min-w-0">
                                  <span className="text-[10.5px] font-bold text-white block truncate">
                                    {match.title}
                                  </span>
                                  <a
                                    href={match.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[9px] text-primary hover:underline truncate block"
                                  >
                                    {match.url}
                                  </a>
                                  <p className="text-[9.5px] text-white/50 italic leading-normal mt-1.5 border-l-2 border-orange-500/60 pl-2">
                                    "{match.snippet}"
                                  </p>
                                </div>

                                <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      runSnippetReScan(match);
                                    }}
                                    className="text-[9px] font-bold text-amber-400 hover:text-white bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded transition"
                                  >
                                    Re-scan Section
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInsertCitation(match);
                                    }}
                                    className="text-[9px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary px-2.5 py-1 rounded transition flex items-center gap-1"
                                  >
                                    Cite source
                                  </button>
                                </div>

                              </div>
                            ))}
                          </div>
                        ) : (
                          originalityScore !== null && !isPlagiarismScanning && (
                            <div className="bg-[#04091a] border border-white/5 rounded-lg p-5 text-center">
                              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                              <p className="text-[10px] font-bold text-white/80">100% Original</p>
                              <p className="text-[9px] text-white/40 mt-0.5 leading-normal">
                                No duplicate matching sentences were found in the database or public web indices.
                              </p>
                            </div>
                          )
                        )}
                      </div>

                    </div>
                  )}

                  {/* SEO Tab */}
                  {activeTab === 'seo' && (
                    <div className="space-y-5 animate-fade-in text-xs font-dm-sans">
                      
                      {/* SEO Inputs Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">SEO Target Parameters</h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Primary Keyword</label>
                          <input
                            type="text"
                            placeholder="e.g. lead generation"
                            value={primaryKeyword}
                            onChange={(e) => setPrimaryKeyword(e.target.value)}
                            className="w-full bg-[#080f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition placeholder-white/15"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Secondary Keywords (comma separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. automation, pipeline"
                            value={secondaryKeywordsInput}
                            onChange={(e) => setSecondaryKeywordsInput(e.target.value)}
                            className="w-full bg-[#080f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition placeholder-white/15"
                          />
                        </div>

                        {contentType !== 'social' && (
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">SEO Profile Adaptive Filter</label>
                            <select
                              value={seoProfile}
                              onChange={(e) => setSeoProfile(e.target.value as any)}
                              className="w-full bg-[#080f28] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                            >
                              <option value="blog_post">Blog Post</option>
                              <option value="product_page">Product Page</option>
                              <option value="landing_page">Landing Page</option>
                              <option value="local_business">Local Business Page</option>
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Target Country</label>
                            <select
                              value={targetCountry}
                              onChange={(e) => setTargetCountry(e.target.value)}
                              className="w-full bg-[#080f28] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                            >
                              <option value="US">United States</option>
                              <option value="GB">United Kingdom</option>
                              <option value="ZA">South Africa</option>
                              <option value="CA">Canada</option>
                              <option value="AU">Australia</option>
                            </select>
                          </div>

                          <div className="flex flex-col justify-end">
                            <button
                              onClick={runSeoAnalysis}
                              disabled={isSeoAnalyzing || !primaryKeyword.trim()}
                              className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                            >
                              {isSeoAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                              {isSeoAnalyzing ? 'Analyzing...' : 'Scan SEO'}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between text-[9px] text-white/30 font-bold uppercase pt-1 px-0.5">
                          <span>Cost: 3 AI Credits</span>
                          <span>Balance: {aiCredits} Credits</span>
                        </div>

                        {seoScanError && (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-lg leading-normal">
                            {seoScanError}
                          </div>
                        )}
                      </div>

                      {/* SEO Score Result metrics */}
                      {seoScore !== null && (
                        <div className="space-y-4">
                          
                          {/* Telemetry Circle */}
                          <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-2">SEO Scoring Grade</span>
                            <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-white/5 bg-[#080f28]">
                              <span className={`text-lg font-black font-mono ${
                                seoScore >= 80 ? 'text-emerald-400' : seoScore >= 50 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {seoScore}
                              </span>
                            </div>
                            <span className="text-[8px] text-white/30 uppercase mt-2.5 font-bold tracking-widest">
                              {seoScore >= 80 ? 'EXCELLENT OPTIMIZED' : seoScore >= 50 ? 'NEEDS IMPROVEMENT' : 'POOR OPTIMIZATION'}
                            </span>
                          </div>

                          {/* Meta Description Editor & SERP Snippet Preview */}
                          {contentType !== 'social' && (
                            <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Search Listing Optimization</h4>
                              
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[9px] text-white/40 font-bold uppercase">
                                  <span>Meta Description</span>
                                  <span className={seoMetaDescription.length >= 120 && seoMetaDescription.length <= 160 ? 'text-emerald-400' : 'text-amber-400'}>
                                    {seoMetaDescription.length} / 160 chars
                                  </span>
                                </div>
                                <textarea
                                  placeholder="Summarize your outline canvas details for Google snippets..."
                                  value={seoMetaDescription}
                                  onChange={(e) => setSeoMetaDescription(e.target.value)}
                                  className="w-full h-16 bg-[#080f28] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-primary transition resize-none placeholder-white/15"
                                />
                              </div>

                              {/* Google SERP Snippet Preview Card */}
                              <div className="space-y-1">
                                <span className="text-[9px] text-white/40 font-bold uppercase block">Google SERP Preview</span>
                                <div className="bg-white border border-gray-200 p-3 rounded-lg text-left text-xs font-sans text-gray-800 shadow-sm leading-normal">
                                  <div className="text-[11px] text-[#202124] flex items-center gap-1.5 truncate">
                                    <span className="font-semibold">LeadsMind</span>
                                    <span className="text-[#5f6368] font-light">› blog › {title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'untitled'}</span>
                                  </div>
                                  <div className="text-[14px] text-[#1a0dab] font-normal hover:underline cursor-pointer truncate mt-0.5 font-medium leading-snug">
                                    {title || 'Untitled Document Outline'}
                                  </div>
                                  <div className="text-[12px] text-[#4d5156] mt-1 font-light leading-relaxed">
                                    {seoMetaDescription.trim().length > 0 ? (
                                      <p dangerouslySetInnerHTML={{
                                        __html: primaryKeyword 
                                          ? seoMetaDescription.replace(new RegExp(`(${primaryKeyword})`, 'gi'), '<strong>$1</strong>')
                                          : seoMetaDescription
                                      }} />
                                    ) : (
                                      <span className="text-gray-400 italic">Please enter a meta description to preview listing card...</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Keyword Density Meter */}
                          <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                            <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Keyword Density Map</h4>
                            <div className="space-y-3 pt-1">
                              {seoDensity.map((den, idx) => {
                                const density = den.density;
                                let statusText = 'Optimal';
                                let barColor = 'bg-emerald-500';
                                let textColor = 'text-emerald-400';
                                
                                const isSocialMode = contentType === 'social';
                                const idealMin = isSocialMode ? 0.8 : (seoProfile === 'landing_page' ? 0.8 : (seoProfile === 'local_business' ? 1.2 : 1.0));
                                const idealMax = isSocialMode ? 2.5 : (seoProfile === 'landing_page' ? 1.8 : (seoProfile === 'local_business' ? 2.2 : 2.0));

                                if (density < idealMin) {
                                  statusText = 'Low Density';
                                  barColor = 'bg-blue-500';
                                  textColor = 'text-blue-400';
                                } else if (density > idealMax) {
                                  statusText = 'Over-optimized';
                                  barColor = 'bg-red-500';
                                  textColor = 'text-red-400';
                                }
                                
                                const percentage = Math.min(100, (density / 5) * 100);

                                return (
                                  <div key={idx} className="bg-[#080f28] border border-white/5 p-3 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-white/80 font-bold font-mono truncate max-w-[120px]">{den.keyword}</span>
                                      <span className={`${textColor} font-bold`}>{density}% ({statusText})</span>
                                    </div>
                                    
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                      <div 
                                        className={`h-full ${barColor} transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                      <div 
                                        className="absolute top-0 bottom-0 border-l border-white/30"
                                        style={{ left: `${(idealMin / 5) * 100}%` }}
                                        title={`Min target: ${idealMin}%`}
                                      />
                                      <div 
                                        className="absolute top-0 bottom-0 border-l border-white/30"
                                        style={{ left: `${(idealMax / 5) * 100}%` }}
                                        title={`Max target: ${idealMax}%`}
                                      />
                                    </div>
                                    
                                    <div className="flex justify-between text-[8px] text-white/30">
                                      <span>{den.count} occurrences</span>
                                      <span>Target: {idealMin}% - {idealMax}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Competitor Benchmarks (Google SEO only) */}
                          {contentType !== 'social' && seoBenchmarks && (
                            <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3 font-bold text-white/60">
                              <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider font-dm-sans">Competitor Benchmarks</h4>
                              
                              <div className="space-y-2 pt-1 text-[10px] font-mono uppercase">
                                <div className="flex justify-between">
                                  <span className="text-white/30">Average Word Count:</span>
                                  <span className="text-white/80">{seoBenchmarks.avgWordCount} words</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/30">Average Subheadings:</span>
                                  <span className="text-white/80">{seoBenchmarks.avgHeadingCount} headings</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/30">Target Readability:</span>
                                  <span className="text-white/80">{seoBenchmarks.avgReadabilityGrade}</span>
                                </div>
                              </div>

                              {/* Top Competitor Card */}
                              {seoBenchmarks.topCompetitor && (
                                <div className="pt-3 border-t border-white/5 space-y-2 font-dm-sans normal-case text-xs">
                                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">#1 Ranking Competitor</span>
                                  <div className="bg-[#080f28] border border-white/5 p-3 rounded-lg space-y-2">
                                    <div className="text-[11px] font-bold text-blue-400 hover:underline truncate">
                                      <a href={seoBenchmarks.topCompetitor.url} target="_blank" rel="noopener noreferrer">
                                        {seoBenchmarks.topCompetitor.title}
                                      </a>
                                    </div>
                                    <div className="text-[9px] text-white/40 truncate select-all">{seoBenchmarks.topCompetitor.url}</div>
                                    <div className="grid grid-cols-2 gap-2 text-[9.5px] border-t border-white/5 pt-1.5 text-white/60">
                                      <div>Word Count: <span className="text-white font-mono font-bold">{seoBenchmarks.topCompetitor.wordCount}</span></div>
                                      <div>Est. Traffic: <span className="text-white font-mono font-bold">{seoBenchmarks.topCompetitor.estimatedTraffic}</span></div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* PAA - People Also Ask Accordions */}
                              {seoBenchmarks.peopleAlsoAsk && (
                                <div className="pt-3 border-t border-white/5 space-y-2 font-dm-sans">
                                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">People Also Ask (Google)</span>
                                  <div className="space-y-1.5">
                                    {seoBenchmarks.peopleAlsoAsk.map((q: string, qIdx: number) => {
                                      const isOpen = openPaaIndex === qIdx;
                                      return (
                                        <div key={qIdx} className="bg-[#080f28] border border-white/5 rounded-lg overflow-hidden transition">
                                          <button
                                            type="button"
                                            onClick={() => setOpenPaaIndex(isOpen ? null : qIdx)}
                                            className="w-full p-2.5 flex items-center justify-between text-[9.5px] text-white/80 font-bold text-left hover:bg-white/5 transition"
                                          >
                                            <span className="normal-case">{q}</span>
                                            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                          </button>
                                          
                                          {isOpen && (
                                            <div className="px-3 pb-3 pt-1 text-[9.5px] text-white/60 normal-case border-t border-white/5 leading-relaxed bg-[#04091a]">
                                              {`According to search trends, targeting '${primaryKeyword}' requires structuring your headings to directly answer search intent. Competitors answering this question on their pages typically rank higher.`}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* NLP Missing Keywords */}
                              {seoBenchmarks.missingKeywords && (
                                <div className="pt-3 border-t border-white/5 space-y-2 font-dm-sans">
                                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">NLP Missing Terms</span>
                                  <div className="flex flex-wrap gap-1">
                                    {seoBenchmarks.missingKeywords.map((kw: string, kwIdx: number) => (
                                      <span key={kwIdx} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded text-[8.5px] font-bold lowercase">
                                        +{kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          )}

                          {/* SEO Metric Suggestions List */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Scoring Checks ({seoMetrics.length})</h4>
                            
                            <div className="space-y-2">
                              {seoMetrics.map((met, idx) => (
                                <div key={idx} className="bg-[#04091a] border border-white/5 p-3 rounded-lg flex items-start gap-2.5">
                                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${met.passed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  <div className="min-w-0">
                                    <span className="text-[10.5px] font-bold text-white block">{met.name}</span>
                                    <p className="text-[9.5px] text-white/60 leading-normal mt-0.5">{met.message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  )}

                  {/* Publish & Distribution Tab */}
                  {activeTab === 'publish' && (
                    <div className="space-y-5 animate-fade-in text-xs font-dm-sans">
                      
                      {/* Social Media Distribution Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-primary" /> Post to Social Media
                        </h4>
                        
                        <div className="space-y-2">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Target Platforms</label>
                          <div className="flex gap-2.5">
                            {[
                              { id: 'facebook', icon: <Facebook className="w-4 h-4 stroke-current" />, color: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2]' },
                              { id: 'instagram', icon: <Instagram className="w-4 h-4 stroke-current" />, color: 'hover:bg-[#E4405F]/10 hover:text-[#E4405F]' },
                              { id: 'twitter', icon: <Twitter className="w-4 h-4 stroke-current" />, color: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]' },
                              { id: 'linkedin', icon: <Linkedin className="w-4 h-4 stroke-current" />, color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]' }
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
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                                    selected 
                                      ? 'bg-primary text-white scale-105 shadow-md shadow-primary/20' 
                                      : 'bg-[#080f28] border border-white/10 text-white/40 hover:border-white/20'
                                  } ${p.color}`}
                                >
                                  {p.icon}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Schedule Posting (Optional)</label>
                          <input
                            type="datetime-local"
                            value={socialSchedule}
                            onChange={(e) => setSocialSchedule(e.target.value)}
                            className="w-full bg-[#080f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleQueueSocialPost}
                          disabled={isSocialQueuing || socialPlatforms.length === 0}
                          className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        >
                          {isSocialQueuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          {socialSchedule ? 'Schedule Social Post' : 'Queue Social Post'}
                        </button>
                      </div>

                      {/* Social Media Preview Simulator Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-4">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-primary" /> Social Mockup Simulator
                        </h4>

                        {/* Preview Platform Tabs */}
                        <div className="flex bg-[#080f28] p-1 rounded-lg border border-white/5 gap-1">
                          {[
                            { id: 'facebook', label: 'Facebook' },
                            { id: 'instagram', label: 'Instagram' },
                            { id: 'linkedin', label: 'LinkedIn' },
                            { id: 'twitter', label: 'Twitter / X' }
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setPreviewPlatform(tab.id as any)}
                              className={`flex-1 text-center py-1 rounded text-[9.5px] font-bold transition-all ${
                                previewPlatform === tab.id
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-white/40 hover:text-white/70'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Device Mockup Screen */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-left font-sans text-gray-800 shadow-sm leading-normal max-w-sm mx-auto overflow-hidden">
                          {(() => {
                            const plainText = editor?.getText() || '';
                            const htmlContent = editor?.getHTML() || '';
                            const imgMatch = htmlContent.match(/<img[^>]*src=["']([^"']*)["']/i);
                            const previewImage = imgMatch ? imgMatch[1] : null;

                            if (previewPlatform === 'facebook') {
                              return (
                                <div className="space-y-3">
                                  {/* Post Header */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm shrink-0">LM</div>
                                    <div>
                                      <div className="text-[11px] font-bold text-gray-900 leading-tight">LeadsMind</div>
                                      <div className="text-[9px] text-gray-500 font-light leading-none mt-0.5">Just now · 🌎</div>
                                    </div>
                                  </div>
                                  {/* Body */}
                                  <p className="text-[11px] text-gray-900 whitespace-pre-wrap leading-relaxed">{plainText || 'Type your social media content on the writing canvas...'}</p>
                                  {/* Media Image */}
                                  {previewImage ? (
                                    <div className="w-full rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                      <img src={previewImage} alt="Post image attachment" className="w-full h-auto object-cover max-h-48" />
                                    </div>
                                  ) : (
                                    <div className="w-full h-32 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300">
                                      <span className="text-[9px] font-light">No image attachment detected in editor.</span>
                                    </div>
                                  )}
                                  {/* Action Bar */}
                                  <div className="flex justify-around border-t border-gray-100 pt-2 text-[10px] text-gray-500 font-semibold select-none">
                                    <span>👍 Like</span>
                                    <span>💬 Comment</span>
                                    <span>🔁 Share</span>
                                  </div>
                                </div>
                              );
                            }

                            if (previewPlatform === 'instagram') {
                              return (
                                <div className="space-y-3">
                                  {/* Post Header */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-500 to-purple-600 p-[1.5px] shrink-0">
                                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-[10px] text-gray-800">LM</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-bold text-gray-900">leadsmind</div>
                                      <div className="text-[8px] text-gray-500 font-light mt-0.5">Cape Town, South Africa</div>
                                    </div>
                                  </div>
                                  {/* Image main display */}
                                  {previewImage ? (
                                    <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-50 border border-gray-100">
                                      <img src={previewImage} alt="Instagram media post" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-full aspect-square rounded-md bg-gray-100 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300">
                                      <span className="text-[9px] font-light">No image attachment detected in editor.</span>
                                    </div>
                                  )}
                                  {/* Instagram icons */}
                                  <div className="flex justify-between items-center text-lg select-none">
                                    <div className="flex gap-3">
                                      <span>❤️</span>
                                      <span>💬</span>
                                      <span>✈️</span>
                                    </div>
                                    <span>🔖</span>
                                  </div>
                                  {/* Caption */}
                                  <div className="text-[10px] leading-relaxed">
                                    <span className="font-bold mr-1.5">leadsmind</span>
                                    <span className="text-gray-800 whitespace-pre-wrap">{plainText || 'Add content on canvas...'}</span>
                                  </div>
                                </div>
                              );
                            }

                            if (previewPlatform === 'linkedin') {
                              return (
                                <div className="space-y-3">
                                  {/* Post Header */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-[#0a66c2] text-white flex items-center justify-center font-extrabold text-sm shrink-0">in</div>
                                    <div>
                                      <div className="text-[11px] font-bold text-gray-900 leading-tight">LeadsMind Studio</div>
                                      <div className="text-[8.5px] text-gray-500 leading-none mt-0.5">14,250 followers • Promoted</div>
                                    </div>
                                  </div>
                                  {/* Body */}
                                  <p className="text-[11px] text-gray-900 whitespace-pre-wrap leading-relaxed">{plainText || 'Type your outline canvas content...'}</p>
                                  {/* Media */}
                                  {previewImage ? (
                                    <div className="w-full rounded overflow-hidden border border-gray-200 bg-gray-50">
                                      <img src={previewImage} alt="LinkedIn attachment" className="w-full h-auto object-cover max-h-48" />
                                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                                        <div className="text-[10px] font-bold text-gray-800 truncate">{title || 'Untitled Document Outline'}</div>
                                        <div className="text-[8.5px] text-gray-500 mt-0.5">leadsmind.co.za</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-32 rounded bg-gray-100 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300">
                                      <span className="text-[9px] font-light">No image attachment detected in editor.</span>
                                    </div>
                                  )}
                                  {/* Action bar */}
                                  <div className="flex justify-around border-t border-gray-100 pt-2 text-[10px] text-gray-500 font-semibold select-none">
                                    <span>👍 Like</span>
                                    <span>💬 Comment</span>
                                    <span>🔁 Repost</span>
                                    <span>✈️ Send</span>
                                  </div>
                                </div>
                              );
                            }

                            if (previewPlatform === 'twitter') {
                              const truncatedText = plainText.length > 280 ? `${plainText.substring(0, 277)}...` : plainText;
                              return (
                                <div className="space-y-3">
                                  {/* Header */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-xs shrink-0">𝕏</div>
                                    <div>
                                      <div className="text-[11px] font-bold text-gray-900 leading-tight">LeadsMind</div>
                                      <div className="text-[9px] text-gray-500 font-light leading-none mt-0.5">@leadsmind · Just now</div>
                                    </div>
                                  </div>
                                  {/* Body */}
                                  <p className="text-[11px] text-gray-900 whitespace-pre-wrap leading-relaxed">
                                    {truncatedText || 'Type your tweets outline...'}
                                  </p>
                                  {plainText.length > 280 && (
                                    <div className="text-[9px] text-blue-500 font-bold mt-1">🧵 1/3 Show full thread preview in queue settings</div>
                                  )}
                                  {/* Media */}
                                  {previewImage && (
                                    <div className="w-full rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                      <img src={previewImage} alt="Twitter card image" className="w-full h-auto object-cover max-h-40" />
                                    </div>
                                  )}
                                  {/* Action Bar */}
                                  <div className="flex justify-around border-t border-gray-100 pt-2 text-[10px] text-gray-400 select-none">
                                    <span>💬 0</span>
                                    <span>🔁 0</span>
                                    <span>❤️ 0</span>
                                    <span>📊 0</span>
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Email Campaign Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-primary" /> Send as Email Campaign
                        </h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Campaign Name</label>
                          <input
                            type="text"
                            placeholder="Campaign Name"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            className="w-full bg-[#080f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition placeholder-white/15"
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
                          className="w-full bg-primary hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          Configure Email Wizard
                        </button>
                      </div>

                      {/* Save to Blog Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                          <FilePenLine className="w-3.5 h-3.5 text-primary" /> Save to Blog
                        </h4>
                        
                        <p className="text-[9.5px] text-white/30 leading-normal">
                          Exports document outline title, HTML content body, and metadata into a new blog manager draft.
                        </p>

                        <button
                          type="button"
                          onClick={handleSaveToBlog}
                          disabled={isBlogSaving}
                          className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        >
                          {isBlogSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Create Blog Draft
                        </button>
                      </div>

                      {/* Send to Contact Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-primary" /> Send to Contact
                        </h4>

                        <div className="space-y-1.5 relative">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Search Contact</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type name or email..."
                              value={contactQuery}
                              onChange={(e) => {
                                setContactQuery(e.target.value);
                                handleSearchContacts(e.target.value);
                              }}
                              className="w-full bg-[#080f28] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-primary transition placeholder-white/15"
                            />
                            <Search className="w-3.5 h-3.5 text-white/20 absolute left-2.5 top-2.5" />
                          </div>

                          {contactResults.length > 0 && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#080f28] border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-2xl py-1">
                              {contactResults.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedContactId(c.id);
                                    setContactQuery(`${c.first_name || ''} ${c.last_name || ''} (${c.email})`);
                                    setContactResults([]);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-primary/10 transition flex flex-col"
                                >
                                  <span className="font-bold">{c.first_name || ''} {c.last_name || ''}</span>
                                  <span className="text-[10px] text-white/40">{c.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Custom Email Subject</label>
                          <input
                            type="text"
                            placeholder="e.g. Document outline attached"
                            value={customEmailSubject}
                            onChange={(e) => setCustomEmailSubject(e.target.value)}
                            className="w-full bg-[#080f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition placeholder-white/15"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSendToContact}
                          disabled={isContactSending || !selectedContactId}
                          className="w-full bg-primary hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        >
                          {isContactSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          Send Email to Contact
                        </button>
                      </div>

                      {/* Utility Actions Card */}
                      <div className="bg-[#04091a] border border-white/5 p-4 rounded-lg space-y-3">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Utility Actions</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleCopyToClipboard}
                            className="bg-[#080f28] border border-white/10 hover:border-primary/30 hover:bg-primary/[0.02] text-white p-2 rounded-lg transition flex flex-col items-center justify-center text-center gap-1 group"
                          >
                            <Copy className="w-4 h-4 text-white/40 group-hover:text-primary transition" />
                            <span className="text-[9.5px] font-bold">Copy HTML</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isPdfDownloading}
                            className="bg-[#080f28] border border-white/10 hover:border-primary/30 hover:bg-primary/[0.02] text-white p-2 rounded-lg transition flex flex-col items-center justify-center text-center gap-1 group disabled:opacity-50"
                          >
                            {isPdfDownloading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Download className="w-4 h-4 text-white/40 group-hover:text-primary transition" />}
                            <span className="text-[9.5px] font-bold">Download PDF</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveTemplate}
                          disabled={isTemplateSaving}
                          className="w-full bg-[#080f28] border border-white/10 hover:border-primary/30 hover:bg-primary/[0.02] text-white text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isTemplateSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LayoutTemplate className="w-3.5 h-3.5 text-white/40" />}
                          Save as Content Template
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Version history Tab */}
                  {activeTab === 'versions' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">Historical Snapshots</h4>
                        <p className="text-[9.5px] text-white/30 leading-normal">
                          Auto-saved snapshots are limited to the latest 10 versions.
                        </p>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {versions.length > 0 ? (
                          versions.map((ver) => (
                            <div
                              key={ver.id}
                              className="bg-[#04091a] border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2 hover:border-white/10 transition group"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-[10.5px] font-bold text-white/80 block truncate">
                                  {ver.title}
                                </span>
                                <span className="text-[8.5px] text-white/30 font-mono block mt-0.5">
                                  {new Date(ver.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(ver.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <button
                                onClick={() => handleRollbackVersion(ver)}
                                className="p-1 rounded bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition"
                                title="Restore this version"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-[10px] text-white/30 italic">
                            No snapshots captured yet. Snapshots occur on auto-save cycles.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Document settings Tab */}
                  {activeTab === 'settings' && (
                    <div className="space-y-4 animate-fade-in text-xs font-dm-sans">
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Visibility Status</label>
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="w-full bg-[#04091a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                        >
                          <option value="draft">Draft Outline</option>
                          <option value="published">Published / Complete</option>
                        </select>
                      </div>

                      <div className="pt-3 border-t border-white/5 space-y-1.5">
                        <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Document Summary Info</h4>
                        <div className="bg-[#04091a] border border-white/5 p-3 rounded-lg space-y-2 text-[10px] text-white/60 font-semibold font-mono uppercase">
                          <div className="flex justify-between">
                            <span className="text-white/30">Created:</span>
                            <span>{initialDocument ? new Date(initialDocument.created_at).toLocaleDateString() : 'New Document'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/30">Last Updated:</span>
                            <span>{initialDocument ? new Date(initialDocument.updated_at).toLocaleDateString() : 'Unsaved'}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>

          {/* Paraphraser Modal */}
          {isParaphraseModalOpen && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#080f28] border border-white/10 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col">
                
                {/* Modal Header */}
                <div className="bg-[#0c1535] border-b border-white/10 px-5 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-space-grotesk font-bold text-sm text-white flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-purple-400 animate-pulse" />
                      AI Rewrite Paraphraser
                    </h3>
                    <p className="text-[10px] text-white/40 uppercase mt-0.5 font-bold tracking-wider">
                      Powered by OpenAI GPT-4o-mini
                    </p>
                  </div>
                  <button
                    onClick={() => setIsParaphraseModalOpen(false)}
                    className="text-white/40 hover:text-white text-xs font-bold px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition"
                  >
                    Close
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[450px]">
                  
                  {/* Original Text Selection */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Selected Phrase</span>
                    <div className="bg-[#04091a] border border-white/5 p-3 rounded-lg text-xs text-white/70 italic leading-relaxed">
                      "{selectedParaphraseText}"
                    </div>
                  </div>

                  {/* Mode Selectors */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Paraphrase Style Mode</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['standard', 'formal', 'simple', 'creative'] as const).map((mode) => (
                        <button
                          key={mode}
                          disabled={isParaphrasing}
                          onClick={() => runParaphrase(selectedParaphraseText, mode)}
                          className={`py-1.5 rounded-lg text-[10.5px] font-bold capitalize transition border ${
                            paraphraseMode === mode 
                              ? 'bg-primary border-primary text-white' 
                              : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                          } disabled:opacity-50`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generated Rewrites */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Rewrite Options</span>
                      {isParaphrasing && (
                        <span className="flex items-center gap-1 text-[9px] text-primary font-bold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rewriting...
                        </span>
                      )}
                    </div>

                    {paraphraseError && (
                      <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2.5 rounded-lg">
                        {paraphraseError}
                      </p>
                    )}

                    {!isParaphrasing && paraphraseOptions.length > 0 && (
                      <div className="space-y-2">
                        {paraphraseOptions.map((opt, idx) => (
                          <div
                            key={idx}
                            className="bg-[#04091a]/60 border border-white/5 rounded-lg p-3 hover:border-primary/40 transition cursor-pointer flex flex-col gap-2 group"
                            onClick={() => handleInsertParaphrase(opt)}
                          >
                            <p className="text-xs text-white/80 leading-relaxed font-dm-sans group-hover:text-white transition">
                              {opt}
                            </p>
                            <div className="flex justify-between items-center text-[9px] text-white/40 font-bold uppercase pt-1.5 border-t border-white/5">
                              <span>Option {idx + 1}</span>
                              <span className="text-primary opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                Replace Selection <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isParaphrasing && paraphraseOptions.length === 0 && !paraphraseError && (
                      <p className="text-center py-6 text-xs text-white/30 italic">
                        Select a mode to generate rewrite options.
                      </p>
                    )}

                  </div>

                </div>

              </div>
            </div>
          )}

          {confirmConfig && (
            <ConfirmDialog
              isOpen={confirmConfig.isOpen}
              onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
              onConfirm={confirmConfig.onConfirm}
              title={confirmConfig.title}
              description={confirmConfig.description}
              confirmLabel={confirmConfig.confirmLabel}
              variant="warning"
            />
          )}
        </div>
      </Wrapper>
    </MetaData>
  );
}

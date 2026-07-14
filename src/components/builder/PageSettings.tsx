"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useBuilder } from './BuilderContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, Image, Globe, Sparkles, History, CheckCircle, FileCode, Plus } from 'lucide-react';
import { updatePageSettings } from '@/app/actions/builder';
import { getPageRevisions, restorePageRevision } from '@/app/actions/builderDeploy';
import { generateAICopySuggestions } from '@/app/actions/builderAI';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

export const PageSettings = () => {
  const { pageId } = useParams();
  const { websiteData } = useBuilder();
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    name: '',
    seo_title: '',
    seo_description: '',
    og_image_url: '',
    type: 'page',
    author: '',
    category: '',
    tags: [] as string[],
    excerpt: '',
  });

  // AI Copy Generator State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);

  const fetchRevisions = useCallback(async () => {
    if (!pageId) return;
    const res = await getPageRevisions(pageId as string);
    if (res.success && res.versions) {
      setRevisions(res.versions);
    }
  }, [pageId]);

  useEffect(() => {
    async function loadPageDetails() {
      if (!pageId) return;
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('pages')
        .select('name, seo_title, seo_description, og_image_url, type, author, category, tags, excerpt')
        .eq('id', pageId)
        .single();

      if (data) {
        setSettings({
          name: data.name || '',
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
          og_image_url: data.og_image_url || '',
          type: data.type || 'page',
          author: data.author || '',
          category: data.category || '',
          tags: data.tags || [],
          excerpt: data.excerpt || '',
        });
      }
      fetchRevisions();
    }
    loadPageDetails();
  }, [pageId, fetchRevisions]);

  const handleSave = async () => {
    if (!pageId) return;
    setLoading(true);
    const result = await updatePageSettings(pageId as string, settings);
    setLoading(false);
    if (result.success) {
      toast.success("Page settings updated!");
      fetchRevisions();
    } else {
      toast.error("Failed to update settings");
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Are you sure you want to rollback to this draft? Current unsaved changes will be overwritten.")) return;
    const res = await restorePageRevision(versionId);
    if (res.success) {
      toast.success("Revision restored!");
      setTimeout(() => window.location.reload(), 300);
    } else {
      toast.error("Rollback failed");
    }
  };

  const handleAskAI = async () => {
    if (!aiPrompt) return;
    setGeneratingAI(true);
    const res = await generateAICopySuggestions(aiPrompt, settings.seo_title || 'Marketing Page');
    setGeneratingAI(false);
    if (res.success && res.suggestions) {
      setAiSuggestions(res.suggestions);
      toast.success("Suggestions loaded");
    } else {
      toast.error("AI Generation failed");
    }
  };

  const applyAISuggestion = (sug: any) => {
    setSettings(s => ({
      ...s,
      seo_title: sug.heading,
      seo_description: sug.subheading
    }));
    toast.success("Applied headings to SEO inputs");
  };

  return (
    <div className="h-full flex flex-col pt-2 bg-transparent !text-dash-text select-none">
      <div className="px-4 py-3 border-b border-dash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-primary" />
          <h2 className="text-[10px] font-bold !text-dash-textMuted">Page settings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {/* SEO Tags */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Globe className="w-3 h-3" /> Meta search config
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] !text-dash-textMuted font-bold">Display name</Label>
              <Input
                value={settings.name}
                onChange={(e) => setSettings(s => ({ ...s, name: e.target.value }))}
                className="h-9 bg-white border-dash-border !text-dash-text text-sm placeholder:text-dash-textMuted"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] !text-dash-textMuted font-bold">SEO title</Label>
              <Input
                value={settings.seo_title}
                onChange={(e) => setSettings(s => ({ ...s, seo_title: e.target.value }))}
                className="h-9 bg-white border-dash-border !text-dash-text text-sm placeholder:text-dash-textMuted"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] !text-dash-textMuted font-bold">Meta description</Label>
              <Textarea
                value={settings.seo_description}
                onChange={(e) => setSettings(s => ({ ...s, seo_description: e.target.value }))}
                className="bg-white border-dash-border !text-dash-text text-sm min-h-[80px]"
              />
            </div>
          </div>
        </section>

        {/* XML Sitemap Endpoint Link */}
        {websiteData?.id && (
          <section className="p-3.5 bg-dash-surface rounded-2xl border border-dash-border flex flex-col gap-2">
            <div className="text-[10px] font-bold !text-dash-text flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-primary" /> Sitemap indexer
            </div>
            <a
              href={`/api/builder/sitemap?websiteId=${websiteData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline truncate"
            >
              /api/builder/sitemap?websiteId={websiteData.id}
            </a>
          </section>
        )}

        {/* AI Copywriter panel */}
        <section className="space-y-4 pt-4 border-t border-dash-border">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary animate-pulse motion-reduce:animate-none" /> AI copywriter suggestions
          </h3>
          <div className="space-y-3">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="headline for a digital agency..."
              className="bg-white border-dash-border !text-dash-text text-xs min-h-[60px]"
            />
            <Button onClick={handleAskAI} disabled={generatingAI} size="sm" className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold h-9">
              {generatingAI ? 'Suggesting...' : 'Ask AI copywriter'}
            </Button>

            <div className="space-y-2">
              {aiSuggestions.map((sug, i) => (
                <div key={i} onClick={() => applyAISuggestion(sug)} className="p-3 bg-dash-surface hover:bg-dash-border/40 border border-dash-border hover:border-primary/30 rounded-xl cursor-pointer transition-all motion-reduce:transition-none space-y-1">
                  <div className="text-xs font-bold !text-dash-text flex justify-between items-center">
                    {sug.heading}
                    <Plus className="w-3 h-3 text-primary" />
                  </div>
                  <div className="text-[9px] !text-dash-textMuted leading-relaxed">{sug.subheading}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Revision Vault Rollbacks */}
        <section className="space-y-4 pt-4 border-t border-dash-border">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <History className="w-3 h-3" /> Revision history
          </h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {revisions.map((rev) => (
              <div key={rev.id} className="p-3 bg-dash-surface border border-dash-border rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold !text-dash-text truncate max-w-[150px]">{rev.name}</div>
                  <div className="text-[9px] !text-dash-textMuted">
                    {new Date(rev.created_at).toLocaleString()}
                  </div>
                </div>
                <Button onClick={() => handleRestore(rev.id)} size="sm" variant="ghost" className="h-7 px-2.5 text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20">
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-dash-border bg-dash-surface">
        <Button disabled={loading} onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 shadow-lg shadow-primary/20 text-[10px]">
          {loading ? "Saving..." : "Save page settings"}
        </Button>
      </div>
    </div>
  );
};

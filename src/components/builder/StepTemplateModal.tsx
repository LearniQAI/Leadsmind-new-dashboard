"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, LayoutGrid, CheckCircle, Loader2 } from 'lucide-react';
import { BUILDER_TEMPLATES, BuilderTemplate } from '@/lib/builder/templates';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface StepTemplateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stepPageId: string | null;
  stepName?: string;
}

// Replaces a single funnel step's content directly in the DB by page id, rather than
// via Craft.js actions.deserialize() — the step being changed here is frequently NOT
// the step currently loaded in the live editor, so there is no active Craft.js instance
// to deserialize into. A full reload afterwards picks up the new content if the changed
// step happens to be the one currently open.
export const StepTemplateModal = ({
  isOpen,
  onOpenChange,
  stepPageId,
  stepName
}: StepTemplateModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const categories = ['ALL', 'Lead Capture', 'SaaS', 'Real Estate', 'Creative', 'Agency', 'General'];

  const filteredTemplates = BUILDER_TEMPLATES.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' ||
      template.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleApplyTemplate = async (template: BuilderTemplate) => {
    if (!stepPageId) return;
    if (!template.content) {
      toast.error('Template content is empty.');
      return;
    }
    setApplyingId(template.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pages')
        .update({ content: template.content })
        .eq('id', stepPageId);

      if (error) throw error;

      toast.success(`Applied template: ${template.name}`);
      onOpenChange(false);
      window.location.reload();
    } catch (e: any) {
      console.error('Failed to apply template to step:', e);
      toast.error('Failed to apply template: ' + (e.message || 'unknown error'));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border-dash-border !text-dash-text rounded-3xl p-0 overflow-hidden shadow-2xl z-[9999]">
        <div className="flex flex-col h-[75vh]">
          <DialogHeader className="p-6 pb-4 border-b border-dash-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse motion-reduce:animate-none" />
                  Change template {stepName ? <span className="text-primary">— {stepName}</span> : null}
                </DialogTitle>
                <DialogDescription className="text-xs !text-dash-textMuted font-bold mt-1">
                  Replaces this step&apos;s content. The current layout will be lost.
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
                <Input
                  placeholder="Search templates (e.g. Lead, Agency...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 bg-white border-dash-border !text-dash-text rounded-xl focus:border-primary/50 text-xs placeholder:text-dash-textMuted"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant="ghost"
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-10 px-4 text-[10px] font-bold rounded-xl border transition-all motion-reduce:transition-none shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-dash-border hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text'
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {filteredTemplates.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <LayoutGrid className="w-12 h-12 mb-4" />
                <p className="text-sm font-bold">No templates found matching filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex flex-col bg-white border border-dash-border hover:border-primary/45 rounded-2xl overflow-hidden transition-all duration-300 motion-reduce:transition-none hover:shadow-[0_0_30px_rgba(19,89,255,0.15)]"
                  >
                    <div className="aspect-[16/10] bg-dash-surface relative overflow-hidden shrink-0">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutGrid className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                      {template.is_premium && (
                        <div className="absolute top-3 right-3 bg-amber-600 text-white font-bold text-[8px] px-2 py-1 rounded-full shadow-lg">
                          Premium
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center p-4">
                        <Button
                          onClick={() => handleApplyTemplate(template)}
                          disabled={applyingId !== null}
                          className="bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-[10px] px-6 h-10 shadow-lg active:scale-95 transition-transform motion-reduce:transition-none"
                        >
                          {applyingId === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Use template'}
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold !text-dash-text truncate max-w-[150px]">
                            {template.name}
                          </h4>
                          <span className="text-[8px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                            {template.category || 'General'}
                          </span>
                        </div>
                        <p className="text-[10px] !text-dash-textMuted leading-relaxed font-medium line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

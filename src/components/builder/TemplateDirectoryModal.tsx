"use client";

import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, LayoutGrid, CheckCircle } from 'lucide-react';
import { BUILDER_TEMPLATES, BuilderTemplate } from '@/lib/builder/templates';
import { toast } from 'sonner';
import { useBuilder } from './BuilderContext';

interface TemplateDirectoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TemplateDirectoryModal = ({
  isOpen,
  onOpenChange
}: TemplateDirectoryModalProps) => {
  const { actions } = useEditor();
  const { previewMode } = useBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Lead Capture', 'SaaS', 'Real Estate', 'Creative', 'Agency', 'General'];

  const filteredTemplates = BUILDER_TEMPLATES.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || 
      template.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleApplyTemplate = (template: BuilderTemplate) => {
    try {
      if (!template.content) {
        toast.error('Template content is empty.');
        return;
      }
      actions.deserialize(template.content);
      toast.success(`Loaded template: ${template.name}`);
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to load template:', e);
      toast.error('Failed to deserialize template layout.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0b0b14] border-white/5 text-white rounded-3xl p-0 overflow-hidden shadow-2xl z-[9999]">
        <div className="flex flex-col h-[75vh]">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  Template <span className="text-primary">Library</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                  Choose a conversion-optimized layout to deploy in one click
                </DialogDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search templates (e.g. Lead, Agency...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 text-xs placeholder:text-white/30"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant="ghost"
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-white/5 hover:bg-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {filteredTemplates.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <LayoutGrid className="w-12 h-12 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No templates found matching filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex flex-col bg-white/[0.02] border border-white/5 hover:border-primary/45 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(108,71,255,0.15)]"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[16/10] bg-white/5 relative overflow-hidden shrink-0">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutGrid className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                      {template.is_premium && (
                        <div className="absolute top-3 right-3 bg-[#f59e0b] text-black font-black uppercase tracking-widest text-[8px] px-2 py-1 rounded-full shadow-lg">
                          Premium
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                        <Button
                          onClick={() => handleApplyTemplate(template)}
                          className="bg-primary hover:bg-primary/95 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-10 shadow-lg active:scale-95 transition-transform"
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-black uppercase tracking-wider text-white truncate max-w-[150px]">
                            {template.name}
                          </h4>
                          <span className="text-[8px] font-black uppercase text-primary tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                            {template.category || 'General'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed font-medium line-clamp-2">
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

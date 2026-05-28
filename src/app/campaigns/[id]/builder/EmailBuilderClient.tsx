'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, MoveUp, MoveDown, Trash2, Eye, ShieldCheck,
  CheckCircle, AlertTriangle, Monitor, Smartphone, Moon, Sun, Save, RefreshCw, Sparkles, Upload
} from 'lucide-react';
import AISparkDrawer from '@/components/common/AISparkDrawer';
import { updateCampaign } from '@/app/actions/marketing';
import { renderEmailLayout, EmailBlock, BrandKit } from '@/lib/builder/emailRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

interface EmailBuilderClientProps {
  campaignId: string;
  initialCampaign: any;
  brandKit: BrandKit;
}

export function EmailBuilderClient({ campaignId, initialCampaign, brandKit: initialBrandKit }: EmailBuilderClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Layout blocks array
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    try {
      return Array.isArray(initialCampaign.builder_json) ? initialCampaign.builder_json : [];
    } catch {
      return [];
    }
  });

  // Selected block index for editing
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);

  // Active brand kit settings
  const [brandKit, setBrandKit] = useState<BrandKit>(initialBrandKit);

  // Active preview configuration
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [darkModeSim, setDarkModeSim] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'add' | 'inspector' | 'brand' | 'warnings'>('add');

  // Deploy / Automate State
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployTags, setDeployTags] = useState(() => {
    try {
      if (initialCampaign.segment && Array.isArray(initialCampaign.segment.tags)) {
        return initialCampaign.segment.tags.join(', ');
      }
    } catch(e){}
    return '';
  });
  const [isAutomated, setIsAutomated] = useState(() => {
    try {
      return !!initialCampaign.segment?.is_automated;
    } catch(e){}
    return false;
  });

  // Selected block
  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;

  // Add block helper
  const addBlock = (type: EmailBlock['type']) => {
    let content: any = {};
    if (type === 'hero') {
      content = {
        imageUrl: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=800&auto=format&fit=crop&q=60',
        imageAlt: '',
        headline: 'Special Announcement',
        subheadline: 'Hi {{first_name}}, discover the latest additions to the {{company}} dashboard.',
        buttonText: 'Get Started',
        buttonUrl: 'https://leadsmind.io'
      };
    } else if (type === 'features') {
      content = {
        columns: [
          { title: 'Precision Targeting', description: 'Filter leads using advanced criteria rules.' },
          { title: 'Instant Alerts', description: 'Receive webhook notifications via WhatsApp redirect loops.' }
        ]
      };
    } else if (type === 'testimonial') {
      content = {
        quote: 'This platform boosted our campaign performance to over 96%!',
        author: 'Marcus Aurelius',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
        avatarAlt: ''
      };
    } else if (type === 'countdown') {
      content = {
        label: 'Exclusive Deal Expires In:',
        targetDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16) // 7 days
      };
    } else if (type === 'cta') {
      content = {
        text: 'Claim Your Account',
        url: 'https://leadsmind.io/claim',
        align: 'center',
        backgroundColor: brandKit.brandColorPrimary || '#2563eb',
        textColor: '#ffffff'
      };
    } else {
      content = {
        body: 'Hi {{first_name}},\n\nWe wanted to let you know that your recent invoice of {{invoice_amount_zar}} is ready for review.\n\nBest regards,\nThe {{company}} Team'
      };
    }

    const newBlock: EmailBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      content,
      conditions: { tag: '', visibility: 'show' }
    };

    const updated = [...blocks, newBlock];
    setBlocks(updated);
    setSelectedBlockIndex(updated.length - 1);
    setActiveTab('inspector');
  };

  // Reorder helper
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setBlocks(updated);
    setSelectedBlockIndex(targetIndex);
  };

  // Delete helper
  const deleteBlock = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    setSelectedBlockIndex(null);
    setActiveTab('add');
  };

  // Update block content field helper
  const updateBlockContent = (fields: any) => {
    if (selectedBlockIndex === null) return;
    setBlocks(prev => prev.map((block, i) => {
      if (i !== selectedBlockIndex) return block;
      return {
        ...block,
        content: { ...block.content, ...fields }
      };
    }));
  };

  // Update block conditions helper
  const updateBlockConditions = (conditions: any) => {
    if (selectedBlockIndex === null) return;
    setBlocks(prev => prev.map((block, i) => {
      if (i !== selectedBlockIndex) return block;
      return {
        ...block,
        conditions: { ...block.conditions, ...conditions }
      };
    }));
  };

  // Sync brand kit action
  const handleSyncBrandKit = () => {
    setBrandKit(initialBrandKit);
    toast.success('Workspace Brand Kit preferences synchronized successfully.');
  };

  // Save campaign action
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Compile final HTML output
      const compiledHtml = renderEmailLayout(blocks, brandKit);
      
      // 2. Generate preview text from text blocks or defaults
      const textBlock = blocks.find(b => b.type === 'text');
      const plainTextPreview = textBlock?.content.body?.slice(0, 100) || 'Your LeadsMind Email Broadcast';

      // 3. Save to database
      const result = await updateCampaign(campaignId, {
        builder_json: blocks,
        body_html: compiledHtml,
        preview_text: plainTextPreview.replace(/\{\{[^}]+\}\}/g, '').trim()
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Campaign layout design saved successfully!');
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Launch / Automate Action
  const handleDeploy = async () => {
    setSaving(true);
    try {
      // compile HTML
      const compiledHtml = renderEmailLayout(blocks, brandKit);
      const textBlock = blocks.find(b => b.type === 'text');
      const plainTextPreview = textBlock?.content.body?.slice(0, 100) || 'Your LeadsMind Email Broadcast';

      const tagsArray = deployTags.split(',').map(t => t.trim()).filter(Boolean);
      const segmentData = {
        tags: tagsArray,
        is_automated: isAutomated
      };

      const result = await updateCampaign(campaignId, {
        builder_json: blocks,
        body_html: compiledHtml,
        preview_text: plainTextPreview.replace(/\{\{[^}]+\}\}/g, '').trim(),
        segment: segmentData,
        status: 'scheduled'
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        const countMsg = result.matchedContactsCount !== undefined
          ? `(Targeting ${result.matchedContactsCount} contacts)`
          : '';
        toast.success(
          isAutomated 
            ? `Automated Campaign Activated! ${countMsg}` 
            : `Broadcast Campaign Scheduled! ${countMsg}`
        );
        setDeployModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      toast.error('Failed to deploy campaign.');
    } finally {
      setSaving(false);
    }
  };

  // Accessibility audit checker
  const accessibilityWarnings = useMemo(() => {
    const warnings: string[] = [];
    blocks.forEach((block, index) => {
      if (block.type === 'hero' && !block.content.imageUrl) {
        // Skip alt check if image URL is empty
      } else if (block.type === 'hero' && !block.content.imageAlt?.trim()) {
        warnings.push(`Block #${index + 1} (Hero Image) is missing descriptive alternative text.`);
      }
      if (block.type === 'testimonial' && block.content.avatarUrl && !block.content.avatarAlt?.trim()) {
        warnings.push(`Block #${index + 1} (Testimonial Avatar) is missing alternative text.`);
      }
    });
    return warnings;
  }, [blocks]);

  // Compiled real-time HTML document for preview iframe
  const previewHtml = useMemo(() => {
    const html = renderEmailLayout(blocks, brandKit, {
      first_name: 'Sibongile',
      last_name: 'Dube',
      company: 'Leadsmind South Africa',
      tags: ['Existing Client']
    }, {
      invoice_amount_zar: 'R 8,450.00'
    });

    if (darkModeSim) {
      // Invert background/text colors for native dark mode simulation
      return html.replace(
        '</head>',
        `<style>
          body, html { background-color: #020617 !important; color: #cbd5e1 !important; }
          table { background-color: #0f172a !important; border-color: rgba(255,255,255,0.06) !important; }
          td, p, div { color: #cbd5e1 !important; }
          h1, h2, h3 { color: #f1f5f9 !important; }
          a { color: #3b82f6 !important; }
        </style></head>`
      );
    }

    return html;
  }, [blocks, brandKit, darkModeSim]);

  // Direct image upload helper
  const handleDirectUpload = async (field: 'imageUrl' | 'avatarUrl') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const workspaceId = initialCampaign.workspace_id;
      if (!workspaceId) {
        toast.error('Workspace context missing for upload.');
        return;
      }

      toast.promise(
        async () => {
          const supabase = createClient();
          const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'uploaded_image.png';
          const filePath = `${workspaceId}/${Date.now()}_${safeName}`;

          const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase
            .from('media_files')
            .insert({
              workspace_id: workspaceId,
              name: safeName,
              path: filePath,
              type: 'file',
              mime_type: file.type,
              size: file.size
            });

          if (dbError) throw dbError;

          const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
          const publicUrl = publicUrlData.publicUrl;
          
          updateBlockContent({ [field]: publicUrl });
          return publicUrl;
        },
        {
          loading: 'Uploading asset to Media Center...',
          success: 'Asset uploaded successfully!',
          error: (err: any) => `Failed to upload: ${err.message}`,
        }
      );
    };
    input.click();
  };

  // Global Image Paste Handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept if they are actively typing text in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        const inputType = (document.activeElement as HTMLInputElement).type;
        // Exception: allow pasting on standard text inputs if it's an image
        if (inputType !== 'text' && document.activeElement?.tagName !== 'TEXTAREA') {
          return;
        }
      }

      const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
      if (!file) return;

      e.preventDefault();

      const workspaceId = initialCampaign.workspace_id;
      if (!workspaceId) {
        toast.error('Workspace context missing for upload.');
        return;
      }

      toast.promise(
        async () => {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'pasted_image.png';
          const filePath = `${workspaceId}/${Date.now()}_${safeName}`;

          // Upload to bucket
          const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
          if (uploadError) throw uploadError;

          // Register in media_files
          const { data: dbData, error: dbError } = await supabase
            .from('media_files')
            .insert({
              workspace_id: workspaceId,
              name: safeName,
              path: filePath,
              type: 'file',
              mime_type: file.type,
              size: file.size
            })
            .select()
            .single();

          if (dbError) throw dbError;

          // Construct public URL
          const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
          const publicUrl = publicUrlData.publicUrl;

          // Apply to the active block or create a new hero block
          if (selectedBlockIndex !== null) {
            const currentBlock = blocks[selectedBlockIndex];
            if (currentBlock.type === 'hero') {
              updateBlockContent({ imageUrl: publicUrl });
            } else if (currentBlock.type === 'testimonial') {
              updateBlockContent({ avatarUrl: publicUrl });
            } else {
              // Add a new hero block at the end
              addBlock('hero');
              setTimeout(() => {
                setBlocks(prev => {
                  const lastIndex = prev.length - 1;
                  const newBlocks = [...prev];
                  newBlocks[lastIndex] = {
                    ...newBlocks[lastIndex],
                    content: { ...newBlocks[lastIndex].content, imageUrl: publicUrl }
                  };
                  return newBlocks;
                });
              }, 100);
            }
          } else {
            // Append a new hero block automatically
            addBlock('hero');
            setTimeout(() => {
              setBlocks(prev => {
                const lastIndex = prev.length - 1;
                const newBlocks = [...prev];
                newBlocks[lastIndex] = {
                  ...newBlocks[lastIndex],
                  content: { ...newBlocks[lastIndex].content, imageUrl: publicUrl }
                };
                return newBlocks;
              });
            }, 100);
          }
          
          return dbData;
        },
        {
          loading: 'Uploading pasted image to Media Center...',
          success: 'Image uploaded and applied to layout!',
          error: (err: any) => `Failed to upload: ${err.message}`,
        }
      );
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [blocks, selectedBlockIndex, initialCampaign.workspace_id]);

  return (
    <div className="min-h-screen bg-[#04091a] text-white flex flex-col font-dm-sans">
      
      {/* Visual Header */}
      <header className="h-16 border-b border-white/5 bg-[#080f28] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/campaigns"
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-[14px] font-bold text-white uppercase tracking-wider font-space-grotesk leading-none mb-1">
              {initialCampaign.name}
            </h1>
            <p className="text-[10px] text-[#4a5a82] font-semibold uppercase tracking-wider">
              Email Subject: <span className="text-[#3b82f6]">{initialCampaign.subject || 'None'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncBrandKit}
            className="h-9 px-3.5 rounded-lg border border-white/5 bg-white/5 text-[#94a3c8] hover:text-white hover:bg-white/10 text-[12px] font-semibold flex items-center gap-1.5 transition-all"
            title="Sync Core brand kit colors and defaults"
          >
            <RefreshCw size={12} className="text-[#4a5a82]" />
            Sync Brand Kit
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 rounded-lg bg-[#2563eb] hover:bg-[#2563eb]/90 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner animate-spin text-[12px]"></i>
                Saving Layout...
              </>
            ) : (
              <>
                <Save size={13} />
                Save Design
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDeployModalOpen(true)}
            className="h-9 px-5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-white text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#10b981]/20"
          >
            Send
          </button>
        </div>
      </header>

      {/* Main Builder Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 1. Left Sidebar: Toolbox & Settings Inspector */}
        <div className="w-[340px] shrink-0 border-r border-white/5 bg-[#080f28] flex flex-col">
          {/* Tab buttons */}
          <div className="flex border-b border-white/5 p-1 bg-[#04091a]">
            {[
              { id: 'add', label: 'Add', icon: Plus },
              { id: 'inspector', label: 'Settings', icon: Eye },
              { id: 'brand', label: 'Brand', icon: ShieldCheck },
              { id: 'warnings', label: `Issues (${accessibilityWarnings.length})`, icon: AlertTriangle }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#2563eb] text-white'
                      : tab.id === 'warnings' && accessibilityWarnings.length > 0
                        ? 'text-amber-400 hover:bg-white/[0.02]'
                        : 'text-[#94a3c8] hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 common-scrollbar">
            
            {/* Tab: Add Blocks */}
            {activeTab === 'add' && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider mb-2">
                  Structural Layout Components
                </div>
                {[
                  { type: 'hero', name: 'Hero Block', desc: 'Cover image, title, action CTA', icon: 'fa-image' },
                  { type: 'features', name: 'Multi-column Features', desc: 'Side-by-side product highlights', icon: 'fa-columns' },
                  { type: 'testimonial', name: 'Testimonial Frame', desc: 'Customer quote and avatar', icon: 'fa-quote-left' },
                  { type: 'countdown', name: 'Countdown Timer', desc: 'Urgency countdown panel', icon: 'fa-hourglass-half' },
                  { type: 'cta', name: 'Call-to-Action Button', desc: 'Styled marketing link button', icon: 'fa-mouse-pointer' },
                  { type: 'text', name: 'Rich Text Paragraph', desc: 'Standard narrative copy blocks', icon: 'fa-align-left' }
                ].map(block => (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => addBlock(block.type as any)}
                    className="w-full p-3 bg-[#04091a]/40 border border-white/5 hover:border-[#2563eb]/50 hover:bg-[#04091a] text-left rounded-xl transition-all flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[#4a5a82] group-hover:text-[#3b82f6] group-hover:bg-[#2563eb]/10 transition-all border border-white/5">
                      <i className={`fa-solid ${block.icon} text-[14px]`}></i>
                    </div>
                    <div>
                      <div className="text-[11.5px] font-bold text-[#eef2ff]">{block.name}</div>
                      <div className="text-[9px] text-[#4a5a82] mt-0.5 leading-tight">{block.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Settings Block Inspector */}
            {activeTab === 'inspector' && (
              selectedBlock ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-widest">
                      Block: {selectedBlock.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteBlock(selectedBlockIndex!)}
                      className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  {/* Component specific properties */}
                  {selectedBlock.type === 'hero' && (
                      <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider">Hero Image URL</label>
                          <button type="button" onClick={() => handleDirectUpload('imageUrl')} className="text-[9px] font-bold text-[#3b82f6] hover:text-[#2563eb] flex items-center gap-1">
                            <Upload size={10} /> Upload
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedBlock.content.imageUrl || ''}
                          onChange={(e) => updateBlockContent({ imageUrl: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Image Description (Alt Text)</label>
                        <input
                          type="text"
                          value={selectedBlock.content.imageAlt || ''}
                          onChange={(e) => updateBlockContent({ imageAlt: e.target.value })}
                          placeholder="e.g. Logo Banner"
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Headline Text</label>
                        <input
                          type="text"
                          value={selectedBlock.content.headline || ''}
                          onChange={(e) => updateBlockContent({ headline: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Subheadline Description</label>
                        <textarea
                          value={selectedBlock.content.subheadline || ''}
                          onChange={(e) => updateBlockContent({ subheadline: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb] min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Action Button Text</label>
                        <input
                          type="text"
                          value={selectedBlock.content.buttonText || ''}
                          onChange={(e) => updateBlockContent({ buttonText: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Action Button Link</label>
                        <input
                          type="text"
                          value={selectedBlock.content.buttonUrl || ''}
                          onChange={(e) => updateBlockContent({ buttonUrl: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'features' && (
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-[#4a5a82]">Features Columns</div>
                      {(selectedBlock.content.columns || []).map((col: any, colIdx: number) => (
                        <div key={colIdx} className="p-2.5 bg-[#04091a] border border-white/5 rounded-lg space-y-2">
                          <div>
                            <label className="block text-[8px] text-[#4a5a82] uppercase tracking-wider">Column {colIdx + 1} Title</label>
                            <input
                              type="text"
                              value={col.title || ''}
                              onChange={(e) => {
                                const cols = [...selectedBlock.content.columns];
                                cols[colIdx] = { ...cols[colIdx], title: e.target.value };
                                updateBlockContent({ columns: cols });
                              }}
                              className="w-full bg-[#080f28] border border-white/5 rounded-md p-1.5 text-[10.5px] text-white focus:outline-none focus:border-[#2563eb]"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-[#4a5a82] uppercase tracking-wider">Column {colIdx + 1} Desc</label>
                            <textarea
                              value={col.description || ''}
                              onChange={(e) => {
                                const cols = [...selectedBlock.content.columns];
                                cols[colIdx] = { ...cols[colIdx], description: e.target.value };
                                updateBlockContent({ columns: cols });
                              }}
                              className="w-full bg-[#080f28] border border-white/5 rounded-md p-1.5 text-[10px] text-white focus:outline-none focus:border-[#2563eb] min-h-[40px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedBlock.type === 'testimonial' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Quote Body</label>
                        <textarea
                          value={selectedBlock.content.quote || ''}
                          onChange={(e) => updateBlockContent({ quote: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb] min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Author Name</label>
                        <input
                          type="text"
                          value={selectedBlock.content.author || ''}
                          onChange={(e) => updateBlockContent({ author: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider">Avatar Image URL</label>
                          <button type="button" onClick={() => handleDirectUpload('avatarUrl')} className="text-[9px] font-bold text-[#3b82f6] hover:text-[#2563eb] flex items-center gap-1">
                            <Upload size={10} /> Upload
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedBlock.content.avatarUrl || ''}
                          onChange={(e) => updateBlockContent({ avatarUrl: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Avatar Alt Attribute *</label>
                        <input
                          type="text"
                          value={selectedBlock.content.avatarAlt || ''}
                          onChange={(e) => updateBlockContent({ avatarAlt: e.target.value })}
                          placeholder="e.g. Portrait photo"
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'countdown' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Countdown Label</label>
                        <input
                          type="text"
                          value={selectedBlock.content.label || ''}
                          onChange={(e) => updateBlockContent({ label: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Target End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={selectedBlock.content.targetDate || ''}
                          onChange={(e) => updateBlockContent({ targetDate: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'cta' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Button Text</label>
                        <input
                          type="text"
                          value={selectedBlock.content.text || ''}
                          onChange={(e) => updateBlockContent({ text: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Destination URL</label>
                        <input
                          type="text"
                          value={selectedBlock.content.url || ''}
                          onChange={(e) => updateBlockContent({ url: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Alignment</label>
                        <select
                          value={selectedBlock.content.align || 'center'}
                          onChange={(e) => updateBlockContent({ align: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2.5 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Button Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={selectedBlock.content.backgroundColor || '#2563eb'}
                            onChange={(e) => updateBlockContent({ backgroundColor: e.target.value })}
                            className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={selectedBlock.content.backgroundColor || '#2563eb'}
                            onChange={(e) => updateBlockContent({ backgroundColor: e.target.value })}
                            className="flex-1 bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'text' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Narrative Content Body</label>
                        <textarea
                          value={selectedBlock.content.body || ''}
                          onChange={(e) => updateBlockContent({ body: e.target.value })}
                          className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2.5 text-[11.5px] text-white focus:outline-none focus:border-[#2563eb] min-h-[140px] font-sans leading-normal"
                        />
                        <button
                          type="button"
                          onClick={() => setIsAiDrawerOpen(true)}
                          className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/30 py-2 rounded-xl text-xs font-bold text-white shadow-[0_0_12px_rgba(124,58,237,0.25)] transition flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={12} className="animate-pulse" />
                          Write with LeadsMind AI
                        </button>
                        <div className="text-[9px] text-[#4a5a82] mt-1.5 leading-normal">
                          Tip: Use placeholders like <strong className="text-gray-400 font-mono">{"{{first_name}}"}</strong>, <strong className="text-gray-400 font-mono">{"{{company}}"}</strong>, or <strong className="text-gray-400 font-mono">{"{{invoice_amount_zar}}"}</strong> to personalize ZAR pricing.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visibility Conditions configuration */}
                  <div className="border-t border-white/5 pt-3 mt-4 space-y-3">
                    <div className="text-[10px] font-bold text-[#eef2ff] uppercase tracking-wider">
                      Conditional Visibility Gateway
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Required Contact Tag</label>
                      <input
                        type="text"
                        value={selectedBlock.conditions?.tag || ''}
                        onChange={(e) => updateBlockConditions({ tag: e.target.value })}
                        placeholder="e.g. Existing Client"
                        className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Condition Behavior</label>
                      <select
                        value={selectedBlock.conditions?.visibility || 'show'}
                        onChange={(e) => updateBlockConditions({ visibility: e.target.value })}
                        className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2.5 text-[11px] text-white focus:outline-none"
                      >
                        <option value="show">Show Block if Contact Has Tag</option>
                        <option value="hide">Hide Block if Contact Has Tag</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[#4a5a82] text-[12px] italic">
                  Select a layout block on the canvas to inspect and configure its attributes.
                </div>
              )
            )}

            {/* Tab: Brand Kit Configuration */}
            {activeTab === 'brand' && (
              <div className="space-y-4 text-left">
                <div className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-widest border-b border-white/5 pb-2">
                  Workspace Template Branding
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider">Header Brand Logo</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const workspaceId = initialCampaign.workspace_id;
                          if (!workspaceId) return toast.error('Workspace context missing.');
                          
                          toast.promise(
                            async () => {
                              const supabase = createClient();
                              const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'brand_logo.png';
                              const filePath = `${workspaceId}/${Date.now()}_${safeName}`;
                              const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
                              if (uploadError) throw uploadError;
                              const { error: dbError } = await supabase.from('media_files').insert({
                                workspace_id: workspaceId, name: safeName, path: filePath, type: 'file', mime_type: file.type, size: file.size
                              });
                              if (dbError) throw dbError;
                              const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
                              const publicUrl = publicUrlData.publicUrl;
                              setBrandKit({ ...brandKit, logoUrl: publicUrl });
                            },
                            { loading: 'Uploading Logo...', success: 'Logo updated!', error: (err: any) => `Failed to upload: ${err.message}` }
                          );
                        };
                        input.click();
                      }} 
                      className="text-[9px] font-bold text-[#3b82f6] hover:text-[#2563eb] flex items-center gap-1"
                    >
                      <Upload size={10} /> Upload
                    </button>
                  </div>
                  <input
                    type="text"
                    value={brandKit.logoUrl || ''}
                    onChange={(e) => setBrandKit({ ...brandKit, logoUrl: e.target.value })}
                    className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                    placeholder="Enter URL or upload a logo"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Primary Brand Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandKit.brandColorPrimary || '#2563eb'}
                      onChange={(e) => setBrandKit({ ...brandKit, brandColorPrimary: e.target.value })}
                      className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandKit.brandColorPrimary || '#2563eb'}
                      onChange={(e) => setBrandKit({ ...brandKit, brandColorPrimary: e.target.value })}
                      className="flex-1 bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Secondary Dark Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandKit.brandColorSecondary || '#080f28'}
                      onChange={(e) => setBrandKit({ ...brandKit, brandColorSecondary: e.target.value })}
                      className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandKit.brandColorSecondary || '#080f28'}
                      onChange={(e) => setBrandKit({ ...brandKit, brandColorSecondary: e.target.value })}
                      className="flex-1 bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-1">Default Typography Font</label>
                  <input
                    type="text"
                    value={brandKit.brandFontDefault || 'Inter'}
                    onChange={(e) => setBrandKit({ ...brandKit, brandFontDefault: e.target.value })}
                    className="w-full bg-[#04091a] border border-white/5 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>
            )}

            {/* Tab: Warnings & Accessibility check */}
            {activeTab === 'warnings' && (
              <div className="space-y-4 text-left">
                <div className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-widest border-b border-white/5 pb-2">
                  Accessibility Audit Linting
                </div>
                {accessibilityWarnings.length === 0 ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                    <div className="text-emerald-400 font-bold text-[13px] flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} /> Perfect Access
                    </div>
                    <p className="text-[10px] text-[#94a3c8] leading-normal">
                      No structural errors or missing image alt attributes detected. This template is ready for screen readers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accessibilityWarnings.map((warn, i) => (
                      <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10.5px] text-amber-300 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                        <span className="leading-tight">{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* 2. Center Panel: Structural Builder Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#04091a] p-8 flex flex-col items-center common-scrollbar">
          <div className="text-[10.5px] font-bold text-[#4a5a82] uppercase tracking-widest mb-4">
            Editor Canvas Layout
          </div>

          <div className="w-full max-w-xl space-y-3">
            {blocks.length === 0 ? (
              <div className="py-20 border-2 border-dashed border-white/5 bg-[#080f28]/45 hover:bg-[#080f28]/60 transition-all rounded-[24px] flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] mb-4">
                  <Plus size={20} />
                </div>
                <h4 className="text-[14px] font-bold text-[#eef2ff] uppercase tracking-wider">Canvas is Empty</h4>
                <p className="text-[10.5px] text-[#4a5a82] mt-1 max-w-[280px]">
                  Click the "+ Add" tab on the left to drag or insert responsive structural layouts.
                </p>
              </div>
            ) : (
              blocks.map((block, index) => {
                const isSelected = selectedBlockIndex === index;
                return (
                  <div
                    key={block.id}
                    onClick={() => {
                      setSelectedBlockIndex(index);
                      setActiveTab('inspector');
                    }}
                    className={`w-full bg-[#080f28] border rounded-2xl p-4 transition-all relative group cursor-pointer ${
                      isSelected
                        ? 'border-[#2563eb] shadow-xl shadow-[#2563eb]/5 bg-[#0c1437]'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.03] mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[#4a5a82] uppercase">
                          Block #{index + 1}
                        </span>
                        <span className="text-[11px] font-bold text-[#eef2ff] capitalize">
                          {block.type} Block
                        </span>
                      </div>
                      
                      {/* Control arrows */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                          className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white"
                          title="Move Block Up"
                        >
                          <MoveUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={index === blocks.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                          className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white"
                          title="Move Block Down"
                        >
                          <MoveDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteBlock(index); }}
                          className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 ml-1"
                          title="Delete Block"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Block Preview Content */}
                    <div className="text-[11px] text-[#94a3c8] space-y-1">
                      {block.type === 'hero' && (
                        <>
                          <div><strong className="text-gray-400">Headline:</strong> {block.content.headline}</div>
                          <div className="truncate"><strong className="text-gray-400">Image:</strong> {block.content.imageUrl || 'None'}</div>
                        </>
                      )}
                      {block.type === 'features' && (
                        <div>
                          <strong className="text-gray-400">Columns count:</strong> {(block.content.columns || []).length} items
                        </div>
                      )}
                      {block.type === 'testimonial' && (
                        <div className="italic">"{block.content.quote?.slice(0, 80)}..." - {block.content.author}</div>
                      )}
                      {block.type === 'countdown' && (
                        <div><strong className="text-gray-400">Target Date:</strong> {block.content.targetDate || 'None'}</div>
                      )}
                      {block.type === 'cta' && (
                        <div><strong className="text-gray-400">Button:</strong> {block.content.text} ({block.content.url})</div>
                      )}
                      {block.type === 'text' && (
                        <p className="line-clamp-2 text-justify">{block.content.body}</p>
                      )}
                    </div>

                    {/* Conditional rules tag */}
                    {block.conditions?.tag && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.02] flex items-center gap-1.5">
                        <i className="fa-solid fa-code-branch text-[#3b82f6] text-[9px]"></i>
                        <span className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-wider">
                          Condition: {block.conditions.visibility === 'hide' ? 'Hide' : 'Show'} if has tag "{block.conditions.tag}"
                        </span>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Right Panel: Dynamic Split Preview Iframe Viewport */}
        <div className="w-[450px] shrink-0 border-l border-white/5 bg-[#080f28] flex flex-col">
          {/* Header preview settings toolbar */}
          <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between shrink-0 bg-[#04091a]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  previewMode === 'desktop' ? 'bg-[#2563eb] text-white' : 'text-[#4a5a82] hover:text-[#94a3c8]'
                }`}
                title="Desktop Viewport Mode"
              >
                <Monitor size={15} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  previewMode === 'mobile' ? 'bg-[#2563eb] text-white' : 'text-[#4a5a82] hover:text-[#94a3c8]'
                }`}
                title="Mobile Viewport Mode"
              >
                <Smartphone size={15} />
              </button>
            </div>

            <div className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest">
              Live Preview Simulator
            </div>

            <button
              type="button"
              onClick={() => setDarkModeSim(!darkModeSim)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                darkModeSim ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-[#4a5a82] hover:text-[#94a3c8]'
              }`}
              title="Simulate Native Dark Mode Overrides"
            >
              {darkModeSim ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Viewport frame container */}
          <div className="flex-1 bg-[#04091a] flex items-center justify-center p-6 overflow-hidden">
            <div
              className={`h-full bg-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/5 ${
                previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
              }`}
            >
              <iframe
                title="Live Email Render"
                srcDoc={previewHtml}
                className="w-full h-full border-none bg-transparent"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>

      <AISparkDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        contextType="email_campaign"
        workspaceId={initialCampaign.workspace_id}
        onInsert={(content) => {
          updateBlockContent({ body: content });
        }}
      />

      {/* Send / Automate Modal */}
      <Dialog open={deployModalOpen} onOpenChange={setDeployModalOpen}>
        <DialogContent className="bg-[#080f28] border border-white/5 rounded-3xl max-w-md p-8 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Send <span className="text-[#3b82f6]">Campaign</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Who should receive this? (Enter Tags)</Label>
              <Input 
                value={deployTags} 
                onChange={e => setDeployTags(e.target.value)} 
                placeholder="e.g. VIP, Newsletter, Welcome" 
                className="h-12 border-white/5 bg-[#04091a] text-white rounded-xl focus-visible:ring-1 focus-visible:ring-[#3b82f6]" 
              />
              <p className="text-[9px] text-[#4a5a82] font-semibold mt-1">Only contacts with these tags will receive this email.</p>
            </div>

            <div className="p-4 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={isAutomated}
                    onChange={(e) => setIsAutomated(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-[#080f28]"
                  />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-white tracking-wide uppercase">Send Automatically</div>
                  <div className="text-[10px] text-[#94a3c8] mt-1 leading-relaxed">
                    Leave this checked to automatically send this email to any new contacts who get these tags in the future.
                  </div>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <button 
              onClick={() => setDeployModalOpen(false)} 
              className="px-6 h-10 rounded-xl border border-white/5 text-[#94a3c8] hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeploy} 
              disabled={saving} 
              className="px-6 h-10 rounded-xl bg-[#10b981] hover:bg-[#10b981]/90 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg transition-all"
            >
              {saving ? 'Sending...' : isAutomated ? 'Start Automation' : 'Send Now'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, MoveUp, MoveDown, Trash2, Eye, ShieldCheck,
  CheckCircle, AlertTriangle, Monitor, Smartphone, Moon, Sun, Save, Sparkles, Upload,
  Image as ImageIcon, Columns, Quote, Hourglass, MousePointerClick, AlignLeft, GitBranch, Loader2
} from 'lucide-react';
import AISparkDrawer from '@/components/common/AISparkDrawer';
import { updateCampaign } from '@/app/actions/marketing';
import { renderEmailLayout, EmailBlock, BrandKit } from '@/lib/builder/emailRenderer';
import { DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter } from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface EmailBuilderClientProps {
  campaignId: string;
  initialCampaign: any;
  brandKit: BrandKit;
}

const BLOCK_TYPES = [
  { type: 'hero', name: 'Hero Block', desc: 'Cover image, title, action CTA', icon: ImageIcon },
  { type: 'features', name: 'Multi-column Features', desc: 'Side-by-side product highlights', icon: Columns },
  { type: 'testimonial', name: 'Testimonial Frame', desc: 'Customer quote and avatar', icon: Quote },
  { type: 'countdown', name: 'Countdown Timer', desc: 'Urgency countdown panel', icon: Hourglass },
  { type: 'cta', name: 'Call-to-Action Button', desc: 'Styled marketing link button', icon: MousePointerClick },
  { type: 'text', name: 'Rich Text Paragraph', desc: 'Standard narrative copy blocks', icon: AlignLeft },
] as const;

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

  const [preheaderText, setPreheaderText] = useState(initialCampaign.preview_text || '');

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
        backgroundColor: brandKit.brandColorPrimary || '#1359FF',
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

  // Save campaign action
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Compile final HTML output — skipPersonalization: true keeps
      // {{first_name}}/{{unsubscribe_link}}/etc. tokens intact in the stored
      // body_html. They're resolved per-recipient by the dispatch worker at
      // actual send time, not baked in once here against no real contact.
      const compiledHtml = renderEmailLayout(blocks, brandKit, {}, {}, preheaderText, true);

      // 2. Generate preview text from text blocks or defaults
      const textBlock = blocks.find(b => b.type === 'text');
      const plainTextPreview = textBlock?.content.body?.slice(0, 100) || 'Your LeadsMind Email Broadcast';

      // 3. Save to database
      const result = await updateCampaign(campaignId, {
        builder_json: blocks,
        body_html: compiledHtml,
        preview_text: preheaderText || plainTextPreview.replace(/\{\{[^}]+\}\}/g, '').trim()
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
      // 1. Compile final HTML
      const compiledHtml = renderEmailLayout(blocks, brandKit, {}, {}, preheaderText);
      const textBlock = blocks.find(b => b.type === 'text');
      const plainTextPreview = textBlock?.content.body?.slice(0, 100) || 'Your LeadsMind Email Broadcast';

      const tokens = deployTags.split(',').map(t => t.trim()).filter(Boolean);
      const emailTokens = tokens.filter(t => t.includes('@'));
      const tagTokens = tokens.filter(t => !t.includes('@'));

      const segmentData = {
        tags: tagTokens,
        emails: emailTokens,
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
        const totalRecipients = (result.matchedContactsCount || 0) + emailTokens.length;
        const countMsg = `(Targeting ${totalRecipients} recipients)`;
        toast.success(
          isAutomated
            ? `Automated campaign activated! ${countMsg}`
            : `Broadcast campaign scheduled! ${countMsg}`
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

      const toastId = toast.loading('Uploading asset to Media Center...');
      try {
        const supabase = createClient();
        const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'uploaded_image.png';
        const filePath = `${workspaceId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw new Error(uploadError.message || 'Upload failed');

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

        if (dbError) throw new Error(dbError.message || 'Database insert failed');

        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        const publicUrl = publicUrlData.publicUrl;

        updateBlockContent({ [field]: publicUrl });
        toast.success('Asset uploaded successfully!', { id: toastId });
      } catch (err: any) {
        console.error('Upload error:', err);
        toast.error(`Failed to upload: ${err.message || 'Unknown error'}`, { id: toastId });
      }
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

      const toastId = toast.loading('Uploading pasted image to Media Center...');
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'pasted_image.png';
        const filePath = `${workspaceId}/${Date.now()}_${safeName}`;

        // Upload to bucket
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw new Error(uploadError.message || 'Upload failed');

        // Register in media_files
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

        if (dbError) throw new Error(dbError.message || 'Database insert failed');

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

        toast.success('Image uploaded and applied to layout!', { id: toastId });
      } catch (err: any) {
        console.error('Paste upload error:', err);
        toast.error(`Failed to upload: ${err.message || 'Unknown error'}`, { id: toastId });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [blocks, selectedBlockIndex, initialCampaign.workspace_id]);

  const fieldInputClass = "w-full bg-white border border-dash-border rounded-lg p-2 text-[11px] !text-dash-text focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none";
  const fieldLabelClass = "block text-[10px] font-bold !text-dash-textMuted mb-1";

  return (
    <div className="min-h-screen bg-dash-surface !text-dash-text flex flex-col">

      {/* Visual Header */}
      <header className="h-16 border-b border-dash-border bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/campaigns"
            className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/40 transition-all motion-reduce:transition-none"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-[14px] font-bold !text-dash-text leading-none mb-1">
              {initialCampaign.name}
            </h1>
            <p className="text-[10px] !text-dash-textMuted font-semibold">
              Email subject: <span className="text-dash-accent">{initialCampaign.subject || 'None'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DashButton onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving layout...
              </>
            ) : (
              <>
                <Save size={13} />
                Save design
              </>
            )}
          </DashButton>

          <button
            type="button"
            onClick={() => setDeployModalOpen(true)}
            className="h-9 px-5 rounded-lg bg-green hover:bg-green/90 text-white text-[12px] font-bold flex items-center gap-2 transition-colors motion-reduce:transition-none"
          >
            Send
          </button>
        </div>
      </header>

      {/* Main Builder Container */}
      <div className="flex-1 flex overflow-hidden">

        {/* 1. Left Sidebar: Toolbox & Settings Inspector */}
        <div className="w-[340px] shrink-0 border-r border-dash-border bg-white flex flex-col">
          {/* Tab buttons */}
          <div className="flex border-b border-dash-border p-1 bg-dash-surface">
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
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-colors motion-reduce:transition-none",
                    activeTab === tab.id
                      ? 'bg-dash-accent text-white'
                      : tab.id === 'warnings' && accessibilityWarnings.length > 0
                        ? 'text-amber-600 hover:bg-dash-border/40'
                        : '!text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/40'
                  )}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

            {/* Tab: Add Blocks */}
            {activeTab === 'add' && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold !text-dash-textMuted mb-2">
                  Structural layout components
                </div>
                {BLOCK_TYPES.map(block => (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => addBlock(block.type as any)}
                    className="w-full p-3 bg-dash-surface border border-dash-border hover:border-dash-accent/50 hover:bg-white text-left rounded-xl transition-colors motion-reduce:transition-none flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:bg-dash-accent/10 transition-colors motion-reduce:transition-none border border-dash-border">
                      <block.icon size={16} />
                    </div>
                    <div>
                      <div className="text-[11.5px] font-bold !text-dash-text">{block.name}</div>
                      <div className="text-[9px] !text-dash-textMuted mt-0.5 leading-tight">{block.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Settings Block Inspector */}
            {activeTab === 'inspector' && (
              selectedBlock ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-dash-border pb-2">
                    <span className="text-[11px] font-bold text-dash-accent capitalize">
                      Block: {selectedBlock.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteBlock(selectedBlockIndex!)}
                      className="text-red hover:text-red/80 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  {/* Component specific properties */}
                  {selectedBlock.type === 'hero' && (
                      <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={fieldLabelClass}>Hero image URL</label>
                          <button type="button" onClick={() => handleDirectUpload('imageUrl')} className="text-[9px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1">
                            <Upload size={10} /> Upload
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedBlock.content.imageUrl || ''}
                          onChange={(e) => updateBlockContent({ imageUrl: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Image description (alt text)</label>
                        <input
                          type="text"
                          value={selectedBlock.content.imageAlt || ''}
                          onChange={(e) => updateBlockContent({ imageAlt: e.target.value })}
                          placeholder="e.g. Logo Banner"
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Headline text</label>
                        <input
                          type="text"
                          value={selectedBlock.content.headline || ''}
                          onChange={(e) => updateBlockContent({ headline: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Subheadline description</label>
                        <textarea
                          value={selectedBlock.content.subheadline || ''}
                          onChange={(e) => updateBlockContent({ subheadline: e.target.value })}
                          className={cn(fieldInputClass, "min-h-[60px]")}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Action button text</label>
                        <input
                          type="text"
                          value={selectedBlock.content.buttonText || ''}
                          onChange={(e) => updateBlockContent({ buttonText: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Action button link</label>
                        <input
                          type="text"
                          value={selectedBlock.content.buttonUrl || ''}
                          onChange={(e) => updateBlockContent({ buttonUrl: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'features' && (
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold !text-dash-textMuted">Features columns</div>
                      {(selectedBlock.content.columns || []).map((col: any, colIdx: number) => (
                        <div key={colIdx} className="p-2.5 bg-dash-surface border border-dash-border rounded-lg space-y-2">
                          <div>
                            <label className="block text-[9px] !text-dash-textMuted">Column {colIdx + 1} title</label>
                            <input
                              type="text"
                              value={col.title || ''}
                              onChange={(e) => {
                                const cols = [...selectedBlock.content.columns];
                                cols[colIdx] = { ...cols[colIdx], title: e.target.value };
                                updateBlockContent({ columns: cols });
                              }}
                              className="w-full bg-white border border-dash-border rounded-md p-1.5 text-[10.5px] !text-dash-text focus:outline-none focus:border-dash-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] !text-dash-textMuted">Column {colIdx + 1} desc</label>
                            <textarea
                              value={col.description || ''}
                              onChange={(e) => {
                                const cols = [...selectedBlock.content.columns];
                                cols[colIdx] = { ...cols[colIdx], description: e.target.value };
                                updateBlockContent({ columns: cols });
                              }}
                              className="w-full bg-white border border-dash-border rounded-md p-1.5 text-[10px] !text-dash-text focus:outline-none focus:border-dash-accent min-h-[40px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedBlock.type === 'testimonial' && (
                    <div className="space-y-3">
                      <div>
                        <label className={fieldLabelClass}>Quote body</label>
                        <textarea
                          value={selectedBlock.content.quote || ''}
                          onChange={(e) => updateBlockContent({ quote: e.target.value })}
                          className={cn(fieldInputClass, "min-h-[60px]")}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Author name</label>
                        <input
                          type="text"
                          value={selectedBlock.content.author || ''}
                          onChange={(e) => updateBlockContent({ author: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={fieldLabelClass}>Avatar image URL</label>
                          <button type="button" onClick={() => handleDirectUpload('avatarUrl')} className="text-[9px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1">
                            <Upload size={10} /> Upload
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedBlock.content.avatarUrl || ''}
                          onChange={(e) => updateBlockContent({ avatarUrl: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'countdown' && (
                    <div className="space-y-3">
                      <div>
                        <label className={fieldLabelClass}>Countdown label</label>
                        <input
                          type="text"
                          value={selectedBlock.content.label || ''}
                          onChange={(e) => updateBlockContent({ label: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Target end date & time</label>
                        <input
                          type="datetime-local"
                          value={selectedBlock.content.targetDate || ''}
                          onChange={(e) => updateBlockContent({ targetDate: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'cta' && (
                    <div className="space-y-3">
                      <div>
                        <label className={fieldLabelClass}>Button text</label>
                        <input
                          type="text"
                          value={selectedBlock.content.text || ''}
                          onChange={(e) => updateBlockContent({ text: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Destination URL</label>
                        <input
                          type="text"
                          value={selectedBlock.content.url || ''}
                          onChange={(e) => updateBlockContent({ url: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Alignment</label>
                        <select
                          value={selectedBlock.content.align || 'center'}
                          onChange={(e) => updateBlockContent({ align: e.target.value })}
                          className={cn(fieldInputClass, "p-2.5")}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Button color</label>
                        <div className="flex gap-2 items-center">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-dash-border shrink-0 cursor-pointer" style={{ backgroundColor: selectedBlock.content.backgroundColor || '#1359FF' }}>
                            <input
                              type="color"
                              value={selectedBlock.content.backgroundColor || '#1359FF'}
                              onChange={(e) => updateBlockContent({ backgroundColor: e.target.value })}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                          </div>
                          <input
                            type="text"
                            value={selectedBlock.content.backgroundColor || '#1359FF'}
                            onChange={(e) => updateBlockContent({ backgroundColor: e.target.value })}
                            className="flex-1 bg-white border border-dash-border rounded-lg p-2 text-[11px] !text-dash-text focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'text' && (
                    <div className="space-y-3">
                      <div>
                        <label className={fieldLabelClass}>Narrative content body</label>
                        <textarea
                          value={selectedBlock.content.body || ''}
                          onChange={(e) => updateBlockContent({ body: e.target.value })}
                          className={cn(fieldInputClass, "p-2.5 text-[11.5px] min-h-[140px] leading-normal")}
                        />
                        <button
                          type="button"
                          onClick={() => setIsAiDrawerOpen(true)}
                          className="w-full mt-2 bg-dash-accent hover:bg-dash-accent/90 py-2 rounded-xl text-xs font-bold text-white transition-colors motion-reduce:transition-none flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={12} />
                          Write with LeadsMind AI
                        </button>
                        <div className="text-[9px] !text-dash-textMuted mt-1.5 leading-normal">
                          Tip: Use placeholders like <strong className="!text-dash-text font-mono">{"{{first_name}}"}</strong>, <strong className="!text-dash-text font-mono">{"{{company}}"}</strong>, or <strong className="!text-dash-text font-mono">{"{{invoice_amount_zar}}"}</strong> to personalize ZAR pricing.
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-8 !text-dash-textMuted text-[12px] italic">
                  Select a layout block on the canvas to inspect and configure its attributes.
                </div>
              )
            )}

            {/* Tab: Brand Kit Configuration */}
            {activeTab === 'brand' && (
              <div className="space-y-4 text-left">
                <div className="text-[11px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">
                  Workspace template branding
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={fieldLabelClass}>Header brand logo</label>
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

                          const toastId = toast.loading('Uploading logo...');
                          try {
                            const supabase = createClient();
                            const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'brand_logo.png';
                            const filePath = `${workspaceId}/${Date.now()}_${safeName}`;

                            const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
                            if (uploadError) throw new Error(uploadError.message || 'Upload failed');

                            const { error: dbError } = await supabase.from('media_files').insert({
                              workspace_id: workspaceId, name: safeName, path: filePath, type: 'file', mime_type: file.type, size: file.size
                            });
                            if (dbError) throw new Error(dbError.message || 'Database insert failed');

                            const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
                            const publicUrl = publicUrlData.publicUrl;

                            setBrandKit({ ...brandKit, logoUrl: publicUrl });
                            toast.success('Logo updated!', { id: toastId });
                          } catch (err: any) {
                            console.error('Logo upload error:', err);
                            toast.error(`Failed to upload: ${err.message || 'Unknown error'}`, { id: toastId });
                          }
                        };
                        input.click();
                      }}
                      className="text-[9px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1"
                    >
                      <Upload size={10} /> Upload
                    </button>
                  </div>
                  <input
                    type="text"
                    value={brandKit.logoUrl || ''}
                    onChange={(e) => setBrandKit({ ...brandKit, logoUrl: e.target.value })}
                    className={fieldInputClass}
                    placeholder="Enter URL or upload a logo"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Preheader / preview text</label>
                  <textarea
                    value={preheaderText}
                    onChange={(e) => setPreheaderText(e.target.value)}
                    className={cn(fieldInputClass, "p-2.5 min-h-[60px]")}
                    placeholder="Short summary hidden in email body but visible in inbox preview"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Primary brand color</label>
                  <div className="flex gap-2 items-center">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-dash-border shrink-0 cursor-pointer" style={{ backgroundColor: brandKit.brandColorPrimary || '#1359FF' }}>
                      <input
                        type="color"
                        value={brandKit.brandColorPrimary || '#1359FF'}
                        onChange={(e) => setBrandKit({ ...brandKit, brandColorPrimary: e.target.value })}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={brandKit.brandColorPrimary || '#1359FF'}
                      onChange={(e) => setBrandKit({ ...brandKit, brandColorPrimary: e.target.value })}
                      className="flex-1 bg-white border border-dash-border rounded-lg p-2 text-[11px] !text-dash-text focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className={fieldLabelClass}>Default typography font</label>
                  <select
                    value={brandKit.brandFontDefault || 'Inter'}
                    onChange={(e) => setBrandKit({ ...brandKit, brandFontDefault: e.target.value })}
                    className={cn(fieldInputClass, "p-2.5")}
                  >
                    <option value="Inter">Inter (Sans Serif)</option>
                    <option value="Roboto">Roboto (Sans Serif)</option>
                    <option value="Open Sans">Open Sans (Sans Serif)</option>
                    <option value="Montserrat">Montserrat (Sans Serif)</option>
                    <option value="Playfair Display">Playfair Display (Serif)</option>
                    <option value="Georgia">Georgia (Serif)</option>
                    <option value="Space Grotesk">Space Grotesk (Modern)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tab: Warnings & Accessibility check */}
            {activeTab === 'warnings' && (
              <div className="space-y-4 text-left">
                <div className="text-[11px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">
                  Accessibility audit linting
                </div>
                {accessibilityWarnings.length === 0 ? (
                  <div className="p-4 bg-green/10 border border-green/20 rounded-xl text-center space-y-2">
                    <div className="text-green font-bold text-[13px] flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} /> Perfect access
                    </div>
                    <p className="text-[10px] !text-dash-textMuted leading-normal">
                      No structural errors or missing image alt attributes detected. This template is ready for screen readers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accessibilityWarnings.map((warn, i) => (
                      <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] text-amber-600 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
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
        <div className="flex-1 overflow-y-auto bg-dash-surface p-8 flex flex-col items-center custom-scrollbar">
          <div className="text-[10.5px] font-bold !text-dash-textMuted mb-4">
            Editor canvas layout
          </div>

          <div className="w-full max-w-xl space-y-3">
            {blocks.length === 0 ? (
              <div className="py-20 border-2 border-dashed border-dash-border bg-white hover:border-dash-accent/40 transition-colors motion-reduce:transition-none rounded-3xl flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted mb-4">
                  <Plus size={20} />
                </div>
                <h4 className="text-[14px] font-bold !text-dash-text">Canvas is empty</h4>
                <p className="text-[10.5px] !text-dash-textMuted mt-1 max-w-[280px]">
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
                    className={cn(
                      "w-full bg-white border rounded-2xl p-4 transition-colors motion-reduce:transition-none relative group cursor-pointer",
                      isSelected
                        ? 'border-dash-accent shadow-md bg-dash-accent/5'
                        : 'border-dash-border hover:border-dash-text/20'
                    )}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between pb-2 border-b border-dash-border mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-dash-surface border border-dash-border !text-dash-textMuted">
                          Block #{index + 1}
                        </span>
                        <span className="text-[11px] font-bold !text-dash-text capitalize">
                          {block.type} block
                        </span>
                      </div>

                      {/* Control arrows */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                          className="w-6 h-6 rounded bg-dash-surface hover:bg-dash-border/60 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center !text-dash-text"
                          title="Move Block Up"
                        >
                          <MoveUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={index === blocks.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                          className="w-6 h-6 rounded bg-dash-surface hover:bg-dash-border/60 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center !text-dash-text"
                          title="Move Block Down"
                        >
                          <MoveDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteBlock(index); }}
                          className="w-6 h-6 rounded bg-red/10 hover:bg-red/20 flex items-center justify-center text-red ml-1"
                          title="Delete Block"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Block Preview Content */}
                    <div className="text-[11px] !text-dash-textMuted space-y-1">
                      {block.type === 'hero' && (
                        <>
                          <div><strong className="!text-dash-text">Headline:</strong> {block.content.headline}</div>
                          <div className="truncate"><strong className="!text-dash-text">Image:</strong> {block.content.imageUrl || 'None'}</div>
                        </>
                      )}
                      {block.type === 'features' && (
                        <div>
                          <strong className="!text-dash-text">Columns count:</strong> {(block.content.columns || []).length} items
                        </div>
                      )}
                      {block.type === 'testimonial' && (
                        <div className="italic">"{block.content.quote?.slice(0, 80)}..." - {block.content.author}</div>
                      )}
                      {block.type === 'countdown' && (
                        <div><strong className="!text-dash-text">Target Date:</strong> {block.content.targetDate || 'None'}</div>
                      )}
                      {block.type === 'cta' && (
                        <div><strong className="!text-dash-text">Button:</strong> {block.content.text} ({block.content.url})</div>
                      )}
                      {block.type === 'text' && (
                        <p className="line-clamp-2 text-justify">{block.content.body}</p>
                      )}
                    </div>

                    {/* Conditional rules tag */}
                    {block.conditions?.tag && (
                      <div className="mt-2.5 pt-2 border-t border-dash-border flex items-center gap-1.5">
                        <GitBranch className="text-dash-accent" size={11} />
                        <span className="text-[9px] font-bold text-dash-accent">
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
        <div className="w-[450px] shrink-0 border-l border-dash-border bg-white flex flex-col">
          {/* Header preview settings toolbar */}
          <div className="h-12 border-b border-dash-border px-4 flex items-center justify-between shrink-0 bg-dash-surface">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors motion-reduce:transition-none",
                  previewMode === 'desktop' ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                )}
                title="Desktop Viewport Mode"
              >
                <Monitor size={15} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors motion-reduce:transition-none",
                  previewMode === 'mobile' ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                )}
                title="Mobile Viewport Mode"
              >
                <Smartphone size={15} />
              </button>
            </div>

            <div className="text-[10px] font-bold !text-dash-textMuted">
              Live preview simulator
            </div>

            <button
              type="button"
              onClick={() => setDarkModeSim(!darkModeSim)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors motion-reduce:transition-none",
                darkModeSim ? 'bg-amber-50 text-amber-600 border border-amber-200' : '!text-dash-textMuted hover:!text-dash-text'
              )}
              title="Simulate Native Dark Mode Overrides"
            >
              {darkModeSim ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Viewport frame container */}
          <div className="flex-1 bg-dash-surface flex items-center justify-center p-6 overflow-hidden">
            <div
              className={cn(
                "h-full bg-white rounded-2xl overflow-hidden shadow-md transition-all duration-300 motion-reduce:transition-none border border-dash-border",
                previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
              )}
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
      <DashModal open={deployModalOpen} onOpenChange={setDeployModalOpen}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle>Send <span className="text-dash-accent">campaign</span></DashModalTitle>
          </DashModalHeader>
          <div className="space-y-6">

            <DashFormField
              label="Target recipients (emails or tags)"
              hint="Type CRM tags or direct comma-separated emails. The system handles both automatically."
            >
              <div className="flex items-center justify-end mb-1">
                <button type="button" onClick={() => alert('Please navigate to the Contacts tab in your dashboard to import CSV files. You can type tags or direct emails here.')} className="text-[10px] font-bold text-dash-accent hover:text-dash-accent/80">
                  Import CSV
                </button>
              </div>
              <DashInput
                value={deployTags}
                onChange={e => setDeployTags(e.target.value)}
                placeholder="e.g. VIP, Newsletter, john@example.com"
              />
            </DashFormField>

            <div className="p-4 rounded-xl border border-dash-accent/20 bg-dash-accent/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5">
                  <input
                    type="checkbox"
                    checked={isAutomated}
                    onChange={(e) => setIsAutomated(e.target.checked)}
                    className="w-4 h-4 rounded border-dash-border accent-dash-accent"
                  />
                </div>
                <div>
                  <div className="text-[12px] font-bold !text-dash-text">Enable auto-sender</div>
                  <div className="text-[11px] !text-dash-textMuted mt-1 leading-relaxed">
                    When enabled, this campaign becomes a live automation. Any future CRM contact that receives one of the tags above will automatically be sent this email.
                  </div>
                </div>
              </label>
            </div>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setDeployModalOpen(false)}>
              Cancel
            </DashButton>
            <DashButton onClick={handleDeploy} disabled={saving}>
              {saving ? 'Processing...' : isAutomated ? 'Save & enable auto-sender' : 'Broadcast now'}
            </DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>
    </div>
  );
}

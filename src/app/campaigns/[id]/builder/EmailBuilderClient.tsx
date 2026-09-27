'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, MoveUp, MoveDown, Trash2, Eye, ShieldCheck,
  CheckCircle, AlertTriangle, Monitor, Smartphone, Moon, Sun, Save, Sparkles, Upload,
  Image as ImageIcon, Columns, Quote, Hourglass, MousePointerClick, AlignLeft, GitBranch, Loader2,
  Pencil, Users, Filter, GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { TagIconGlyph } from '@/lib/tags/tagIcons';
import AISparkDrawer from '@/components/common/AISparkDrawer';
import { dispatchCampaignNow, updateCampaign, sendTestEmailAction, getCampaignAudienceReach } from '@/app/actions/marketing';
import { renderEmailLayout, compileCampaignHtml, EmailBlock, BrandKit } from '@/lib/builder/emailRenderer';
import { checkEmailContent, type EmailContentWarning } from '@/lib/builder/emailContentCheck';
import { DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter } from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toastCampaignSendError } from '@/lib/campaigns/sendErrorToast';
import { CampaignSettingsDialog } from '@/components/campaigns/CampaignSettingsDialog';
import type { TagOption } from '@/components/crm/TagMultiSelect';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface SegmentOption { id: string; name: string; }

interface EmailBuilderClientProps {
  campaignId: string;
  initialCampaign: any;
  brandKit: BrandKit;
  availableSegments?: SegmentOption[];
  availableTags?: TagOption[];
  userEmail?: string;
}

// `color` is a per-type accent (icon tile in the palette, and the block's header badge on the
// canvas), so a block's kind reads at a glance instead of every block looking identical — the
// same colored-tile convention already used by the LMS content block list.
const BLOCK_TYPES = [
  { type: 'hero', name: 'Hero Block', desc: 'Cover image, title, action CTA', icon: ImageIcon, color: 'from-blue-500 to-blue-600' },
  { type: 'features', name: 'Multi-column Features', desc: 'Side-by-side product highlights', icon: Columns, color: 'from-purple-500 to-purple-600' },
  { type: 'testimonial', name: 'Testimonial Frame', desc: 'Customer quote and avatar', icon: Quote, color: 'from-pink-500 to-pink-600' },
  { type: 'countdown', name: 'Countdown Timer', desc: 'Urgency countdown panel', icon: Hourglass, color: 'from-orange-500 to-orange-600' },
  { type: 'cta', name: 'Call-to-Action Button', desc: 'Styled marketing link button', icon: MousePointerClick, color: 'from-emerald-500 to-emerald-600' },
  { type: 'text', name: 'Rich Text Paragraph', desc: 'Standard narrative copy blocks', icon: AlignLeft, color: 'from-slate-500 to-slate-600' },
] as const;

const BLOCK_META: Record<string, { name: string; icon: any; color: string }> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.type, { name: b.name, icon: b.icon, color: b.color }])
);

export function EmailBuilderClient({ campaignId, initialCampaign, brandKit: initialBrandKit, availableSegments = [], availableTags = [], userEmail = '' }: EmailBuilderClientProps) {
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
  // True while a palette block is being dragged over the canvas (native HTML5 drag, since it
  // starts outside @hello-pangea/dnd's own DragDropContext) — drives the drop-zone highlight.
  const [isPaletteDragOver, setIsPaletteDragOver] = useState(false);

  // Active brand kit settings
  const [brandKit, setBrandKit] = useState<BrandKit>(initialBrandKit);

  // Active preview configuration
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [darkModeSim, setDarkModeSim] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'add' | 'inspector' | 'brand' | 'warnings'>('add');

  // Test send
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState(userEmail);
  const [testSending, setTestSending] = useState(false);

  // Deploy / Automate State
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  // Every immediate send (header "Send now" and the Send dialog's "Send now") confirms first.
  const [confirmSendNowOpen, setConfirmSendNowOpen] = useState(false);
  // The audience is configured ONLY in the campaign's Settings dialog (one source of truth). The
  // Send dialog shows it read-only; "Edit audience" opens that same Settings dialog in place.
  const [tagOptions, setTagOptions] = useState<TagOption[]>(availableTags);
  const [savedCampaign, setSavedCampaign] = useState<any>(initialCampaign);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const savedSegment = savedCampaign.segment && typeof savedCampaign.segment === 'object' ? savedCampaign.segment : {};
  const savedTagIds: string[] = Array.isArray(savedSegment.tags) ? savedSegment.tags : [];
  const savedRuleCount: number = Array.isArray(savedSegment.ruleGroup?.rules) ? savedSegment.ruleGroup.rules.length : 0;
  const savedSegmentId: string | null = savedRuleCount > 0 ? null : (savedSegment.segmentId || null);
  const hasSavedAudience = savedTagIds.length > 0 || savedRuleCount > 0 || !!savedSegmentId;
  const [reach, setReach] = useState<{ total: number; emailReach: number } | null>(null);
  const [reachError, setReachError] = useState<string | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  const [isAutomated, setIsAutomated] = useState(() => !!initialCampaign.segment?.is_automated);
  // The Settings audience is the ONLY audience: nothing can be sent without one.
  const canSend = hasSavedAudience;

  const [preheaderText, setPreheaderText] = useState(initialCampaign.preview_text || '');
  const [scheduledFor, setScheduledFor] = useState(() => {
    if (!initialCampaign.scheduled_for) return '';
    const date = new Date(initialCampaign.scheduled_for);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  });

  // Selected block
  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;

  // Add block helper. `atIndex` inserts at a specific position (dropped there from the palette);
  // omitted, it appends (a palette click, or the paste-image fallback) — same as before.
  const addBlock = (type: EmailBlock['type'], atIndex?: number) => {
    let content: any = {};
    if (type === 'hero') {
      content = {
        imageUrl: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=800&auto=format&fit=crop&q=60',
        imageAlt: '',
        headline: 'Special Announcement',
        // Possessive form, not "the {{company}} dashboard": {{company}}'s no-data fallback is the
        // phrase "your company" (parsePersonalTokens), and "the your company dashboard" was the
        // broken rendering the 2026-09-27 deliverability audit found live. "{{company}}'s dashboard"
        // reads correctly with that fallback AND with any real company name substituted in.
        subheadline: "Hi {{first_name}}, discover the latest additions to {{company}}'s dashboard.",
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
        // Same possessive fix as the hero block's subheadline above.
        body: "Hi {{first_name}},\n\nWe wanted to let you know that your recent invoice of {{invoice_amount_zar}} is ready for review.\n\nBest regards,\n{{company}}'s Team"
      };
    }

    const newBlock: EmailBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      content,
      conditions: { tag: '', visibility: 'show' }
    };

    const updated = [...blocks];
    const insertAt = atIndex === undefined ? updated.length : Math.max(0, Math.min(atIndex, updated.length));
    updated.splice(insertAt, 0, newBlock);
    setBlocks(updated);
    setSelectedBlockIndex(insertAt);
    setActiveTab('inspector');
  };

  // Reorder helper (kept alongside drag-to-reorder below as a keyboard/click-accessible fallback)
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

  // Drag-to-reorder existing canvas blocks (@hello-pangea/dnd) — same reorder pattern as the LMS
  // lesson content block list. Keeps the selection on whichever block was selected, even though
  // its index changed.
  const handleBlockDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const selectedId = selectedBlockIndex !== null ? blocks[selectedBlockIndex]?.id : null;
    const reordered = Array.from(blocks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBlocks(reordered);
    if (selectedId) {
      const newIndex = reordered.findIndex((b) => b.id === selectedId);
      setSelectedBlockIndex(newIndex === -1 ? null : newIndex);
    }
  };

  // Dropping a NEW block dragged from the palette (native HTML5 drag: it starts outside
  // @hello-pangea/dnd's own DragDropContext, so this is plain dataTransfer, not a DropResult).
  // The drop position is resolved from where the pointer landed among the rendered blocks — same
  // technique as the Forms builder's palette-to-canvas drop.
  const handlePaletteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPaletteDragOver(false);
    const type = e.dataTransfer.getData('block-type') as EmailBlock['type'];
    if (!type || !BLOCK_META[type]) return;

    const dropY = e.clientY;
    const blockElements = Array.from(document.querySelectorAll('[data-rfd-draggable-id]'));
    let targetIndex = blocks.length;
    for (let i = 0; i < blockElements.length; i++) {
      const rect = blockElements[i].getBoundingClientRect();
      if (dropY < rect.top + rect.height / 2) { targetIndex = i; break; }
    }
    addBlock(type, targetIndex);
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
      const compiledHtml = compileCampaignHtml(blocks, brandKit, preheaderText);

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

  // Sends the CURRENT (even unsaved) design to one address via the workspace's
  // own Resend account, so the real rendering/deliverability can be checked
  // before deploying. Tokens resolve exactly as in a real send.
  const handleSendTest = async () => {
    if (!testEmail.trim()) { toast.error('Enter an email address.'); return; }
    setTestSending(true);
    try {
      const res = await sendTestEmailAction(campaignId, testEmail.trim(), compileCampaignHtml(blocks, brandKit, preheaderText));
      if (res.error) toastCampaignSendError(res.error, router.push);
      else { toast.success(`Test email sent to ${testEmail.trim()}`); setTestModalOpen(false); }
    } catch {
      toast.error('Failed to send test email.');
    } finally {
      setTestSending(false);
    }
  };

  // Live, count-only size of the SAVED audience while the Send dialog is open.
  const segmentKey = JSON.stringify(savedSegment);
  useEffect(() => {
    if (!deployModalOpen) return;
    if (!hasSavedAudience) { setReach(null); setReachError(null); return; }
    let cancelled = false;
    setReachLoading(true);
    getCampaignAudienceReach(campaignId).then((res: any) => {
      if (cancelled) return;
      if (res.error) { setReach(null); setReachError(res.error); }
      else { setReach({ total: res.total, emailReach: res.emailReach }); setReachError(null); }
      setReachLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployModalOpen, segmentKey]);

  // Launch / Automate Action
  const handleDeploy = async (mode: 'now' | 'schedule') => {
    setSaving(true);
    try {
      // 1. Compile final HTML
      // Same compile as handleSave (tokens intact). Resolving here bakes an empty
      // unsubscribe href and "Valued Customer" into every email.
      const compiledHtml = compileCampaignHtml(blocks, brandKit, preheaderText);
      const textBlock = blocks.find(b => b.type === 'text');
      const plainTextPreview = textBlock?.content.body?.slice(0, 100) || 'Your LeadsMind Email Broadcast';

      if (!hasSavedAudience) {
        toast.error('No audience selected. Add one in Settings before sending.');
        return;
      }

      if (mode === 'schedule') {
        if (!scheduledFor || Number.isNaN(new Date(scheduledFor).getTime()) || new Date(scheduledFor).getTime() <= Date.now()) {
          toast.error('Choose a future date and time.');
          return;
        }
      }

      // The audience is exactly what Settings saved (no direct addresses: the Settings audience is
      // the only audience); only the auto-sender switch comes from this dialog.
      const segmentData = {
        tags: savedTagIds,
        emails: [],
        is_automated: isAutomated,
        ruleGroup: savedRuleCount > 0 ? savedSegment.ruleGroup : undefined,
        segmentId: savedSegmentId ?? undefined,
        combineMode: savedTagIds.length > 0 && (savedRuleCount > 0 || savedSegmentId) ? savedSegment.combineMode : undefined,
      };

      const result = await updateCampaign(campaignId, {
        builder_json: blocks,
        body_html: compiledHtml,
        preview_text: plainTextPreview.replace(/\{\{[^}]+\}\}/g, '').trim(),
        segment: segmentData,
        status: 'scheduled',
        scheduled_for: mode === 'schedule' ? new Date(scheduledFor).toISOString() : null,
      });

      if (result.error) {
        toastCampaignSendError(result.error, router.push);
      } else {
        if (mode === 'now' && !isAutomated && (result.matchedContactsCount || 0) > 0) {
          const dispatchResult = await dispatchCampaignNow(campaignId);
          if (dispatchResult.error) {
            toastCampaignSendError(dispatchResult.error, router.push);
            return;
          }
        }
        const directSent = result.directSent?.length ?? 0;
        if (result.directFailed?.length) {
          toast.warning(`${result.directFailed.length} direct address(es) failed to send: ${result.directFailed.map((f: { email: string }) => f.email).join(', ')}`);
        }
        if (result.directSkipped?.length) {
          toast.info(`Skipped ${result.directSkipped.length} unsubscribed/invalid address(es): ${result.directSkipped.join(', ')}`);
        }
        const totalRecipients = (result.matchedContactsCount || 0) + directSent;
        const countMsg = `(Targeting ${totalRecipients} recipients)`;
        toast.success(
          isAutomated
            ? `Automated campaign activated! ${countMsg}`
            : mode === 'schedule'
              ? `Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}. ${countMsg}`
              : `Broadcast started immediately! ${countMsg}`
        );
        setDeployModalOpen(false);
        // A real "Send now" (not scheduling, not just enabling an auto-sender) has actually gone
        // out — take the user back to the campaigns list rather than leaving them on the now-sent
        // campaign's builder. router.push (not the literal leadsmind.io URL) so this still resolves
        // correctly in local/staging environments, not just production.
        if (mode === 'now' && !isAutomated) {
          router.push('/campaigns');
        } else {
          router.refresh();
        }
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

  // Deliverability pre-check on the exact HTML that gets sent: warns (never blocks) on thin or
  // image-led emails, which real Gmail tests sent to spam (see lib/builder/emailContentCheck.ts).
  const contentCheck = useMemo(
    () => checkEmailContent(compileCampaignHtml(blocks, brandKit, preheaderText)),
    [blocks, brandKit, preheaderText]
  );
  const issueCount = accessibilityWarnings.length + contentCheck.warnings.length;

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

  const fieldInputClass = "w-full bg-white border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text placeholder:!text-dash-textMuted/60 focus:outline-none focus:border-dash-accent focus:ring-[3px] focus:ring-dash-accent/12 transition-all motion-reduce:transition-none";
  const fieldLabelClass = "block text-[10.5px] font-bold uppercase tracking-wide !text-dash-textMuted mb-1.5";
  const sectionHeaderClass = "text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted border-b border-dash-border pb-2.5";

  return (
    <div className="min-h-screen bg-dash-surface !text-dash-text flex flex-col">

      {/* Visual Header */}
      <header className="h-[68px] border-b border-dash-border bg-white/95 backdrop-blur-sm flex items-center justify-between px-7 shrink-0 shadow-[0_1px_3px_rgba(15,23,42,0.04)] z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/campaigns"
            className="w-9 h-9 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:border-dash-text/20 hover:-translate-x-0.5 transition-all motion-reduce:transition-none shrink-0"
            title="Back to campaigns"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-extrabold !text-dash-text leading-tight mb-0.5 tracking-tight truncate">
              {initialCampaign.name}
            </h1>
            <p className="text-[10.5px] !text-dash-textMuted font-semibold truncate">
              Subject: <span className="text-dash-accent font-bold">{initialCampaign.subject || 'None'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <DashButton onClick={handleSave} disabled={saving} size="sm" variant="secondary">
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={13} />
                Save design
              </>
            )}
          </DashButton>

          {blocks.length > 0 && contentCheck.warnings.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('warnings' as any)}
              title={contentCheck.warnings.map((w) => w.message).join('\n\n')}
              className="h-9 px-3.5 rounded-xl bg-amber/10 border border-amber/30 text-amber text-[11.5px] font-bold inline-flex items-center gap-1.5 hover:bg-amber/15 transition-colors motion-reduce:transition-none"
            >
              <AlertTriangle size={13} />
              Spam risk: {contentCheck.warnings.some((w) => w.code === 'low_text') ? 'low text' : 'image-heavy'}
            </button>
          )}

          <div className="w-px h-6 bg-dash-border mx-0.5" />

          <DashButton onClick={() => setTestModalOpen(true)} disabled={saving || blocks.length === 0} size="sm" variant="secondary">
            Send test
          </DashButton>

          {!isAutomated && initialCampaign.status !== 'sent' && (
            <DashButton onClick={() => setConfirmSendNowOpen(true)} disabled={saving || blocks.length === 0 || !canSend} title={canSend ? undefined : 'Add an audience in Settings first'} size="sm" variant="secondary">
              Send now
            </DashButton>
          )}

          <button
            type="button"
            onClick={() => setDeployModalOpen(true)}
            className="h-9 px-5 rounded-xl bg-gradient-to-b from-green to-green/90 hover:from-green/95 hover:to-green/85 text-white text-[12.5px] font-bold flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.08)] hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all motion-reduce:transition-none"
          >
            Send
          </button>
        </div>
      </header>

      {/* Main Builder Container */}
      <div className="flex-1 flex overflow-hidden">

        {/* 1. Left Sidebar: Toolbox & Settings Inspector */}
        <div className="w-[340px] shrink-0 border-r border-dash-border bg-white flex flex-col">
          {/* Tab buttons — a segmented pill control, not a solid-fill tab strip */}
          <div className="flex gap-1 border-b border-dash-border p-3 bg-white">
            <div className="flex-1 flex gap-1 bg-dash-surface rounded-xl p-1">
              {[
                { id: 'add', label: 'Add', icon: Plus },
                { id: 'inspector', label: 'Settings', icon: Eye },
                { id: 'brand', label: 'Brand', icon: ShieldCheck },
                { id: 'warnings', label: `Issues (${issueCount})`, icon: AlertTriangle }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10.5px] font-bold flex flex-col items-center justify-center gap-1 transition-all motion-reduce:transition-none",
                      activeTab === tab.id
                        ? 'bg-white text-dash-accent shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                        : tab.id === 'warnings' && issueCount > 0
                          ? 'text-amber-600 hover:bg-white/60'
                          : '!text-dash-textMuted hover:!text-dash-text hover:bg-white/60'
                    )}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

            {/* Tab: Add Blocks */}
            {activeTab === 'add' && (
              <div className="space-y-2.5">
                <div className={sectionHeaderClass}>
                  Structural layout components
                </div>
                <p className="text-[10.5px] !text-dash-textMuted -mt-1 mb-1 leading-relaxed">
                  Click to append, or drag a block onto the canvas to drop it exactly where you want it.
                </p>
                {BLOCK_TYPES.map(block => (
                  <button
                    key={block.type}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('block-type', block.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => addBlock(block.type as any)}
                    className="w-full p-3.5 bg-white border border-dash-border hover:border-dash-accent/40 text-left rounded-2xl transition-all motion-reduce:transition-none flex items-center gap-3 group shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-grab active:cursor-grabbing"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0 shadow-sm transition-transform motion-reduce:transition-none group-hover:scale-105",
                      block.color
                    )}>
                      <block.icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold !text-dash-text">{block.name}</div>
                      <div className="text-[10px] !text-dash-textMuted mt-0.5 leading-tight">{block.desc}</div>
                    </div>
                    <GripVertical size={14} className="!text-dash-textMuted/40 group-hover:!text-dash-textMuted shrink-0 transition-colors motion-reduce:transition-none" />
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Settings Block Inspector */}
            {activeTab === 'inspector' && (
              selectedBlock ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-dash-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0",
                        BLOCK_META[selectedBlock.type]?.color
                      )}>
                        {React.createElement(BLOCK_META[selectedBlock.type]?.icon ?? AlignLeft, { size: 13 })}
                      </div>
                      <span className="text-[12px] font-bold !text-dash-text capitalize">
                        {BLOCK_META[selectedBlock.type]?.name ?? `${selectedBlock.type} block`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBlock(selectedBlockIndex!)}
                      className="text-red hover:bg-red/10 rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition-colors motion-reduce:transition-none"
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
                <div className="text-center py-10 px-4 !text-dash-textMuted">
                  <div className="w-11 h-11 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center mx-auto mb-3 !text-dash-textMuted/60">
                    <Eye size={18} />
                  </div>
                  <p className="text-[11.5px] leading-relaxed">Select a layout block on the canvas to inspect and configure its attributes.</p>
                </div>
              )
            )}

            {/* Tab: Brand Kit Configuration */}
            {activeTab === 'brand' && (
              <div className="space-y-4 text-left">
                <div className={sectionHeaderClass}>
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
                <div className={sectionHeaderClass}>
                  Deliverability
                </div>
                {contentCheck.warnings.length === 0 ? (
                  <p className="text-[11px] !text-dash-textMuted leading-normal">
                    {contentCheck.words} words of text{contentCheck.largeImages ? `, ${contentCheck.largeImages} large image${contentCheck.largeImages === 1 ? '' : 's'}` : ''}. Enough copy for mailbox providers to read.
                  </p>
                ) : (
                  <DeliverabilityWarnings warnings={contentCheck.warnings} />
                )}
                <div className={sectionHeaderClass}>
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
        <div
          className="flex-1 overflow-y-auto p-8 flex flex-col items-center custom-scrollbar"
          style={{
            backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.055) 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
            backgroundColor: 'var(--dash-surface, #f8fafc)',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider !text-dash-textMuted mb-5 px-3 py-1 rounded-full bg-white border border-dash-border shadow-sm">
            Editor canvas layout
          </div>

          <div className="w-full max-w-xl">
            {blocks.length === 0 ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsPaletteDragOver(true); }}
                onDragLeave={() => setIsPaletteDragOver(false)}
                onDrop={handlePaletteDrop}
                className={cn(
                  "py-24 border-2 border-dashed bg-white transition-all motion-reduce:transition-none rounded-3xl flex flex-col items-center justify-center text-center p-6",
                  isPaletteDragOver ? 'border-dash-accent bg-dash-accent/5 scale-[1.01]' : 'border-dash-border hover:border-dash-accent/40'
                )}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-dash-accent/15 to-dash-accent/5 flex items-center justify-center text-dash-accent mb-4">
                  <Plus size={24} />
                </div>
                <h4 className="text-[15px] font-extrabold !text-dash-text tracking-tight">Canvas is empty</h4>
                <p className="text-[11px] !text-dash-textMuted mt-1.5 max-w-[300px] leading-relaxed">
                  Drag a block from the "Add" panel onto this canvas, or click one to append it.
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleBlockDragEnd}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsPaletteDragOver(true); }}
                  onDragLeave={() => setIsPaletteDragOver(false)}
                  onDrop={handlePaletteDrop}
                  className={cn(
                    "rounded-2xl transition-all motion-reduce:transition-none",
                    isPaletteDragOver ? 'ring-2 ring-dash-accent/50 ring-offset-4 ring-offset-dash-surface' : ''
                  )}
                >
                  <Droppable droppableId="email-canvas-blocks">
                    {(droppableProvided) => (
                      <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps} className="space-y-3.5">
                        {blocks.map((block, index) => {
                          const isSelected = selectedBlockIndex === index;
                          const meta = BLOCK_META[block.type];
                          const BlockIcon = meta?.icon ?? AlignLeft;
                          return (
                            <Draggable key={block.id} draggableId={block.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  onClick={() => {
                                    setSelectedBlockIndex(index);
                                    setActiveTab('inspector');
                                  }}
                                  className={cn(
                                    "w-full bg-white border rounded-2xl p-4.5 transition-all motion-reduce:transition-none relative group cursor-pointer",
                                    dragSnapshot.isDragging
                                      ? 'shadow-xl border-dash-accent/60 rotate-[0.5deg]'
                                      : isSelected
                                        ? 'border-dash-accent shadow-[0_0_0_3px_rgba(19,89,255,0.1)] bg-dash-accent/[0.03]'
                                        : 'border-dash-border hover:border-dash-text/15 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]'
                                  )}
                                >
                                  {/* Header info */}
                                  <div className="flex items-center justify-between pb-3 border-b border-dash-border mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        {...dragProvided.dragHandleProps}
                                        onClick={(e) => e.stopPropagation()}
                                        className="!text-dash-textMuted/50 hover:!text-dash-textMuted cursor-grab active:cursor-grabbing shrink-0 -ml-1 transition-colors motion-reduce:transition-none"
                                        title="Drag to reorder"
                                      >
                                        <GripVertical size={15} />
                                      </span>
                                      <div className={cn(
                                        "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0",
                                        meta?.color
                                      )}>
                                        <BlockIcon size={13} />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-[11.5px] font-bold !text-dash-text truncate block">
                                          {meta?.name ?? `${block.type} block`}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-dash-surface !text-dash-textMuted/70 shrink-0">
                                        #{index + 1}
                                      </span>
                                    </div>

                                    {/* Control arrows — kept alongside drag-to-reorder as a click-accessible fallback */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none shrink-0">
                                      <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                                        className="w-6 h-6 rounded-lg bg-dash-surface hover:bg-dash-border/60 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center !text-dash-text transition-colors motion-reduce:transition-none"
                                        title="Move block up"
                                      >
                                        <MoveUp size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={index === blocks.length - 1}
                                        onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                                        className="w-6 h-6 rounded-lg bg-dash-surface hover:bg-dash-border/60 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center !text-dash-text transition-colors motion-reduce:transition-none"
                                        title="Move block down"
                                      >
                                        <MoveDown size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); deleteBlock(index); }}
                                        className="w-6 h-6 rounded-lg bg-red/10 hover:bg-red/20 flex items-center justify-center text-red ml-1 transition-colors motion-reduce:transition-none"
                                        title="Delete block"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Block Preview Content */}
                                  <div className="text-[11.5px] !text-dash-textMuted space-y-1 leading-relaxed">
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
                                    <div className="mt-3 pt-2.5 border-t border-dash-border flex items-center gap-1.5">
                                      <GitBranch className="text-dash-accent" size={11} />
                                      <span className="text-[9px] font-bold text-dash-accent">
                                        Condition: {block.conditions.visibility === 'hide' ? 'Hide' : 'Show'} if has tag "{block.conditions.tag}"
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {droppableProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
            )}
          </div>
        </div>

        {/* 3. Right Panel: Dynamic Split Preview Iframe Viewport */}
        <div className="w-[450px] shrink-0 border-l border-dash-border bg-white flex flex-col">
          {/* Header preview settings toolbar */}
          <div className="h-14 border-b border-dash-border px-4 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-1 bg-dash-surface rounded-xl p-1">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all motion-reduce:transition-none",
                  previewMode === 'desktop' ? 'bg-white text-dash-accent shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
                )}
                title="Desktop Viewport Mode"
              >
                <Monitor size={15} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all motion-reduce:transition-none",
                  previewMode === 'mobile' ? 'bg-white text-dash-accent shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
                )}
                title="Mobile Viewport Mode"
              >
                <Smartphone size={15} />
              </button>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">
              Live preview
            </div>

            <button
              type="button"
              onClick={() => setDarkModeSim(!darkModeSim)}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all motion-reduce:transition-none",
                darkModeSim ? 'bg-amber-50 text-amber-600 border border-amber-200' : '!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface'
              )}
              title="Simulate Native Dark Mode Overrides"
            >
              {darkModeSim ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Viewport frame container */}
          <div
            className="flex-1 flex items-center justify-center p-6 overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.05) 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px',
              backgroundColor: 'var(--dash-surface, #f8fafc)',
            }}
          >
            <div
              className={cn(
                "h-full bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.09)] transition-all duration-300 motion-reduce:transition-none border border-dash-border flex flex-col",
                previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
              )}
            >
              {/* Decorative browser-style chrome strip, purely visual */}
              <div className="h-7 shrink-0 bg-dash-surface border-b border-dash-border flex items-center gap-1.5 px-3">
                <span className="w-2 h-2 rounded-full bg-red/40" />
                <span className="w-2 h-2 rounded-full bg-amber/40" />
                <span className="w-2 h-2 rounded-full bg-green/40" />
              </div>
              <iframe
                title="Live Email Render"
                srcDoc={previewHtml}
                className="w-full flex-1 border-none bg-transparent"
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

      {/* Send test email Modal */}
      <DashModal open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DashModalContent className="max-w-sm">
          <DashModalHeader>
            <DashModalTitle>Send <span className="text-dash-accent">test email</span></DashModalTitle>
          </DashModalHeader>
          <DashFormField label="Send to" hint="Sent through your connected Resend account using the current design (unsaved changes included).">
            <DashInput type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" />
          </DashFormField>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setTestModalOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSendTest} disabled={testSending}>{testSending ? 'Sending...' : 'Send test'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      {/* Send / Automate Modal */}
      <DashModal open={deployModalOpen} onOpenChange={setDeployModalOpen}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle>Send <span className="text-dash-accent">campaign</span></DashModalTitle>
          </DashModalHeader>
          <div className="space-y-6">
            {contentCheck.warnings.length > 0 && <DeliverabilityWarnings warnings={contentCheck.warnings} withIntro />}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold !text-dash-text">Audience</span>
                {hasSavedAudience && (
                  <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-bold text-dash-accent hover:text-dash-accent/80">
                    <Pencil size={12} /> Edit audience
                  </button>
                )}
              </div>
              {hasSavedAudience ? (
                <div className="rounded-xl border border-dash-border bg-dash-surface p-3.5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {savedTagIds.map((id) => {
                      const tag = tagOptions.find((t) => t.id === id || t.name.toLowerCase() === String(id).toLowerCase());
                      const color = tag?.color ?? '#64748b';
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5 px-2 h-7 rounded-lg text-[12px] font-semibold border" style={{ backgroundColor: `${color}14`, borderColor: `${color}33`, color }}>
                          <TagIconGlyph icon={tag?.icon} size={12} />
                          {tag?.name ?? 'Deleted tag'}
                        </span>
                      );
                    })}
                    {savedSegmentId && (
                      <span className="inline-flex items-center gap-1.5 px-2 h-7 rounded-lg text-[12px] font-semibold border border-dash-border bg-white !text-dash-text">
                        <Users size={12} /> Segment: {availableSegments.find((sg) => sg.id === savedSegmentId)?.name ?? 'Deleted segment'}
                      </span>
                    )}
                    {savedRuleCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2 h-7 rounded-lg text-[12px] font-semibold border border-dash-border bg-white !text-dash-text">
                        <Filter size={12} /> {savedRuleCount} filter rule{savedRuleCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {savedTagIds.length > 0 && (savedRuleCount > 0 || !!savedSegmentId) && (
                    <p className="text-[11px] !text-dash-textMuted">
                      Contacts with ALL of these tags {savedSegment.combineMode === 'OR' ? 'OR' : 'AND'} matching the {savedSegmentId ? 'segment' : 'filters'}.
                    </p>
                  )}
                  {savedTagIds.length > 1 && !(savedRuleCount > 0 || !!savedSegmentId) && (
                    <p className="text-[11px] !text-dash-textMuted">Contacts with ALL of these tags.</p>
                  )}
                  <div className="text-[12px] !text-dash-textMuted border-t border-dash-border pt-2.5">
                    {reachLoading ? 'Counting recipients…' : reachError ? (
                      <span className="text-red">{reachError}</span>
                    ) : reach ? (
                      <>
                        <span className="font-bold !text-dash-text">{reach.emailReach.toLocaleString()}</span> recipient{reach.emailReach === 1 ? '' : 's'} will be emailed
                        {reach.total > reach.emailReach ? ` (${(reach.total - reach.emailReach).toLocaleString()} unsubscribed or invalid skipped)` : ''}
                      </>
                    ) : '—'}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber/40 bg-amber/10 p-3.5 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[12px] font-bold !text-dash-text">No audience selected — add one in Settings</p>
                    <p className="text-[11px] !text-dash-textMuted mt-0.5">Pick tags, a saved segment or filters for this campaign. Sending is disabled until it has an audience.</p>
                    <DashButton size="sm" className="mt-2.5" onClick={() => setSettingsOpen(true)}>Add audience</DashButton>
                  </div>
                </div>
              )}
            </div>

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
                    When enabled, this campaign becomes a live automation. Any future CRM contact that comes to have ALL of the tags above will automatically be sent this email.
                  </div>
                </div>
              </label>
            </div>
            {!isAutomated && (
              <DashFormField
                label="Schedule for later"
                hint="Campaign dispatch runs every 15 minutes. Delivery begins in the first dispatch cycle after this time."
              >
                <DashInput
                  type="datetime-local"
                  value={scheduledFor}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </DashFormField>
            )}
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setDeployModalOpen(false)}>
              Cancel
            </DashButton>
            {isAutomated ? (
              <DashButton onClick={() => handleDeploy('now')} disabled={saving || !hasSavedAudience}>
                {saving ? 'Processing...' : 'Save & enable auto-sender'}
              </DashButton>
            ) : (
              <>
                <DashButton variant="secondary" onClick={() => handleDeploy('schedule')} disabled={saving || !scheduledFor || !hasSavedAudience}>
                  {saving ? 'Processing...' : 'Schedule for later'}
                </DashButton>
                <DashButton onClick={() => setConfirmSendNowOpen(true)} disabled={saving || !canSend}>
                  {saving ? 'Processing...' : 'Send now'}
                </DashButton>
              </>
            )}
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <CampaignSettingsDialog
        campaign={savedCampaign}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        availableTags={tagOptions}
        availableSegments={availableSegments}
        onTagsChange={setTagOptions}
        onSaved={(saved) => setSavedCampaign((prev: any) => ({ ...prev, ...saved }))}
      />

      <ConfirmDialog
        isOpen={confirmSendNowOpen}
        onClose={() => setConfirmSendNowOpen(false)}
        onConfirm={() => handleDeploy('now')}
        title="Send this campaign now?"
        description={
          <div className="space-y-3">
            <p>{`The current design will be saved and emailed immediately to this campaign's audience${
              initialCampaign.status === 'scheduled' && initialCampaign.scheduled_for
                ? `, skipping its schedule (${new Date(initialCampaign.scheduled_for).toLocaleString()})`
                : ''
            }. Unsubscribed and invalid addresses are skipped. This can't be undone.`}</p>
            {contentCheck.warnings.length > 0 && <DeliverabilityWarnings warnings={contentCheck.warnings} withIntro />}
          </div>
        }
        confirmLabel="Send now"
        variant="warning"
      />
    </div>
  );
}

/** Spam-risk callout shown in the Issues tab, the Send dialog and the send-now confirmation. */
function DeliverabilityWarnings({ warnings, withIntro }: { warnings: EmailContentWarning[]; withIntro?: boolean }) {
  return (
    <div role="alert" className="p-3 bg-amber/10 border border-amber/30 rounded-xl text-left space-y-2">
      {withIntro && (
        <div className="text-[12px] font-bold !text-dash-text flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-amber shrink-0" /> This email may land in spam
        </div>
      )}
      {warnings.map((w) => (
        <div key={w.code} className="text-[11.5px] !text-dash-text flex items-start gap-2 leading-snug">
          {!withIntro && <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber" />}
          <span>{w.message}</span>
        </div>
      ))}
      {withIntro && <p className="text-[11px] !text-dash-textMuted">You can still send. This is a warning, not a block.</p>}
    </div>
  );
}

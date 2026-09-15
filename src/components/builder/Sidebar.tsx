"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { Container } from './user/Container';
import { Section } from './user/Section';
import { Columns } from './user/Columns';
import { Spacer } from './user/Spacer';
import { Divider } from './user/Divider';
import { Heading } from './user/Heading';
import { Paragraph } from './user/Paragraph';
import { Image as ImageComponent } from './user/Image';
import { Video } from './user/Video';
import { Icon } from './user/Icon';
import { Text } from './user/Text';
import { Form } from './user/Form';
import { Countdown } from './user/Countdown';
import { PricingTable } from './user/PricingTable';
import { FAQ } from './user/FAQ';
import { UserButton } from './user/Button';
import { ProgressBar } from './user/ProgressBar';
import { StarRating } from './user/StarRating';
import { UserTestimonial } from './user/Testimonial';
import { LogoStrip } from './user/LogoStrip';
import { Hero } from './user/Hero';
import { Navbar } from './user/Navbar';
import { Footer } from './user/Footer';
import { PageSettings } from './PageSettings';
import { Layout, Type, Image as ImageIcon, RectangleHorizontal as ButtonIcon, Square, Columns as ColumnsIcon, FormInput, Timer, CreditCard, MessageCircleQuestion, Section as SectionIcon, ArrowUpDown, Minus, Heading as HeadingIcon, AlignLeft, Video as VideoIcon, Star, Navigation, LayoutGrid, Layers, Search, Code as CodeIcon, ListOrdered, Sparkles, Plus, Paintbrush, PackageSearch, FileText, TrendingUp, TrendingDown, CheckCircle2, CalendarCheck } from 'lucide-react';
import { BlogFeed } from './user/BlogFeed';
import { RESOLVER } from '@/lib/builder/resolver';
import { WebsiteSettings } from './WebsiteSettings';
import { useBuilder } from './BuilderContext';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import UserAvatar from '@/components/ui/UserAvatar';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import StepNavigator from '@/components/funnels/StepNavigator';
import { StepTemplateModal } from './StepTemplateModal';
import { AddStepModal } from './AddStepModal';
import { STEP_TYPE_META, type StepType } from '@/lib/builder/stepTypes';
import { getTemplateById, BLANK_PAGE } from '@/lib/builder/templates';
import { NodeTreeExplorer } from './NodeTreeExplorer';
import { Input } from '@/components/ui/input';
import { generateAISectionLayout } from '@/app/actions/builderAI';
import { saveCustomComponent } from '@/app/actions/builder';
import { cn } from '@/lib/utils';

// Pill-toggle tab button — Sidebar Visual Polish, applied to the Website/Funnel Builder's
// own Sidebar (matches the course/lesson builder's LessonBuilderSidebar.tsx segmented-pill
// tab language). Icon-only (vs. the course builder's text-label pills) since this sidebar
// carries up to 5 tabs instead of 2 and a full-width row of "Elements / Layers / Funnel
// steps / Page settings / Globals" labels wouldn't fit at 320px.
const PillTabButton = ({ active, onClick, title, icon: Icon }: { active: boolean; onClick: () => void; title: string; icon: any }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "flex-1 h-9 rounded-full flex items-center justify-center transition-all duration-150 motion-reduce:transition-none",
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
    )}
  >
    <Icon className="w-[18px] h-[18px]" />
  </button>
);

// `variant` is additive. "lesson" was introduced for LessonBuilderSidebar.tsx (Systeme-parity
// Master Prompt, Sidebar Visual Polish pass) to match its reference's flat light-gray card
// look, without duplicating the real connectors.create() drag-wiring in a second component.
// The Website/Funnel Builder's own Sidebar.tsx below now also renders its Elements tiles with
// variant="lesson" (Sidebar Visual Polish extended to this builder) so both builders share one
// visual language and one drag implementation — "default" is kept only for any other caller
// that still wants the original dash-token tile look.
export const DraggableItem = ({
  name,
  icon: Icon,
  component,
  variant = 'default',
}: {
  name: string;
  icon: any;
  component: React.ReactElement;
  variant?: 'default' | 'lesson';
}) => {
  const { connectors } = useEditor();

  if (variant === 'lesson') {
    return (
      <div
        ref={ref => {
          if (ref) {
            connectors.create(ref, component);
          }
        }}
        className="flex h-[104px] flex-col items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-transparent hover:border-slate-300 transition-all duration-150 motion-reduce:transition-none cursor-grab active:cursor-grabbing active:scale-[0.97] active:shadow-inner group"
      >
        <Icon className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors motion-reduce:transition-none pointer-events-none" strokeWidth={1.75} />
        <span className="text-[12px] font-medium text-slate-700 text-center leading-tight px-1.5 line-clamp-2 w-full">{name}</span>
      </div>
    );
  }

  return (
    <div
      ref={ref => {
        if (ref) {
          connectors.create(ref, component);
        }
      }}
      className="flex flex-col items-center justify-center h-[78px] rounded-2xl border border-dash-border bg-white hover:-translate-y-[2px] hover:border-dash-accent/40 hover:shadow-md transition-all duration-150 motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-grab active:cursor-grabbing active:border-dash-accent active:bg-dash-accent/5 active:scale-[0.98] group"
    >
      <div className="h-9 w-9 rounded-xl bg-dash-surface flex items-center justify-center mb-1.5 group-hover:bg-dash-accent group-hover:text-white transition-colors duration-200 motion-reduce:transition-none">
        <Icon className="w-[18px] h-[18px] !text-dash-textMuted group-hover:!text-white transition-colors motion-reduce:transition-none pointer-events-none" strokeWidth={1.75} />
      </div>
      <span className="text-[9.5px] font-semibold !text-dash-textMuted group-hover:!text-dash-text text-center leading-tight px-1 truncate w-full">{name}</span>
    </div>
  );
};

// Matches LessonBuilderSidebar.tsx's `SidebarSection` exactly (sentence-case header,
// grid-cols-2, mb-7 last:mb-0) — kept local rather than imported since that one isn't exported.
const ElementSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-7 last:mb-0">
    <h3 className="text-[13px] font-bold text-slate-900 mb-3">{title}</h3>
    <div className="grid grid-cols-2 gap-2.5">{children}</div>
  </div>
);

export const Sidebar = ({
  type,
  steps,
  onReorder,
  website,
  onUpdateWebsite
}: {
  type?: 'website' | 'funnel',
  steps?: any[],
  onReorder?: (steps: any[]) => void,
  website?: any,
  onUpdateWebsite?: (updates: any) => void
}) => {
  const router = useRouter();
  const { pageId } = useParams();
  const { pages, websiteData, setIsTemplateDirectoryOpen, leftPanelTab, setLeftPanelTab } = useBuilder();
  const activeTab = leftPanelTab as 'elements' | 'layers' | 'settings' | 'page' | 'steps';
  const setActiveTab = setLeftPanelTab as (tab: 'elements' | 'layers' | 'settings' | 'page' | 'steps') => void;

  const { connectors } = useEditor();
  const { user } = useDashboardContext();
  const [customBlueprints, setCustomBlueprints] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // AI Layout Ingestion State
  const [aiLayoutPrompt, setAiLayoutPrompt] = React.useState('');
  const [generatingLayout, setGeneratingLayout] = React.useState(false);

  const fetchBlueprints = async () => {
    try {
      const { getCustomComponents } = await import('@/app/actions/builder');
      const res = await getCustomComponents();
      if (res.success && res.components) {
        setCustomBlueprints(res.components);
      }
    } catch (err) {
      console.error('Failed to fetch custom components:', err);
    }
  };

  React.useEffect(() => {
    fetchBlueprints();

    if (typeof window !== 'undefined') {
      const handler = () => fetchBlueprints();
      window.addEventListener('reload-custom-components', handler);
      return () => window.removeEventListener('reload-custom-components', handler);
    }
  }, []);

  const handleGenerateLayout = async () => {
    if (!aiLayoutPrompt) return;
    setGeneratingLayout(true);
    try {
      const res = await generateAISectionLayout(aiLayoutPrompt);
      if (res.success && res.nodeTree) {
        const saveRes = await saveCustomComponent(
          `AI: ${aiLayoutPrompt.substring(0, 15)}`,
          `AI layout generated for: ${aiLayoutPrompt}`,
          res.nodeTree
        );
        if (saveRes.success) {
          toast.success('AI block compiled to Saved Blueprints!');
          setAiLayoutPrompt('');
          fetchBlueprints();
        } else {
          toast.error('Failed to save generated blueprint');
        }
      } else {
        toast.error('AI Layout compile failed');
      }
    } catch (err: any) {
      toast.error('Generation error: ' + err.message);
    } finally {
      setGeneratingLayout(false);
    }
  };

  const funnelSteps = pages.map((p, idx) => ({
    id: p.id,
    stepId: p.stepId,
    name: p.name,
    path: '/' + p.slug,
    position: idx + 1,
    type: p.name.toLowerCase().includes('thank') ? 'thankyou' as const : 
          p.name.toLowerCase().includes('checkout') ? 'checkout' as const : 
          p.name.toLowerCase().includes('sales') ? 'sales' as const : 'optin' as const
  }));

  const handleSelectStep = (targetPageId: string) => {
    router.push(`/editor/funnel/${websiteData?.id}/${targetPageId}`);
  };

  const handleViewStep = async (step: { id: string; stepId?: string; name: string }) => {
    if (!websiteData?.subdomain || !websiteData?.workspaceSlug) {
      toast.error('Cannot preview: this funnel has no subdomain configured yet.');
      return;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('funnel_steps')
        .select('path_name')
        .eq('id', step.stepId)
        .single();
      if (error) throw error;

      const pathName = data?.path_name || '/';
      const url = pathName === '/'
        ? `/p/${websiteData.workspaceSlug}/${websiteData.subdomain}`
        : `/p/${websiteData.workspaceSlug}/${websiteData.subdomain}${pathName}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error('Failed to open preview: ' + err.message);
    }
  };

  const [changeTemplateStep, setChangeTemplateStep] = React.useState<{ id: string; name: string } | null>(null);
  const [isAddStepModalOpen, setIsAddStepModalOpen] = React.useState(false);

  const handleAddStepOfType = async (stepType: StepType) => {
    if (!websiteData?.id) return;
    setIsAddStepModalOpen(false);
    const toastId = toast.loading('Adding new funnel step...');
    try {
      const supabase = createClient();
      const nextOrder = funnelSteps.length + 1;
      const meta = STEP_TYPE_META[stepType];
      const stepName = funnelSteps.some((s: any) => s.name === meta.label) ? `${meta.label} ${nextOrder}` : meta.label;
      const stepPath = `/${stepName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

      const { data: step, error: stepError } = await supabase
        .from('funnel_steps')
        .insert({
          funnel_id: websiteData.id,
          name: stepName,
          path_name: stepPath,
          order: nextOrder,
          step_type: stepType
        })
        .select()
        .single();

      if (stepError) throw stepError;

      const template = getTemplateById(meta.defaultTemplateId);
      const initialContent = template?.content || BLANK_PAGE;
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert({
          workspace_id: websiteData.workspace_id,
          funnel_step_id: step.id,
          name: stepName,
          content: initialContent,
          status: 'draft'
        })
        .select()
        .single();

      if (pageError) throw pageError;

      toast.success('Step added successfully!', { id: toastId });
      router.push(`/editor/funnel/${websiteData.id}/${page.id}`);
      setTimeout(() => window.location.reload(), 300);
    } catch (err: any) {
      toast.error('Failed to add step: ' + err.message, { id: toastId });
    }
  };

  const handleReorderSteps = async (newSteps: any[]) => {
    const toastId = toast.loading('Saving step order...');
    try {
      const supabase = createClient();
      const results = await Promise.allSettled(
        newSteps.map((step, idx) =>
          supabase
            .from('funnel_steps')
            .update({ order: idx + 1 })
            .eq('id', step.stepId)
        )
      );

      const failures = results.reduce<{ step: any; reason: string }[]>((acc, result, idx) => {
        const step = newSteps[idx];
        if (result.status === 'rejected') {
          acc.push({ step, reason: result.reason?.message || String(result.reason) });
        } else if (result.value?.error) {
          acc.push({ step, reason: result.value.error.message });
        }
        return acc;
      }, []);

      if (failures.length > 0) {
        console.error('[Sidebar] Step reorder partially failed:', {
          failedSteps: failures.map(f => ({ id: f.step.id, name: f.step.name, reason: f.reason })),
          totalSteps: newSteps.length,
          failedCount: failures.length,
        });
        const failedNames = failures.map(f => f.step.name || f.step.id).join(', ');
        toast.error(`Step order failed to save for: ${failedNames}. Please retry.`, { id: toastId });
        return;
      }

      toast.success('Step order updated!', { id: toastId });
      window.location.reload();
    } catch (err: any) {
      console.error('[Sidebar] Step reorder failed:', err);
      toast.error('Failed to save order: ' + err.message, { id: toastId });
    }
  };

  return (
    <div className="w-[320px] h-full bg-white flex flex-col font-sans select-none z-40">
      {/* Pill tab row (Sidebar Visual Polish — matches LessonBuilderSidebar.tsx) */}
      <div className="p-3 shrink-0 flex items-center gap-2">
        <div className="flex-1 flex items-center bg-slate-100 rounded-full p-1">
          <PillTabButton active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} title="Elements" icon={Plus} />
          <PillTabButton active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} title="Layers" icon={Layers} />
          {type === 'funnel' && (
            <PillTabButton active={activeTab === 'steps'} onClick={() => setActiveTab('steps')} title="Funnel steps" icon={ListOrdered} />
          )}
          <PillTabButton active={activeTab === 'page'} onClick={() => setActiveTab('page')} title="Page settings" icon={FileText} />
          <PillTabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} title="Globals" icon={Paintbrush} />
        </div>
        <UserAvatar
          avatarUrl={user?.avatarUrl}
          oauthImage={user?.oauthImage}
          firstName={user?.firstName}
          lastName={user?.lastName}
          size="xs"
        />
      </div>

      {/* Content panel */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {activeTab === 'elements' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search stays sticky — the course builder's reference has none, but with grid-cols-2
              and taller (104px) tiles this list runs long, so keeping it reachable while
              scrolling is a functional call, not a copy of the old dash-token look. */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm z-10 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-colors motion-reduce:transition-none placeholder:text-slate-400 text-slate-700"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 common-scrollbar">
          {/* AI Generator Panel */}
          <section className="mb-7 p-4 bg-slate-100 rounded-2xl border border-transparent space-y-3">
            <h3 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse motion-reduce:animate-none text-slate-500" />
              AI section generator
            </h3>
            <Input
              value={aiLayoutPrompt}
              onChange={(e) => setAiLayoutPrompt(e.target.value)}
              placeholder="e.g. bento grid, pricing table"
              className="h-8 bg-white border-slate-200 text-slate-700 text-xs placeholder:text-slate-400"
            />
            <Button
              onClick={handleGenerateLayout}
              disabled={generatingLayout}
              size="sm"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold h-8"
            >
              {generatingLayout ? 'Generating...' : 'Ingest canvas block'}
            </Button>
          </section>

          {customBlueprints.length > 0 && (
            <ElementSection title="Saved blueprints">
              {customBlueprints.map((blueprint) => (
                <div
                  key={blueprint.id}
                  ref={ref => {
                    if (ref) {
                      try {
                        const tree = typeof blueprint.content === 'string' ? JSON.parse(blueprint.content) : blueprint.content;
                        connectors.create(ref, tree);
                      } catch (e) {
                        console.error('Failed to parse blueprint node tree:', e);
                      }
                    }
                  }}
                  className="relative flex h-[104px] flex-col items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-transparent hover:border-slate-300 transition-all duration-150 motion-reduce:transition-none cursor-grab active:cursor-grabbing active:scale-[0.97] group"
                >
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (confirm(`Delete blueprint "${blueprint.name}"?`)) {
                        const { deleteCustomComponent } = await import('@/app/actions/builder');
                        const res = await deleteCustomComponent(blueprint.id);
                        if (res.success) {
                          toast.success('Blueprint deleted');
                          fetchBlueprints();
                        } else {
                          toast.error('Failed to delete blueprint');
                        }
                      }
                    }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red cursor-pointer p-0.5 transition-colors motion-reduce:transition-none z-20"
                    title="Delete blueprint"
                  >
                    <Minus size={10} />
                  </button>
                  <Layers className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors motion-reduce:transition-none pointer-events-none" strokeWidth={1.75} />
                  <span className="text-[12px] font-medium text-slate-700 text-center leading-tight px-1.5 line-clamp-2 w-full">{blueprint.name}</span>
                </div>
              ))}
            </ElementSection>
          )}

          <ElementSection title="Structure nodes">
            <DraggableItem variant="lesson" name="Section" icon={SectionIcon} component={<RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" />} />
            <DraggableItem variant="lesson" name="Container" icon={Square} component={<RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" />} />
            <DraggableItem variant="lesson" name="Columns" icon={ColumnsIcon} component={<RESOLVER.Columns canvas layout="2" gap={16} padding={16} />} />
            <DraggableItem variant="lesson" name="Spacer" icon={ArrowUpDown} component={<RESOLVER.Spacer height={32} />} />
            <DraggableItem variant="lesson" name="Divider" icon={Minus} component={<RESOLVER.Divider weight={1} color="#e5e7eb" width="100%" alignment="center" />} />
          </ElementSection>

          <ElementSection title="Typography">
            <DraggableItem variant="lesson" name="Heading" icon={HeadingIcon} component={<RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" />} />
            <DraggableItem variant="lesson" name="Paragraph" icon={AlignLeft} component={<RESOLVER.Paragraph text="Type your paragraph here." fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" />} />
            <DraggableItem variant="lesson" name="Text / Edit" icon={Type} component={<RESOLVER.Text text="Custom Text" fontSize={16} />} />
          </ElementSection>

          <ElementSection title="Media & assets">
            <DraggableItem variant="lesson" name="Image" icon={ImageIcon} component={<RESOLVER.Image src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Placeholder" borderRadius={16} objectFit="cover" />} />
            <DraggableItem variant="lesson" name="Video" icon={VideoIcon} component={<RESOLVER.Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" provider="youtube" autoPlay={false} controls={true} loop={false} muted={false} borderRadius={16} />} />
            <DraggableItem variant="lesson" name="Icon" icon={Star} component={<RESOLVER.Icon name="Star" size={24} color="#000000" strokeWidth={2} alignment="center" />} />
          </ElementSection>

          <ElementSection title="Layout & authority">
            <DraggableItem variant="lesson" name="Ultra Hero" icon={SectionIcon} component={<RESOLVER.Hero />} />
            <DraggableItem variant="lesson" name="Global Navbar" icon={Navigation} component={<RESOLVER.Navbar />} />
            <DraggableItem variant="lesson" name="Global Footer" icon={Layout} component={<RESOLVER.Footer />} />
            <DraggableItem variant="lesson" name="Blog Feed" icon={LayoutGrid} component={<RESOLVER.BlogFeed />} />
          </ElementSection>

          <ElementSection title="Trust & social proof">
            <DraggableItem variant="lesson" name="Testimonial" icon={MessageCircleQuestion} component={<RESOLVER.Testimonial />} />
            <DraggableItem variant="lesson" name="Star Rating" icon={Star} component={<RESOLVER.StarRating />} />
            <DraggableItem variant="lesson" name="Logo Cloud" icon={ImageIcon} component={<RESOLVER.LogoStrip />} />
            <DraggableItem variant="lesson" name="FAQ" icon={MessageCircleQuestion} component={<RESOLVER.FAQ />} />
          </ElementSection>

          <ElementSection title="Conversion & logic">
            <DraggableItem variant="lesson" name="Button" icon={ButtonIcon} component={<RESOLVER.Button text="Click Here" size="md" variant="primary" color="#6c47ff" textColor="#ffffff" borderRadius={8} width="fit" link="#" iconPosition="right" />} />
            <DraggableItem variant="lesson" name="Lead Form" icon={FormInput} component={<RESOLVER.Form />} />
            <DraggableItem variant="lesson" name="Order Form" icon={CreditCard} component={<RESOLVER.OrderForm />} />
            <DraggableItem variant="lesson" name="Upsell" icon={TrendingUp} component={<RESOLVER.Upsell />} />
            <DraggableItem variant="lesson" name="Downsell" icon={TrendingDown} component={<RESOLVER.Downsell />} />
            <DraggableItem variant="lesson" name="Thank You" icon={CheckCircle2} component={<RESOLVER.ThankYou />} />
            <DraggableItem variant="lesson" name="Popup Form" icon={FormInput} component={<RESOLVER.PopupForm canvas />} />
            <DraggableItem variant="lesson" name="Webinar Registration" icon={VideoIcon} component={<RESOLVER.WebinarRegistration />} />
            <DraggableItem variant="lesson" name="Webinar Thank You" icon={CalendarCheck} component={<RESOLVER.WebinarThankYou />} />
            <DraggableItem variant="lesson" name="Countdown" icon={Timer} component={<RESOLVER.Countdown />} />
            <DraggableItem variant="lesson" name="Pricing" icon={CreditCard} component={<RESOLVER.PricingTable />} />
            <DraggableItem variant="lesson" name="Progress" icon={Layout} component={<RESOLVER.ProgressBar value={65} color="#6c47ff" height={12} showLabel={true} label="Step 1 of 3" borderRadius={99} />} />
          </ElementSection>

          <ElementSection title="Advanced">
            <DraggableItem
              variant="lesson"
              name="Embed Code"
              icon={CodeIcon}
              component={<RESOLVER.CodeBlock customCode={`<div style="padding: 20px; background: #f4f4f5; border-radius: 12px; text-align: center; border: 1px dashed #e4e4e7;"><h3>Custom HTML Block</h3><p>Edit this in the settings panel</p></div>`} />}
            />
          </ElementSection>

          <button
            onClick={() => setIsTemplateDirectoryOpen(true)}
            className="w-full flex items-start gap-3 p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl border border-transparent text-left transition-colors motion-reduce:transition-none"
          >
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0">
              <PackageSearch className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900">Need more elements?</p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Explore our templates and pre-built sections.
              </p>
              <span className="text-[11px] font-bold text-slate-900 mt-1 inline-block">Browse Templates →</span>
            </div>
          </button>
        </div>
      </div>
      ) : activeTab === 'layers' ? (
        <div className="flex-1 overflow-hidden h-full">
          <div className="p-3 text-[13px] font-bold text-slate-900 border-b border-slate-200">Layer tree</div>
          <NodeTreeExplorer />
        </div>
      ) : activeTab === 'steps' ? (
        <div className="flex-1 overflow-hidden h-full">
          <div className="p-3 text-[13px] font-bold text-slate-900 border-b border-slate-200">Funnel steps</div>
          <StepNavigator
            steps={funnelSteps}
            activeStepId={pageId as string}
            onSelectStep={handleSelectStep}
            onReorder={handleReorderSteps}
            onAddStep={() => setIsAddStepModalOpen(true)}
            onViewStep={handleViewStep}
            onChangeTemplate={(step) => setChangeTemplateStep({ id: step.id, name: step.name })}
          />
        </div>
      ) : activeTab === 'page' ? (
        <div className="flex-1 overflow-hidden">
          <PageSettings />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <WebsiteSettings
            website={website || { name: '', subdomain: '' }}
            onUpdate={onUpdateWebsite || (() => { })}
          />
        </div>
      )}
      </div>
      <StepTemplateModal
        isOpen={!!changeTemplateStep}
        onOpenChange={(open) => !open && setChangeTemplateStep(null)}
        stepPageId={changeTemplateStep?.id || null}
        stepName={changeTemplateStep?.name}
      />
      <AddStepModal
        isOpen={isAddStepModalOpen}
        onOpenChange={setIsAddStepModalOpen}
        onPick={handleAddStepOfType}
      />
    </div>
  );
};

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
import { Layout, Type, Image as ImageIcon, RectangleHorizontal as ButtonIcon, Square, Columns as ColumnsIcon, FormInput, Timer, CreditCard, MessageCircleQuestion, Section as SectionIcon, ArrowUpDown, Minus, Heading as HeadingIcon, AlignLeft, Video as VideoIcon, Star, Navigation, LayoutGrid, Layers, Search, Code as CodeIcon, ListOrdered, Sparkles, Plus, Paintbrush, PackageSearch } from 'lucide-react';
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
import { NodeTreeExplorer } from './NodeTreeExplorer';
import { Input } from '@/components/ui/input';
import { generateAISectionLayout } from '@/app/actions/builderAI';
import { saveCustomComponent } from '@/app/actions/builder';
import { cn } from '@/lib/utils';

const RailButton = ({ active, onClick, title, icon: Icon }: { active: boolean; onClick: () => void; title: string; icon: any }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "h-11 w-11 rounded-xl flex items-center justify-center transition-colors motion-reduce:transition-none",
      active ? "bg-dash-accent/10 text-dash-accent" : "!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface"
    )}
  >
    <Icon className="w-[18px] h-[18px]" />
  </button>
);

const DraggableItem = ({ name, icon: Icon, component }: { name: string, icon: any, component: React.ReactElement }) => {
  const { connectors } = useEditor();

  return (
    <div
      ref={ref => {
        if (ref) {
          connectors.create(ref, component);
        }
      }}
      className="flex flex-col items-center justify-center h-[68px] rounded-2xl border border-dash-border bg-white hover:-translate-y-[2px] hover:border-dash-accent/40 hover:shadow-md transition-all duration-150 motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-grab active:cursor-grabbing active:border-dash-accent active:bg-dash-accent/5 active:scale-[0.98] group"
    >
      <div className="h-6 w-6 rounded-lg bg-dash-surface flex items-center justify-center mb-1 group-hover:bg-dash-accent group-hover:text-white transition-colors duration-200 motion-reduce:transition-none">
        <Icon className="w-3.5 h-3.5 !text-dash-textMuted group-hover:!text-white transition-colors motion-reduce:transition-none pointer-events-none" />
      </div>
      <span className="text-[9.5px] font-semibold !text-dash-textMuted group-hover:!text-dash-text text-center leading-tight px-1 truncate w-full">{name}</span>
    </div>
  );
};

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
  const { pages, websiteData, setIsTemplateDirectoryOpen } = useBuilder();
  const [activeTab, setActiveTab] = React.useState<'elements' | 'layers' | 'settings' | 'page' | 'steps'>('elements');

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

  const handleAddStep = async () => {
    if (!websiteData?.id) return;
    const toastId = toast.loading('Adding new funnel step...');
    try {
      const supabase = createClient();
      const nextOrder = funnelSteps.length + 1;
      const stepName = `Step ${nextOrder}`;
      const stepPath = `/step-${nextOrder}`;

      const { data: step, error: stepError } = await supabase
        .from('funnel_steps')
        .insert({
          funnel_id: websiteData.id,
          name: stepName,
          path_name: stepPath,
          order: nextOrder
        })
        .select()
        .single();

      if (stepError) throw stepError;

      const initialContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
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
            .eq('id', step.id)
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
    <div className="w-[320px] h-full bg-white flex font-sans select-none z-40">
      {/* Icon rail */}
      <div className="w-[60px] h-full border-r border-dash-border flex flex-col items-center py-4 shrink-0">
        <div className="flex flex-col items-center gap-1.5">
          <RailButton active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} title="Elements" icon={Plus} />
          <RailButton active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} title="Layers" icon={Layers} />
          <RailButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} title="Globals" icon={Paintbrush} />
        </div>
        <div className="flex-1" />
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
          {/* Sticky Search */}
          <div className="px-4 py-3 border-b border-dash-border bg-white/95 backdrop-blur-sm z-10 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-[12px] bg-white border border-dash-border rounded-xl outline-none focus:border-dash-accent focus:ring-1 focus:ring-dash-accent transition-colors motion-reduce:transition-none placeholder:text-dash-textMuted !text-dash-text"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8 common-scrollbar">
          {/* AI Generator Panel */}
          <section className="p-4 bg-dash-accent/5 rounded-2xl border border-dash-accent/10 space-y-3">
            <h3 className="text-[10px] font-bold text-dash-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse motion-reduce:animate-none text-dash-accent" />
              AI section generator
            </h3>
            <Input
              value={aiLayoutPrompt}
              onChange={(e) => setAiLayoutPrompt(e.target.value)}
              placeholder="e.g. bento grid, pricing table"
              className="h-8 bg-white border-dash-border !text-dash-text text-xs placeholder:text-dash-textMuted"
            />
            <Button
              onClick={handleGenerateLayout}
              disabled={generatingLayout}
              size="sm"
              className="w-full bg-dash-accent/10 hover:bg-dash-accent/20 text-dash-accent border border-dash-accent/20 text-[10px] font-bold h-8"
            >
              {generatingLayout ? 'Generating...' : 'Ingest canvas block'}
            </Button>
          </section>

          {customBlueprints.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold text-green mb-4 px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green" />
                Saved blueprints
              </h3>
              <div className="grid grid-cols-3 gap-2">
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
                    className="relative flex flex-col items-center justify-center p-4 rounded-2xl border border-dash-border bg-dash-surface hover:border-green/50 hover:bg-green/5 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all motion-reduce:transition-none cursor-grab active:cursor-grabbing group"
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
                      className="absolute top-2 right-2 !text-dash-textMuted hover:text-red cursor-pointer p-0.5 transition-colors motion-reduce:transition-none z-20"
                      title="Delete blueprint"
                    >
                      <Minus size={10} />
                    </button>
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center mb-3 group-hover:bg-green group-hover:text-white transition-all motion-reduce:transition-none duration-300">
                      <Layers className="w-5 h-5 group-hover:scale-110 transition-transform motion-reduce:transition-none pointer-events-none" />
                    </div>
                    <span className="text-[9px] font-bold !text-dash-textMuted group-hover:!text-dash-text text-center leading-tight truncate w-full px-1">{blueprint.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Structure nodes</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem name="Section" icon={SectionIcon} component={<RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" />} />
              <DraggableItem name="Container" icon={Square} component={<RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" />} />
              <DraggableItem name="Columns" icon={ColumnsIcon} component={<RESOLVER.Columns canvas layout="2" gap={16} padding={16} />} />
              <DraggableItem name="Spacer" icon={ArrowUpDown} component={<RESOLVER.Spacer height={32} />} />
              <DraggableItem name="Divider" icon={Minus} component={<RESOLVER.Divider weight={1} color="#e5e7eb" width="100%" alignment="center" />} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Typography</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem name="Heading" icon={HeadingIcon} component={<RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" />} />
              <DraggableItem name="Paragraph" icon={AlignLeft} component={<RESOLVER.Paragraph text="Type your paragraph here." fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" />} />
              <DraggableItem name="Text / Edit" icon={Type} component={<RESOLVER.Text text="Custom Text" fontSize={16} />} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Media & assets</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem name="Image" icon={ImageIcon} component={<RESOLVER.Image src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Placeholder" borderRadius={16} objectFit="cover" />} />
              <DraggableItem name="Video" icon={VideoIcon} component={<RESOLVER.Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" provider="youtube" autoPlay={false} controls={true} loop={false} muted={false} borderRadius={16} />} />
              <DraggableItem name="Icon" icon={Star} component={<RESOLVER.Icon name="Star" size={24} color="#000000" strokeWidth={2} alignment="center" />} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Layout & authority</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem name="Ultra Hero" icon={SectionIcon} component={<RESOLVER.Hero />} />
              <DraggableItem name="Global Navbar" icon={Navigation} component={<RESOLVER.Navbar />} />
              <DraggableItem name="Global Footer" icon={Layout} component={<RESOLVER.Footer />} />
              <DraggableItem name="Blog Feed" icon={LayoutGrid} component={<RESOLVER.BlogFeed />} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Trust & social proof</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem name="Testimonial" icon={MessageCircleQuestion} component={<RESOLVER.Testimonial />} />
              <DraggableItem name="Star Rating" icon={Star} component={<RESOLVER.StarRating />} />
              <DraggableItem name="Logo Cloud" icon={ImageIcon} component={<RESOLVER.LogoStrip />} />
              <DraggableItem name="FAQ" icon={MessageCircleQuestion} component={<RESOLVER.FAQ />} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Conversion & logic</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem name="Button" icon={ButtonIcon} component={<RESOLVER.Button text="Click Here" size="md" variant="primary" color="#6c47ff" textColor="#ffffff" borderRadius={8} width="fit" link="#" iconPosition="right" />} />
              <DraggableItem name="Lead Form" icon={FormInput} component={<RESOLVER.Form />} />
              <DraggableItem name="Countdown" icon={Timer} component={<RESOLVER.Countdown />} />
              <DraggableItem name="Pricing" icon={CreditCard} component={<RESOLVER.PricingTable />} />
              <DraggableItem name="Progress" icon={Layout} component={<RESOLVER.ProgressBar value={65} color="#6c47ff" height={12} showLabel={true} label="Step 1 of 3" borderRadius={99} />} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold !text-dash-textMuted tracking-wider mb-3.5 uppercase px-1">Advanced</h3>
            <div className="grid grid-cols-3 gap-2">
              <DraggableItem
                name="Embed Code"
                icon={CodeIcon}
                component={<RESOLVER.CodeBlock customCode={`<div style="padding: 20px; background: #f4f4f5; border-radius: 12px; text-align: center; border: 1px dashed #e4e4e7;"><h3>Custom HTML Block</h3><p>Edit this in the settings panel</p></div>`} />}
              />
            </div>
          </section>

          <button
            onClick={() => setIsTemplateDirectoryOpen(true)}
            className="w-full flex items-start gap-3 p-4 bg-dash-accent/5 rounded-2xl border border-dash-accent/10 text-left hover:bg-dash-accent/10 transition-colors motion-reduce:transition-none"
          >
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-dash-accent/10">
              <PackageSearch className="w-4 h-4 text-dash-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold !text-dash-text">Need more elements?</p>
              <p className="text-[10px] !text-dash-textMuted leading-relaxed mt-0.5">
                Explore our templates and pre-built sections.
              </p>
              <span className="text-[10px] font-bold text-dash-accent mt-1 inline-block">Browse Templates →</span>
            </div>
          </button>
        </div>
      </div>
      ) : activeTab === 'layers' ? (
        <div className="flex-1 overflow-hidden h-full">
          <div className="p-3 text-[10px] font-bold !text-dash-textMuted border-b border-dash-border">Layer tree</div>
          <NodeTreeExplorer />
        </div>
      ) : activeTab === 'steps' ? (
        <div className="flex-1 overflow-hidden h-full">
          <div className="p-3 text-[10px] font-bold !text-dash-textMuted border-b border-dash-border">Funnel steps</div>
          <StepNavigator
            steps={funnelSteps}
            activeStepId={pageId as string}
            onSelectStep={handleSelectStep}
            onReorder={handleReorderSteps}
            onAddStep={handleAddStep}
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
    </div>
  );
};

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
import { Layout, Type, Image as ImageIcon, RectangleHorizontal as ButtonIcon, Square, Columns as ColumnsIcon, FormInput, Timer, CreditCard, MessageCircleQuestion, Section as SectionIcon, ArrowUpDown, Minus, Heading as HeadingIcon, AlignLeft, Video as VideoIcon, Star, Navigation, LayoutGrid, Layers, Settings, Search, Code as CodeIcon, ListOrdered, Sparkles, ArrowLeft, Trash2 } from 'lucide-react';
import { BlogFeed } from './user/BlogFeed';
import { RESOLVER } from '@/lib/builder/resolver';
import { WebsiteSettings } from './WebsiteSettings';
import { useBuilder } from './BuilderContext';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import StepNavigator from '@/components/funnels/StepNavigator';
import { NodeTreeExplorer } from './NodeTreeExplorer';
import { Input } from '@/components/ui/input';
import { generateAISectionLayout } from '@/app/actions/builderAI';
import { saveCustomComponent } from '@/app/actions/builder';

const DraggableItem = ({ name, icon: Icon, component }: { name: string, icon: any, component: React.ReactElement }) => {
  const { connectors } = useEditor();

  return (
    <div
      ref={ref => {
        if (ref) {
          connectors.create(ref, component);
        }
      }}
      className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dash-border bg-dash-surface hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(19,89,255,0.1)] transition-all motion-reduce:transition-none cursor-grab active:cursor-grabbing group"
    >
      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-all motion-reduce:transition-none duration-300">
        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform motion-reduce:transition-none pointer-events-none" />
      </div>
      <span className="text-[9px] font-bold !text-dash-textMuted group-hover:!text-dash-text text-center leading-tight">{name}</span>
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
  const { pages, websiteData } = useBuilder();
  const [activeTab, setActiveTab] = React.useState<'elements' | 'layers' | 'settings' | 'page' | 'steps'>('elements');

  const { selected } = useEditor((state) => {
    const selectedId = Array.from(state.events.selected)[0];
    let selectedNode;

    if (selectedId) {
      selectedNode = {
        id: selectedId,
        name: state.nodes[selectedId].data.custom?.displayName || state.nodes[selectedId].data.displayName,
        settings: state.nodes[selectedId].related && state.nodes[selectedId].related.settings,
        isDeletable: (state.nodes[selectedId].data as any).rules?.canDelete ? (state.nodes[selectedId].data as any).rules.canDelete() : true,
      };
    }

    return {
      selected: selectedNode
    };
  });
  const { connectors, actions: editorActions } = useEditor();
  const [customBlueprints, setCustomBlueprints] = React.useState<any[]>([]);
  
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
          workspace_id: websiteData.workspace_id,
          name: stepName,
          path: stepPath,
          position: nextOrder
        })
        .select()
        .single();

      if (stepError) throw stepError;

      const initialContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert({
          workspace_id: step.workspace_id,
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
            .update({ position: idx + 1 })
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

  if (selected && selected.id !== 'ROOT') {
    return (
      <div className="w-[300px] h-full bg-white border-r border-dash-border flex flex-col font-sans select-none z-40 animate-in fade-in slide-in-from-left duration-200 motion-reduce:animate-none">
        <div className="p-4 border-b border-dash-border flex items-center gap-3 bg-dash-surface">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editorActions.selectNode(null)}
            className="h-8 w-8 !text-dash-textMuted hover:!text-dash-text hover:bg-white rounded-lg transition-colors motion-reduce:transition-none shrink-0"
            title="Back to elements"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[11px] font-bold flex items-center gap-2 truncate">
              <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <Settings className="w-3 h-3 text-primary" />
              </div>
              <span className="truncate">{selected.name}</span>
            </h2>
          </div>
          {selected.id !== 'ROOT' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                editorActions.delete(selected.id);
              }}
              className="h-8 w-8 hover:bg-red/10 text-red rounded-lg transition-all motion-reduce:transition-none shrink-0"
              title="Delete element"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 common-scrollbar">
          {selected.settings && React.createElement(selected.settings as any)}
          {!selected.settings && (
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-dash-surface flex items-center justify-center mx-auto mb-4 opacity-40">
                <Settings className="w-6 h-6" />
              </div>
              <p className="text-[9px] font-bold !text-dash-textMuted">No settings available</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] h-full bg-white border-r border-dash-border flex flex-col font-sans select-none z-40">
      <div className="p-3 border-b border-dash-border flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('elements')}
          title="Elements"
          className={`flex-1 h-11 rounded-xl transition-all duration-300 motion-reduce:transition-none ${activeTab === 'elements' ? 'bg-primary/10 text-primary border border-primary/20' : '!text-dash-textMuted hover:!text-dash-text'}`}
        >
          <LayoutGrid size={18} />
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('layers')}
          title="Layers explorer"
          className={`flex-1 h-11 rounded-xl transition-all duration-300 motion-reduce:transition-none ${activeTab === 'layers' ? 'bg-primary/10 text-primary border border-primary/20' : '!text-dash-textMuted hover:!text-dash-text'}`}
        >
          <Layers size={18} />
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('page')}
          title="Page settings"
          className={`flex-1 h-11 rounded-xl transition-all duration-300 motion-reduce:transition-none ${activeTab === 'page' ? 'bg-primary/10 text-primary border border-primary/20' : '!text-dash-textMuted hover:!text-dash-text'}`}
        >
          <Settings size={18} />
        </Button>
        {type === 'funnel' ? (
          <Button
            variant="ghost"
            onClick={() => setActiveTab('steps')}
            title="Funnel steps"
            className={`flex-1 h-11 rounded-xl transition-all duration-300 motion-reduce:transition-none ${activeTab === 'steps' ? 'bg-primary/10 text-primary border border-primary/20' : '!text-dash-textMuted hover:!text-dash-text'}`}
          >
            <ListOrdered size={18} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            title="Site settings"
            className={`flex-1 h-11 rounded-xl transition-all duration-300 motion-reduce:transition-none ${activeTab === 'settings' ? 'bg-primary/10 text-primary border border-primary/20' : '!text-dash-textMuted hover:!text-dash-text'}`}
          >
            <Layout size={18} />
          </Button>
        )}
      </div>

      {activeTab === 'elements' ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-8 common-scrollbar">
          {/* AI Generator Panel */}
          <section className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
            <h3 className="text-[10px] font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse motion-reduce:animate-none text-primary" />
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
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold h-8"
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
              <div className="grid grid-cols-2 gap-2">
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
            <h3 className="text-[10px] font-bold !text-dash-textMuted mb-4 px-1">Structure nodes</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Section" icon={SectionIcon} component={<RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" />} />
              <DraggableItem name="Container" icon={Square} component={<RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" />} />
              <DraggableItem name="Columns" icon={ColumnsIcon} component={<RESOLVER.Columns canvas layout="2" gap={16} padding={16} />} />
              <DraggableItem name="Spacer" icon={ArrowUpDown} component={<RESOLVER.Spacer height={32} />} />
              <DraggableItem name="Divider" icon={Minus} component={<RESOLVER.Divider weight={1} color="#e5e7eb" width="100%" alignment="center" />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 px-1">Typography</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Heading" icon={HeadingIcon} component={<RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" />} />
              <DraggableItem name="Paragraph" icon={AlignLeft} component={<RESOLVER.Paragraph text="Type your paragraph here." fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" />} />
              <DraggableItem name="Text / Edit" icon={Type} component={<RESOLVER.Text text="Custom Text" fontSize={16} />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 px-1">Media & assets</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Image" icon={ImageIcon} component={<RESOLVER.Image src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Placeholder" borderRadius={16} objectFit="cover" />} />
              <DraggableItem name="Video" icon={VideoIcon} component={<RESOLVER.Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" provider="youtube" autoPlay={false} controls={true} loop={false} muted={false} borderRadius={16} />} />
              <DraggableItem name="Icon" icon={Star} component={<RESOLVER.Icon name="Star" size={24} color="#000000" strokeWidth={2} alignment="center" />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 px-1">Layout & authority</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Ultra Hero" icon={SectionIcon} component={<RESOLVER.Hero />} />
              <DraggableItem name="Global Navbar" icon={Navigation} component={<RESOLVER.Navbar />} />
              <DraggableItem name="Global Footer" icon={Layout} component={<RESOLVER.Footer />} />
              <DraggableItem name="Blog Feed" icon={LayoutGrid} component={<RESOLVER.BlogFeed />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 px-1">Trust & social proof</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Testimonial" icon={MessageCircleQuestion} component={<RESOLVER.Testimonial />} />
              <DraggableItem name="Star Rating" icon={Star} component={<RESOLVER.StarRating />} />
              <DraggableItem name="Logo Cloud" icon={ImageIcon} component={<RESOLVER.LogoStrip />} />
              <DraggableItem name="FAQ" icon={MessageCircleQuestion} component={<RESOLVER.FAQ />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 px-1">Conversion & logic</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Button" icon={ButtonIcon} component={<RESOLVER.Button text="Click Here" size="md" variant="primary" color="#6c47ff" textColor="#ffffff" borderRadius={8} width="fit" link="#" iconPosition="right" />} />
              <DraggableItem name="Lead Form" icon={FormInput} component={<RESOLVER.Form />} />
              <DraggableItem name="Countdown" icon={Timer} component={<RESOLVER.Countdown />} />
              <DraggableItem name="Pricing" icon={CreditCard} component={<RESOLVER.PricingTable />} />
              <DraggableItem name="Progress" icon={Layout} component={<RESOLVER.ProgressBar value={65} color="#6c47ff" height={12} showLabel={true} label="Step 1 of 3" borderRadius={99} />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 px-1">Advanced</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem
                name="Embed Code"
                icon={CodeIcon}
                component={<RESOLVER.CodeBlock customCode={`<div style="padding: 20px; background: #f4f4f5; border-radius: 12px; text-align: center; border: 1px dashed #e4e4e7;"><h3>Custom HTML Block</h3><p>Edit this in the settings panel</p></div>`} />}
              />
            </div>
          </section>
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
  );
};

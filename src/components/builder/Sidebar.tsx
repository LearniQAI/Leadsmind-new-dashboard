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
import { Layout, Type, Image as ImageIcon, RectangleHorizontal as ButtonIcon, Square, Columns as ColumnsIcon, FormInput, Timer, CreditCard, MessageCircleQuestion, Section as SectionIcon, ArrowUpDown, Minus, Heading as HeadingIcon, AlignLeft, Video as VideoIcon, Star, Navigation, LayoutGrid, Layers, Settings, Search, Code as CodeIcon } from 'lucide-react';
import { BlogFeed } from './user/BlogFeed';
import { RESOLVER } from '@/lib/builder/resolver';
import { WebsiteSettings } from './WebsiteSettings';

const DraggableItem = ({ name, icon: Icon, component }: { name: string, icon: any, component: React.ReactElement }) => {
  const { connectors } = useEditor();

  return (
    <div
      ref={ref => {
        if (ref) {
          connectors.create(ref, component);
        }
      }}
      className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-[#12121c] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(19,89,255,0.1)] transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-all duration-300">
        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform pointer-events-none" />
      </div>
      <span className="text-[9px] font-black text-white/40 group-hover:text-white uppercase tracking-widest text-center leading-tight">{name}</span>
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
  const [activeTab, setActiveTab] = React.useState<'elements' | 'layers' | 'settings' | 'page'>(type === 'funnel' ? 'layers' : 'elements');

  return (
    <div className="w-[300px] h-full bg-[#0b0b14] border-r border-white/5 flex flex-col font-sans select-none z-40">
      <div className="p-3 border-b border-white/5 flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('elements')}
          title="Elements"
          className={`flex-1 h-11 rounded-xl transition-all duration-300 ${activeTab === 'elements' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/30 hover:text-white'}`}
        >
          <LayoutGrid size={18} />
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('page')}
          title="Page Settings"
          className={`flex-1 h-11 rounded-xl transition-all duration-300 ${activeTab === 'page' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/30 hover:text-white'}`}
        >
          <Settings size={18} />
        </Button>
        {type === 'funnel' ? (
          <Button
            variant="ghost"
            onClick={() => setActiveTab('layers')}
            title="Funnel Steps"
            className={`flex-1 h-11 rounded-xl transition-all duration-300 ${activeTab === 'layers' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/30 hover:text-white'}`}
          >
            <Layers size={18} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            title="Site Settings"
            className={`flex-1 h-11 rounded-xl transition-all duration-300 ${activeTab === 'settings' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/30 hover:text-white'}`}
          >
            <Layout size={18} />
          </Button>
        )}
      </div>


      {activeTab === 'elements' ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-8 common-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 px-1">Structure Nodes</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Section" icon={SectionIcon} component={<RESOLVER.Section canvas paddingBottom={64} paddingTop={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent" />} />
              <DraggableItem name="Container" icon={Square} component={<RESOLVER.Container canvas layoutType="fixed" maxWidth="1200px" padding={16} backgroundColor="transparent" />} />
              <DraggableItem name="Columns" icon={ColumnsIcon} component={<RESOLVER.Columns canvas layout="2" gap={16} padding={16} />} />
              <DraggableItem name="Spacer" icon={ArrowUpDown} component={<RESOLVER.Spacer height={32} />} />
              <DraggableItem name="Divider" icon={Minus} component={<RESOLVER.Divider weight={1} color="#e5e7eb" width="100%" alignment="center" />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Typography</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Heading" icon={HeadingIcon} component={<RESOLVER.Heading level="h2" text="Heading" fontWeight="bold" textAlign="left" color="#111827" />} />
              <DraggableItem name="Paragraph" icon={AlignLeft} component={<RESOLVER.Paragraph text="Type your paragraph here." fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" />} />
              <DraggableItem name="Text / Edit" icon={Type} component={<RESOLVER.Text text="Custom Text" fontSize={16} />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Media & Assets</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Image" icon={ImageIcon} component={<RESOLVER.Image src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Placeholder" borderRadius={16} objectFit="cover" />} />
              <DraggableItem name="Video" icon={VideoIcon} component={<RESOLVER.Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" provider="youtube" autoPlay={false} controls={true} loop={false} muted={false} borderRadius={16} />} />
              <DraggableItem name="Icon" icon={Star} component={<RESOLVER.Icon name="Star" size={24} color="#000000" strokeWidth={2} alignment="center" />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Layout & Authority</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Ultra Hero" icon={SectionIcon} component={<RESOLVER.Hero />} />
              <DraggableItem name="Global Navbar" icon={Navigation} component={<RESOLVER.Navbar />} />
              <DraggableItem name="Global Footer" icon={Layout} component={<RESOLVER.Footer />} />
              <DraggableItem name="Blog Feed" icon={LayoutGrid} component={<RESOLVER.BlogFeed />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Trust & Social Proof</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Testimonial" icon={MessageCircleQuestion} component={<RESOLVER.Testimonial />} />
              <DraggableItem name="Star Rating" icon={Star} component={<RESOLVER.StarRating />} />
              <DraggableItem name="Logo Cloud" icon={ImageIcon} component={<RESOLVER.LogoStrip />} />
              <DraggableItem name="FAQ" icon={MessageCircleQuestion} component={<RESOLVER.FAQ />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Conversion & Logic</h3>
            <div className="grid grid-cols-2 gap-2">
              <DraggableItem name="Button" icon={ButtonIcon} component={<RESOLVER.Button text="Click Here" size="md" variant="primary" color="#6c47ff" textColor="#ffffff" borderRadius={8} width="fit" link="#" iconPosition="right" />} />
              <DraggableItem name="Lead Form" icon={FormInput} component={<RESOLVER.Form />} />
              <DraggableItem name="Countdown" icon={Timer} component={<RESOLVER.Countdown />} />
              <DraggableItem name="Pricing" icon={CreditCard} component={<RESOLVER.PricingTable />} />
              <DraggableItem name="Progress" icon={Layout} component={<RESOLVER.ProgressBar value={65} color="#6c47ff" height={12} showLabel={true} label="Step 1 of 3" borderRadius={99} />} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Advanced</h3>
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
        <div className="flex-1 overflow-hidden">
          {/* Funnel content if needed */}
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

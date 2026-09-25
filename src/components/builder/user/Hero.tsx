"use client";

import React from 'react';
import { useNode, useEditor, Element } from '@craftjs/core';
import { resolveLink } from '@/lib/builder/utils';
import { BUTTON_SIZE_CLASSES, buttonInlineStyle } from '@/lib/builder/buttonStyle';

const SECONDARY_ALIGN: Record<string, string> = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };
import { useGlobalSync, useResponsiveValue } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { HeroSettings } from './HeroSettings';

export interface HeroProps {
 layout: 'split' | 'centered' | 'background';
 minHeight: number;
 backgroundColor: string;
 backgroundImage: string;
 overlayOpacity: number;
 padding: number;
 gap: number;
 // Pro Extras
 contentAlignment: 'start' | 'center' | 'end';
 contentMaxWidth: number;
 gradientOverlay: boolean;
 gradientColor1: string;
 gradientColor2: string;
 showScrollIndicator: boolean;
 useGlassmorphism: boolean;
 // Advanced Reqs
 backgroundVideo: string;
 heightPreset: 'full' | 'large' | 'compact';
 animation: 'none' | 'fade-in' | 'slide-up';
 showSecondaryButton: boolean;
 /** The two blurred accent-colored "blob" decorations were unconditional — fine for a
  *  colorful hero, but they bleed a visible tinted glow onto an otherwise plain white
  *  background for clinical/monochrome designs (e.g. Velocity). Defaults to true so every
  *  existing template keeps its current look untouched. */
 showBackgroundBlobs?: boolean;
 children?: React.ReactNode;
}

export const Hero = (allProps: HeroProps & any) => {
 const {
  layout,
  minHeight,
  backgroundColor,
  backgroundImage,
  overlayOpacity,
  gradientOverlay,
  gradientColor1,
  gradientColor2,
  showScrollIndicator,
  useGlassmorphism,
  backgroundVideo,
  heightPreset,
  animation,
  showSecondaryButton,
  secondaryButtonText,
  secondaryButtonLink,
  secondaryButtonVariant,
  secondaryButtonColor,
  secondaryButtonTextColor,
  secondaryButtonRadius,
  secondaryButtonSize,
  secondaryButtonAlign,
  showBackgroundBlobs = true,
  // Style Props (Catch these so they don't leak to DOM)
  padding: _padding,
  padding_mobile,
  padding_tablet,
  gap: _gap,
  gap_mobile,
  gap_tablet,
  contentMaxWidth: _contentMaxWidth,
  contentMaxWidth_mobile,
  contentMaxWidth_tablet,
  contentAlignment: baseContentAlignment,
  contentAlignment_mobile,
  contentAlignment_tablet,
  // Craft Props
  children,
  dragRef,
  ...props
 } = allProps;

 const { connectors: { connect, drag } } = useNode();
 const { viewMode, websiteData } = useBuilder();
 const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
 const basePath = (websiteData?.workspaceSlug && websiteData?.subdomain) ? `/p/${websiteData.workspaceSlug}/${websiteData.subdomain}` : '';

 // Responsive values
 const padding = useResponsiveValue(allProps, 'padding', 80);
 const gap = useResponsiveValue(allProps, 'gap', 40);
 const contentMaxWidth = useResponsiveValue(allProps, 'contentMaxWidth', 900);
 const contentAlignment = useResponsiveValue(allProps, 'contentAlignment', baseContentAlignment);

 const layoutStyles = {
  split: "flex-col lg:flex-row items-center",
  centered: "flex-col items-center text-center",
  background: "flex-col items-center text-center",
 };

 const alignStyles = {
  start: "items-start pt-20",
  center: "items-center",
  end: "items-end pb-20",
 };

 const heightMap = {
  full: "min-h-screen",
  large: "min-h-[80vh]",
  compact: "min-h-[50vh]",
 };

 const animationClasses = {
  none: "",
  'fade-in': "animate-in fade-in duration-1000",
  'slide-up': "animate-in slide-in-from-bottom-12 duration-1000",
 };

 return (
  <div
   ref={(el) => {
    if (el) {
     connect(el);
     drag(el);
     if (dragRef) {
      if (typeof dragRef === 'function') dragRef(el);
      else dragRef.current = el;
     }
    }
   }}
   className={`relative w-full flex overflow-hidden transition-all duration-500 ${heightMap[heightPreset as keyof typeof heightMap] || 'min-h-[80vh]'}`}
   style={{
    backgroundColor,
    backgroundImage: (layout === 'background' && !backgroundVideo) ? `url(${backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: `${padding}px 24px`
   }}
  >
   {backgroundVideo && (
    <video
     autoPlay
     loop
     muted
     playsInline
     className="absolute inset-0 w-full h-full object-cover z-0"
    >
     <source src={backgroundVideo} type="video/mp4" />
    </video>
   )}
   {/* Background Overlay (Solid or Gradient) */}
   {layout === 'background' && (
    <div
     className="absolute inset-0 z-0 pointer-events-none"
     style={{
      background: gradientOverlay
       ? `linear-gradient(to bottom, ${gradientColor1}, ${gradientColor2})`
       : `rgba(0,0,0,${overlayOpacity / 100})`
     }}
    ></div>
   )}

   {/* Background Blobs (Premium Aesthetic) */}
   {showBackgroundBlobs && (
    <>
     <div className="absolute top-0 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px] pointer-events-none opacity-50"></div>
     <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
    </>
   )}

   <div className={`relative z-10 max-w-7xl mx-auto w-full flex ${layoutStyles[layout as keyof typeof layoutStyles]} ${alignStyles[contentAlignment as keyof typeof alignStyles]} ${animationClasses[animation as keyof typeof animationClasses] || ''}`} style={{ gap: `${gap}px` }}>
    <div
     className={`flex-1 w-full ${useGlassmorphism ? 'backdrop-blur-xl bg-white/5 p-12 rounded-[48px] border border-white/10 shadow-2xl' : ''}`}
     style={{ maxWidth: layout === 'split' ? 'none' : `${contentMaxWidth}px` }}
    >
     {children}
     {/* Secondary button — the "Show secondary button" setting used to save with nothing
         rendering it. Styled exactly like a Button block (lib/builder/buttonStyle), linked via
         the same LinkSelector/resolveLink. Placed under the Hero's content (whose primary CTA
         is whatever Button block the admin dropped in), aligned with it; full width on phones.
         Not rendered at all when the setting is off. */}
     {showSecondaryButton && (
      <div className={`mt-6 flex ${SECONDARY_ALIGN[secondaryButtonAlign === 'left' || secondaryButtonAlign === 'center' || secondaryButtonAlign === 'right' ? secondaryButtonAlign : (layout === 'split' ? 'left' : 'center')]}`}>
       <a
        href={resolveLink(secondaryButtonLink, { basePath })}
        onClick={(e) => { if (enabled) e.preventDefault(); }}
        data-hero-secondary-button=""
        className={`inline-flex ${enabled && viewMode === 'mobile' ? 'w-full' : 'w-full sm:w-auto'} items-center justify-center gap-2 no-underline transition-all hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 ${BUTTON_SIZE_CLASSES[secondaryButtonSize] || BUTTON_SIZE_CLASSES.md}`}
        style={buttonInlineStyle({ variant: secondaryButtonVariant, color: secondaryButtonColor, textColor: secondaryButtonTextColor, borderRadius: secondaryButtonRadius })}
       >
        {secondaryButtonText || 'Learn more'}
       </a>
      </div>
     )}
    </div>
   </div>

   {showScrollIndicator && (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-50 animate-bounce cursor-pointer">
     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Scroll</span>
     <div className="w-[1px] h-12 bg-current"></div>
    </div>
   )}
  </div>
 );
};


Hero.craft = {
 displayName: 'Ultra Hero',
 isCanvas: true,
 props: {
  layout: 'split',
  minHeight: 80,
  backgroundColor: '#ffffff',
  backgroundImage: '',
  overlayOpacity: 40,
  padding: 80,
  gap: 40,
  contentAlignment: 'center',
  contentMaxWidth: 900,
  gradientOverlay: false,
  gradientColor1: 'rgba(0,0,0,0.8)',
  gradientColor2: 'rgba(108,71,255,0.4)',
  showScrollIndicator: true,
  useGlassmorphism: false,
  backgroundVideo: '',
  heightPreset: 'large',
  animation: 'fade-in',
  showSecondaryButton: false,
  secondaryButtonText: 'Learn more',
  secondaryButtonLink: '#',
  secondaryButtonVariant: 'outline',
  secondaryButtonColor: '#6c47ff',
  secondaryButtonTextColor: '#6c47ff',
  secondaryButtonRadius: 12,
  secondaryButtonSize: 'md',
  secondaryButtonAlign: 'auto',
  showBackgroundBlobs: true,
 },
 related: {
  settings: HeroSettings,
 },
};

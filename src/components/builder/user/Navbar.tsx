"use client";

import React, { useState, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Menu, X, Pencil, Image as ImageIcon } from 'lucide-react';
import { NavbarSettings } from './NavbarSettings';
import { useBuilder } from '../BuilderContext';
import { resolveLink } from '@/lib/builder/utils';
import { InlineTextEditor } from './InlineTextEditor';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import { inlineRichText } from '@/lib/builder/blockTypography';
import { MediaVaultModal } from '../MediaVaultModal';
import type { LinkObject } from '../LinkSelector';


export interface NavbarProps {
 logo: string;
 brandName: string;
 // A link is stored as a plain '#id'/'/page'/'https://...' string by default (every built-in
 // template's own links, since resolveLink's string branch handles that shape directly with
 // no ambiguity), OR as a LinkSelector-authored LinkObject once a user edits a link via
 // NavbarSettings' link editor (see addLink there — new links are created as LinkObjects).
 // resolveLink already accepts both; this only makes the type match what actually flows
 // through it at runtime.
 links: { label: string, href: string | LinkObject }[];
 backgroundColor: string;
 textColor: string;
 sticky: boolean;
 padding: number;
 showButton: boolean;
 buttonText: string;
 buttonBg: string;
 buttonTextColor: string;
 // Pro Extras
 fullWidth: boolean;
 borderBottomWidth: number;
 borderBottomColor: string;
 linkHoverColor: string;
 fontSize: number;
 fontWeight: string;
 // Advanced Reqs
 layoutType: 'side' | 'split' | 'stacked';
 navigationSource: string;
 mobileOverlayColor: string;
 hamburgerColor: string;
 // Global Syncing
 isGlobal?: boolean;
 globalId?: string;
}

import { useGlobalSync, useSpacingStyle } from '@/lib/builder/hooks';
import { omitSpacingProps } from '@/lib/builder/spacing';

export const Navbar = ({
 logo,
 brandName,
 // Templates/deserialized JSON can omit this entirely — displayLinks.map below
 // is unguarded, so default it rather than let a bare Navbar node (used all
 // over the built-in templates with no links prop) crash the canvas.
 links = [],
 backgroundColor,
 textColor,
 sticky,
 padding,
 showButton,
 buttonText,
 buttonBg,
 buttonTextColor,
 fullWidth,
 borderBottomWidth,
 borderBottomColor,
 linkHoverColor,
 fontSize,
 fontWeight,
 layoutType,
 navigationSource,
 mobileOverlayColor,
 hamburgerColor,
 isGlobal,
 globalId,
 dragRef,
 ...props
}: NavbarProps & any) => {
 const { connectors: { connect, drag }, actions: { setProp } } = useNode();
 const { pages, websiteData, viewMode } = useBuilder();
 const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
 // Same accepted permanent pattern as Columns.tsx's `viewModeColsOverride` (see the long
 // comment there and on Viewport.tsx's `getWidth()`): the editor's Desktop/Tablet/Mobile
 // toggle only narrows a wrapper <div>'s CSS width, not the real browser viewport, so the
 // `hidden md:flex` / `md:hidden` classes below — keyed to the real window width — never
 // respond to it. At "mobile"/"tablet" preview this kept the full desktop link row visible
 // and overflowing off the narrowed canvas instead of collapsing behind the hamburger.
 // Force the mobile layout in the editor's mobile/tablet preview only; production always
 // uses the real breakpoint classes.
 const previewMobile = enabled && (viewMode === 'mobile' || viewMode === 'tablet');
 // Self-spaced (lib/builder/spacing.ts SELF_SPACED_BLOCKS): the universal spacing is painted on
 // this <nav> itself. A wrapper element would become the sticky nav's parent box — exactly the
 // nav's own height — leaving it no room to stick, so `sticky top-0` silently stopped working.
 const spacing = useSpacingStyle(props);
 const [isOpen, setIsOpen] = useState(false);
 const [isScrolled, setIsScrolled] = useState(false);
 const [isLogoVaultOpen, setIsLogoVaultOpen] = useState(false);

 // Sync props to global config if enabled
 useGlobalSync(!!isGlobal, globalId || 'main_navbar', {
  logo, brandName, links, backgroundColor, textColor, sticky, padding,
  showButton, buttonText, buttonBg, buttonTextColor, fullWidth,
  borderBottomWidth, borderBottomColor, linkHoverColor, fontSize,
  fontWeight, layoutType, navigationSource, mobileOverlayColor, hamburgerColor
 });

 const basePath = (websiteData?.workspaceSlug && websiteData?.subdomain) 
  ? `/p/${websiteData.workspaceSlug}/${websiteData.subdomain}` 
  : '';

 const displayLinks = (navigationSource === 'website' && pages && pages.length > 0)
  ? pages.map(p => ({ label: p.name, href: p.slug === 'home' ? `${basePath}/` : `${basePath}/${p.slug}` }))
  : links;

 // Only manual links are backed by an editable index into `links` — the
 // auto (page-derived) list has nothing to write an inline edit back to.
 const isManualLinks = navigationSource !== 'website' || !pages || pages.length === 0;
 const updateLinkLabel = (index: number, val: string) => {
  setProp((p: any) => { p.links[index].label = val; }, 500);
 };


 useEffect(() => {

  const handleScroll = () => {
   setIsScrolled(window.scrollY > 20);
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 return (
  <nav
   {...omitSpacingProps(props)}
   ref={(ref) => {
    if (ref) {
     connect(ref);
     drag(ref);
     if (dragRef) {
      if (typeof dragRef === 'function') dragRef(ref);
      else dragRef.current = ref;
     }
    }
   }}
   className={`w-full transition-all duration-300 z-[100] ${sticky ? 'sticky top-0' : 'relative'} ${isScrolled ? 'shadow-lg backdrop-blur-md' : ''}`}
   style={{
    backgroundColor: isScrolled ? backgroundColor : backgroundColor,
    color: textColor,
    // Top/bottom: the universal spacing controls when set, else the Navbar's own padding.
    paddingTop: spacing.paddingTop ?? `${padding}px`,
    paddingBottom: spacing.paddingBottom ?? `${padding}px`,
    paddingLeft: '24px',
    paddingRight: '24px',
    marginTop: spacing.marginTop,
    marginBottom: spacing.marginBottom,
    borderBottom: `${borderBottomWidth}px solid ${borderBottomColor}`
   }}
  >
   <div className={`${fullWidth ? 'w-full px-8' : 'max-w-7xl mx-auto px-4'} flex ${layoutType === 'stacked' ? 'flex-col gap-4' : 'items-center justify-between'}`}>
    {/* Logo */}
    <div className={`flex items-center gap-2 cursor-pointer ${layoutType === 'stacked' ? 'justify-center border-b border-white/5 pb-4 w-full' : ''}`}>
     {enabled ? (
      <div
       className="relative group/logo shrink-0"
       onClick={(e) => { e.preventDefault(); setIsLogoVaultOpen(true); }}
       title="Click to replace logo"
      >
       {logo ? (
        <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
       ) : (
        <div className="h-8 w-8 rounded-md border border-dashed border-current opacity-50 flex items-center justify-center">
         <ImageIcon size={14} />
        </div>
       )}
       <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md opacity-0 group-hover/logo:opacity-100 transition-opacity motion-reduce:transition-none">
        <Pencil size={12} className="text-white" />
       </div>
      </div>
     ) : (
      logo && <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
     )}
     {enabled ? (
      <span className="font-black tracking-tighter text-xl uppercase outline-none">
       <InlineTextEditor
        value={brandName}
        onChange={(val) => setProp((p: any) => { p.brandName = val; }, 500)}
       />
      </span>
     ) : (
      <span
       className="font-black tracking-tighter text-xl uppercase"
       // Inline slot: inlineRichText drops the <p> the inline editor wraps text in, which
       // otherwise took the global `p` rule (14px, weight 400, body colour) here.
       dangerouslySetInnerHTML={{ __html: inlineRichText(brandName) }}
      />
     )}
    </div>

    {/* Desktop Links */}
    <div className={`${previewMobile ? 'hidden' : 'hidden md:flex'} items-center transition-all ${layoutType === 'split' ? 'gap-12 flex-1 justify-center' : 'gap-8'} ${layoutType === 'stacked' ? 'w-full justify-center' : ''}`}>
     {displayLinks.map((link: { label: string, href: string | LinkObject }, i: number) => (
      enabled && isManualLinks ? (
       <span
        key={i}
        className="transition-all duration-300 uppercase tracking-widest font-bold outline-none cursor-text"
        style={{ fontSize: `${fontSize}px`, fontWeight: fontWeight, color: 'inherit' }}
       >
        <InlineTextEditor
         value={link.label}
         onChange={(val) => updateLinkLabel(i, val)}
        />
       </span>
      ) : (
       <a
        key={i}
        href={resolveLink(link.href, { basePath })}
        onClick={(e) => { if (enabled) e.preventDefault(); }}
        className="transition-all duration-300 uppercase tracking-widest font-bold"
        style={{
         fontSize: `${fontSize}px`,
         fontWeight: fontWeight,
         color: 'inherit'
        }}
        onMouseOver={(e: any) => e.target.style.color = linkHoverColor}
        onMouseOut={(e: any) => e.target.style.color = 'inherit'}
        // The inline editor saves labels as `<p>Home</p>`; as React text that showed the tags.
        dangerouslySetInnerHTML={{ __html: inlineRichText(link.label) }}
       />
      )
     ))}

     {(showButton && layoutType !== 'split') && (
      <button
       className="px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl"
       style={{ backgroundColor: buttonBg, color: buttonTextColor }}
      >
       {buttonText}
      </button>
     )}
    </div>

    {/* Action Button for Split Layout */}
    {(showButton && layoutType === 'split') && (
     <div className={previewMobile ? 'hidden' : 'hidden md:block'}>
      <button
       className="px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl"
       style={{ backgroundColor: buttonBg, color: buttonTextColor }}
      >
       {buttonText}
      </button>
     </div>
    )}

    {/* Mobile Toggle */}
    <button
     className={previewMobile ? 'p-2' : 'md:hidden p-2'}
     onClick={() => setIsOpen(!isOpen)}
     style={{ color: hamburgerColor }}
    >
     {isOpen ? <X /> : <Menu />}
    </button>
   </div>

   {/* Mobile Menu */}
   {isOpen && (
    <div
     className="md:hidden absolute top-full left-0 w-full border-t border-white/5 py-8 px-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-top duration-300"
     style={{ backgroundColor: mobileOverlayColor }}
    >
     {displayLinks.map((link: { label: string, href: string | LinkObject }, i: number) => (
      enabled && isManualLinks ? (
       <span key={i} className="text-sm font-black uppercase tracking-widest outline-none cursor-text">
        <InlineTextEditor
         value={link.label}
         onChange={(val) => updateLinkLabel(i, val)}
        />
       </span>
      ) : (
       <a
        key={i}
        href={resolveLink(link.href, { basePath })}
        onClick={(e) => { if (enabled) e.preventDefault(); }}
        className="text-sm font-black uppercase tracking-widest"
        dangerouslySetInnerHTML={{ __html: inlineRichText(link.label) }}
       />
      )
     ))}
     {showButton && (
      <button
       className="w-full py-4 rounded-xl font-black uppercase tracking-widest"
       style={{ backgroundColor: buttonBg, color: buttonTextColor }}
      >
       {buttonText}
      </button>
     )}
    </div>
   )}

   {enabled && (
    <MediaVaultModal
     isOpen={isLogoVaultOpen}
     onOpenChange={setIsLogoVaultOpen}
     onSelect={(url) => setProp((p: any) => { p.logo = url; })}
    />
   )}
  </nav>
 );
};


Navbar.craft = {
 displayName: 'Global Navbar',
 props: {
  logo: '',
  brandName: 'LeadsMind',
  links: [
   { label: 'Features', href: '#features' },
   { label: 'Pricing', href: '#pricing' },
   { label: 'About', href: '#about' },
  ],
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
  sticky: true,
  padding: 16,
  showButton: true,
  buttonText: 'Get Started',
  buttonBg: '#6c47ff',
  buttonTextColor: '#ffffff',
  fullWidth: false,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255,255,255,0.05)',
  linkHoverColor: '#6c47ff',
  fontSize: 12,
  fontWeight: '700',
  layoutType: 'side',
  navigationSource: 'none',
  mobileOverlayColor: '#0f172a',
  hamburgerColor: '#ffffff',
 },
 related: {
  settings: NavbarSettings,
 },
};

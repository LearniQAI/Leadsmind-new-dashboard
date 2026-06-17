"use client";

import React from 'react';
import { Editor, Frame } from '@craftjs/core';
import { RESOLVER } from '@/lib/builder/resolver';
import { BuilderProvider } from './BuilderContext';

export default function PublishedPageRenderer({
 content,
 websiteData,
 pages,
 websiteId,
 funnelId
}: {
 content: string;
 websiteData?: any;
 pages?: any[];
 websiteId?: string;
 funnelId?: string;
}) {
 // Retrieve theme variables from config
 const websiteConfig = websiteData?.config || {};
 const primaryColor = websiteConfig.primaryColor || '#6c47ff';
 const secondaryColor = websiteConfig.secondaryColor || '#3b82f6';
 const accentColor = websiteConfig.accentColor || '#fbbf24';
 const backgroundColor = websiteConfig.backgroundColor || '#050508';
 const headingFont = websiteConfig.headingFont || 'Space Grotesk';
 const bodyFont = websiteConfig.bodyFont || 'DM Sans';

 const googleFontsLink = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;700;900&family=${encodeURIComponent(bodyFont)}:wght@400;500;700&display=swap`;

 const themeVariablesCss = `
  :root {
   --theme-primary: ${primaryColor};
   --theme-secondary: ${secondaryColor};
   --theme-accent: ${accentColor};
   --theme-bg: ${backgroundColor};
   --font-heading: '${headingFont}', sans-serif;
   --font-body: '${bodyFont}', sans-serif;
  }
  
  h1, h2, h3, h4, h5, h6 {
   font-family: var(--font-heading) !important;
  }
  
  p, span, a, button, input, textarea {
   font-family: var(--font-body) !important;
  }
 `;

 // Resolve navigation & footer settings
 const websiteLinks = websiteConfig.navLinks || [];
 const footerLinks = websiteConfig.footerLinks || [];
 const hasNav = websiteLinks.length > 0;
 const hasFooter = footerLinks.length > 0;

 const navStyle = websiteConfig.navStyle || {
  bg: 'transparent',
  text: '#ffffff',
  ctaText: 'Get Started',
  ctaBg: '#6c47ff',
  ctaColor: '#ffffff',
  border: true,
  glass: true,
  size: 'py-4'
 };

 const footerStyle = websiteConfig.footerStyle || {
  bg: '#0b0b14',
  text: '#ffffff',
  accentColor: '#6c47ff',
  border: true,
  tagline: 'Empowering businesses with intelligent automation.',
  layout: 'split'
 };

 // Helper to resolve links relative to preview or custom domains
 const resolveNavLink = (linkHref: string) => {
  if (!linkHref) return '#';
  if (linkHref.startsWith('http://') || linkHref.startsWith('https://') || linkHref.startsWith('mailto:') || linkHref.startsWith('tel:')) {
   return linkHref;
  }
  
  const path = '/' + linkHref.replace(/^\/+/, '');
  
  if (typeof window !== 'undefined') {
   const loc = window.location.pathname;
   const match = loc.match(/^\/p\/([^\/]+)\/([^\/]+)/);
   if (match) {
    const workspaceSlug = match[1];
    const subdomain = match[2];
    if (path === '/') {
     return `/p/${workspaceSlug}/${subdomain}`;
    }
    return `/p/${workspaceSlug}/${subdomain}${path}`;
   }
  }
  return path;
 };

 // Defensive parsing for content JSON
 let validContent = content;
 try {
  if (!validContent || validContent.trim() === '') {
   validContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
  } else {
   JSON.parse(validContent);
  }
 } catch (err) {
  validContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
 }

 return (
  <div className="w-full min-h-screen bg-[var(--theme-bg)] text-black selection:bg-primary selection:text-white antialiased overflow-x-hidden flex flex-col">
   <link href={googleFontsLink} rel="stylesheet" />
   <style dangerouslySetInnerHTML={{ __html: themeVariablesCss }} />
   
   <BuilderProvider
    websiteData={websiteData || null}
    pages={pages || []}
    websiteId={websiteId}
    funnelId={funnelId}
    onUpdateWebsite={() => {}}
   >
    {hasNav && (
     <nav
      className={`w-full sticky top-0 z-50 transition-all ${navStyle.border ? 'border-b border-black/10' : ''} ${navStyle.glass ? 'backdrop-blur-md bg-opacity-70' : ''}`}
      style={{ backgroundColor: navStyle.glass ? undefined : navStyle.bg }}
     >
      {navStyle.glass && (
       <div className="absolute inset-0 z-[-1] opacity-70" style={{ backgroundColor: navStyle.bg }} />
      )}
      <div className={`max-w-7xl mx-auto px-4 flex items-center justify-between ${navStyle.size}`}>
       <div className="font-black tracking-tighter text-xl" style={{ color: navStyle.text }}>
        {websiteData?.name || 'Leadsmind'}
       </div>
       <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
         {websiteLinks.map((link: any, i: number) => (
          <a
           key={i}
           href={resolveNavLink(link.href)}
           className="text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
           style={{ color: navStyle.text }}
          >
           {link.label}
          </a>
         ))}
        </div>
        {navStyle.ctaText && (
         <a
          href={resolveNavLink(navStyle.ctaLink || '#')}
          className="px-5 py-2 text-sm font-bold rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: navStyle.ctaBg || '#6c47ff', color: navStyle.ctaColor || '#ffffff' }}
         >
          {navStyle.ctaText}
         </a>
        )}
       </div>
      </div>
     </nav>
    )}

    <div className="flex-1 min-h-[500px] w-full">
     <Editor
      resolver={RESOLVER}
      enabled={false}
     >
      <Frame data={validContent} />
     </Editor>
    </div>

    {hasFooter && (
     <footer
      className={`w-full mt-auto py-16 ${footerStyle.border ? 'border-t border-black/10' : ''}`}
      style={{ backgroundColor: footerStyle.bg }}
     >
      <div className={`max-w-7xl mx-auto px-4 flex flex-col gap-8 ${footerStyle.layout === 'center' ? 'items-center text-center' : 'md:flex-row items-start justify-between'}`}>
       <div className="flex flex-col gap-3 max-w-sm">
        <div className="font-black tracking-tighter text-2xl" style={{ color: footerStyle.text }}>
         {websiteData?.name || 'Leadsmind'}
        </div>
        {footerStyle.tagline && (
         <p className="text-sm opacity-80 leading-relaxed" style={{ color: footerStyle.text }}>
          {footerStyle.tagline}
         </p>
        )}
        <div className="text-sm font-medium mt-2 opacity-60" style={{ color: footerStyle.text }}>
         © {new Date().getFullYear()} {websiteData?.name || 'Leadsmind'}. All rights reserved.
        </div>
       </div>
       <div className="flex items-center gap-6 flex-wrap">
        {footerLinks.map((link: any, i: number) => (
         <a
          key={i}
          href={resolveNavLink(link.href)}
          className="text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
          style={{ color: footerStyle.text }}
         >
          {link.label}
         </a>
        ))}
       </div>
      </div>
     </footer>
    )}
   </BuilderProvider>
  </div>
 );
}

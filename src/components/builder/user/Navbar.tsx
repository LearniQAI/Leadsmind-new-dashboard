"use client";

import React, { useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import { Menu, X } from 'lucide-react';
import { NavbarSettings } from './NavbarSettings';
import { useBuilder } from '../BuilderContext';
import { resolveLink } from '@/lib/builder/utils';


export interface NavbarProps {
  logo: string;
  brandName: string;
  links: { label: string, href: string }[];
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

import { useGlobalSync } from '@/lib/builder/hooks';

export const Navbar = ({
  logo,
  brandName,
  links,
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
  const { connectors: { connect, drag } } = useNode();
  const { pages, websiteData } = useBuilder();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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


  useEffect(() => {

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      {...props}
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
        padding: `${padding}px 24px`,
        borderBottom: `${borderBottomWidth}px solid ${borderBottomColor}`
      }}
    >
      <div className={`${fullWidth ? 'w-full px-8' : 'max-w-7xl mx-auto px-4'} flex ${layoutType === 'stacked' ? 'flex-col gap-4' : 'items-center justify-between'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2 cursor-pointer ${layoutType === 'stacked' ? 'justify-center border-b border-white/5 pb-4 w-full' : ''}`}>
          {logo && <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />}
          <span className="font-black tracking-tighter text-xl uppercase">{brandName}</span>
        </div>

        {/* Desktop Links */}
        <div className={`hidden md:flex items-center transition-all ${layoutType === 'split' ? 'gap-12 flex-1 justify-center' : 'gap-8'} ${layoutType === 'stacked' ? 'w-full justify-center' : ''}`}>
          {displayLinks.map((link: { label: string, href: string }, i: number) => (
            <a
              key={i}
              href={resolveLink(link.href, { basePath })}
              className="transition-all duration-300 uppercase tracking-widest font-bold"
              style={{
                fontSize: `${fontSize}px`,
                fontWeight: fontWeight,
                color: 'inherit'
              }}
              onMouseOver={(e: any) => e.target.style.color = linkHoverColor}
              onMouseOut={(e: any) => e.target.style.color = 'inherit'}
            >
              {link.label}
            </a>
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
          <div className="hidden md:block">
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
          className="md:hidden p-2"
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
          {displayLinks.map((link: { label: string, href: string }, i: number) => (
            <a key={i} href={resolveLink(link.href, { basePath })} className="text-sm font-black uppercase tracking-widest">{link.label}</a>
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
    </nav>
  );
};


Navbar.craft = {
  displayName: 'Global Navbar',
  props: {
    logo: 'https://vjltxstiwsqisuvvthvt.supabase.co/storage/v1/object/public/leadsmind-assets//leadsmind_logo_white.png',
    brandName: 'Leadsmind',
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

"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { FooterSettings } from './FooterSettings';
import { useBuilder } from '../BuilderContext';
import { useGlobalSync } from '@/lib/builder/hooks';

export interface FooterProps {
  brandName: string;
  description: string;
  columns: { title: string, links: { label: string, href: string }[] }[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  padding: number;
  fullWidth: boolean;
  socialLinks: { platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram', url: string }[];
  columnsCount: number;
  showSocial: boolean;
  borderTopWidth: number;
  borderTopColor: string;
  titleFontSize: number;
  linkFontSize: number;
  titleFontWeight: string;
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterDescription: string;
  isGlobal?: boolean;
  globalId?: string;
}


export const Footer = ({
  brandName,
  description,
  columns,
  backgroundColor,
  textColor,
  accentColor,
  padding,
  fullWidth,
  socialLinks,
  columnsCount,
  showSocial,
  borderTopWidth,
  borderTopColor,
  titleFontSize,
  linkFontSize,
  titleFontWeight,
  showNewsletter: activeNewsletterToggle,
  newsletterTitle,
  newsletterDescription,
  isGlobal,
  globalId,
  dragRef,
  ...props
}: FooterProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  const { websiteData } = useBuilder();

  // Sync props to global config if enabled
  useGlobalSync(!!isGlobal, globalId || 'main_footer', {
    brandName, description, columns, backgroundColor, textColor, accentColor,
    padding, fullWidth, socialLinks, columnsCount, showSocial,
    borderTopWidth, borderTopColor, titleFontSize, linkFontSize, titleFontWeight,
    showNewsletter: activeNewsletterToggle, newsletterTitle, newsletterDescription
  });


  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
      case 'linkedin': return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" /></svg>;
      case 'facebook': return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
      case 'instagram': return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.166.422.36 1.057.415 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.055 1.17-.249 1.805-.415 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.166-1.057.36-2.227.415-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.055-1.805-.249-2.227-.415-.562-.217-.96-.477-1.382-.896-.42-.419-.819-.679-1.381.896-.422.166-1.057.36-2.227.415-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.055-1.805-.249-2.227-.415-.562-.217-.96-.477-1.382-.896-.42-.419-.819-.679-1.381.896-.422-.166 1.057-.36 2.227-.415 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.277.058-2.15.258-2.914.557-.79.306-1.458.716-2.126 1.384-.668.668-1.078 1.336-1.384 2.126-.299.764-.499 1.637-.557 2.914C.014 8.333 0 8.741 0 12c0 3.259.014 3.667.072 4.947.058 1.277.258 2.15.557 2.914.306.79.716 1.458 1.384 2.126.668.668 1.336 1.078 2.126 1.384.764.299 1.637.499 2.914.557 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.277-.058 2.15-.258 2.914-.557.79-.306 1.458-.716 2.126-1.384.668-.668 1.336 1.078 2.126 1.384.764.299 1.637.499 2.914.557.128.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.277-.058 2.15-.258 2.914-.557.79-.306 1.458-.716 2.126-1.384.668-.668 1.336-1.078 2.126-1.384.764-.299 1.637-.499-2.914-.557C15.667.014 15.259 0 12 0z" /></svg>;
      default: return null;
    }
  };

  return (
    <footer
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
      className="w-full flex flex-col transition-all duration-300"
      style={{
        backgroundColor,
        color: textColor,
        padding: `${padding}px 24px`,
        borderTop: `${borderTopWidth}px solid ${borderTopColor}`
      }}
    >
      <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columnsCount + 1 + (activeNewsletterToggle ? 1 : 0)} gap-12`}>
        {/* Brand Info */}
        <div className="space-y-6">
          <h2 className="font-black text-2xl uppercase tracking-tighter" style={{ color: accentColor }}>{brandName}</h2>
          <p className="text-sm opacity-60 leading-relaxed max-w-xs">{description}</p>
        </div>

        {/* Dynamic Columns */}
        {columns.map((col: { title: string, links: { label: string, href: string }[] }, i: number) => (
          <div key={i} className="flex flex-col gap-6">
            <h4
              className="uppercase tracking-[0.2em] mb-2"
              style={{
                color: accentColor,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleFontWeight
              }}
            >
              {col.title}
            </h4>
            <ul className="flex flex-col gap-3">
              {col.links.map((link: { label: string, href: string }, j: number) => (
                <li key={j}>
                  <a
                    href={link.href}
                    className="opacity-60 hover:opacity-100 transition-opacity text-inherit"
                    style={{ fontSize: `${linkFontSize}px` }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
          
        {/* Newsletter Column */}
        {activeNewsletterToggle === true && (
          <div className="flex flex-col gap-6 lg:min-w-[300px]">
            <h4
              className="uppercase tracking-[0.2em] mb-2"
              style={{
                color: accentColor,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleFontWeight
              }}
            >
              {newsletterTitle}
            </h4>
            <p className="text-sm opacity-60 leading-relaxed mb-2">{newsletterDescription}</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs flex-1 outline-none focus:border-primary/50 transition-colors"
              />
              <button
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: accentColor, color: textColor }}
              >
                Join
              </button>
            </div>
          </div>
        )}
      </div>

      {(showSocial && socialLinks.length > 0) && (
        <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} w-full mt-12 flex gap-6 pt-12 border-t border-white/5`}>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 self-center">Follow Us</span>
          <div className="flex gap-4">
            {socialLinks.map((social: { platform: string, url: string }, i: number) => (
              <a key={i} href={social.url} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-primary/10 hover:text-primary transition-all border border-white/5 hover:border-primary/30">
                {getSocialIcon(social.platform)}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest opacity-40">
        <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
        <div className="flex gap-8">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

Footer.craft = {
  displayName: 'Global Footer',
  props: {
    brandName: 'Leadsmind',
    description: 'Empowering businesses with intelligent automation and high-conversion sales funnels that work 24/7.',
    columns: [
      {
        title: 'Platform',
        links: [
          { label: 'Builder', href: '#' },
          { label: 'Solutions', href: '#' },
          { label: 'Pricing', href: '#' }
        ]
      },
      {
        title: 'Company',
        links: [
          { label: 'About Us', href: '#' },
          { label: 'Careers', href: '#' },
          { label: 'Contact', href: '#' }
        ]
      },
    ],
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#6c47ff',
    padding: 80,
    fullWidth: false,
    columnsCount: 2,
    showSocial: true,
    socialLinks: [
      { platform: 'twitter', url: '#' },
      { platform: 'linkedin', url: '#' },
      { platform: 'facebook', url: '#' },
      { platform: 'instagram', url: '#' }
    ],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    titleFontSize: 12,
    linkFontSize: 14,
    titleFontWeight: '900',
    showNewsletter: true,
    newsletterTitle: 'Join the inner circle',
    newsletterDescription: 'Get the latest conversion strategies and funnel templates delivered for free.',
  },
  related: {
    settings: FooterSettings,
  },
};

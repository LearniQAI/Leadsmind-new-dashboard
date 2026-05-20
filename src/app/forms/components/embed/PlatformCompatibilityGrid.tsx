'use client';

import React from 'react';
import { Layers, Globe, Store, Compass, Laptop, Code } from 'lucide-react';

interface Platform {
  name: string;
  category: string;
  icon: React.ReactNode;
  brandColor: string;
  hoverGlow: string;
  iconColor: string;
}

export function PlatformCompatibilityGrid() {
  const platforms: Platform[] = [
    {
      name: 'WordPress',
      category: 'CMS / Plugin',
      icon: <Globe size={14} />,
      brandColor: 'group-hover:text-[#21759b]',
      hoverGlow: 'group-hover:border-[#21759b]/30 group-hover:bg-[#21759b]/5 shadow-[#21759b]/5',
      iconColor: 'bg-[#21759b]/10 text-[#21759b]',
    },
    {
      name: 'Webflow',
      category: 'Visual Design',
      icon: <Layers size={14} />,
      brandColor: 'group-hover:text-[#4353ff]',
      hoverGlow: 'group-hover:border-[#4353ff]/30 group-hover:bg-[#4353ff]/5 shadow-[#4353ff]/5',
      iconColor: 'bg-[#4353ff]/10 text-[#4353ff]',
    },
    {
      name: 'Shopify',
      category: 'E-Commerce',
      icon: <Store size={14} />,
      brandColor: 'group-hover:text-[#96bf48]',
      hoverGlow: 'group-hover:border-[#96bf48]/30 group-hover:bg-[#96bf48]/5 shadow-[#96bf48]/5',
      iconColor: 'bg-[#96bf48]/10 text-[#96bf48]',
    },
    {
      name: 'Wix',
      category: 'Website Builder',
      icon: <Laptop size={14} />,
      brandColor: 'group-hover:text-[#f59e0b]',
      hoverGlow: 'group-hover:border-[#f59e0b]/30 group-hover:bg-[#f59e0b]/5 shadow-[#f59e0b]/5',
      iconColor: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    },
    {
      name: 'Squarespace',
      category: 'Page Builder',
      icon: <Compass size={14} />,
      brandColor: 'group-hover:text-[#a78bfa]',
      hoverGlow: 'group-hover:border-[#a78bfa]/30 group-hover:bg-[#a78bfa]/5 shadow-[#a78bfa]/5',
      iconColor: 'bg-[#a78bfa]/10 text-[#a78bfa]',
    },
    {
      name: 'Plain HTML',
      category: 'Static / Custom',
      icon: <Code size={14} />,
      brandColor: 'group-hover:text-[#10b981]',
      hoverGlow: 'group-hover:border-[#10b981]/30 group-hover:bg-[#10b981]/5 shadow-[#10b981]/5',
      iconColor: 'bg-[#10b981]/10 text-[#10b981]',
    },
  ];

  return (
    <div className="p-5 bg-gradient-to-br from-[#0c1535]/80 to-[#080f28]/90 border border-white/10 rounded-2xl relative overflow-hidden">
      {/* Subtle background overlay */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      <div className="mb-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3c8] font-display mb-1">
          Battle-Tested Platform Integration
        </h4>
        <p className="text-[10.5px] text-[#4a5a82] font-sans">
          Guaranteed styling compatibility and secure rendering across all major platforms.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className={`flex items-center gap-3 px-3.5 py-3 bg-white/[0.02] border border-white/5 rounded-xl transition-all duration-300 group cursor-default hover:-translate-y-0.5 hover:shadow-lg ${platform.hoverGlow}`}
          >
            {/* Brand Colored Icon Container */}
            <div className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${platform.iconColor} group-hover:scale-105`}>
              {platform.icon}
            </div>
            
            <div className="min-w-0">
              <p className={`text-xs font-bold text-[#eef2ff] font-display truncate transition-colors duration-300 ${platform.brandColor}`}>
                {platform.name}
              </p>
              <p className="text-[9px] text-[#4a5a82] font-sans font-medium uppercase tracking-wider truncate">
                {platform.category}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

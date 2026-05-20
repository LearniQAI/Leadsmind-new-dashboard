'use client';

import React from 'react';
import { Layers, Globe, Store, Compass, Laptop, Code } from 'lucide-react';

interface Platform {
  name: string;
  category: string;
  icon: React.ReactNode;
  brandColor: string;
  hoverGlow: string;
  activeBorder: string;
  iconColor: string;
}

interface PlatformCompatibilityGridProps {
  selectedPlatform: string | null;
  onSelectPlatform: (name: string) => void;
}

export function PlatformCompatibilityGrid({
  selectedPlatform,
  onSelectPlatform,
}: PlatformCompatibilityGridProps) {
  const platforms: Platform[] = [
    {
      name: 'WordPress',
      category: 'CMS / Plugin',
      icon: <Globe size={14} />,
      brandColor: 'group-hover:text-[#21759b]',
      hoverGlow: 'hover:border-[#21759b]/40 hover:bg-[#21759b]/5 shadow-[#21759b]/5',
      activeBorder: 'border-[#21759b] bg-[#21759b]/10 shadow-[0_0_15px_rgba(33,117,155,0.15)]',
      iconColor: 'bg-[#21759b]/10 text-[#21759b]',
    },
    {
      name: 'Webflow',
      category: 'Visual Design',
      icon: <Layers size={14} />,
      brandColor: 'group-hover:text-[#4353ff]',
      hoverGlow: 'hover:border-[#4353ff]/40 hover:bg-[#4353ff]/5 shadow-[#4353ff]/5',
      activeBorder: 'border-[#4353ff] bg-[#4353ff]/10 shadow-[0_0_15px_rgba(67,83,255,0.15)]',
      iconColor: 'bg-[#4353ff]/10 text-[#4353ff]',
    },
    {
      name: 'Shopify',
      category: 'E-Commerce',
      icon: <Store size={14} />,
      brandColor: 'group-hover:text-[#96bf48]',
      hoverGlow: 'hover:border-[#96bf48]/40 hover:bg-[#96bf48]/5 shadow-[#96bf48]/5',
      activeBorder: 'border-[#96bf48] bg-[#96bf48]/10 shadow-[0_0_15px_rgba(150,191,72,0.15)]',
      iconColor: 'bg-[#96bf48]/10 text-[#96bf48]',
    },
    {
      name: 'Wix',
      category: 'Website Builder',
      icon: <Laptop size={14} />,
      brandColor: 'group-hover:text-[#f59e0b]',
      hoverGlow: 'hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/5 shadow-[#f59e0b]/5',
      activeBorder: 'border-[#f59e0b] bg-[#f59e0b]/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      iconColor: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    },
    {
      name: 'Squarespace',
      category: 'Page Builder',
      icon: <Compass size={14} />,
      brandColor: 'group-hover:text-[#a78bfa]',
      hoverGlow: 'hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/5 shadow-[#a78bfa]/5',
      activeBorder: 'border-[#a78bfa] bg-[#a78bfa]/10 shadow-[0_0_15px_rgba(167,139,250,0.15)]',
      iconColor: 'bg-[#a78bfa]/10 text-[#a78bfa]',
    },
    {
      name: 'Plain HTML',
      category: 'Static / Custom',
      icon: <Code size={14} />,
      brandColor: 'group-hover:text-[#10b981]',
      hoverGlow: 'hover:border-[#10b981]/40 hover:bg-[#10b981]/5 shadow-[#10b981]/5',
      activeBorder: 'border-[#10b981] bg-[#10b981]/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
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
          Click on any platform to automatically select the recommended embed method and view setup tips.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {platforms.map((platform) => {
          const isActive = selectedPlatform === platform.name;
          return (
            <button
              key={platform.name}
              onClick={() => onSelectPlatform(platform.name)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-lg text-left ${
                isActive 
                  ? platform.activeBorder 
                  : `bg-white/[0.02] border border-white/5 ${platform.hoverGlow}`
              }`}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

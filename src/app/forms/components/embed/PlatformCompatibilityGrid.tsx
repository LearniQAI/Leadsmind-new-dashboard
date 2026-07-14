'use client';

import React from 'react';
import { Layers, Globe, Store, Compass, Laptop, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      hoverGlow: 'hover:border-[#21759b]/40 hover:bg-[#21759b]/5',
      activeBorder: 'border-[#21759b] bg-[#21759b]/10',
      iconColor: 'bg-[#21759b]/10 text-[#21759b]',
    },
    {
      name: 'Webflow',
      category: 'Visual Design',
      icon: <Layers size={14} />,
      brandColor: 'group-hover:text-[#4353ff]',
      hoverGlow: 'hover:border-[#4353ff]/40 hover:bg-[#4353ff]/5',
      activeBorder: 'border-[#4353ff] bg-[#4353ff]/10',
      iconColor: 'bg-[#4353ff]/10 text-[#4353ff]',
    },
    {
      name: 'Shopify',
      category: 'E-Commerce',
      icon: <Store size={14} />,
      brandColor: 'group-hover:text-[#96bf48]',
      hoverGlow: 'hover:border-[#96bf48]/40 hover:bg-[#96bf48]/5',
      activeBorder: 'border-[#96bf48] bg-[#96bf48]/10',
      iconColor: 'bg-[#96bf48]/10 text-[#96bf48]',
    },
    {
      name: 'Wix',
      category: 'Website Builder',
      icon: <Laptop size={14} />,
      brandColor: 'group-hover:text-[#f59e0b]',
      hoverGlow: 'hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/5',
      activeBorder: 'border-[#f59e0b] bg-[#f59e0b]/10',
      iconColor: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    },
    {
      name: 'Squarespace',
      category: 'Page Builder',
      icon: <Compass size={14} />,
      brandColor: 'group-hover:text-[#a78bfa]',
      hoverGlow: 'hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/5',
      activeBorder: 'border-[#a78bfa] bg-[#a78bfa]/10',
      iconColor: 'bg-[#a78bfa]/10 text-[#a78bfa]',
    },
    {
      name: 'Plain HTML',
      category: 'Static / Custom',
      icon: <Code size={14} />,
      brandColor: 'group-hover:text-[#10b981]',
      hoverGlow: 'hover:border-[#10b981]/40 hover:bg-[#10b981]/5',
      activeBorder: 'border-[#10b981] bg-[#10b981]/10',
      iconColor: 'bg-[#10b981]/10 text-[#10b981]',
    },
  ];

  return (
    <div className="p-5 bg-dash-surface border border-dash-border rounded-2xl">
      <div className="mb-4">
        <h4 className="text-[11px] font-bold !text-dash-textMuted mb-1">
          Platform integration
        </h4>
        <p className="text-[11px] !text-dash-textMuted">
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
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors motion-reduce:transition-none group text-left border",
                isActive
                  ? platform.activeBorder
                  : cn("bg-white border-dash-border", platform.hoverGlow)
              )}
            >
              <div className={cn("p-2 rounded-lg flex items-center justify-center", platform.iconColor)}>
                {platform.icon}
              </div>

              <div className="min-w-0">
                <p className={cn("text-xs font-bold !text-dash-text truncate transition-colors motion-reduce:transition-none", platform.brandColor)}>
                  {platform.name}
                </p>
                <p className="text-[9px] !text-dash-textMuted font-medium truncate">
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

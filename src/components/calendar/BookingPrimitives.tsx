import React from 'react';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
 children: React.ReactNode;
 className?: string;
 withGlow?: boolean;
 glowColor?: string;
}

export function GlassContainer({
 children,
 className,
 withGlow = true,
 glowColor = '#1359FF'
}: GlassContainerProps) {
 return (
  <div className={cn(
   "bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden group transition-all duration-500 motion-reduce:transition-none",
   className
  )}>
   {/* Dynamic Glow Effect - subtle accent */}
   {withGlow && (
    <div
     className="absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000 motion-reduce:transition-none rounded-full"
     style={{ backgroundColor: glowColor }}
    />
   )}

   <div className="relative z-10">
    {children}
   </div>
  </div>
 );
}

interface SectionLabelProps {
 label: string;
 title: string;
 description?: string;
 badge?: React.ReactNode;
}

export function SectionLabel({ label, title, description, badge }: SectionLabelProps) {
 return (
  <div className="flex flex-col gap-1 mb-[20px]">
   <div className="flex items-center gap-2 mb-1">
     <div className="h-1.5 w-1.5 rounded-full bg-dash-accent" />
     <span className="text-[10px] font-bold !text-dash-textMuted">{label}</span>
   </div>
   <div className="flex items-center justify-between gap-4">
    <h5 className="text-lg font-bold !text-dash-text mb-0">
     {title}
    </h5>
    {badge}
   </div>
   {description && <p className="!text-dash-textMuted text-xs font-medium mt-3 leading-relaxed">{description}</p>}
  </div>
 );
}

export function PremiumSection({
 children,
 label,
 title,
 description,
 badge,
 className,
 accentColor = "#1359FF"
}: SectionLabelProps & { children: React.ReactNode; className?: string; accentColor?: string }) {
 return (
  <section className={cn(
   "bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden",
   className
  )}>
   {/* Subtle Ambient Glow */}
   <div
    className="absolute top-0 right-0 w-[300px] h-[300px] blur-[100px] opacity-[0.05] pointer-events-none rounded-full"
    style={{ backgroundColor: accentColor }}
   />

   <div className="relative z-10">
    <SectionLabel label={label} title={title} description={description} badge={badge} />
    {children}
   </div>
  </section>
 );
}

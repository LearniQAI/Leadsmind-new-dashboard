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
 glowColor = 'var(--primary)' 
}: GlassContainerProps) {
 return (
  <div className={cn(
   "card__wrapper relative overflow-hidden group transition-all duration-500",
   className
  )}>
   {/* Dynamic Glow Effect - subtle to match Manez */}
   {withGlow && (
    <div 
     className="absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000 rounded-full"
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
  <div className="card__title-wrap flex flex-col gap-1 mb-[20px]">
   <div className="flex items-center gap-2 mb-1">
     <div className="h-1.5 w-1.5 rounded-full bg-primary" />
     <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{label}</span>
   </div>
   <div className="flex items-center justify-between gap-4">
    <h5 className="card__heading-title mb-0 uppercase">
     {title}
    </h5>
    {badge}
   </div>
   {description && <p className="card__desc style_two text-xs font-medium mt-3 leading-relaxed">{description}</p>}
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
 accentColor = "var(--primary)"
}: SectionLabelProps & { children: React.ReactNode; className?: string; accentColor?: string }) {
 return (
  <section className={cn(
   "card__wrapper relative overflow-hidden",
   className
  )}>
   {/* Subtle Ambient Glow to match Manez premium pages */}
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

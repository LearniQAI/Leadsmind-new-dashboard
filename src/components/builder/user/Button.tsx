"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Button as ShadcnButton } from '@/components/ui/button';
import * as LucideIcons from 'lucide-react';
import { resolveLink } from '@/lib/builder/utils';
import { useBuilder } from '../BuilderContext';



export interface ButtonProps {
 text: string;
 size: 'sm' | 'md' | 'lg' | 'xl';
 variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
 color: string;
 textColor: string;
 borderRadius: number;
 width: 'fit' | 'full';
 link: string | { type: string, value: string };
 icon?: string;
 iconPosition: 'left' | 'right';
}

export const UserButton = (allProps: ButtonProps & any) => {
  const { 
    text, 
    size, 
    variant, 
    color, 
    textColor, 
    borderRadius, 
    width, 
    link, 
    icon, 
    iconPosition,
    dragRef,
    ...props 
  } = allProps;
 const { connectors: { connect, drag } } = useNode();
 const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
 const { websiteData } = useBuilder();
 const [loading, setLoading] = React.useState(false);
 
 const basePath = (websiteData?.workspaceSlug && websiteData?.subdomain) 
  ? `/p/${websiteData.workspaceSlug}/${websiteData.subdomain}` 
  : '';

 const IconComponent = icon ? (LucideIcons as any)[icon] : null;


 const sizeClasses = {
   sm: 'px-3 py-1.5 text-xs',
   md: 'px-5 py-2.5 text-sm',
   lg: 'px-8 py-4 text-base font-bold',
   xl: 'px-10 py-5 text-lg font-black uppercase tracking-tighter',
 };

 const getAction = () => {
  if (typeof link === 'object' && link.type === 'action') return (link as any).value;
  return undefined;
 };

 const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
   if (enabled) {
     e.preventDefault();
     return;
   }

   const actionValue = getAction();
   if (!actionValue) return;

   if (
     actionValue.startsWith('enroll_course:') ||
     actionValue.startsWith('enroll_bundle:') ||
     actionValue.startsWith('open_player:') ||
     actionValue.startsWith('deep_link:') ||
     actionValue.startsWith('start_trial:') ||
     actionValue.startsWith('book_lesson') ||
     actionValue.startsWith('go_checkout:')
   ) {
     e.preventDefault();
     setLoading(true);

     const parts = actionValue.split(':');
     const actionType = parts[0];
     const courseId = parts[1] || '';
     const bundleId = parts[1] || '';
     const lessonId = parts[2] || '';

     try {
       const workspaceId = websiteData?.workspace_id || '';
       if (!workspaceId) {
         console.error('[Button Action] Missing workspaceId');
         setLoading(false);
         return;
       }

       const res = await fetch('/api/automation/button-action', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           action: actionType,
           courseId,
           bundleId,
           workspaceId,
           lessonId
         })
       });

       const data = await res.json();
       if (data.error) {
         alert(`Error: ${data.error}`);
       } else {
         if (data.redirectUrl) {
           window.location.href = data.redirectUrl;
         }
       }
     } catch (err: any) {
       console.error('[Button Action] Execution error:', err);
       alert(`Error executing action: ${err.message}`);
     } finally {
       setLoading(false);
     }
   }
 };

 return (
  <div
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
   className={`inline-block ${width === 'full' ? 'w-full' : 'w-fit'} outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all`}
  >
   <a 
    href={resolveLink(link, { basePath })} 
    data-action={getAction()}
    onClick={handleClick}
    className="block no-underline"
   >
    <ShadcnButton
      disabled={loading}
      className={`w-full transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group ${sizeClasses[(size || 'md') as keyof typeof sizeClasses]}`}
      style={{
        borderRadius: `${borderRadius}px`,
        backgroundColor: color || undefined,
        color: textColor || undefined,
        border: variant === 'outline' ? `2px solid ${color}` : undefined,
      }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <LucideIcons.Loader2 className="animate-spin h-4 w-4" />
          Processing...
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && <IconComponent size={size === 'xl' ? 24 : 18} />}
          {text}
          {icon && iconPosition === 'right' && <IconComponent size={size === 'xl' ? 24 : 18} className="group-hover:translate-x-1 transition-transform" />}
        </>
      )}
    </ShadcnButton>
   </a>
  </div>
 );
};

import { ButtonSettings } from './ButtonSettings';

UserButton.craft = {
 displayName: 'Button',
 props: {
  text: 'Click Here',
  size: 'md',
  variant: 'primary',
  color: '#6c47ff',
  textColor: '#ffffff',
  borderRadius: 8,
  width: 'fit',
  link: '#',
  iconPosition: 'right',
 },
 related: {
  settings: ButtonSettings,
 },
 rules: {
  canDrag: () => true,
 },
};

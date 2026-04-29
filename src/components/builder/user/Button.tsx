"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
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
  const { websiteData } = useBuilder();
  
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

  const isCustomColor = variant === 'primary';

  const getAction = () => {
    if (typeof link === 'object' && link.type === 'action') return (link as any).value;
    return undefined;
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
        className="block no-underline"
      >
        <ShadcnButton
            className={`w-full transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group ${sizeClasses[(size || 'md') as keyof typeof sizeClasses]}`}
            style={{
                borderRadius: `${borderRadius}px`,
                backgroundColor: isCustomColor ? color : undefined,
                color: isCustomColor ? textColor : undefined,
                border: variant === 'outline' ? `2px solid ${color}` : undefined,
            }}
        >
            {icon && iconPosition === 'left' && <IconComponent size={size === 'xl' ? 24 : 18} />}
            {text}
            {icon && iconPosition === 'right' && <IconComponent size={size === 'xl' ? 24 : 18} className="group-hover:translate-x-1 transition-transform" />}
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

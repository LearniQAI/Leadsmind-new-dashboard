"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ContainerSettings } from './ContainerSettings';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { formatPseudoClasses } from '@/lib/builder/utils';

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export interface ContainerProps {
 layoutType: 'fluid' | 'fixed';
 maxWidth: string;
 backgroundColor: string;
 padding: number;
 children?: React.ReactNode;
}

const getResponsiveStyles = (id: string, props: any) => {
  const getVal = (propName: string, device: 'desktop' | 'tablet' | 'mobile') => {
    if (device === 'mobile') return props[`${propName}_mobile`] ?? props[`${propName}_tablet`] ?? props[propName];
    if (device === 'tablet') return props[`${propName}_tablet`] ?? props[propName];
    return props[propName];
  };

  const getStyleRules = (device: 'desktop' | 'tablet' | 'mobile') => {
    let rules = '';

    const display = getVal('display', device);
    if (display) rules += `display: ${display};`;

    if (display === 'flex') {
      const flexDirection = getVal('flexDirection', device);
      const justifyContent = getVal('justifyContent', device);
      const alignItems = getVal('alignItems', device);
      const gap = getVal('gap', device);
      if (flexDirection) rules += `flex-direction: ${flexDirection};`;
      if (justifyContent) rules += `justify-content: ${justifyContent};`;
      if (alignItems) rules += `align-items: ${alignItems};`;
      if (gap) rules += `gap: ${gap};`;
    } else if (display === 'grid') {
      const gap = getVal('gap', device);
      if (gap) rules += `gap: ${gap};`;
    }

    // Box Model (Margin & Padding)
    const mt = getVal('marginTop', device);
    const mr = getVal('marginRight', device);
    const mb = getVal('marginBottom', device);
    const ml = getVal('marginLeft', device);
    if (mt) rules += `margin-top: ${mt};`;
    if (mr) rules += `margin-right: ${mr};`;
    if (mb) rules += `margin-bottom: ${mb};`;
    if (ml) rules += `margin-left: ${ml};`;

    const pt = getVal('paddingTop', device);
    const pr = getVal('paddingRight', device);
    const pb = getVal('paddingBottom', device);
    const pl = getVal('paddingLeft', device);
    if (pt) rules += `padding-top: ${pt};`;
    if (pr) rules += `padding-right: ${pr};`;
    if (pb) rules += `padding-bottom: ${pb};`;
    if (pl) rules += `padding-left: ${pl};`;

    // Typography
    const fontFamily = getVal('fontFamily', device);
    const fontSize = getVal('fontSize', device);
    const fontWeight = getVal('fontWeight', device);
    const textAlign = getVal('textAlign', device);
    const lineHeight = getVal('lineHeight', device);
    const letterSpacing = getVal('letterSpacing', device);
    const color = getVal('color', device);

    if (fontFamily) rules += `font-family: ${fontFamily}, sans-serif;`;
    if (fontSize) rules += `font-size: ${fontSize};`;
    if (fontWeight) {
      const weightMap: any = { normal: '400', medium: '500', semibold: '600', bold: '700', black: '900' };
      rules += `font-weight: ${weightMap[fontWeight] ?? fontWeight};`;
    }
    if (textAlign) rules += `text-align: ${textAlign};`;
    if (lineHeight) rules += `line-height: ${lineHeight};`;
    if (letterSpacing) rules += `letter-spacing: ${letterSpacing};`;
    if (color) rules += `color: ${color};`;

    // Background & Borders
    const bgGradient = getVal('backgroundGradient', device);
    if (bgGradient) {
      const gColor1 = getVal('gradientColor1', device) || '#2563eb';
      const gColor2 = getVal('gradientColor2', device) || '#7c3aed';
      const gAngle = getVal('gradientAngle', device) || '90';
      rules += `background: linear-gradient(${gAngle}deg, ${gColor1}, ${gColor2});`;
    } else {
      const bgColor = getVal('backgroundColor', device);
      if (bgColor) rules += `background-color: ${bgColor};`;
    }

    const bStyle = getVal('borderStyle', device);
    const bWidth = getVal('borderWidth', device);
    const bColor = getVal('borderColor', device);
    if (bStyle) rules += `border-style: ${bStyle};`;
    if (bWidth) rules += `border-width: ${bWidth};`;
    if (bColor) rules += `border-color: ${bColor};`;

    const bRadiusIndiv = getVal('borderRadiusIndividual', device);
    if (bRadiusIndiv) {
      const btlr = getVal('borderTopLeftRadius', device);
      const btrr = getVal('borderTopRightRadius', device);
      const bbrr = getVal('borderBottomRightRadius', device);
      const bblr = getVal('borderBottomLeftRadius', device);
      if (btlr) rules += `border-top-left-radius: ${btlr};`;
      if (btrr) rules += `border-top-right-radius: ${btrr};`;
      if (bbrr) rules += `border-bottom-right-radius: ${bbrr};`;
      if (bblr) rules += `border-bottom-left-radius: ${bblr};`;
    } else {
      const bRadius = getVal('borderRadius', device);
      if (bRadius) rules += `border-radius: ${bRadius};`;
    }

    // Shadow Preset
    const bShadow = getVal('boxShadow', device);
    if (bShadow && bShadow !== 'none') {
      const shadowMap: any = {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      };
      if (shadowMap[bShadow]) rules += `box-shadow: ${shadowMap[bShadow]};`;
    } else if (bShadow === 'none') {
      rules += `box-shadow: none;`;
    }

    return rules;
  };

  const cleanId = id.replace(/[^a-zA-Z0-9-]/g, '_');
  return `
    .node-${cleanId} {
      ${getStyleRules('desktop')}
    }
    @media (max-width: 1024px) {
      .node-${cleanId} {
        ${getStyleRules('tablet')}
      }
    }
    @media (max-width: 768px) {
      .node-${cleanId} {
        ${getStyleRules('mobile')}
      }
    }
  `;
};

export const Container = (allProps: ContainerProps & any) => {
  const { 
    layoutType: _layoutType,
    backgroundColor,
    padding: _p,
    children, 
    canvas, 
    isCanvas,
    dragRef,
    ...props 
  } = allProps;
  
  const { id, connectors: { connect, drag } } = useNode();
  
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

  // Responsive values & Root overrides
  const isRoot = id === 'ROOT';
  const responsivePadding = useResponsiveValue(allProps, 'padding', 16);
  const responsiveLayoutType = useResponsiveValue(allProps, 'layoutType', 'fixed');
  const responsiveMaxWidth = useResponsiveValue(allProps, 'maxWidth', '1200px');

  const padding = isRoot ? 0 : responsivePadding;
  const layoutType = isRoot ? 'fluid' : responsiveLayoutType;
  const maxWidth = isRoot ? '100%' : responsiveMaxWidth;
  
  const cleanId = id.replace(/[^a-zA-Z0-9-]/g, '_');
  const cssRules = getResponsiveStyles(cleanId, allProps);

  let cleanClassName = props.className;
  if (isRoot && props.className) {
    cleanClassName = props.className.replace(/\bbg-\S+/g, '').trim();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssRules }} />
      <div
        {...props}
        ref={(el) => {
          if (el) {
            connect(el);
            drag(el);
            if (dragRef) {
              if (typeof dragRef === 'function') dragRef(el);
              else dragRef.current = el;
            }
          }
        }}
        className={cn(
          "transition-all duration-200",
          enabled && "outline-dashed outline-1 outline-transparent hover:outline-black/10",
          layoutType === 'fixed' ? "mx-auto" : "w-full",
          `node-${cleanId}`,
          formatPseudoClasses(allProps.customClasses, allProps.hoverClasses, allProps.focusClasses),
          cleanClassName
        )}
        style={{
          maxWidth: layoutType === 'fixed' ? maxWidth : '100%',
          padding: _p !== undefined && !allProps.paddingTop && !allProps.paddingRight && !allProps.paddingBottom && !allProps.paddingLeft ? `${padding}px` : undefined,
          backgroundColor: isRoot ? 'var(--theme-bg)' : (!allProps.backgroundGradient && backgroundColor && !allProps.backgroundColor ? backgroundColor : undefined),
        }}
      >
        {React.Children.count(children) === 0 && enabled ? (
          <div className="w-full min-h-[80px] bg-slate-900/5 border border-dashed border-slate-900/10 flex items-center justify-center rounded-xl p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Empty Container</span>
          </div>
        ) : children}
      </div>
    </>
  );
};

Container.craft = {
  displayName: 'Container',
  isCanvas: true,
  props: {
    layoutType: 'fixed',
    maxWidth: '1200px',
    backgroundColor: 'transparent',
    padding: 16,
    display: 'block',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: '',
    marginTop: '',
    marginRight: '',
    marginBottom: '',
    marginLeft: '',
    paddingTop: '',
    paddingRight: '',
    paddingBottom: '',
    paddingLeft: '',
    fontFamily: 'Inter',
    fontSize: '',
    fontWeight: 'normal',
    textAlign: 'left',
    lineHeight: '',
    letterSpacing: '',
    color: '',
    backgroundGradient: false,
    gradientColor1: '#2563eb',
    gradientColor2: '#7c3aed',
    gradientAngle: '90',
    borderWidth: '',
    borderStyle: 'none',
    borderColor: '',
    borderRadius: '',
    borderRadiusIndividual: false,
    borderTopLeftRadius: '',
    borderTopRightRadius: '',
    borderBottomRightRadius: '',
    borderBottomLeftRadius: '',
    boxShadow: 'none',
    customClasses: '',
    hoverClasses: '',
    focusClasses: '',
  },
  related: {
    settings: ContainerSettings,
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
  },
};

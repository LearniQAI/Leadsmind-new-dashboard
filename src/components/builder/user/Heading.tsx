"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { InlineTextEditor } from './InlineTextEditor';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import { HeadingSettings } from './HeadingSettings';
import { replaceMergeTags } from '../../../lib/builder/utils';
import { useResponsiveValue } from '../../../lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { useLessonBuilder } from '../LessonBuilderContext';

export interface HeadingProps {
 text: string;
 level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
 fontWeight: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
 textAlign: 'left' | 'center' | 'right' | 'justify';
 color: string;
 fontSize?: number; // Optional override
 /** Part 2 (Text Element Typography Controls) — real per-element overrides, independent of
  *  the existing `fontWeight` enum/`level` size system above (kept untouched to avoid
  *  breaking either). `fontFamily` is a literal Google Fonts family name; `lineHeight`/
  *  `letterSpacing` are raw px numbers. All three are undefined by default (no visual
  *  change) until a user actually sets one via TypographyControl. */
 fontFamily?: string;
 /** tight/normal/relaxed/loose — same value domain as Paragraph. Applied as a
  *  `leading-*` class on the heading's own text tag (an inherited px value never
  *  reached the text, because that tag hardcodes its own leading). */
 lineHeight?: 'tight' | 'normal' | 'relaxed' | 'loose';
 letterSpacing?: number;
 /** Part 3 typography decision: when true (Lesson Builder templates only — always false/
  *  unset for Website/Funnel Builder usage), applies the active course's real Signal/Ember/
  *  Grove heading font instead of the default system stack. Additive to `className`, not a
  *  replacement — outside the Lesson Builder, useLessonBuilder() resolves to a null theme and
  *  this is a no-op. */
 useThemeFont?: boolean;
}

export const Heading = (allProps: HeadingProps & any) => {
  const { 
   text, 
   level, 
   fontWeight: _fw,
   fontWeight_mobile,
   fontWeight_tablet,
   textAlign: _ta,
   textAlign_mobile,
   textAlign_tablet,
   color: _color, 
   fontSize: _fs,
   fontSize_mobile,
   fontSize_tablet,
   fontFamily: _ff,
   fontFamily_mobile,
   fontFamily_tablet,
   lineHeight: _lh,
   lineHeight_mobile,
   lineHeight_tablet,
   letterSpacing: _ls,
   letterSpacing_mobile,
   letterSpacing_tablet,
   useThemeFont,
   dragRef,
   ...props
  } = allProps;
  const { connectors: { connect, drag }, actions: { setProp } } = useNode();
  const { viewMode } = useBuilder();
  const { theme: lessonTheme } = useLessonBuilder();
  const themeFontClass = useThemeFont && lessonTheme ? lessonTheme.headingFontClass : '';
  const { enabled } = useEditor((state) => ({
   enabled: state.options.enabled
  }));

  const Tag = level;
  const displayText = enabled ? text : sanitizeRichTextHtml(replaceMergeTags(text));

  // Responsive values
  const fontSize = useResponsiveValue(allProps, 'fontSize', undefined);
  const fontWeight = useResponsiveValue(allProps, 'fontWeight', _fw);
  const textAlign = useResponsiveValue(allProps, 'textAlign', _ta);
  const color = useResponsiveValue(allProps, 'color', _color);
  const fontFamily = useResponsiveValue(allProps, 'fontFamily', _ff);
  const lineHeight = useResponsiveValue(allProps, 'lineHeight', _lh);
  const letterSpacing = useResponsiveValue(allProps, 'letterSpacing', _ls);

  // Base scales for sizes based on level if fontSize is not strictly provided
  const baseSizes = {
   h1: 'text-5xl md:text-6xl',
   h2: 'text-4xl md:text-5xl',
   h3: 'text-3xl md:text-4xl',
   h4: 'text-2xl md:text-3xl',
   h5: 'text-xl md:text-2xl',
   h6: 'text-lg md:text-xl',
  };

  const weights = {
   normal: 'font-normal',
   medium: 'font-medium',
   semibold: 'font-semibold',
   bold: 'font-bold',
   black: 'font-black',
  };

  const alignments = {
   left: 'text-left',
   center: 'text-center',
   right: 'text-right',
   justify: 'text-justify',
  };

  const lineHeights = {
   tight: 'leading-tight',
   normal: 'leading-normal',
   relaxed: 'leading-relaxed',
   loose: 'leading-loose',
  };
  const lineHeightClass = lineHeights[lineHeight as keyof typeof lineHeights] || 'leading-tight';

  return (
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
    className={`w-full ${enabled ? 'outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all' : ''} ${!fontSize ? baseSizes[level as keyof typeof baseSizes] : ''} ${weights[fontWeight as keyof typeof weights]} ${alignments[textAlign as keyof typeof alignments]} ${themeFontClass} ${props.className || ''}`}
    style={{
     color,
     fontSize: fontSize ? `${fontSize}px` : undefined,
     fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
     letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
    }}
   >
    {enabled ? (
      <Tag className={`outline-none w-full m-0 p-0 ${lineHeightClass} tracking-tight`} style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
        <InlineTextEditor
          value={text}
          onChange={(val) => setProp((props: any) => { props.text = val; }, 500)}
        />
      </Tag>
    ) : (
     <Tag className={`outline-none w-full m-0 p-0 ${lineHeightClass} tracking-tight`} style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }} dangerouslySetInnerHTML={{ __html: displayText }} />
    )}
   </div>
  );
};

Heading.craft = {
 displayName: 'Heading',
 props: {
  text: 'Heading',
  level: 'h2',
  fontWeight: 'bold',
  textAlign: 'left',
  color: '#111827',
  lineHeight: 'tight',
  // Real bug (AUDIT-THEN-FIX, Bug 1): this used to be a hardcoded 8 — an absurdly small size
  // that's also truthy, so `!fontSize` in Heading's render was NEVER true for a freshly
  // inserted heading, meaning the real per-level baseSizes (h1..h6) below were unreachable and
  // every level rendered identically tiny regardless of which was selected. Left unset here,
  // exactly like fontFamily/lineHeight/letterSpacing already are, so a fresh heading uses its
  // level's real default size until a user explicitly overrides it via the settings panel.
 },
 related: {
  settings: HeadingSettings,
 },
 rules: {
  canDrag: () => true,
 },
};

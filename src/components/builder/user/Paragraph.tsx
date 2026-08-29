"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { InlineTextEditor } from './InlineTextEditor';
import { ParagraphSettings } from './ParagraphSettings';
import { replaceMergeTags } from '@/lib/builder/utils';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { useLessonBuilder } from '../LessonBuilderContext';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';

export interface ParagraphProps {
 text: string;
 fontSize: number;
 textAlign: 'left' | 'center' | 'right' | 'justify';
 color: string;
 lineHeight: 'tight' | 'normal' | 'relaxed' | 'loose';
 /** Part 2 (Text Element Typography Controls) — real per-element overrides, independent of
  *  the enum-based lineHeight above (kept untouched — this is what the "Bulleted list"
  *  checklist items from the Template A/B work already rely on, so it's not disturbed). */
 fontFamily?: string;
 letterSpacing?: number;
 /** Same theme-inheritance mechanism as Heading.tsx — see its comment. */
 useThemeFont?: boolean;
}

export const Paragraph = (allProps: ParagraphProps & any) => {
 const {
  text,
  textAlign: _ta,
  textAlign_mobile,
  textAlign_tablet,
  color: _color,
  lineHeight: _lh,
  lineHeight_mobile,
  lineHeight_tablet,
  fontSize: _fs,
  fontSize_mobile,
  fontSize_tablet,
  fontFamily: _ff,
  fontFamily_mobile,
  fontFamily_tablet,
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
 const themeFontClass = useThemeFont && lessonTheme ? lessonTheme.bodyFontClass : '';
 const { enabled } = useEditor((state) => ({
  enabled: state.options.enabled
 }));

 const displayText = enabled ? text : sanitizeRichTextHtml(replaceMergeTags(text));

 // Responsive values
 const fontSize = useResponsiveValue(allProps, 'fontSize', 16);
 const textAlign = useResponsiveValue(allProps, 'textAlign', _ta);
 const lineHeight = useResponsiveValue(allProps, 'lineHeight', _lh);
 const color = useResponsiveValue(allProps, 'color', _color);
 const fontFamily = useResponsiveValue(allProps, 'fontFamily', _ff);
 const letterSpacing = useResponsiveValue(allProps, 'letterSpacing', _ls);

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
   className={`w-full ${enabled ? 'outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all' : ''} ${alignments[textAlign as keyof typeof alignments]} ${lineHeights[lineHeight as keyof typeof lineHeights]} ${themeFontClass} ${props.className || ''}`}
   style={{
    color,
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
   }}
  >
    {enabled ? (
      <p className="outline-none w-full m-0 p-0" style={{ color: 'inherit', fontSize: 'inherit', textAlign: 'inherit' }}>
        <InlineTextEditor
          value={text}
          onChange={(val) => setProp((props: any) => { props.text = val; }, 500)}
        />
      </p>
   ) : (
    <p style={{ color: 'inherit', margin: 0 }} dangerouslySetInnerHTML={{ __html: displayText }} />
   )}
  </div>
 );
};

Paragraph.craft = {
 displayName: 'Paragraph',
 props: {
  text: 'Type your paragraph text here. This block supports rich text styling if applied externally, but is built for clean, scalable body copy. ',
  fontSize: 16,
  textAlign: 'left',
  color: '#4b5563',
  lineHeight: 'relaxed',
 },
 related: {
  settings: ParagraphSettings,
 },
 rules: {
  canDrag: () => true,
 },
};

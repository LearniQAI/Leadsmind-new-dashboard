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
import { pickBoxStyle, stripBoxStyleKeys } from '@/lib/builder/boxStyle';

export interface ParagraphProps {
 text: string;
 fontSize: number;
 fontWeight: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
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
  fontWeight: _fw,
  fontWeight_mobile,
  fontWeight_tablet,
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
 // Part 2 Color / Size-and-position sections — apply, then strip so they don't hit the DOM.
 const boxStyle = pickBoxStyle(props);
 stripBoxStyleKeys(props);
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
 const fontWeight = useResponsiveValue(allProps, 'fontWeight', _fw);
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

 const INHERIT_TYPOGRAPHY: React.CSSProperties = {
  color: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'inherit',
  fontFamily: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
  textAlign: 'inherit',
 };

 const weights = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',
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
   className={`w-full ${enabled ? 'outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all' : ''} ${weights[fontWeight as keyof typeof weights] || ''} ${alignments[textAlign as keyof typeof alignments]} ${lineHeights[lineHeight as keyof typeof lineHeights]} ${themeFontClass} ${props.className || ''}`}
   style={{
    ...boxStyle,
    color,
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
   }}
  >
    {enabled ? (
      // Every typography property is pinned to `inherit` so the bundled template's
      // bare `p { ... }` rule can't override the size / weight / line-height /
      // letter-spacing set on the wrapper above (see .tiptap p in globals.css for
      // the matching fix on TipTap's own inner <p>).
      <p className="outline-none w-full m-0 p-0" style={INHERIT_TYPOGRAPHY}>
        <InlineTextEditor
          value={text}
          onChange={(val) => setProp((props: any) => { props.text = val; }, 500)}
        />
      </p>
   ) : (
    <p style={{ ...INHERIT_TYPOGRAPHY, margin: 0 }} dangerouslySetInnerHTML={{ __html: displayText }} />
   )}
  </div>
 );
};

Paragraph.craft = {
 displayName: 'Paragraph',
 props: {
  text: 'Type your paragraph text here. This block supports rich text styling if applied externally, but is built for clean, scalable body copy. ',
  fontSize: 16,
  fontWeight: 'normal',
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

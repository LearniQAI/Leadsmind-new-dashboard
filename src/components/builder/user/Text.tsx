"use client";

import React from 'react';
import { useEditor, useNode } from '@craftjs/core';
import { InlineTextEditor } from './InlineTextEditor';
import { TextSettings } from './TextSettings';
import { replaceMergeTags } from '@/lib/builder/utils';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import { pickBoxStyle, stripBoxStyleKeys } from '@/lib/builder/boxStyle';
import { RICH_TEXT_CLASS, BLOCK_FONT_ATTR, BLOCK_FONT_VAR, fontStack } from '@/lib/builder/blockTypography';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';
import { useBuilder } from '../BuilderContext';

// Typography keys the panel writes per breakpoint (TypographyControl's setResponsiveValue).
const TEXT_TYPE_KEYS = ['fontSize', 'textAlign', 'color', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;

export const Text = (allProps: any) => {
 const { text, dragRef, ...props } = allProps;
 // Resolved for the current breakpoint like Heading/Paragraph. This used to destructure the
 // base (Desktop) props only, so Tablet/Mobile values never rendered — and leaked onto the
 // <div> as unknown attributes through the spread below.
 const fontSize = useResponsiveValue(allProps, 'fontSize', undefined);
 const textAlign = useResponsiveValue(allProps, 'textAlign', undefined);
 const color = useResponsiveValue(allProps, 'color', undefined);
 const fontFamily = useResponsiveValue(allProps, 'fontFamily', undefined);
 const fontWeight = useResponsiveValue(allProps, 'fontWeight', undefined);
 const lineHeight = useResponsiveValue(allProps, 'lineHeight', undefined);
 const letterSpacing = useResponsiveValue(allProps, 'letterSpacing', undefined);
 for (const k of TEXT_TYPE_KEYS) { delete props[k]; delete props[`${k}_tablet`]; delete props[`${k}_mobile`]; }
 // Part 2 Color / Size-and-position sections — apply, then strip so they don't hit the DOM.
 const { viewMode } = useBuilder();
 const boxStyle = pickBoxStyle(props, viewMode);
 stripBoxStyleKeys(props);
 const { connectors: { connect, drag }, actions: { setProp } } = useNode();
 const { enabled } = useEditor((state) => ({
  enabled: state.options.enabled
 }));

 const displayText = enabled ? text : sanitizeRichTextHtml(replaceMergeTags(text));

 // Part 2 (Text Element Typography Controls): fontFamily/fontWeight/lineHeight/letterSpacing
 // are genuinely applied here now — previously TypographyControl existed but Text never read
 // these props at all, so the panel saved values with zero visual effect. fontWeight carries
 // a real Google Fonts variant string (e.g. "700italic"); the trailing "italic" isn't a valid
 // font-weight value on its own, so it's split into a real separate font-style rule (same
 // fix applied to Container.tsx's own typography rendering).
 React.useEffect(() => { if (fontFamily) loadGoogleFontFamily(fontFamily); }, [fontFamily]);
 const isItalic = typeof fontWeight === 'string' && /italic$/.test(fontWeight);
 const weightValue = isItalic ? fontWeight.replace(/italic$/, '') : fontWeight;

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
   // An explicit font outranks the page theme's !important font (themeFontCss / BLOCK_FONT_ATTR).
   {...(fontFamily ? { [BLOCK_FONT_ATTR]: '' } : {})}
   style={{
    fontSize: fontSize !== undefined && fontSize !== null && fontSize !== '' ? `${fontSize}px` : undefined,
    textAlign,
    color,
    fontFamily: fontFamily ? fontStack(fontFamily) : undefined,
    ...(fontFamily ? { [BLOCK_FONT_VAR]: fontStack(fontFamily) } : {}),
    fontWeight: weightValue || undefined,
    fontStyle: isItalic ? 'italic' : undefined,
    lineHeight: lineHeight ? `${lineHeight}px` : undefined,
    letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
    ...boxStyle,
   }}
  >
    {enabled ? (
      <span className="outline-none block w-full" style={{ color: 'inherit' }}>
        <InlineTextEditor
          value={text}
          onChange={(val) => setProp((props: any) => { props.text = val; }, 500)}
        />
      </span>
    ) : (
      <span className={RICH_TEXT_CLASS} style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: displayText }} />
    )}
  </div>
 );
};

Text.craft = {
 displayName: 'Text',
 props: {
  text: 'Click to edit text',
  fontSize: 16,
  textAlign: 'left',
  color: '#000000',
 },
 related: {
  settings: TextSettings,
 },
 rules: {
  canDrag: () => true,
 },
};


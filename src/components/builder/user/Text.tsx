"use client";

import React from 'react';
import { useEditor, useNode } from '@craftjs/core';
import { InlineTextEditor } from './InlineTextEditor';
import { TextSettings } from './TextSettings';
import { replaceMergeTags } from '@/lib/builder/utils';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import { pickBoxStyle, stripBoxStyleKeys } from '@/lib/builder/boxStyle';

export const Text = ({ text, fontSize, textAlign, color, fontFamily, fontWeight, lineHeight, letterSpacing, dragRef, ...props }: any) => {
 // Part 2 Color / Size-and-position sections — apply, then strip so they don't hit the DOM.
 const boxStyle = pickBoxStyle(props);
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
   style={{
    fontSize: `${fontSize}px`,
    textAlign,
    color,
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
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
      <span style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: displayText }} />
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


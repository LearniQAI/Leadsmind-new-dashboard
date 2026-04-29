"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { ParagraphSettings } from './ParagraphSettings';
import { replaceMergeTags } from '@/lib/builder/utils';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export interface ParagraphProps {
  text: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  lineHeight: 'tight' | 'normal' | 'relaxed' | 'loose';
}

export const Paragraph = (allProps: ParagraphProps & any) => {
  const { 
    text, 
    textAlign: _ta, 
    textAlign_mobile,
    textAlign_tablet,
    color, 
    lineHeight: _lh, 
    lineHeight_mobile,
    lineHeight_tablet,
    fontSize: _fs,
    fontSize_mobile,
    fontSize_tablet,
    dragRef, 
    ...props 
  } = allProps;
  const { connectors: { connect, drag }, actions: { setProp } } = useNode();
  const { viewMode } = useBuilder();
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

  const displayText = enabled ? text : replaceMergeTags(text);

  // Responsive values
  const fontSize = useResponsiveValue(allProps, 'fontSize', 16);
  const textAlign = useResponsiveValue(allProps, 'textAlign', _ta);
  const lineHeight = useResponsiveValue(allProps, 'lineHeight', _lh);
  
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
      className={`w-full outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${alignments[textAlign as keyof typeof alignments]} ${lineHeights[lineHeight as keyof typeof lineHeights]} ${props.className || ''}`}
      style={{
        color,
        fontSize: `${fontSize}px`,
      }}
    >
      {enabled ? (
        <ContentEditable
            html={text}
            disabled={!enabled}
            onChange={(e) => setProp((props: any) => (props.text = e.target.value), 500)}
            tagName="p"
            className="outline-none w-full m-0 p-0"
        />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: displayText }} />
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

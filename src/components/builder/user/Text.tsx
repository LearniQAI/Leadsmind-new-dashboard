"use client";

import React from 'react';
import { useEditor, useNode } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { TextSettings } from './TextSettings';
import { replaceMergeTags } from '@/lib/builder/utils';

export const Text = ({ text, fontSize, textAlign, color, dragRef, ...props }: any) => {
  const { connectors: { connect, drag }, actions: { setProp } } = useNode();
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

  const displayText = enabled ? text : replaceMergeTags(text);

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
      }}
    >
      {enabled ? (
        <ContentEditable
          html={text}
          disabled={!enabled}
          onChange={(e) => setProp((props: any) => (props.text = e.target.value), 500)}
          tagName="span"
          className="outline-none block w-full"
        />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: displayText }} />
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


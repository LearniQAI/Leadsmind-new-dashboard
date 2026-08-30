"use client";

// TEMPORARY visual-polish harness for Text/Heading/Paragraph/Video/Image panels. Delete after.

import React, { useState } from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { Text } from '@/components/builder/user/Text';
import { Heading } from '@/components/builder/user/Heading';
import { Paragraph } from '@/components/builder/user/Paragraph';
import { Video } from '@/components/builder/user/Video';
import { Image } from '@/components/builder/user/Image';
import { ElementProperties } from '@/components/builder/ElementProperties';

const WANT = ['Text', 'Heading', 'Paragraph', 'Video', 'Image'];

function Toolbar() {
  const { actions, selectedId, nodes } = useEditor((state) => ({
    selectedId: Array.from(state.events.selected)[0] || null,
    nodes: Object.keys(state.nodes).map((id) => ({
      id, name: state.nodes[id].data.displayName || (state.nodes[id].data as any).name || '',
    })),
  }));
  return (
    <div style={{ display: 'flex', gap: 6, padding: 8, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
      {nodes.filter((n) => WANT.includes(n.name)).map((n) => (
        <button key={n.id} data-testid={`select-${n.name}`} onClick={() => actions.selectNode(n.id)}
          style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db',
            background: selectedId === n.id ? '#6c47ff' : '#fff', color: selectedId === n.id ? '#fff' : '#111' }}>
          {n.name}
        </button>
      ))}
    </div>
  );
}

function Panel() {
  const { selectedId } = useEditor((s) => ({ selectedId: Array.from(s.events.selected)[0] || null }));
  if (!selectedId || selectedId === 'ROOT') return <div style={{ padding: 16, fontSize: 12, color: '#888' }}>select one</div>;
  return <ElementProperties nodeId={selectedId} />;
}

export default function PanelPolishAudit() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <Editor resolver={{ Text, Heading, Paragraph, Video, Image }} enabled>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Toolbar />
          <div id="canvas" style={{ flex: 1, overflow: 'auto', padding: 24, background: '#fff' }}>
            <Frame>
              <Element is="div" canvas>
                <Element is={Text} id="text-node" text="Sample text" />
                <Element is={Heading} id="heading-node" text="Sample Heading" />
                <Element is={Paragraph} id="paragraph-node" text="Sample paragraph copy for the panel polish review." />
                <Element is={Video} id="video-node" />
                <Element is={Image} id="image-node" />
              </Element>
            </Frame>
          </div>
        </div>
        <div style={{ width: 340, borderLeft: '1px solid #e5e7eb', overflow: 'auto', background: '#fff' }}>
          <Panel />
        </div>
      </Editor>
    </div>
  );
}

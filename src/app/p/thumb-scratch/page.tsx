"use client";

import React from 'react';
import { Editor, Frame } from '@craftjs/core';
import { useSearchParams } from 'next/navigation';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { RESOLVER } from '@/lib/builder/resolver';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { velocity } from '@/lib/builder/templates/velocity';

const MAP: Record<string, any> = { velocity };

export default function ThumbScratchPage() {
  const params = useSearchParams();
  const key = params.get('t') || 'velocity';
  const tpl = MAP[key];

  return (
    <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}} autoDetectViewport>
      <Editor resolver={RESOLVER as any} enabled={false} onRender={PublishedNodeRender}>
        <Frame data={tpl.content} />
      </Editor>
    </BuilderProvider>
  );
}

"use client";

import React from 'react';
import { Editor, Frame } from '@craftjs/core';
import { RESOLVER } from '@/lib/builder/resolver';
import { BuilderProvider } from './BuilderContext';

export default function PublishedPageRenderer({
 content,
 websiteData,
 pages,
 websiteId,
 funnelId
}: {
 content: string;
 websiteData?: any;
 pages?: any[];
 websiteId?: string;
 funnelId?: string;
}) {
 // If content is missing or invalid, provide a sleek fallback
 let validContent = content;
 try {
  if (!validContent || validContent.trim() === '') {
   validContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
  } else {
   JSON.parse(validContent); // validate JSON
  }
 } catch (err) {
  validContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
 }

 return (
  <div className="w-full min-h-screen bg-bgBody dark:bg-bgBody-dark text-heading dark:text-heading-dark selection:bg-primary selection:text-white antialiased overflow-x-hidden">
   <BuilderProvider
    websiteData={websiteData || null}
    pages={pages || []}
    websiteId={websiteId}
    funnelId={funnelId}
    onUpdateWebsite={() => {}}
   >
    <Editor
     resolver={RESOLVER}
     enabled={false}
    >
     <Frame data={validContent} />
    </Editor>
   </BuilderProvider>
  </div>
 );
}

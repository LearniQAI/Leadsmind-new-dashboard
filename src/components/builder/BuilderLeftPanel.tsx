"use client";

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Sidebar } from './Sidebar';
import { ElementProperties } from './ElementProperties';

// Single left-panel host: renders ElementProperties whenever Craft.js has a
// non-ROOT node selected, otherwise falls back to Sidebar (pages/layers/elements
// picker/globals). Craft.js's own selection state is the single source of truth
// for which mode is active — there is no separate "panel mode" flag to keep in
// sync with it.
export const BuilderLeftPanel = ({
  type,
  website,
  onUpdateWebsite
}: {
  type?: 'website' | 'funnel';
  website?: any;
  onUpdateWebsite?: (updates: any) => void;
}) => {
  const { selectedId } = useEditor((state) => ({
    selectedId: Array.from(state.events.selected)[0] || null,
  }));

  if (selectedId && selectedId !== 'ROOT') {
    return <ElementProperties nodeId={selectedId} />;
  }

  return (
    <Sidebar
      type={type}
      website={website}
      onUpdateWebsite={onUpdateWebsite}
    />
  );
};

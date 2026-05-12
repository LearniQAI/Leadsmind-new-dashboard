"use client";

import React from 'react';
import { BuilderEditor } from '@/components/builder/BuilderEditor';
import { useParams } from 'next/navigation';

export default function FunnelEditorShell() {
 const { pageId } = useParams();
 return <BuilderEditor type="funnel" key={pageId as string} />;
}

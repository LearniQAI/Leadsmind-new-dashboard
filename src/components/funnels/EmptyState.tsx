'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

interface EmptyStateProps {
  onCreateFunnel: () => void;
}

export function EmptyState({ onCreateFunnel }: EmptyStateProps) {
  return (
    <DashEmptyState
      icon={Filter}
      title="No funnels created yet"
      description="Map your marketing conversion flows sequentially and capture prospective client leads automatically."
      actionLabel="Create first funnel"
      onAction={onCreateFunnel}
    />
  );
}

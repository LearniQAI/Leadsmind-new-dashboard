'use client';

import React from 'react';
import { ShareEmbedModal } from './components/embed/ShareEmbedModal';

interface EmbedModalProps {
  form: {
    id: string;
    name: string;
    status: string;
    workspace_id?: string;
  };
  open: boolean;
  onClose: () => void;
}

export function EmbedModal({ form, open, onClose }: EmbedModalProps) {
  return (
    <ShareEmbedModal
      form={form}
      open={open}
      onClose={onClose}
    />
  );
}

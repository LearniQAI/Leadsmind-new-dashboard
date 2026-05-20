'use client';

import React from 'react';
import { CampaignManager } from '@/app/public/campaigns/CampaignManager';

interface Props {
  schema: any;
  workspaceId: string | null;
  formId: string;
  isEmbedFrame: boolean;
  hasError: boolean;
}

export default function PublicFormRenderer({ schema, workspaceId, formId, isEmbedFrame, hasError }: Props) {
  if (hasError || !schema) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'DM Sans, sans-serif',
        background: '#04081a', padding: 24, boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: 420, textAlign: 'center', padding: 40,
          background: 'rgba(12,21,53,0.9)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, color: '#eef2ff'
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 900,
            fontSize: 18, textTransform: 'uppercase', marginBottom: 8, color: '#eef2ff'
          }}>
            Form Unavailable
          </h2>
          <p style={{ color: '#94a3c8', fontSize: 13, lineHeight: 1.6 }}>
            This form is not published or the link is invalid. Contact the form owner for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CampaignManager
      schema={schema}
      workspaceId={workspaceId}
      formId={formId}
    />
  );
}

import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import KycConsentClient from './KycConsentClient';

export const dynamic = 'force-dynamic';

interface KycConsentPageProps {
  params: { id: string };
}

export default async function KycConsentPage({ params }: KycConsentPageProps) {
  const adminClient = createAdminClient();

  // Fetch the consent record including workspace and contact info
  const { data: consent, error: consentErr } = await adminClient
    .from('kyc_consent')
    .select('*, workspace:workspaces(*), contact:contacts(*)')
    .eq('id', params.id)
    .maybeSingle() as any;

  if (consentErr || !consent) {
    notFound();
  }

  return (
    <KycConsentClient consent={consent} />
  );
}

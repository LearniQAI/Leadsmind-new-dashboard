import React from 'react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import PublicQuotePortal from '@/components/portal/PublicQuotePortal';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, workspace:workspaces(name)')
    .eq('id', id)
    .single() as any;

  return {
    title: quote ? `${quote.quote_number} — ${quote.workspace?.name || 'LeadsMind Proposal'}` : 'Proposal Portal',
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuotePage({ params }: Props) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, contact:contacts(*), workspace:workspaces(*)')
    .eq('id', id)
    .single();

  if (error || !quote) {
    notFound();
  }

  return (
    <PublicQuotePortal 
      quote={quote} 
    />
  );
}

import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
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
  
  // Verify authenticated session
  const user = await getUser();
  if (!user) {
    redirect('/auth/portal/login');
  }

  const supabase = createAdminClient();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, contact:contacts(*), workspace:workspaces(*)')
    .eq('id', id)
    .single();

  if (error || !quote) {
    notFound();
  }

  // Multi-Tenant Isolation validation:
  // 1. Check if the logged-in user email matches the quote contact record's email
  const isClientOwner = quote.contact && quote.contact.email === user.email;

  // 2. Check if the logged-in user is a workspace member (allows admins/impersonators)
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', quote.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isWorkspaceTeammate = !!membership;

  if (!isClientOwner && !isWorkspaceTeammate) {
    // Cross-tenant data isolation breach block
    notFound();
  }

  return (
    <PublicQuotePortal 
      quote={quote} 
    />
  );
}

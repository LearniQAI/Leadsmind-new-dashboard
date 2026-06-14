import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getPortalSession } from '@/lib/portal/session';
import SingleInvoiceView from '@/components/portal/SingleInvoiceView';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, workspace:workspaces(name)')
    .eq('id', id)
    .single() as any;

  return {
    title: invoice ? `${invoice.invoice_number} — ${invoice.workspace?.name || 'LeadsMind Portal'}` : 'Invoice Portal',
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params }: Props) {
  const { id } = await params;
  
  // Verify authenticated session
  const user = await getUser();
  if (!user) {
    redirect('/auth/portal/login');
  }

  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, contact:contacts(*), workspace:workspaces(*)')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Multi-Tenant Isolation validation:
  // 1. Check if the logged-in user email matches the invoice contact record's email
  const isClientOwner = invoice.contact && invoice.contact.email === user.email;

  // 2. Check if the logged-in user is a workspace member (allows admins/impersonators)
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', invoice.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isWorkspaceTeammate = !!membership;

  if (!isClientOwner && !isWorkspaceTeammate) {
    // Cross-tenant data isolation breach block
    notFound();
  }

  // Fetch attachments if any exist
  const { data: attachments } = await supabase
    .from('invoice_attachments')
    .select('*')
    .eq('invoice_id', id);

  return (
    <SingleInvoiceView 
      invoice={invoice} 
      attachments={attachments || []} 
    />
  );
}

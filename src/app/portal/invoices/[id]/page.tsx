import React from 'react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
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
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, contact:contacts(*), workspace:workspaces(*)')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // We can fetch attachments too if any exist in public.invoice_attachments
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

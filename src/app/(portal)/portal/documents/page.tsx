import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MetaData from '@/hooks/useMetaData';
import DocumentsClient from '@/components/portal/DocumentsClient';

export const dynamic = 'force-dynamic';

export default async function PortalDocumentsPage() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const supabase = createAdminClient();

  // 1. Fetch documents linked to this contact from the secure contact_documents join table
  const { data: dbDocs } = await supabase
    .from('contact_documents')
    .select('*, file:media_files(*)')
    .eq('contact_id', contact.id)
    .order('created_at', { ascending: false });

  const docs = dbDocs || [];

  // 2. Fetch quotes linked to this contact that are pending signature — a
  // quote is signable once it has been sent, up until the client signs it
  // (which moves it to 'accepted').
  const { data: dbSignableQuotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false });

  const signableQuotes = dbSignableQuotes || [];

  return (
    <MetaData pageTitle="My Documents">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Client <span className="text-dash-accent">Documents & E-Signs</span>
          </h1>
          <p className="text-[11.5px] text-dash-textMuted uppercase tracking-[0.2em] mt-2 font-medium">
            Access contract agreements, project briefs, and e-signature requirements
          </p>
        </div>

        {/* Unified Documents & E-Sign Client Dashboard */}
        <DocumentsClient
          initialDocs={docs}
          initialQuotes={signableQuotes}
          contactId={contact.id}
          workspaceId={workspace.id}
        />
      </div>
    </MetaData>
  );
}


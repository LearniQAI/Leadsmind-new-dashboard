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

  // 2. Fetch proposals linked to this contact that are pending signature
  const { data: dbProposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('contact_id', contact.id)
    .neq('status', 'signed')
    .order('created_at', { ascending: false });

  const proposals = dbProposals || [];

  return (
    <MetaData pageTitle="My Documents">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Client <span className="text-[var(--accent2)]">Documents & E-Signs</span>
          </h1>
          <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
            Access contract agreements, project briefs, and e-signature requirements
          </p>
        </div>

        {/* Unified Documents & E-Sign Client Dashboard */}
        <DocumentsClient 
          initialDocs={docs} 
          initialProposals={proposals} 
          contactId={contact.id} 
          workspaceId={workspace.id} 
        />
      </div>
    </MetaData>
  );
}


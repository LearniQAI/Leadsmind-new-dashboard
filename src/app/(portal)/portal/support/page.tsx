import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MetaData from '@/hooks/useMetaData';
import SupportClient from '@/components/portal/SupportClient';

export const dynamic = 'force-dynamic';

export default async function PortalSupportPage() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const supabase = createAdminClient();

  // Fetch client support tickets
  const { data: dbTickets } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  const tickets = dbTickets || [];

  return (
    <MetaData pageTitle="Client Support">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Help & <span className="text-[var(--accent2)]">Support</span>
          </h1>
          <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
            Open a support ticket, track dialogue threads, or provide CSAT reviews
          </p>
        </div>

        <SupportClient initialTickets={tickets} workspaceId={workspace.id} contactId={contact.id} />
      </div>
    </MetaData>
  );
}


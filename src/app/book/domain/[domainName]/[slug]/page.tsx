import React from 'react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import PublicBookingLayout from '@/components/calendar/public/PublicBookingLayout';

export default async function CustomDomainBookingPage({
  params
}: {
  params: { domainName: string; slug: string }
}) {
  const { domainName, slug } = await params;
  const supabase = createAdminClient();

  // 1. Resolve workspace by custom domain name
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('custom_domain', domainName)
    .maybeSingle();

  if (!workspace) {
    return notFound();
  }

  // 2. Fetch calendar associated with that workspace and slug
  const { data: calendar } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('slug', slug)
    .maybeSingle();

  if (!calendar) {
    return notFound();
  }

  return <PublicBookingLayout calendar={calendar} />;
}

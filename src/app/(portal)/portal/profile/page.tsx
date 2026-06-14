import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { redirect } from 'next/navigation';
import MetaData from '@/hooks/useMetaData';
import ProfileClient from '@/components/portal/ProfileClient';

export const dynamic = 'force-dynamic';

export default async function PortalProfilePage() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact } = session;

  return (
    <MetaData pageTitle="My Profile">
      <div className="max-w-4xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Profile <span className="text-[var(--accent2)]">Settings</span>
          </h1>
          <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
            Manage your personal profile details, notification preferences, and POPIA privacy rights
          </p>
        </div>

        {/* Client Profile Settings Panel */}
        <ProfileClient contact={contact} />
      </div>
    </MetaData>
  );
}


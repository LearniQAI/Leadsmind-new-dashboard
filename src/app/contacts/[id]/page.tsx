import React from 'react';
import { ArrowLeft, Mail, Zap } from 'lucide-react';
import { getContact, getContactActivities, getContactNotes, getContactTasks } from '@/app/actions/contacts';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { ProfileSidebar } from '@/components/crm/ProfileSidebar';
import { ProfileContent } from '@/components/crm/ProfileContent';
import { KycStatusPanel } from '@/components/crm/KycStatusPanel';
import { DashButton } from '@/components/dashboard-ui/Button';

/**
 * Contact 360° Profile Page
 * High-fidelity orchestrator for relationship data and tactical interactions.
 */
interface ContactProfilePageProps {
  params: { id: string };
}

export default async function ContactProfilePage({ params }: ContactProfilePageProps) {
  await requireAuth();

  const [contactRes, activitiesRes, notesRes, tasksRes] = await Promise.all([
    getContact(params.id),
    getContactActivities(params.id),
    getContactNotes(params.id),
    getContactTasks(params.id)
  ]);

  if (!contactRes.success || !contactRes.data) {
    redirect('/contacts');
  }

  const contact = contactRes.data;
  const activities = activitiesRes.data || [];
  const notes = notesRes.data || [];
  const tasks = tasksRes.data || [];

  return (
    <MetaData pageTitle={`${contact.first_name} ${contact.last_name} | Profile`}>
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-5">
            <div className="flex items-center gap-4">
              <Link
                href="/contacts"
                className="w-10 h-10 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
              >
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-[22px] font-bold !text-dash-text leading-none mb-1.5">
                  Contact profile
                </h1>
                <p className="text-[12px] font-medium !text-dash-textMuted">
                  Comprehensive 360° view of relationship status and history
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DashButton variant="secondary" size="sm">
                <Mail size={13} className="text-dash-textMuted" />
                Send email
              </DashButton>
              <DashButton variant="primary" size="sm">
                <Zap size={12} />
                AI assist
              </DashButton>
            </div>
          </div>

          {/* 360 Layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 px-6 pb-10">
            {/* 1. Sidebar (280px) */}
            <ProfileSidebar contact={contact} />

            {/* 2. Content Area (Flex: 1) */}
            <ProfileContent
              contact={contact}
              activities={activities}
              notes={notes}
              tasks={tasks}
            />

            {/* 3. KYC Status Dashboard Panel (320px) */}
            <KycStatusPanel contact={contact} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

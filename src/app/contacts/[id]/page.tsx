import React from 'react';
import { getContact, getContactActivities, getContactNotes, getContactTasks } from '@/app/actions/contacts';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { ProfileSidebar } from '@/components/crm/ProfileSidebar';
import { ProfileContent } from '@/components/crm/ProfileContent';

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
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-5">
            <div className="flex items-center gap-4">
              <Link
                href="/contacts"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] hover:text-[#eef2ff] transition-all"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </Link>
              <div>
                <h1 className="text-[22px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1.5 font-space-grotesk">
                  Contact <span className="text-[#3b82f6]">Profile</span>
                </h1>
                <p className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                  Comprehensive 360° view of relationship status and history
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-9 px-4 rounded-[8px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-semibold font-dm-sans flex items-center gap-2 transition-all">
                <i className="fa-solid fa-envelope text-[13px] text-[#4a5a82]"></i>
                Send Email
              </button>
              <button className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20">
                <i className="fa-solid fa-bolt text-[12px]"></i>
                AI Assist
              </button>
            </div>
          </div>

          {/* 360 Layout */}
          <div className="flex-1 flex gap-6 px-6 pb-10">
            {/* 1. Sidebar (280px) */}
            <ProfileSidebar contact={contact} />

            {/* 2. Content Area (Flex: 1) */}
            <ProfileContent
              contact={contact}
              activities={activities}
              notes={notes}
              tasks={tasks}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

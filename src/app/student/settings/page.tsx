import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getStudentSettings } from '@/app/actions/studentSettings';
import StudentSettingsClient from './StudentSettingsClient';

export const dynamic = 'force-dynamic';

export default async function StudentSettingsPage() {
  const { data: settings } = await getStudentSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="space-y-3 border-b border-dash-border pb-7">
        <nav className="flex items-center gap-2 text-[12px] font-medium tracking-tight !text-dash-textMuted">
          <Link
            href="/student"
            className="inline-flex items-center gap-0.5 transition-colors hover:!text-dash-text"
          >
            <ChevronLeft size={13} /> Dashboard
          </Link>
          <span className="!text-dash-border">/</span>
          <span className="font-semibold !text-dash-text">Settings</span>
        </nav>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-dash-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] !text-dash-accent">
              Student portal
            </span>
          </div>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] !text-dash-text md:text-[36px]">
            Settings
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Manage your name, password, and notification preferences.
          </p>
        </div>
      </header>

      {settings ? (
        <StudentSettingsClient settings={settings} />
      ) : (
        <div className="rounded-2xl border border-dashed border-dash-border bg-white p-8 text-center text-[13px] !text-dash-textMuted">
          We couldn&apos;t load your settings right now. Please refresh the page.
        </div>
      )}
    </div>
  );
}

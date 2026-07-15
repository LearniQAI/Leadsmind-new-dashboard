import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, LayoutDashboard, LogOut, ArrowLeftRight
} from 'lucide-react';
import { requireAuth } from '@/lib/auth';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default async function StudentLayout({ children }: StudentLayoutProps) {
  // Ensure student is authenticated before entering
  await requireAuth();

  return (
    <div className="min-h-screen bg-dash-bg !text-dash-text flex font-body">
      {/* Student Sidebar */}
      <aside className="w-64 border-r border-dash-border bg-white flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <Image
            src="/assets/images/brand/LeadsMind_Logo.png.png"
            alt="LeadsMind"
            width={140}
            height={32}
            className="h-8 w-auto object-contain"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] !text-dash-textMuted">Student</span>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/student" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-all motion-reduce:transition-none">
            <LayoutDashboard size={16} className="!text-dash-accent" /> My Dashboard
          </Link>
          <Link href="/student/marketplace" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-all motion-reduce:transition-none">
            <BookOpen size={16} className="!text-dash-accent" /> Course Catalog
          </Link>
          <Link href="/courses" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold !text-dash-textMuted/70 hover:!text-dash-text hover:bg-dash-surface transition-all motion-reduce:transition-none">
            <ArrowLeftRight size={16} /> Admin Workspace
          </Link>
        </nav>

        <div className="border-t border-dash-border pt-4">
          <Link href="/auth/signin-basic" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold !text-red hover:bg-red/10 transition-all motion-reduce:transition-none">
            <LogOut size={16} /> Sign Out
          </Link>
        </div>
      </aside>

      {/* Page Content Panel */}
      <main className="flex-1 overflow-y-auto p-10 min-h-screen bg-dash-bg">
        {children}
      </main>
    </div>
  );
}

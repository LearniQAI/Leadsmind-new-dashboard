import React from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-[#04091a] text-white flex font-body">
      {/* Student Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#080f28]/60 backdrop-blur-xl flex flex-col p-6 shrink-0">
        <div className="flex flex-col mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Student Center</span>
          <div className="text-xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1">
            LEADSMIND
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/student" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/[0.03] transition-all">
            <LayoutDashboard size={16} className="text-primary" /> My Dashboard
          </Link>
          <Link href="/student/marketplace" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/[0.03] transition-all">
            <BookOpen size={16} className="text-accent" /> Course Catalog
          </Link>
          <Link href="/courses" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/40 hover:text-white/80 hover:bg-white/[0.01] transition-all">
            <ArrowLeftRight size={16} /> Admin Workspace
          </Link>
        </nav>

        <div className="border-t border-white/5 pt-4">
          <Link href="/auth/signin-basic" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={16} /> Sign Out
          </Link>
        </div>
      </aside>

      {/* Page Content Panel */}
      <main className="flex-1 overflow-y-auto p-10 min-h-screen">
        {children}
      </main>
    </div>
  );
}

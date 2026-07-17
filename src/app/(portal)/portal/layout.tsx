import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  History, FileText, Wallet, Settings, LogOut, Calendar, 
  Video, BookOpen, FolderOpen, Headphones, User, ShieldAlert,
  ChevronDown, Building, Menu
} from 'lucide-react';
import { exitImpersonation } from '@/app/actions/portal';
import { setActiveWorkspace } from '@/app/actions/auth';
import { headers } from 'next/headers';
import ClientLayoutShell from '@/app/(portal)/portal/layout-client';
import PopiaConsentWall from '@/components/portal/PopiaConsentWall';
import PortalLenaChat from '@/components/portal/PortalLenaChat';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();

  if (!session) {
    redirect('/auth/portal/login');
  }

  const branding = session.branding || {};
  const primaryColor = branding.primary_color || '#04091a';
  const btnColor = branding.button_color || '#2563eb';
  const txtColor = branding.text_color || '#eef2ff';
  const fontFamily = branding.typography || 'Inter';

  const style = {
    '--primary-color': primaryColor,
    '--btn-color': btnColor,
    '--txt-color': txtColor,
    '--font-family': fontFamily,
  } as React.CSSProperties;

  // Check POPIA consent status
  if (!session.contact.consent_timestamp) {
    const reqHeaders = headers();
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    return (
      <div 
        className="min-h-screen flex flex-col font-sans"
        style={{ 
          backgroundColor: 'var(--primary-color)', 
          color: 'var(--txt-color)', 
          fontFamily: 'var(--font-family), sans-serif',
          ...style 
        }}
      >
        {branding.favicon_url && (
          <link rel="icon" href={branding.favicon_url} />
        )}
        <PopiaConsentWall ipAddress={ipAddress} />
      </div>
    );
  }

  // Check FICA completion status
  const supabase = createAdminClient();
  const { data: rating } = await supabase
    .from('kyc_risk_ratings')
    .select('fica_complete')
    .eq('contact_id', session.contact.id)
    .maybeSingle();

  const ficaComplete = rating?.fica_complete ?? false;

  // Server action to exit impersonation
  const handleExitImpersonation = async () => {
    'use server';
    await exitImpersonation();
    // Redirect back to CRM detail view for that contact if we can parse previous header or just contacts list
    redirect(`/contacts/${session.contact.id}`);
  };

  // Server action to switch workspace context
  const handleSwitchWorkspace = async (wsId: string) => {
    'use server';
    const result = await setActiveWorkspace(wsId);
    if (!result.success) {
      redirect('/portal/dashboard?error=workspace_switch_failed');
    }
    redirect('/portal/dashboard');
  };

  const navItems = [
    { label: 'Dashboard', icon: History, href: '/portal/dashboard' },
    { label: 'Invoices', icon: Wallet, href: '/portal/invoices' },
    { label: 'Courses', icon: BookOpen, href: '/portal/courses' },
    { label: 'Projects', icon: FolderOpen, href: '/portal/projects' },
    { label: 'Documents', icon: FileText, href: '/portal/documents' },
    { label: 'Bookings', icon: Calendar, href: '/portal/bookings' },
    { label: 'Support', icon: Headphones, href: '/portal/support' },
    { label: 'Profile', icon: User, href: '/portal/profile' }
  ];

  return (
    <div 
      className="min-h-screen flex flex-col font-sans animate-fade-in"
      style={{ 
        backgroundColor: 'var(--primary-color)', 
        color: 'var(--txt-color)', 
        fontFamily: 'var(--font-family), sans-serif',
        ...style 
      }}
    >
      {/* Dynamic Favicon */}
      {branding.favicon_url && (
        <link rel="icon" href={branding.favicon_url} />
      )}

      {/* 1. Impersonation Banner */}
      {session.isImpersonating && (
        <div className="bg-amber-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-4 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>
              <strong>Impersonation Active</strong>: You are viewing this portal exactly as <strong>{session.contact.first_name} {session.contact.last_name || ''}</strong> ({session.contact.email})
            </span>
          </div>
          <form action={handleExitImpersonation}>
            <button 
              type="submit" 
              className="bg-black/20 hover:bg-black/30 text-white font-black px-4 py-1.5 rounded-lg border border-white/20 transition-all uppercase tracking-wider text-[10px]"
            >
              Exit View
            </button>
          </form>
        </div>
      )}

      {/* 2. Main Wrapper with Client Shell (handles mobile drawer state) */}
      <ClientLayoutShell 
        session={session} 
        navItems={navItems} 
        handleSwitchWorkspace={handleSwitchWorkspace}
        ficaComplete={ficaComplete}
      >
        {children}
      </ClientLayoutShell>

      {/* LENA Chat Widget */}
      <PortalLenaChat />
    </div>
  );
}

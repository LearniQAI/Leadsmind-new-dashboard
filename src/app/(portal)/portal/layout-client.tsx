'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, Building, LogOut, ShieldAlert, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleLogout } from '@/app/actions/auth';

interface ClientLayoutShellProps {
  session: any;
  navItems: any[];
  handleSwitchWorkspace: (wsId: string) => Promise<void>;
  ficaComplete: boolean;
  children: React.ReactNode;
}

export default function ClientLayoutShell({
  session,
  navItems,
  handleSwitchWorkspace,
  ficaComplete,
  children
}: ClientLayoutShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  return (
    <div className="flex flex-1 relative">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-dash-border bg-dash-surface flex-col p-6 shrink-0">
        {/* Logo */}
        {session.workspace?.plan_tier !== 'spark' ? (
          session.branding?.logo_url ? (
            <img
              src={session.branding.logo_url}
              alt={session.workspace.name}
              className="max-h-12 max-w-full object-contain mb-10 align-middle self-start"
            />
          ) : (
            <div className="text-lg font-bold text-dash-text mb-10 truncate font-space-grotesk tracking-wide uppercase">
              {session.workspace?.name}
            </div>
          )
        ) : (
          <div className="text-lg font-black tracking-tighter text-dash-accent mb-10 font-space-grotesk flex items-center gap-1.5 uppercase">
            <span className="text-dash-text">Leads</span>Mind
          </div>
        )}

        {/* Workspace Switcher */}
        {session.allContacts.length > 1 ? (
          <div className="relative mb-8">
            <button
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-dash-border hover:border-dash-accent/40 text-left transition-all group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent shrink-0">
                  <Building size={15} />
                </div>
                <div className="truncate">
                  <p className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider font-mono">Workspace</p>
                  <p className="text-[12px] font-black text-dash-text truncate mt-0.5">{session.workspace?.name || 'My Workspace'}</p>
                </div>
              </div>
              <ChevronDown size={14} className={cn("text-dash-textMuted transition-transform", wsDropdownOpen && "rotate-180")} />
            </button>

            {wsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-dash-border rounded-2xl py-2 shadow-lg z-40 animate-fade-in">
                {session.allContacts.map((c: any) => (
                  <button
                    key={c.workspace_id}
                    onClick={() => {
                      setWsDropdownOpen(false);
                      handleSwitchWorkspace(c.workspace_id);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-[12px] font-bold hover:bg-dash-accent/5 hover:text-dash-text transition-colors truncate flex items-center gap-2",
                      c.workspace_id === session.workspace.id ? "text-dash-accent bg-dash-accent/5" : "text-dash-textMuted"
                    )}
                  >
                    <Building size={12} className="shrink-0" />
                    <span className="truncate">{c.workspace?.name || 'Workspace'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-dash-border mb-8">
            <div className="w-8 h-8 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent shrink-0">
              <Building size={15} />
            </div>
            <div className="truncate">
              <p className="text-[9px] font-bold text-dash-textMuted uppercase tracking-wider font-mono">Workspace</p>
              <p className="text-[12px] font-bold text-dash-textMuted truncate mt-0.5">{session.workspace?.name || 'My Workspace'}</p>
            </div>
          </div>
        )}

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item, i) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const isRestricted = !ficaComplete && ['/portal/bookings', '/portal/courses', '/portal/projects', '/portal/support'].includes(item.href);
            return (
              <Link 
                key={i}
                href={item.href}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  active
                    ? 'bg-dash-accent/10 text-dash-accent border-l-2 border-dash-accent'
                    : isRestricted
                      ? 'text-dash-textMuted/60 hover:text-dash-textMuted cursor-not-allowed opacity-50'
                      : 'text-dash-textMuted hover:text-dash-text hover:bg-dash-accent/5'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </div>
                {isRestricted && <Lock size={12} className="text-amber-500 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Client Identity details */}
        <div className="border-t border-dash-border pt-6 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-full bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center font-bold text-dash-accent text-xs shrink-0 relative">
              {session.contact.first_name[0] || '?'}{session.contact.last_name ? session.contact.last_name[0] : ''}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-dash-text truncate leading-none mb-1">{session.contact.first_name}</h4>
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">Online</p>
            </div>
          </div>
          <button
            onClick={() => handleLogout()}
            className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-500 flex items-center justify-center transition-all shrink-0"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header */}
      <div className="flex flex-col flex-grow min-w-0">
        <header className="md:hidden h-14 border-b border-dash-border bg-white/95 backdrop-blur-xl flex items-center justify-between px-6 z-40">
          {session.workspace?.plan_tier !== 'spark' ? (
            session.branding?.logo_url ? (
              <img
                src={session.branding.logo_url}
                alt={session.workspace.name}
                className="max-h-8 max-w-[150px] object-contain"
              />
            ) : (
              <div className="text-md font-bold text-dash-text truncate font-space tracking-wide uppercase">
                {session.workspace?.name}
              </div>
            )
          ) : (
            <div className="text-md font-black tracking-tighter text-dash-accent font-space">
              LEADSMIND
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </header>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 px-6 pb-8 flex flex-col overflow-y-auto">
            {/* Workspace Selector */}
            {session.allContacts.length > 1 && (
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider font-mono">Workspace</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {session.allContacts.map((c: any) => (
                    <button
                      key={c.workspace_id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSwitchWorkspace(c.workspace_id);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all truncate flex items-center gap-2 border border-dash-border",
                        c.workspace_id === session.workspace.id ? "text-dash-accent bg-dash-accent/5 border-dash-accent/30" : "text-dash-textMuted"
                      )}
                    >
                      <Building size={12} className="shrink-0" />
                      <span className="truncate">{c.workspace?.name || 'Workspace'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nav list */}
            <nav className="flex-grow space-y-1 overflow-y-auto">
              {navItems.map((item, i) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const isRestricted = !ficaComplete && ['/portal/bookings', '/portal/courses', '/portal/projects', '/portal/support'].includes(item.href);
                return (
                  <Link 
                    key={i}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-transparent",
                      active
                        ? 'bg-dash-accent/10 text-dash-accent border-dash-accent/20'
                        : isRestricted
                          ? 'text-dash-textMuted/60 opacity-55'
                          : 'text-dash-textMuted hover:text-dash-text hover:bg-dash-accent/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    {isRestricted && <Lock size={12} className="text-amber-500 shrink-0" />}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="mt-6 w-full py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        )}

        {/* 3. Main Dashboard Workspace Content */}
        <main className="flex-1 overflow-y-auto relative z-10 bg-dash-bg">
          {!ficaComplete && ['/portal/bookings', '/portal/courses', '/portal/projects', '/portal/support'].some(p => pathname === p || pathname.startsWith(p + '/')) ? (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-dash-border rounded-[32px] text-center space-y-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-2xl pointer-events-none" />
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase tracking-wider text-dash-text font-space">FICA Compliance Block Active</h2>
                <p className="text-xs uppercase tracking-widest font-semibold text-amber-600">Identity Verification Hold</p>
              </div>
              <p className="text-xs text-dash-textMuted leading-relaxed max-w-sm mx-auto font-sans font-medium">
                Under the Financial Intelligence Centre Act (FICA) regulations, we are required to obtain and verify your identity documentation and physical address confirmation.
                Access to bookings, classes, project files, and support channels will remain locked until your verification is complete.
              </p>
              <div className="bg-dash-surface border border-dash-border rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-dash-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Verify Identity Book, Card, or Passport</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-dash-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Verify Proof of Physical Address (Utility bill)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-dash-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Provide Experian TrueID Biometric Selfie</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/portal/documents"
                  className="flex-1 bg-dash-accent hover:bg-dash-accent/90 text-white font-black py-3 rounded-xl text-[10.5px] uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5"
                >
                  Go to Verification Vault
                </Link>
                <Link
                  href="/portal/dashboard"
                  className="flex-1 bg-dash-surface hover:bg-dash-border/60 text-dash-text border border-dash-border font-black py-3 rounded-xl text-[10.5px] uppercase tracking-wider transition-all flex items-center justify-center"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

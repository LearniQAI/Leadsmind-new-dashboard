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
      <aside className="hidden md:flex w-64 border-r border-[var(--bdr)] bg-[rgba(11,17,33,0.5)] backdrop-blur-xl flex-col p-6 shrink-0">
        {/* Logo */}
        {session.workspace?.plan_tier !== 'free' ? (
          session.branding?.logo_url ? (
            <img 
              src={session.branding.logo_url} 
              alt={session.workspace.name} 
              className="max-h-12 max-w-full object-contain mb-10 align-middle self-start" 
            />
          ) : (
            <div className="text-lg font-bold text-white mb-10 truncate font-space-grotesk tracking-wide uppercase">
              {session.workspace?.name}
            </div>
          )
        ) : (
          <div className="text-lg font-black tracking-tighter text-[var(--accent2)] mb-10 font-space-grotesk flex items-center gap-1.5 uppercase">
            <span className="text-white">Leads</span>Mind
          </div>
        )}

        {/* Workspace Switcher */}
        {session.allContacts.length > 1 ? (
          <div className="relative mb-8">
            <button
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111d47]/40 border border-white/5 hover:border-white/10 text-left transition-all group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Building size={15} />
                </div>
                <div className="truncate">
                  <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider font-mono">Workspace</p>
                  <p className="text-[12px] font-black text-[#eef2ff] truncate mt-0.5">{session.workspace?.name || 'My Workspace'}</p>
                </div>
              </div>
              <ChevronDown size={14} className={cn("text-[#4a5a82] transition-transform", wsDropdownOpen && "rotate-180")} />
            </button>

            {wsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#080f28] border border-white/10 rounded-2xl py-2 shadow-2xl z-40 animate-fade-in">
                {session.allContacts.map((c: any) => (
                  <button
                    key={c.workspace_id}
                    onClick={() => {
                      setWsDropdownOpen(false);
                      handleSwitchWorkspace(c.workspace_id);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-[12px] font-bold hover:bg-white/5 hover:text-white transition-colors truncate flex items-center gap-2",
                      c.workspace_id === session.workspace.id ? "text-blue-400 bg-blue-500/5" : "text-[#94a3c8]"
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
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111d47]/20 border border-white/5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Building size={15} />
            </div>
            <div className="truncate">
              <p className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider font-mono">Workspace</p>
              <p className="text-[12px] font-bold text-[#94a3c8] truncate mt-0.5">{session.workspace?.name || 'My Workspace'}</p>
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
                    ? 'bg-[var(--accentg)] text-[var(--accent2)] border-l-2 border-blue-500' 
                    : isRestricted
                      ? 'text-[var(--t4)] hover:text-[var(--t3)] cursor-not-allowed opacity-50'
                      : 'text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.03)]'
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
        <div className="border-t border-white/5 pt-6 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xs shrink-0 relative">
              {session.contact.first_name[0] || '?'}{session.contact.last_name ? session.contact.last_name[0] : ''}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#080f28]" />
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-white truncate leading-none mb-1">{session.contact.first_name}</h4>
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">Online</p>
            </div>
          </div>
          <button 
            onClick={() => handleLogout()}
            className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-rose-500 flex items-center justify-center transition-all shrink-0"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header */}
      <div className="flex flex-col flex-grow min-w-0">
        <header className="md:hidden h-14 border-b border-[var(--bdr)] bg-[rgba(11,17,33,0.8)] backdrop-blur-xl flex items-center justify-between px-6 z-40">
          {session.workspace?.plan_tier !== 'free' ? (
            session.branding?.logo_url ? (
              <img 
                src={session.branding.logo_url} 
                alt={session.workspace.name} 
                className="max-h-8 max-w-[150px] object-contain" 
              />
            ) : (
              <div className="text-md font-bold text-white truncate font-space tracking-wide uppercase">
                {session.workspace?.name}
              </div>
            )
          ) : (
            <div className="text-md font-black tracking-tighter text-[var(--accent2)] font-space">
              LEADSMIND
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#94a3c8]"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </header>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-[#04091a]/90 backdrop-blur-md z-40 pt-16 px-6 pb-8 flex flex-col">
            {/* Workspace Selector */}
            {session.allContacts.length > 1 && (
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider font-mono">Workspace</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {session.allContacts.map((c: any) => (
                    <button
                      key={c.workspace_id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSwitchWorkspace(c.workspace_id);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all truncate flex items-center gap-2 border border-white/5",
                        c.workspace_id === session.workspace.id ? "text-blue-400 bg-blue-500/5 border-blue-500/20" : "text-[#94a3c8]"
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
                        ? 'bg-[var(--accentg)] text-[var(--accent2)] border-blue-500/20' 
                        : isRestricted
                          ? 'text-[var(--t4)] opacity-55'
                          : 'text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.03)]'
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
              className="mt-6 w-full py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        )}

        {/* 3. Main Dashboard Workspace Content */}
        <main className="flex-1 overflow-y-auto relative z-10">
          {!ficaComplete && ['/portal/bookings', '/portal/courses', '/portal/projects', '/portal/support'].some(p => pathname === p || pathname.startsWith(p + '/')) ? (
            <div className="max-w-xl mx-auto my-12 p-8 bg-[var(--n800)] border border-[var(--bdr)] rounded-[32px] text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-950/20 animate-pulse">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase tracking-wider text-white font-space">FICA Compliance Block Active</h2>
                <p className="text-xs text-[var(--t3)] uppercase tracking-widest font-semibold text-amber-400">Identity Verification Hold</p>
              </div>
              <p className="text-xs text-[#94a3c8] leading-relaxed max-w-sm mx-auto font-sans font-medium">
                Under the Financial Intelligence Centre Act (FICA) regulations, we are required to obtain and verify your identity documentation and physical address confirmation. 
                Access to bookings, classes, project files, and support channels will remain locked until your verification is complete.
              </p>
              <div className="bg-[#0b1329]/50 border border-white/5 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-350">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Verify Identity Book, Card, or Passport</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-350">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Verify Proof of Physical Address (Utility bill)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-350">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Provide Experian TrueID Biometric Selfie</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/portal/documents"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl text-[10.5px] uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5"
                >
                  Go to Verification Vault
                </Link>
                <Link
                  href="/portal/dashboard"
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/5 font-black py-3 rounded-xl text-[10.5px] uppercase tracking-wider transition-all flex items-center justify-center"
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

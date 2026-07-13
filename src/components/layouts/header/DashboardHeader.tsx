"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HeaderAction from "./components/HeaderAction";
import useGlobalContext from "@/hooks/use-context";
import { useDashboardContext } from "../DashboardProvider";
import { Menu, Search, Command as CommandIcon, HelpCircle } from "lucide-react";
import Link from "next/link";
import { resolveActiveNav } from "@/lib/nav/matchActiveNav";

// Section-aware subtitle clause, keyed by the active nav module (see
// src/data/dashboard-nav.ts for module ids). No network/data-fetching involved —
// this only reads the already-resolved route module, same as the sidebar does.
const SECTION_CLAUSES: Record<string, string> = {
  dashboard: "here's where things stand today.",
  "crm-sales": "your contacts are right where you left them.",
  marketing: "let's see what's converting.",
  "finance-accounting": "keep the cash flow moving.",
  "commerce-ops": "everything's running on schedule.",
  learning: "your students are waiting.",
  communication: "your conversations are all caught up.",
  settings: "your workspace, your rules.",
};
const DEFAULT_CLAUSE = "here's where things stand today.";

function getGreetingSubtitle(pathname: string | null): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const moduleId = pathname ? resolveActiveNav(pathname)?.moduleId : null;
  const clause = (moduleId && SECTION_CLAUSES[moduleId]) || DEFAULT_CLAUSE;
  return `${timeGreeting} — ${clause}`;
}

const DashboardHeader = () => {
    const { setSideMenuOpen, setSearchOpen } = useGlobalContext();
    const { enrichedWorkspace } = useDashboardContext();
    const pathname = usePathname();
    const [hasUpdate, setHasUpdate] = useState(false);

    useEffect(() => {
        if (!pathname) return;
        
        async function checkReleaseNotes() {
            try {
                const res = await fetch(`/api/platform/release-notes?route=${encodeURIComponent(pathname)}`);
                if (res.ok) {
                    const json = await res.json();
                    setHasUpdate(json.data && json.data.length > 0);
                }
            } catch (err) {
                console.error("Failed to check release notes:", err);
            }
        }

        checkReleaseNotes();
        
        // Listen to a custom event if release notes are read/dismissed
        const handleDismiss = () => setHasUpdate(false);
        window.addEventListener('dismiss-help-alert', handleDismiss);
        return () => window.removeEventListener('dismiss-help-alert', handleDismiss);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-40 w-full bg-dash-bg/90 backdrop-blur-md border-b border-dash-border h-[70px] flex items-center px-4 md:px-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between w-full h-full gap-4">
                {/* Left: Hamburger & Mobile Logo / Greeting */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink">
                    <button
                        onClick={() => setSideMenuOpen(true)}
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-xl lg:hidden transition-all active:scale-95"
                    >
                        <Menu size={22} />
                    </button>

                    {/* Mobile Logo (Only visible on small screens when sidebar is hidden) */}
                    <img
                        src="/assets/images/brand/LeadsMind_Logo.png.png"
                        alt="LeadsMind"
                        className="lg:hidden flex-shrink-0 h-10 w-auto object-contain"
                    />

                    <div className="flex flex-col justify-center min-w-0 ml-1 md:ml-2">
                        <h2 className="text-[14px] md:text-[16px] font-bold !text-dash-text tracking-tight truncate leading-tight">
                            Hello, <span className="text-dash-accent">{enrichedWorkspace?.name || 'Workspace'}</span> 👋
                        </h2>
                        <p className="text-[11px] md:text-[12px] !text-dash-textMuted font-medium truncate hidden xs:block">
                            {getGreetingSubtitle(pathname)}
                        </p>
                    </div>
                </div>

                {/* Center: Search (Hidden on mobile/tablet) */}
                <div className="hidden xl:flex flex-1 justify-center px-4">
                    <div
                        className="relative w-full max-w-[360px] cursor-pointer group"
                        onClick={() => setSearchOpen(true)}
                    >
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none !text-dash-textMuted group-hover:!text-dash-accent transition-colors motion-reduce:transition-none">
                            <Search size={14} />
                        </div>
                        <div className="w-full bg-dash-surface border border-dash-border shadow-[0_1px_2px_rgba(15,23,42,0.04)] group-hover:border-dash-accent/40 group-hover:shadow-[0_2px_8px_rgba(19,89,255,0.12)] rounded-xl py-1.5 pl-10 pr-12 text-[12px] !text-dash-textMuted select-none flex items-center h-[38px] transition-all motion-reduce:transition-none">
                            Search everything...
                        </div>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <div className="flex items-center gap-0.5 text-[8px] font-black !text-dash-textMuted border border-dash-border rounded-lg px-1.5 py-1 bg-dash-bg">
                                <CommandIcon size={8} />
                                <span>K</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-help-drawer'))}
                        title="Open page help documentation"
                        className="relative w-9 h-9 flex items-center justify-center !text-dash-textMuted hover:text-dash-accent hover:bg-dash-surface rounded-xl transition-all active:scale-95"
                    >
                        <HelpCircle size={18} />
                        {hasUpdate && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                        )}
                        {hasUpdate && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
                        )}
                    </button>
                    <HeaderAction />
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
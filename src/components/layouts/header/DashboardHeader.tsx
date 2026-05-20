"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HeaderAction from "./components/HeaderAction";
import useGlobalContext from "@/hooks/use-context";
import { useDashboardContext } from "../DashboardProvider";
import { Menu, Search, Command as CommandIcon, Zap, HelpCircle } from "lucide-react";
import Link from "next/link";

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
        <header className="sticky top-0 z-40 w-full bg-n900/80 backdrop-blur-md border-b border-white/5 h-[70px] flex items-center px-4 md:px-6">
            <div className="flex items-center justify-between w-full h-full gap-4">
                {/* Left: Hamburger & Mobile Logo / Greeting */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink">
                    <button 
                        onClick={() => setSideMenuOpen(true)} 
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-t2 hover:text-t1 hover:bg-white/[0.05] rounded-xl lg:hidden transition-all active:scale-95"
                    >
                        <Menu size={22} />
                    </button>
                    
                    {/* Mobile Logo (Only visible on small screens when sidebar is hidden) */}
                    <div className="lg:hidden flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-lg shadow-accent/20">
                        <Zap size={16} className="text-white fill-white" />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center min-w-0 ml-1 md:ml-2">
                        <h2 className="text-[14px] md:text-[16px] font-space font-bold text-t1 tracking-tight truncate leading-tight">
                            Hello, <span className="text-accent2">{enrichedWorkspace?.name || 'Workspace'}</span> 👋
                        </h2>
                        <p className="text-[9px] md:text-[10px] text-t3 uppercase font-black tracking-widest truncate hidden xs:block">Operating System</p>
                    </div>
                </div>

                {/* Center: Search (Hidden on mobile/tablet) */}
                <div className="hidden xl:flex flex-1 justify-center px-4">
                    <div 
                        className="relative w-full max-w-[360px] cursor-pointer group"
                        onClick={() => setSearchOpen(true)}
                    >
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-t3 group-hover:text-t2 transition-colors">
                            <Search size={14} />
                        </div>
                        <div className="w-full bg-white/[0.03] border border-white/5 group-hover:border-white/10 group-hover:bg-white/[0.06] rounded-xl py-1.5 pl-10 pr-12 text-[12px] text-t3 select-none flex items-center h-[38px] transition-all">
                            Search everything...
                        </div>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <div className="flex items-center gap-0.5 text-[8px] font-black text-t4 border border-white/10 rounded-lg px-1.5 py-1 bg-white/[0.02]">
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
                        className="relative w-9 h-9 flex items-center justify-center text-t2 hover:text-primary hover:bg-white/[0.05] rounded-xl transition-all active:scale-95"
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
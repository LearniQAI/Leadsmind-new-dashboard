"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import HeaderAction from "./components/HeaderAction";
import useGlobalContext from "@/hooks/use-context";
import { useDashboardContext } from "../DashboardProvider";
import { Menu, Search, Command as CommandIcon, HelpCircle, ChevronDown, Check, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspace } from "@/app/actions/auth";
import { toast } from "sonner";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import UserAvatar from "@/components/ui/UserAvatar";

interface WorkspaceItem {
    id: string;
    name: string;
    slug: string;
    role: string;
}

const DashboardHeader = () => {
    const { setSideMenuOpen, setSearchOpen } = useGlobalContext();
    const { enrichedWorkspace, user } = useDashboardContext();
    const pathname = usePathname();
    const router = useRouter();
    const [hasUpdate, setHasUpdate] = useState(false);
    const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
    const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const supabase = createClient();
    
    // Scroll animation states for Mobile
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        if (latest > previous && latest > 50) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

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
        
        const handleDismiss = () => setHasUpdate(false);
        window.addEventListener('dismiss-help-alert', handleDismiss);
        return () => window.removeEventListener('dismiss-help-alert', handleDismiss);
    }, [pathname]);

    useEffect(() => {
        async function fetchUserWorkspaces() {
            if (!user?.id) return;
            const { data, error } = await supabase
                .from('workspace_members')
                .select(`
                    role,
                    workspace_id,
                    workspaces (
                        id, name, slug
                    )
                `)
                .eq('user_id', user.id);

            if (!error && data) {
                const wsItems = data
                    .filter((m: any) => m.workspaces)
                    .map((m: any) => ({
                        id: m.workspaces.id,
                        name: m.workspaces.name,
                        slug: m.workspaces.slug,
                        role: m.role,
                    }));
                setWorkspaces(wsItems);
            }
        }
        fetchUserWorkspaces();
    }, [user?.id, supabase]);

    useEffect(() => {
        if (!isWorkspaceDropdownOpen) return;
        const handlePointerDown = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsWorkspaceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isWorkspaceDropdownOpen]);

    const handleWorkspaceSwitch = async (workspaceId: string) => {
        if (workspaceId === enrichedWorkspace?.id) {
            setIsWorkspaceDropdownOpen(false);
            return;
        }

        const toastId = toast.loading("Switching workspace...");
        try {
            const result = await setActiveWorkspace(workspaceId);
            if (!result.success) {
                toast.error(result.error || "Unable to switch workspace. Please try again.", { id: toastId });
                setIsWorkspaceDropdownOpen(false);
                return;
            }
            toast.success("Workspace switched successfully", { id: toastId });
            setIsWorkspaceDropdownOpen(false);
            router.refresh();
            window.location.reload();
        } catch (error) {
            toast.error("Unable to switch workspace. Please try again.", { id: toastId });
        }
    };

    return (
        <>
            {/* MOBILE HEADER (up to 768px) */}
            <header className="sticky top-0 z-40 w-full bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E5E7EB] flex flex-col md:hidden shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                {/* Top Row: Hamburger, Logo, Avatar Menu */}
                <div className="flex items-center justify-between px-4 py-3 h-[60px] bg-white">
                    {/* Left: Hamburger */}
                    <button
                        onClick={() => setSideMenuOpen(true)}
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-[#E5E7EB]"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Center: Logo */}
                    <img
                        src="/assets/images/brand/LeadsMind_Logo.png.png"
                        alt="LeadsMind"
                        className="h-7 w-auto object-contain max-w-[100px]"
                    />

                    {/* Right: User Avatar Only */}
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        className="flex-shrink-0 p-0.5 rounded-full border border-transparent hover:border-slate-200 transition-colors"
                        onClick={() => {
                            // Can trigger mobile user dropdown or dispatch event
                            const headerAvatarBtn = document.querySelector('.nav-item button[aria-haspopup="menu"]') as HTMLButtonElement;
                            if (headerAvatarBtn) headerAvatarBtn.click();
                        }}
                    >
                        <UserAvatar 
                            avatarUrl={user?.avatarUrl}
                            oauthImage={user?.oauthImage}
                            firstName={user?.firstName}
                            lastName={user?.lastName}
                            size="md"
                            showOnlineIndicator={true}
                        />
                    </motion.button>
                </div>

                {/* Second Row: Search Trigger (Collapsible) */}
                <motion.div 
                    variants={{
                        visible: { height: "60px", opacity: 1, paddingBottom: "12px", paddingTop: "0px", display: "flex" },
                        hidden: { height: 0, opacity: 0, paddingBottom: 0, paddingTop: 0, transitionEnd: { display: "none" } }
                    }}
                    animate={hidden ? "hidden" : "visible"}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="px-4 bg-white overflow-hidden flex items-start"
                >
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="w-full flex items-center bg-white border border-[#E5E7EB] rounded-[14px] h-[44px] px-3.5 hover:border-[#CBD5E1] transition-all shadow-sm active:scale-[0.98]"
                    >
                        <Search size={16} className="text-slate-400 mr-2.5 flex-shrink-0" />
                        <span className="text-[14px] text-slate-500 flex-1 text-left select-none font-medium">
                            Search workspace...
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 border border-[#E5E7EB] rounded-lg px-2 py-1 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <CommandIcon size={10} />
                            <span>K</span>
                        </div>
                    </button>
                </motion.div>
                
                {/* Hidden wrapper to keep original HeaderAction mounted in the DOM for trigger binding */}
                <div className="hidden">
                    <HeaderAction />
                </div>
            </header>

            {/* DESKTOP HEADER (768px and up) */}
            <header className="sticky top-0 z-40 w-full bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E5E7EB] h-[70px] hidden md:flex items-center px-6 shadow-[0_1px_3px_rgba(15,23,42,0.02)]">
                <div className="flex items-center justify-between w-full h-full gap-4">
                    {/* Left Side: Mobile Menu, Logo & Workspace Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                        {/* Clean Executive Workspace Label */}
                        <div className="flex flex-col text-left justify-center min-w-0 ml-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider !text-slate-400 leading-none">
                                Workspace
                            </span>
                            <h1 className="text-[15px] font-bold !text-[#0F172A] mt-1 truncate leading-tight max-w-[180px]">
                                {enrichedWorkspace?.name || 'LeadsMind Workspace'}
                            </h1>
                        </div>
                    </div>

                    {/* Center: Large Premium Global Search */}
                    <div className="flex flex-1 justify-center px-4 max-w-[600px] mx-auto">
                        <button
                            type="button"
                            className="relative w-full group flex items-center bg-white border border-[#E5E7EB] rounded-[14px] h-[48px] px-3.5 hover:border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all duration-200 shadow-sm"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search size={16} className="text-slate-400 group-hover:text-slate-500 mr-2.5 flex-shrink-0 transition-colors" />
                            <span className="text-[13px] text-slate-500 flex-1 text-left select-none">
                                Search anything...
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 border border-[#E5E7EB] rounded-lg px-2 py-1 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ml-2">
                                <CommandIcon size={10} />
                                <span>K</span>
                            </div>
                        </button>
                    </div>

                    {/* Right Side: Switcher, Notifications, Help Center, Profile */}
                    <div className="flex items-center gap-3 flex-shrink-0" ref={dropdownRef}>
                        {/* Workspace Switcher */}
                        {workspaces.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                                    className="h-9 px-3 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50 text-[12px] font-semibold !text-[#0F172A] flex items-center gap-1.5 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.02)] active:scale-98"
                                >
                                    <Layers size={13} className="text-primary" />
                                    <span className="truncate max-w-[100px]">
                                        {enrichedWorkspace?.name || 'Switch'}
                                    </span>
                                    <ChevronDown size={12} className="text-slate-400" />
                                </button>

                                {isWorkspaceDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-3 py-1.5 text-[9px] font-bold !text-slate-400 uppercase tracking-wider">
                                            Switch Workspace
                                        </div>
                                        <div className="space-y-0.5 mt-1">
                                            {workspaces.map((ws) => (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => handleWorkspaceSwitch(ws.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-[12px] transition-colors flex items-center justify-between ${
                                                        ws.id === enrichedWorkspace?.id
                                                            ? "bg-primary/10 !text-primary font-bold"
                                                            : "!text-slate-700 hover:bg-slate-50 hover:!text-slate-900"
                                                    }`}
                                                >
                                                    <span className="truncate">{ws.name}</span>
                                                    {ws.id === enrichedWorkspace?.id && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Help Center Icon */}
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-help-drawer'))}
                            title="Open page help documentation"
                            className="relative w-9 h-9 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-all active:scale-95 border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
                        >
                            <HelpCircle size={17} />
                            {hasUpdate && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                            )}
                            {hasUpdate && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            )}
                        </button>

                        {/* Notifications & Profile dropdown dropdowns */}
                        <HeaderAction />
                    </div>
                </div>
            </header>
        </>
    );
};

export default DashboardHeader;
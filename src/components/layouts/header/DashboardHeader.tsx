"use client";
import React, { useState } from "react";
import HeaderAction from "./components/HeaderAction";
import useGlobalContext from "@/hooks/use-context";
import sidebarData from "@/data/sidebar-data";
import Link from "next/link";
import { SidebarCategory } from "@/interface";
import { useDashboardContext } from "../DashboardProvider";

const DashboardHeader = () => {
    const { sidebarHandle, setSearchOpen } = useGlobalContext();
    const { enrichedWorkspace } = useDashboardContext();

    return (
        <header className="app__header__area px-6 sticky top-0 z-[1000] bg-n900/80 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center justify-between h-full">
                {/* Left: Greeting */}
                <div className="flex items-center gap-4">
                    <button onClick={sidebarHandle} className="text-t2 hover:text-t1 lg:hidden">
                        <i className="fa-solid fa-bars text-xl"></i>
                    </button>
                    <h2 className="header__title whitespace-nowrap">
                        Hello, <span>{enrichedWorkspace?.name || 'Workspace'}</span> 👋
                    </h2>
                </div>

                {/* Center: Search */}
                <div className="hidden md:flex flex-1 justify-center px-8">
                    <div 
                        className="relative w-full max-w-[320px] cursor-pointer"
                        onClick={() => setSearchOpen(true)}
                    >
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-t3">
                            <i className="fa-solid fa-magnifying-glass text-xs"></i>
                        </div>
                        <div className="w-full bg-white/[0.05] border border-white/5 rounded-lg py-1.5 pl-9 pr-12 text-[13px] text-t3 select-none flex items-center h-[34px]">
                            Search leads, tasks, funnels...
                        </div>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <span className="text-[10px] font-bold text-t4 border border-white/10 rounded px-1.5 py-0.5">⌘K</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center">
                    <HeaderAction />
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
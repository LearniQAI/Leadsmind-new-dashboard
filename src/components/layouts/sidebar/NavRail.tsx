"use client";
import React from "react";
import { NavModule } from "@/interface";
import NavRailModule from "./NavRailModule";

interface NavRailProps {
  modules: NavModule[];
  activeModuleId: string | null;
  activeItemId?: number;
  pathname: string;
  isCollapse: boolean;
  onSelectModule: (moduleId: string) => void;
  onToggleCollapse: () => void;
  onHoverModule: (moduleId: string | null) => void;
  onNavigate?: () => void;
}

const NavRail: React.FC<NavRailProps> = ({
  modules,
  activeModuleId,
  activeItemId,
  pathname,
  isCollapse,
  onSelectModule,
  onToggleCollapse,
  onHoverModule,
  onNavigate,
}) => {
  // Widths must stay in literal-string sync with src/lib/nav/sidebarWidth.ts
  // (RAIL_COLLAPSED_WIDTH=72, RAIL_EXPANDED_WIDTH=208) — Tailwind can't pick up
  // dynamically-interpolated arbitrary-value classes, only literal ones.
  return (
    <nav
      className={`hidden lg:flex flex-col ${isCollapse ? "items-center w-[72px]" : "items-stretch w-[208px] px-2"} flex-shrink-0 h-full bg-dash-bg border-r border-dash-border py-4 gap-1`}
    >
      {modules.map((module) => (
        <NavRailModule
          key={module.id}
          module={module}
          isActive={module.id === activeModuleId}
          isCollapse={isCollapse}
          pathname={pathname}
          activeItemId={activeItemId}
          onSelectModule={onSelectModule}
          onHoverModule={onHoverModule}
          onNavigate={onNavigate}
        />
      ))}

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapse ? "Expand navigation" : "Collapse navigation"}
        className={`mt-auto rounded-lg flex items-center !text-dash-textMuted hover:bg-dash-surface hover:!text-dash-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2 ${
          isCollapse ? "w-10 h-10 justify-center" : "w-full gap-3 px-4 py-2.5"
        }`}
      >
        <i className={`fa-solid fa-angles-${isCollapse ? "right" : "left"} text-xs ${isCollapse ? "" : "w-5 text-center flex-shrink-0"}`}></i>
        {!isCollapse && <span className="text-[12px] font-bold uppercase tracking-tight">Collapse</span>}
      </button>
    </nav>
  );
};

export default NavRail;

"use client";
import Link from "next/link";
import React from "react";
import { NavModule } from "@/interface";
import NavItemsList from "./NavItemsList";

interface NavRailProps {
  modules: NavModule[];
  activeModuleId: string | null;
  activeItemId?: number;
  pathname: string;
  isCollapse: boolean;
  onSelectModule: (moduleId: string) => void;
  onToggleCollapse: () => void;
  onHoverModule: (moduleId: string | null) => void;
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
}) => {
  // Widths must stay in literal-string sync with src/lib/nav/sidebarWidth.ts
  // (RAIL_COLLAPSED_WIDTH=72, RAIL_EXPANDED_WIDTH=208) — Tailwind can't pick up
  // dynamically-interpolated arbitrary-value classes, only literal ones.
  return (
    <nav
      className={`hidden lg:flex flex-col ${isCollapse ? "items-center w-[72px]" : "items-stretch w-[208px] px-2"} flex-shrink-0 h-full bg-dash-bg border-r border-dash-border py-4 gap-1`}
    >
      {modules.map((module) => {
        const isActive = module.id === activeModuleId;
        const isDirectLink = Boolean(module.link) && !module.items;

        const button = isCollapse ? (
          <button
            type="button"
            onClick={() => !isDirectLink && onSelectModule(module.id)}
            aria-current={isActive ? "true" : undefined}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2 ${
              isActive
                ? "bg-dash-accent/10 text-dash-accent"
                : "!text-dash-textMuted hover:bg-dash-surface hover:!text-dash-text"
            }`}
          >
            <i className={`${module.icon} text-[17px]`}></i>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => !isDirectLink && onSelectModule(module.id)}
            aria-current={isActive ? "true" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2 ${
              isActive
                ? "bg-dash-accent/10 text-dash-accent"
                : "!text-dash-textMuted hover:bg-dash-surface hover:!text-dash-text"
            }`}
          >
            <i className={`${module.icon} text-[16px] w-5 flex-shrink-0 text-center`}></i>
            <span className="text-[12px] font-bold uppercase tracking-tight truncate">{module.label}</span>
          </button>
        );

        return (
          <div
            key={module.id}
            className="group relative w-full flex justify-center"
            onMouseEnter={() => onHoverModule(module.id)}
          >
            {isDirectLink ? <Link href={module.link!} className="w-full">{button}</Link> : button}

            {isCollapse && module.items && (
              <div
                className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100
                  transition-opacity duration-150 motion-reduce:transition-none absolute left-full top-0 ml-2 z-[1100]
                  w-[220px] bg-dash-surface border border-dash-border rounded-xl shadow-xl p-3"
              >
                <h3 className="text-[11px] font-black uppercase tracking-wider !text-dash-text px-2 pb-2">
                  {module.label}
                </h3>
                <NavItemsList items={module.items} pathname={pathname} activeItemId={activeItemId} />
              </div>
            )}
          </div>
        );
      })}

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

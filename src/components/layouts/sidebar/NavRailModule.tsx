"use client";
import Link from "next/link";
import React, { useLayoutEffect, useRef, useState } from "react";
import { NavModule } from "@/interface";
import NavItemsList from "./NavItemsList";

interface NavRailModuleProps {
  module: NavModule;
  isActive: boolean;
  isCollapse: boolean;
  pathname: string;
  activeItemId?: number;
  onSelectModule: (moduleId: string) => void;
  onHoverModule: (moduleId: string | null) => void;
}

// Fixed-position, viewport-clamped flyout for the collapsed icon rail. The
// rail is pinned full-height, so a module near the bottom (e.g. Settings)
// opening a tall submenu top-aligned to the icon runs off the bottom of the
// screen with no way to scroll to the rest — clamping the computed `top`
// keeps the whole panel on-screen instead.
const FLYOUT_MARGIN = 8;

const NavRailModule: React.FC<NavRailModuleProps> = ({
  module,
  isActive,
  isCollapse,
  pathname,
  activeItemId,
  onSelectModule,
  onHoverModule,
}) => {
  const isDirectLink = Boolean(module.link) && !module.items;
  const triggerRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Always fixed + off-screen by default so the (still-mounted, for measuring
  // and instant-open) panel never participates in the rail's own layout flow.
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !flyoutRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const flyoutHeight = flyoutRef.current.offsetHeight;
    const maxTop = window.innerHeight - flyoutHeight - FLYOUT_MARGIN;

    const top = Math.max(FLYOUT_MARGIN, Math.min(triggerRect.top, maxTop));

    setStyle({
      position: "fixed",
      top,
      left: triggerRect.right + 8,
      maxHeight: `calc(100vh - ${FLYOUT_MARGIN * 2}px)`,
    });
  }, [isOpen]);

  const handleEnter = () => {
    onHoverModule(module.id);
    if (isCollapse && module.items) setIsOpen(true);
  };

  const handleLeave = () => {
    setIsOpen(false);
  };

  // Keyboard nav: only close when focus actually leaves this module (button
  // + its flyout links), not when it merely moves from the button to a link
  // inside the same flyout — those live in the same DOM subtree but render
  // fixed-positioned elsewhere on screen, so a plain blur would fire on every
  // Tab press between them.
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsOpen(false);
    }
  };

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
      ref={triggerRef}
      className="group relative w-full flex justify-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleBlur}
    >
      {isDirectLink ? (
        <Link href={module.link!} className="w-full">
          {button}
        </Link>
      ) : (
        button
      )}

      {isCollapse && module.items && (
        <div
          ref={flyoutRef}
          style={style}
          className={`${isOpen ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"}
            transition-opacity duration-150 motion-reduce:transition-none z-[1100]
            w-[220px] bg-dash-surface border border-dash-border rounded-xl shadow-xl p-3 overflow-y-auto`}
        >
          <h3 className="text-[11px] font-black uppercase tracking-wider !text-dash-text px-2 pb-2">
            {module.label}
          </h3>
          <NavItemsList items={module.items} pathname={pathname} activeItemId={activeItemId} />
        </div>
      )}
    </div>
  );
};

export default NavRailModule;

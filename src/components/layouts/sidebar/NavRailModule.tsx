"use client";
import Link from "next/link";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavModule } from "@/interface";
import NavItemsList from "./NavItemsList";
import HoverInfoTrigger from "./hover-info/HoverInfoTrigger";
import { level1Content, level1LenaQuestion } from "@/data/sidebar-hover-content";

interface NavRailModuleProps {
  module: NavModule;
  isActive: boolean;
  isCollapse: boolean;
  pathname: string;
  activeItemId?: number;
  onSelectModule: (moduleId: string) => void;
  onHoverModule: (moduleId: string | null) => void;
  onNavigate?: () => void;
  // Collapsed-rail flyout open state now lives one level up (NavRail), so only
  // one module's flyout can be open at a time — see NavRail's openModuleId.
  isFlyoutOpen: boolean;
  onToggleFlyout: (moduleId: string) => void;
  onCloseFlyout: () => void;
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
  onNavigate,
  isFlyoutOpen,
  onToggleFlyout,
  onCloseFlyout,
}) => {
  const isDirectLink = Boolean(module.link) && !module.items;
  const hasFlyout = isCollapse && Boolean(module.items);
  const triggerRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  // Always fixed + off-screen by default so the (still-mounted, for measuring
  // and instant-open) panel never participates in the rail's own layout flow.
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!isFlyoutOpen || !triggerRef.current || !flyoutRef.current) return;

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
  }, [isFlyoutOpen]);

  // Click-outside-to-close: only armed while this module's flyout is open.
  // Checks real DOM containment against both the trigger and the flyout
  // (which is visually elsewhere on screen via position:fixed, but still a
  // DOM descendant of triggerRef) so a click on either never closes it.
  useEffect(() => {
    if (!isFlyoutOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      onCloseFlyout();
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isFlyoutOpen, onCloseFlyout]);

  const handleEnter = () => {
    onHoverModule(module.id);
  };

  const handleLeave = () => {
    onHoverModule(null);
  };

  const handleClick = () => {
    if (isDirectLink) return;
    onSelectModule(module.id);
    if (hasFlyout) onToggleFlyout(module.id);
  };

  // Escape closes the open flyout and keeps focus on the trigger button
  // rather than dropping it, so keyboard users aren't left with focus
  // lost to the (now-hidden) content that used to be under it.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && isFlyoutOpen) {
      e.stopPropagation();
      onCloseFlyout();
      (e.currentTarget.querySelector("button") as HTMLButtonElement | null)?.focus();
    }
  };

  // Only close on blur if focus actually leaves this module (button + its
  // flyout links), not when it merely moves from the button to a link
  // inside the same flyout — those live in the same DOM subtree but render
  // fixed-positioned elsewhere on screen, so a plain blur would fire on every
  // Tab press between them.
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      onCloseFlyout();
    }
  };

  const button = isCollapse ? (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isActive ? "true" : undefined}
      aria-expanded={hasFlyout ? isFlyoutOpen : undefined}
      aria-haspopup={hasFlyout ? "true" : undefined}
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

  const hoverContent = level1Content[module.id];

  return (
    <div
      ref={triggerRef}
      className="group relative w-full flex justify-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {isDirectLink ? (
        <Link href={module.link!} className="w-full">
          {button}
        </Link>
      ) : (
        button
      )}

      {/* Direct-link modules (e.g. Dashboard) have no flyout to host their
          Level 1 info trigger's header, so it sits as its own small overlay
          on the row instead — kept outside the Link so it isn't a nested
          interactive element. */}
      {isDirectLink && hoverContent && (
        <div className={isCollapse ? "absolute top-0.5 right-1" : "absolute right-2.5 top-1/2 -translate-y-1/2"}>
          <HoverInfoTrigger
            className={isCollapse ? "w-4 h-4 bg-dash-bg rounded-full shadow-sm" : "w-5 h-5"}
            content={{
              level: 1,
              icon: module.icon,
              title: module.label,
              description: hoverContent.description,
              quickActions: hoverContent.quickActions,
              lenaQuestion: level1LenaQuestion(module.label),
            }}
          />
        </div>
      )}

      {hasFlyout && (
        <div
          ref={flyoutRef}
          style={style}
          className={`${isFlyoutOpen ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"}
            transition-opacity duration-150 motion-reduce:transition-none z-[1100]
            w-[220px] bg-dash-surface border border-dash-border rounded-xl shadow-xl p-3 overflow-y-auto`}
        >
          <div className="flex items-center gap-2 px-2 pb-2">
            <h3 className="min-w-0 flex-1 text-[11px] font-black uppercase tracking-wider !text-dash-text truncate">
              {module.label}
            </h3>
            {hoverContent && (
              <HoverInfoTrigger
                className="w-6 h-6"
                content={{
                  level: 1,
                  icon: module.icon,
                  title: module.label,
                  description: hoverContent.description,
                  quickActions: hoverContent.quickActions,
                  lenaQuestion: level1LenaQuestion(module.label),
                }}
              />
            )}
          </div>
          <NavItemsList
            items={module.items}
            pathname={pathname}
            activeItemId={activeItemId}
            onNavigate={onNavigate}
            moduleLabel={module.label}
          />
        </div>
      )}
    </div>
  );
};

export default NavRailModule;

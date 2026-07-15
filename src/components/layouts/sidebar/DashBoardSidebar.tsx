"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import useGlobalContext from "@/hooks/use-context";
import dashboardNav from "@/data/dashboard-nav";
import { usePathname } from "next/navigation";
import { useDashboardContext } from "../DashboardProvider";
import { X, ChevronDown } from "lucide-react";
import { resolveActiveNav } from "@/lib/nav/matchActiveNav";
import { filterNavByPermissions } from "@/lib/nav/filterNavByPermissions";
import NavRail from "./NavRail";
import NavSubPanel from "./NavSubPanel";
import NavItemsList from "./NavItemsList";

const DashBoardSidebar = () => {
  const { isCollapse, setIsCollapse, sideMenuOpen, setSideMenuOpen } = useGlobalContext();
  const { role, permissions } = useDashboardContext() as any;
  const pathName = usePathname();

  const visibleModules = filterNavByPermissions(dashboardNav, { role, permissions });
  const activeNav = resolveActiveNav(pathName);

  // Clicking a rail module that has no page of its own (e.g. "Marketing") should
  // preview its sub-nav immediately, without waiting for a navigation to occur.
  // The override resets as soon as the URL actually changes, so the URL remains
  // the source of truth for active state on load/refresh/deep-link.
  const [manualModuleId, setManualModuleId] = useState<string | null>(null);
  useEffect(() => {
    setManualModuleId(null);
    if (window.innerWidth < 1200) {
      setSideMenuOpen(false);
    }
  }, [pathName, setSideMenuOpen]);

  // Auto-collapse to the icon-only rail once the user navigates into a
  // module's sub-page — the expanded rail + persistent sub-nav panel both
  // eating horizontal space stops being worth it once someone is actively
  // working inside a page. Dashboard home is exempt (it's a landing/overview
  // screen that benefits from labels). A user's explicit expand is a real
  // choice, so once they toggle back open we stop auto-collapsing until they
  // manually collapse again — userExpandedRef tracks that override for the
  // life of this mount; it isn't persisted, so a fresh load still gets the
  // smart default.
  const userExpandedRef = useRef(false);
  const prevPathRef = useRef(pathName);
  useEffect(() => {
    const navigated = prevPathRef.current !== pathName;
    prevPathRef.current = pathName;
    if (!navigated || userExpandedRef.current) return;
    if (activeNav?.itemId && activeNav.moduleId !== "dashboard") {
      setIsCollapse(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathName]);

  const handleToggleCollapse = () => {
    const next = !isCollapse;
    userExpandedRef.current = !next; // true only while expanded-by-choice
    setIsCollapse(next);
  };

  // "True" active module — what the rail's own selected/highlighted state shows.
  // Never affected by hover; only by an actual click-to-pin or real navigation.
  const activeModuleId = manualModuleId ?? activeNav?.moduleId ?? null;

  // Hovering a rail module temporarily previews its sub-nav content, purely as
  // an at-rest convenience. It must never outlive the hover itself — the moment
  // the pointer leaves the rail/sub-nav region (see onMouseLeave below),
  // hoveredModuleId resets to null and the preview collapses back to whatever
  // the true active module actually is, per matchActiveNav(pathname).
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  useEffect(() => {
    setHoveredModuleId(null);
  }, [pathName]);

  // The module whose content the sub-panel actually renders right now. Also
  // drives the sidebar's width (hasSubNav) so the two never disagree — if they
  // did, hovering a with-items module while parked on a no-items page (or vice
  // versa) would either overflow the rail or leave a blank gap.
  const previewModuleId = hoveredModuleId ?? activeModuleId;
  const previewModule = visibleModules.find((m) => m.id === previewModuleId);
  const hasSubNav = Boolean(previewModule?.items) && !isCollapse;

  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(activeNav?.moduleId ?? null);
  useEffect(() => {
    setMobileExpandedId(activeNav?.moduleId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathName]);

  return (
    <>
      {sideMenuOpen && (
        <div
          onClick={() => setSideMenuOpen(false)}
          className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-[1000] lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-dash-bg border-r border-dash-border z-[1000] transition-all duration-300 ease-in-out flex flex-col
          w-[280px] ${sideMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          lg:translate-x-0 ${isCollapse ? "lg:w-[72px]" : hasSubNav ? "lg:w-[428px]" : "lg:w-[208px]"}`}
      >
        {/* Logo — widths must stay in sync with src/lib/nav/sidebarWidth.ts.
            Desktop-collapsed shows the dedicated square icon mark (icon0.svg);
            everywhere else shows the full LeadsMind lockup. */}
        <div className="h-[70px] flex items-center justify-between px-5 border-b border-dash-border flex-shrink-0">
          <Link href="/dashboard" className="flex items-center min-w-0">
            {/* Icon-only mark: desktop rail collapsed ONLY. The mobile drawer is
                always full-width regardless of the desktop isCollapse preference
                stored in localStorage, so this must never show below lg. */}
            <img
              src="/icon0.svg"
              alt="LeadsMind"
              width={36}
              height={36}
              className={`w-9 h-9 flex-shrink-0 object-contain ${
                isCollapse ? "hidden lg:block" : "hidden"
              }`}
            />
            <img
              src="/assets/images/brand/LeadsMind_Logo.png.png"
              alt="LeadsMind"
              className={`h-8 w-auto object-contain ${isCollapse ? "lg:hidden" : ""}`}
            />
          </Link>
          <button
            onClick={() => setSideMenuOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center bg-dash-surface rounded-lg text-dash-textMuted hover:text-dash-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Desktop: rail + contextual sub-nav. onMouseLeave sits on this shared
            wrapper (not on NavRail alone) so moving the pointer from the rail
            into the sub-panel to click an item doesn't trip the revert-to-real-
            active logic — the rail and its preview panel count as one region. */}
        <div className="hidden lg:flex flex-1 min-h-0" onMouseLeave={() => setHoveredModuleId(null)}>
          <NavRail
            modules={visibleModules}
            activeModuleId={activeModuleId}
            activeItemId={activeNav?.itemId}
            pathname={pathName}
            isCollapse={isCollapse}
            onSelectModule={setManualModuleId}
            onToggleCollapse={handleToggleCollapse}
            onHoverModule={setHoveredModuleId}
          />
          {/* Gated on hasSubNav (not just previewModule?.items) so this never
              mounts while the rail is collapsed — collapsed mode has its own
              per-icon CSS flyout inside NavRail; rendering both at once is what
              produced two overlapping "module" panels on hover. */}
          {hasSubNav && <NavSubPanel module={previewModule} pathname={pathName} activeItemId={activeNav?.itemId} />}
        </div>

        {/* Mobile: rail modules as an accordion, no second column */}
        <div className="flex lg:hidden flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar py-4 px-3 gap-1">
          {visibleModules.map((module) => {
            if (!module.items) {
              return (
                <Link
                  key={module.id}
                  href={module.link!}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    module.id === activeNav?.moduleId
                      ? "bg-dash-accent/10 text-dash-accent font-bold"
                      : "text-dash-textMuted hover:bg-dash-surface hover:text-dash-text"
                  }`}
                >
                  <i className={`${module.icon} text-[15px] w-5 text-center`}></i>
                  <span className="text-[13px]">{module.label}</span>
                </Link>
              );
            }

            const isExpanded = mobileExpandedId === module.id;

            return (
              <div key={module.id}>
                <button
                  type="button"
                  onClick={() => setMobileExpandedId(isExpanded ? null : module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    module.id === activeNav?.moduleId
                      ? "text-dash-accent font-bold"
                      : "text-dash-textMuted hover:bg-dash-surface hover:text-dash-text"
                  }`}
                >
                  <i className={`${module.icon} text-[15px] w-5 text-center`}></i>
                  <span className="text-[13px] flex-1 text-left">{module.label}</span>
                  <ChevronDown
                    size={14}
                    className={`opacity-50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
                {isExpanded && (
                  <div className="pl-6 mt-1">
                    <NavItemsList
                      items={module.items}
                      pathname={pathName}
                      activeItemId={activeNav?.itemId}
                      onNavigate={() => setSideMenuOpen(false)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default DashBoardSidebar;

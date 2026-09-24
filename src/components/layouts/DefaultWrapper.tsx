"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DashboardFooter from "./footer/FooterOne";
import DashboardHeader from "./header/DashboardHeader";
import DashBoardSidebar from "./sidebar/DashBoardSidebar";
import useGlobalContext from "@/hooks/use-context";
import { useDashboardContext } from "./DashboardProvider";
import GlobalSearchModal from "../dashboard/GlobalSearchModal";
import AccessDenied from "../auth/AccessDenied";
import { getRequiredModule } from "@/lib/nav/deriveRouteMap";
import { canAccessModule, hasFullAccess } from "@/lib/permissions/modules";
import { resolveActiveNav } from "@/lib/nav/matchActiveNav";
import dashboardNav from "@/data/dashboard-nav";
import LENAChat from "../support/LENAChat";
// import LENAContextualSidebar from "../support/LENAContextualSidebar";
import HelpDrawer from "../platform/HelpDrawer";
import { FeedbackCenter } from "@/components/production/FeedbackCenter";

interface WrapperProps {
 children: React.ReactNode;
}

const Wrapper: React.FC<WrapperProps> = ({ children }) => {
 const { isCollapse } = useGlobalContext();
 const { role, permissions } = useDashboardContext() as any;
 const pathName = usePathname();
 const [isLoading, setIsLoading] = useState<boolean>(true);

 useEffect(() => {
  setIsLoading(false);
 }, []);

  // UX mirror of the real, server-side module gate in src/lib/supabase/middleware.ts
  // (which runs before the page's data is fetched). This only covers client-side
  // navigations that the middleware already allowed or skipped.
  const hasPermission = () => {
    if (hasFullAccess(role)) return true;
    if (pathName === '/' || pathName.startsWith('/auth')) return true;

    // Inside HR & Payroll, Employees additionally needs the hr role. The payroll page
    // branches internally (admin/owner/hr/payroll get the payroll-run view, everyone else
    // their own payslips); that boundary is enforced by the API routes.
    if (pathName.startsWith('/hr/employees') && role !== 'hr') return false;

    const requiredModule = getRequiredModule(pathName);
    if (!requiredModule) return true;

    return canAccessModule(role, permissions, requiredModule);
  };

 const accessGranted = hasPermission();

  const activeNav = resolveActiveNav(pathName);
  const activeModuleHasItems = Boolean(
    activeNav && dashboardNav.find((m) => m.id === activeNav.moduleId)?.items
  );
  const hasSubNav = activeModuleHasItems && !isCollapse;

  // Must stay in literal-string sync with src/lib/nav/sidebarWidth.ts and the
  // matching ternary in DashBoardSidebar.tsx's <aside> width.
  return (
   <>
    <div className="flex min-h-screen bg-dash-bg text-dash-text overflow-x-hidden">
     {/* Sidebar Component */}
     <DashBoardSidebar />

     {/* Main Content Area */}
     <div
      className={`flex flex-col flex-1 min-h-screen w-full max-w-full transition-all duration-300 ease-in-out ${
        isCollapse ? "lg:pl-[72px]" : hasSubNav ? "lg:pl-[428px]" : "lg:pl-[208px]"
      }`}
     >
      {/* Header */}
      <DashboardHeader />
      
      {/* Page Content */}
      <main className="flex-1 w-full overflow-hidden">
        {accessGranted ? children : <AccessDenied />}
      </main>
      
      {/* Footer */}
      <DashboardFooter />
      
      {/* Global Modals */}
      <GlobalSearchModal />
      <LENAChat />
      {/* <LENAContextualSidebar /> */}
      <HelpDrawer />
      <FeedbackCenter />
     </div>
    </div>
   </>
  );
};

export default Wrapper;

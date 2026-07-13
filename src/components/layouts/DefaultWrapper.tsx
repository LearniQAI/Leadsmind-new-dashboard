"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BackToTop from "@/common/BackToTop/BackToTop";
import DashboardFooter from "./footer/FooterOne";
import DashboardHeader from "./header/DashboardHeader";
import DashBoardSidebar from "./sidebar/DashBoardSidebar";
import useGlobalContext from "@/hooks/use-context";
import { useDashboardContext } from "./DashboardProvider";
import GlobalSearchModal from "../dashboard/GlobalSearchModal";
import AccessDenied from "../auth/AccessDenied";
import { getRequiredPermission } from "@/lib/nav/deriveRouteMap";
import { resolveActiveNav } from "@/lib/nav/matchActiveNav";
import dashboardNav from "@/data/dashboard-nav";
// import LENAChat from "../support/LENAChat";
// import LENAContextualSidebar from "../support/LENAContextualSidebar";
import LenaVisitorChat from "../support/LenaVisitorChat";
import HelpDrawer from "../platform/HelpDrawer";
import { FeedbackCenter } from "@/components/production/FeedbackCenter";
import { GlobalCommandPalette } from "@/components/production/GlobalCommandPalette";

interface WrapperProps {
 children: React.ReactNode;
}

const Wrapper: React.FC<WrapperProps> = ({ children }) => {
 const { isCollapse } = useGlobalContext();
 const { role, permissions, workspace } = useDashboardContext() as any;
 const workspaceId = workspace?.id || null;
 const pathName = usePathname();
 const [isLoading, setIsLoading] = useState<boolean>(true);

 useEffect(() => {
  setIsLoading(false);
 }, []);

  // Simple path to permission mapping
  const hasPermission = () => {
    if (role === 'admin' || role === 'owner') return true;
    if (pathName === '/dashboard' || pathName === '/' || pathName.startsWith('/auth')) return true;
    
    // Explicit role-based checks for HR and Payroll sections
    if (pathName.startsWith('/hr')) {
      if (pathName.startsWith('/hr/employees')) {
        return role === 'admin' || role === 'owner' || role === 'hr';
      }
      if (pathName.startsWith('/hr/payroll')) {
        return role === 'admin' || role === 'owner' || role === 'hr' || role === 'payroll';
      }
      // Allow any workspace member to access basic HR pages (Leave, Time Tracking)
      return true;
    }

    const requiredPermission = getRequiredPermission(pathName);
    if (!requiredPermission) return true;

    return permissions.includes(requiredPermission);
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
      <BackToTop />
      
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
      {/* <LENAChat /> */}
      {/* <LENAContextualSidebar /> */}
      <LenaVisitorChat workspaceId={workspaceId} />
      <HelpDrawer />
      <FeedbackCenter />
      <GlobalCommandPalette />
     </div>
    </div>
   </>
  );
};

export default Wrapper;

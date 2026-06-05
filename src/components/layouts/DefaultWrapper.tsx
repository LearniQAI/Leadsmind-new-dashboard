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

    const routeMap: Record<string, string> = {
      '/contacts': 'contacts',
      '/conversations': 'contacts',
      '/lead-finder': 'contacts',
      '/social-planner': 'marketing',
      '/pipelines': 'pipelines',
      '/proposals': 'proposals',
      '/invoices': 'invoices',
      '/quotes': 'invoices',
      '/calendar': 'calendar',
      '/websites': 'marketing',
      '/blog': 'marketing',
      '/ai-studio': 'marketing',
      '/funnels': 'marketing',
      '/campaigns': 'marketing',
      '/forms': 'marketing',
      '/social': 'marketing',
      '/reputation': 'marketing',
      '/ads': 'marketing',
      '/products': 'commerce',
      '/orders': 'commerce',
      '/finance': 'commerce',
      '/hr': 'commerce',
      '/inventory': 'commerce',
      '/projects': 'business',
      '/support': 'business',
      '/articles': 'business',
      '/community': 'business',
      '/media': 'business',
      '/automations': 'automation',
      '/courses': 'learning',
      '/settings': 'settings',
      '/tasks': 'dashboard',
    };

    const requiredPermission = Object.entries(routeMap).find(([path]) => pathName.startsWith(path))?.[1];
    if (!requiredPermission) return true; 
    
    return permissions.includes(requiredPermission);
  };

 const accessGranted = hasPermission();

  return (
   <>
    <div className="flex min-h-screen bg-n900 text-t1 overflow-x-hidden">
     {/* Sidebar Component */}
     <DashBoardSidebar />
     
     {/* Main Content Area */}
     <div 
      className={`flex flex-col flex-1 min-h-screen w-full max-w-full transition-all duration-300 ease-in-out ${
        isCollapse ? "lg:pl-[80px]" : "lg:pl-[280px]"
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

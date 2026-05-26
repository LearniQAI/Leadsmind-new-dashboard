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
import LENAChat from "../support/LENAChat";
import HelpDrawer from "../platform/HelpDrawer";
import { FeedbackCenter } from "@/components/production/FeedbackCenter";
import { GlobalCommandPalette } from "@/components/production/GlobalCommandPalette";

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

 // Simple path to permission mapping
 const hasPermission = () => {
   if (role === 'admin') return true;
   if (pathName === '/dashboard' || pathName === '/' || pathName.startsWith('/auth')) return true;
   
   const routeMap: Record<string, string> = {
     '/contacts': 'contacts',
     '/pipelines': 'pipelines',
     '/proposals': 'proposals',
     '/invoices': 'invoices',
     '/calendar': 'calendar',
     '/websites': 'marketing',
     '/funnels': 'marketing',
     '/campaigns': 'marketing',
     '/content-studio': 'marketing',
     '/automations': 'automation',
     '/settings': 'settings',
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
      <LENAChat />
      <HelpDrawer />
      <FeedbackCenter />
      <GlobalCommandPalette />
     </div>
    </div>
   </>
  );
};

export default Wrapper;

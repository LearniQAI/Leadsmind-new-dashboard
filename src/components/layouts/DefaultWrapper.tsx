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

interface WrapperProps {
 children: React.ReactNode;
}

const Wrapper: React.FC<WrapperProps> = ({ children }) => {
 const { isCollapse } = useGlobalContext();
 const pathName = usePathname();
 const [isLoading, setIsLoading] = useState<boolean>(true);

 useEffect(() => {
  setIsLoading(false);
 }, []);

  return (
   <>
    <div className="flex min-h-screen bg-n900 text-t1 overflow-x-hidden">
     {/* Sidebar Component */}
     <DashBoardSidebar />
     
     {/* Main Content Area */}
     <div 
      className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ease-in-out ${
        isCollapse ? "lg:ml-[80px]" : "lg:ml-[280px]"
      }`}
     >
      <BackToTop />
      
      {/* Header */}
      <DashboardHeader />
      
      {/* Page Content */}
      <main className="flex-1 w-full max-w-[100vw]">
        {children}
      </main>
      
      {/* Footer */}
      <DashboardFooter />
      
      {/* Global Modals */}
      <GlobalSearchModal />
     </div>
    </div>
   </>
  );
};

export default Wrapper;

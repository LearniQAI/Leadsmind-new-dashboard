"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BackToTop from "@/common/BackToTop/BackToTop";
import Preloader from "@/common/Preloader/Preloader";
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
 const { theme } = useGlobalContext();
 const { user, workspace, role, branding } = useDashboardContext();
 const pathName = usePathname();
 const [isLoading, setIsLoading] = useState<boolean>(false);

 useEffect(() => {
  setIsLoading(false);
 }, []);

 const renderHeader = () => {
  switch (pathName) {
   default:
    return <DashboardHeader />;
  }
 };

 const renderFooter = () => {
  switch (pathName) {
   default:
    return <DashboardFooter />;
  }
 };

  return (
   <>
    <div className="page__full-wrapper bg-n900">
     <DashBoardSidebar />
     <div className="page__body-wrapper bg-n900 min-h-screen flex flex-col">
      <BackToTop />
      {renderHeader()}
      <main className="flex-1">
        {children}
      </main>
      {renderFooter()}
      <GlobalSearchModal />
     </div>
    </div>
   </>
  );
};

export default Wrapper;

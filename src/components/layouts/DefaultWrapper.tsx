"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BackToTop from "@/common/BackToTop/BackToTop";
import Preloader from "@/common/Preloader/Preloader";
import DashboardFooter from "./footer/FooterOne";
import DashboardHeader from "./header/DashboardHeader";
import DashBoardSidebar from "./sidebar/DashBoardSidebar";
import useGlobalContext from "@/hooks/use-context";

interface WrapperProps {
  children: React.ReactNode;
}

import { useDashboardContext } from "./DashboardProvider";

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
      <div
        className={`page__full-wrapper ${theme === "dark" ? "dark" : "light"}`}
      >
        <DashBoardSidebar />
        <div className="page__body-wrapper bg-[#0A0F3D] min-h-screen">
          <BackToTop />
          {renderHeader()}
          {children}
          {renderFooter()}
        </div>
      </div>
    </>
  );
};

export default Wrapper;

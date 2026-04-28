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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadingTimeout = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(loadingTimeout);
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
        <div className="page__body-wrapper">
          {isLoading ? (
            <Preloader />
          ) : (
            <>
              <BackToTop />
              {renderHeader()}
              {children}
              {renderFooter()}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Wrapper;

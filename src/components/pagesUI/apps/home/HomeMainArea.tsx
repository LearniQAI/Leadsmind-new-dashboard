"use client";
import React from "react";
import MettingSchedule from "./MettingSchedule";
import CalanderSection from "./CalanderSection";
import OrderOverview from "./OrderOverview";
import CustomerSatisfaction from "./CustomerSatisfaction";
import UserActivity from "./UserActivity";
import DashboardDetailsCards from "./DashboardDetailsCards";
import AnnouncementTable from "./AnnouncementTable";

const HomeMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
          <DashboardDetailsCards />
          <MettingSchedule />
          <CalanderSection />
          <OrderOverview />
          <CustomerSatisfaction />
          <UserActivity />
          <AnnouncementTable />
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default HomeMainArea;

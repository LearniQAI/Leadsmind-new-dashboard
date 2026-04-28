import React from "react";
import AlartHeader from "./AlartHeader";
import DashboardCardItem from "./DashboardCardItem";
import MarkAttendance from "./MarkAttendance";
import AttendanceLeaves from "./AttendanceLeaves";
import Notification from "./Notification";
import Announcement from "./Announcement";
import ClientReview from "./ClientReview";
import RecentActivity from "./RecentActivity";
import LiveChatSection from "./LiveChatSection";
import MeetingScheduleTwo from "./MeetingScheduleTwo";
import EmployeeCalendar from "./EmployeeCalander";
import WelcomeThumb from "./WelcomeThumb";

const EmplyeeDashboardMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <AlartHeader />
        <div className="grid grid-cols-12 g-20 gap-x-5">
          <DashboardCardItem />
          <div className="col-span-12 xxl:col-span-4">
            <WelcomeThumb />
            <MarkAttendance />
            <MeetingScheduleTwo />
          </div>
          <div className="col-span-12 sm:col-span-6 xxl:col-span-4">
            <AttendanceLeaves />
          </div>
          <div className="col-span-12 sm:col-span-6 xxl:col-span-4">
            <Notification />
          </div>
          <div className="col-span-12 xxl:col-span-6">
            <EmployeeCalendar />
          </div>
          <div className="col-span-12 xxl:col-span-6">
            <Announcement />
          </div>
          <div className="col-span-12 xl:col-span-6 xxl:col-span-4">
            <ClientReview />
          </div>
          <div className="col-span-12 lg:col-span-6 xxl:col-span-4">
            <RecentActivity />
          </div>
          <div className="col-span-12 lg:col-span-6 xl:col-span-12 xxl:col-span-4">
            <LiveChatSection />
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}

    </>
  );
};

export default EmplyeeDashboardMainArea;

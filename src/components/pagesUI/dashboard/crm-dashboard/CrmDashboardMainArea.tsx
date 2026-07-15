import React from "react";
import SalesOverview from "./SalesOverview";
import DashboardAnalysisCard from "./DashboardAnalysisCard";
import AudienceSection from "./AudienceSection";
import CrmMiniCalander from "./CrmMiniCalander";
import CrmOrderOverview from "./CrmOrderOverview";
import CrmCustomerSatisfaction from "./CrmCustomerSatisfaction";
import CrmUserActivity from "./CrmUserActivity";
import CrmDealsStaticTable from "./CrmDealsStaticTable";
import QuickActions from "@/components/dashboard/QuickActions";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";

const CrmDashboardMainArea = () => {
  const { user } = useDashboardContext();
  return (
   <>
    {/* Page Header */}
    <div className="page-header">
     <div className="ph-left">
      <h1>Hello, <span style={{ color: "var(--accent2)" }}>{user?.firstName || 'there'}</span> 👋</h1>
      <p>Overview of your business operations &amp; revenue trends</p>
     </div>
    <div className="ph-right">
     <button className="btn-ghost mr-2">
      <i className="fa-solid fa-download mr-2"></i> Export Report
     </button>
     <button className="btn-primary">
      <i className="fa-solid fa-plus mr-2"></i> Customise View
     </button>
    </div>
   </div>

   {/* Quick Actions Bar */}
   <QuickActions />

   {/* -- App side area start -- */}
   <div className="app__slide-wrapper p-6">
    <div className="grid grid-cols-12 gap-5">
     {/* Stat Cards (Full Width) */}
     <div className="col-span-12">
      <DashboardAnalysisCard />
     </div>

     {/* Main Content Grid */}
     <div className="col-span-12 lg:col-span-8">
      <SalesOverview />
     </div>
     <div className="col-span-12 lg:col-span-4">
      <AudienceSection />
     </div>

     <div className="col-span-12 xl:col-span-8">
      <CrmDealsStaticTable />
     </div>
     <div className="col-span-12 xl:col-span-4 grid gap-5">
      <CrmCustomerSatisfaction />
      <CrmUserActivity />
     </div>

     <div className="col-span-12 lg:col-span-7">
      <CrmOrderOverview />
     </div>
     <div className="col-span-12 lg:col-span-5">
      <div className="card__wrapper">
       <div className="mini__calendar fc fc-media-screen fc-direction-ltr fc-theme-standard">
        <CrmMiniCalander />
       </div>
      </div>
     </div>
    </div>
   </div>
   {/* -- App side area end -- */}
  </>
 );
};

export default CrmDashboardMainArea;

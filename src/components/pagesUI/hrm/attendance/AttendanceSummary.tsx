import SummarySingleCard from "@/components/common/SummarySingleCard";

import React from "react";

const AttendanceSummary = () => {
  return (
    <>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <SummarySingleCard
          iconClass="fa-sharp fa-regular fa-gear"
          title="Total Employee"
          value={850}
          description="Than Last Month"
          percentageChange="+5.15%"
          isIncrease={true}
        />
      </div>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <SummarySingleCard
          iconClass="fa-light fa-badge-check"
          title="Total Present"
          value={150}
          description="Than Last Month"
          percentageChange="+5.5%"
          isIncrease={false}
        />
      </div>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <SummarySingleCard
          iconClass="fa-sharp fa-regular fa-user"
          title="Total Half Day"
          value={3130}
          description="Than Last Year"
          percentageChange="+10%"
          isIncrease={true}
        />
      </div>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <SummarySingleCard
          iconClass="fa-sharp fa-regular fa-house-person-leave"
          title="On Leave Employee"
          value={55}
          description="Than Last Month"
          percentageChange="+2.15%"
          isIncrease={true}
        />
      </div>
    </>
  );
};

export default AttendanceSummary;

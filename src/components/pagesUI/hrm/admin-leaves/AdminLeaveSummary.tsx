import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";

const AdminLeaveSummary: React.FC = () => {
  const leaveData = [
    {
      iconClass: "fa-light fa-ban",
      title: "Total Leave",
      value: "15",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Approve",
      value: "12",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Rejected",
      value: "2",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "Pending",
      value: "5",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
  ];

  return (
    <>
      {leaveData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default AdminLeaveSummary;

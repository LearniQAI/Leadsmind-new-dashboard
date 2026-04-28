import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard"; // Adjust the import path as necessary

const LeadsSummary: React.FC = () => {
  const leadData = [
    {
      iconClass: "fa-light fa-ban",
      title: "Total Lead",
      value: "1500",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Total Company",
      value: "950",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Approved",
      value: "3130",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "Rejected",
      value: "251",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
  ];

  return (
    <>
      {leadData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default LeadsSummary;

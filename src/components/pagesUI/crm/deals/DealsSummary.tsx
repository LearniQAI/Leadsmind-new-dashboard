import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard"; // Adjust the import path as necessary

const DealsSummary: React.FC = () => {
  const dealData = [
    {
      iconClass: "fa-light fa-ban",
      title: "Total Deal",
      value: "999",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Total Company",
      value: "313",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Won",
      value: "850",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "Lost",
      value: "199",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
  ];

  return (
    <>
      {dealData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default DealsSummary;

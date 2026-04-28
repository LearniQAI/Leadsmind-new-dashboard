import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard"; // Adjust the import path if necessary
// Adjust the import path if necessary

const CompaniesSummary: React.FC = () => {
  const companyData = [
    {
      iconClass: "fa-light fa-ban",
      title: "Total Company",
      value: "1500",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Total Active",
      value: "950",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Total Complete",
      value: "3130",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "Pending",
      value: "251",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
  ];

  return (
    <>
      {companyData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default CompaniesSummary;

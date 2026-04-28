import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard"; // Adjust the import path as necessary

const PayrollSummary: React.FC = () => {
  const payrollData = [
    {
      iconClass: "fa-sharp fa-regular fa-gear",
      title: "Total Employee",
      value: "8450",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Total Paid",
      value: "950",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Total Unpaid",
      value: "3130",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "Total Leave",
      value: "55",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
  ];

  return (
    <>
      {payrollData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default PayrollSummary;

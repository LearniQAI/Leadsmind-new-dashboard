import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";

const PersonalLoanSummary: React.FC = () => {
  const data = [
    {
      iconClass: "fa-sharp fa-regular fa-gear",
      title: "Total Loan",
      value: "$8450.00",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Total Paid",
      value: "$5350.00",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Total Unpaid",
      value: "$3130.00",
      description: "",
      percentageChange: "",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "Monthly EMI",
      value: "$250.00",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
  ];

  return (
    <>
      {data.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default PersonalLoanSummary;

import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard"; // Adjust the import path as necessary

const ExpenseSummary: React.FC = () => {
  const expenseData = [
    {
      iconClass: "fa-sharp fa-regular fa-gear",
      title: "Total Expense",
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
      title: "Total Returned",
      value: "$250.00",
      description: "",
      percentageChange: "",
      isIncrease: true,
    },
  ];

  return (
    <>
      {expenseData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default ExpenseSummary;

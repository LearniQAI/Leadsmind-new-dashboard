import SummarySingleCard from "@/components/common/SummarySingleCard";
import React from "react"; // Adjust the import path as needed

const DashboardDetailsCards = () => {
  const cardsData = [
    {
      iconClass: "fa-sharp fa-regular fa-user",
      title: "Total Employee",
      value: 313,
      description: "Than Last Year",
      percentageChange: "+10%",
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-house-person-leave",
      title: "On Leave Employee",
      value: 55,
      description: "Than Last Month",
      percentageChange: "+2.15%",
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-gear",
      title: "Total Project",
      value: 313,
      description: "Than Last Month",
      percentageChange: "+5.15%",
      isIncrease: true,
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Compleat Project",
      value: 150,
      description: "Than Last Month",
      percentageChange: "+5.5%",
      isIncrease: false,
    },
    {
      iconClass: "fa-sharp fa-regular fa-users",
      title: "Total Client",
      value: 151,
      description: "Than Last Month",
      percentageChange: "+2.15%",
      isIncrease: true,
    },
    {
      iconClass: "fa-regular fa-arrow-up-right-dots",
      title: "Total Revenue",
      value: "$55",
      description: "Than Last Month",
      percentageChange: "+2.15%",
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-light fa-suitcase",
      title: "Total Jobs",
      value: 55,
      description: "Than Last Month",
      percentageChange: "+2.15%",
      isIncrease: true,
    },
    {
      iconClass: "icon-tickets1",
      title: "Total Ticket",
      value: 55,
      description: "Than Last Month",
      percentageChange: "+2.15%",
      isIncrease: true,
    },
  ];

  return (
    <>
      {cardsData.map((card, index) => (
        <div key={index} className="col-span-12 sm:col-span-6 xxl:col-span-3">
          <SummarySingleCard {...card} />
        </div>
      ))}
    </>
  );
};

export default DashboardDetailsCards;

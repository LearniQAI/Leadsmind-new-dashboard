import SummarySingleCard from "@/components/common/SummarySingleCard";

import React from "react";

const TrainingSummary: React.FC = () => {
  const trainingData = [
    {
      iconClass: "fa-sharp fa-light fa-book",
      title: "Total Training",
      value: "25+",
    },
    {
      iconClass: "fa-sharp fa-light fa-user",
      title: "Total Trainee",
      value: "313",
    },
    {
      iconClass: "fa-light fa-badge-check",
      title: "Complete Training",
      value: "15",
    },
    {
      iconClass: "fa-sharp fa-light fa-rectangle-terminal",
      title: "Upcoming Training",
      value: "5",
    },
  ];

  return (
    <>
      {trainingData.map((item, index) => (
        <div className="col-span-12 sm:col-span-6 xxl:col-span-3" key={index}>
          <SummarySingleCard {...item} />
        </div>
      ))}
    </>
  );
};

export default TrainingSummary;

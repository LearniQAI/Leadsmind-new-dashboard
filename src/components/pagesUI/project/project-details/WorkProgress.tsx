import { Box, LinearProgress, Typography } from "@mui/material";
import React from "react";

const WorkProgress = () => {
  const WorkProgressData = [
    {
      id: 1,
      title: "Project Planning",
      progress: 100,
      color: "progress-primary",
    },
    {
      id: 2,
      title: "Requirement Analysis",
      progress: 90,
      color: "progress-secondary",
    },
    {
      id: 3,
      title: "Design & Prototyping",
      progress: 80,
      color: "progress-success",
    },
    {
      id: 4,
      title: "Development",
      progress: 80,
      color: "progress-danger",
    },
    {
      id: 5,
      title: "Testing",
      progress: 60,
      color: "progress-info",
    },
    {
      id: 6,
      title: "Deployment",
      progress: 50,
      color: "progress-warning",
    },
    {
      id: 7,
      title: "Post-launch Support",
      progress: 40,
      color: "progress-primary",
    },
  ];
  return (
    <>
      <div className="card__wrapper">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Work Progress</h5>
        </div>
        <div className="mz-progress-bar progress-showcase">
          {WorkProgressData.map((item, index) => (
            <div key={index}>
              <div className="mz-progress-head">
                <h4 className="mz-progress-title">
                  <span>{item?.title}</span>
                </h4>
                <span className="mz-progress-percentage">
                  {item?.progress}%
                </span>
              </div>
              <Box sx={{ width: "100%", mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={item?.progress}
                  className={`progress-bar ${item?.color}`}
                  sx={{ height: "15px" }}
                />
              </Box>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default WorkProgress;

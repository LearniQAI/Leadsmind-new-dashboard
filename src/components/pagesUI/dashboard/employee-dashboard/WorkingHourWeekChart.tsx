"use client";

import React, { useLayoutEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

// Dynamically import the Chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const WorkingHourWeekChart = () => {
  const [isMounted, setIsMounted] = useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  // Define chart options
  const options: ApexOptions = {
    series: [
      {
        name: "Work",
        data: [7.7, 8, 6, 7.85, 7, 8],
      },
      {
        name: "Bark",
        data: [-0.3, 0, -3, -0.15, -1, -0.2],
      },
    ],
    chart: {
      type: "bar",
      height: 320,
      stacked: true,
      foreColor: "var(--clr-chart-1)",
      toolbar: {
        show: true,
      },
    },
    colors: ["var(--clr-theme-primary)", "var(--clr-action-danger)"],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 1,
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    yaxis: {
      min: -3,
      max: 8,
    },
    tooltip: {
      shared: false,
      x: {
        formatter: function (val: number) {
          return val.toString(); // Convert the number to a string
        },
      },
      y: {
        formatter: function (val: number) {
          return `${Math.abs(val)} Hour`; // Return the formatted string
        },
      },
    },
    xaxis: {
      categories: ["Sa", "Su", "Mo", "Tu", "We", "Th"],
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      offsetX: -5,
      labels: {
        colors: "var(--clr-chart-1)",
      },
    },
  };

  return isMounted ? (
    <Chart options={options} series={options.series} type="bar" height={320} />
  ) : (
    <div>Loading...</div>
  );
};

export default WorkingHourWeekChart;

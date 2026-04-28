"use client";

import React, { useLayoutEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

// Dynamically import the Chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const WorkingHourMonthChart = () => {
  const [isMounted, setIsMounted] = useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  // Define options for the Apex chart
  const options: ApexOptions = {
    series: [
      {
        name: "Work",
        data: [7.7, 8, 6, 7.85, 7, 8, 7.7, 8, 6, 7.85, 7, 8, 7.7, 8, 6, 7.85, 7, 8, 7.7, 8],
      },
      {
        name: "Bark",
        data: [-0.3, 0, -3, -0.15, -1, -0.2, -0.3, 0, -3, -0.15, -1, -0.2, -0.3, 0, -3, -0.15, -1, -0.2, -0.3, 0],
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
          return val.toString(); // Ensure a string return type
        },
      },
      y: {
        formatter: function (val: number) {
          return `${Math.abs(val)} Hour`; // String template for clarity
        },
      },
    },
    xaxis: {
      categories: [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
        "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
      ],
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left", // Changed "start" to "left" (valid value)
      offsetX: -5,
      labels: {
        colors: "var(--clr-chart-1)",
        // Removed unsupported 'fontSize' and 'fontFamily'
      },
    },
  };

  return isMounted ? (
    <Chart options={options} series={options.series} type="bar" height={320} />
  ) : (
    <div>Loading...</div>
  );
};

export default WorkingHourMonthChart;

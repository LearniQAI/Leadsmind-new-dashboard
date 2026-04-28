"use client";

import React, { useLayoutEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

// Dynamically load the chart to support Next.js SSR
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MixedChartsBasic = () => {
  const [isMounted, setIsMounted] = useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  // Define the options for the Apex chart
  const options: ApexOptions = {
    series: [
      {
        name: "TEAM A",
        type: "column",
        data: [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 30],
      },
      {
        name: "TEAM B",
        type: "area",
        data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43],
      },
      {
        name: "TEAM C",
        type: "line",
        data: [30, 25, 36, 30, 45, 35, 64, 52, 59, 36, 39],
      },
    ],
    chart: {
      height: 350,
      type: "line",
      stacked: false,
      foreColor: "#7A7A7A",
      toolbar: {
        show: true,
      },
    },
    colors: ["#6C5FFC", "#1ABC9C"],
    stroke: {
      width: [0, 2, 5],
      curve: "smooth",
    },
    plotOptions: {
      bar: {
        columnWidth: "50%",
      },
    },
    fill: {
      opacity: [1, 1, 1],
      gradient: {
        inverseColors: false,
        shade: "light",
        type: "vertical",
        opacityFrom: 0.85,
        opacityTo: 0.55,
        stops: [0, 100],
      },
    },
    states: {
      hover: {
        filter: {
          type: "lighten",
          value: 0.25, // Use type assertion to bypass type-checking
        } as any,
      },
    },
    markers: {
      size: 0,
    },
    xaxis: {
      categories: [
        "01/01/2003",
        "02/01/2003",
        "03/01/2003",
        "04/01/2003",
        "05/01/2003",
        "06/01/2003",
        "07/01/2003",
        "08/01/2003",
        "09/01/2003",
        "10/01/2003",
        "11/01/2003",
      ],
      type: "datetime",
    },
    yaxis: {
      min: 0,
      max: 67,
      tickAmount: 10,
      labels: {
        formatter: function (value, index) {
          const customLabels = [
            0, 7, 13, 20, 27, 34, 40, 47, 54, 60, 67,
          ];
          return customLabels[index] !== undefined
            ? customLabels[index].toString()
            : "";
        },
        style: {
          colors: "#7A7A7A",
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return y.toFixed(0) + " points";
          }
          return y;
        },
      },
    },
    legend: {
      show: true,
      labels: {
        colors: "#7A7A7A",
      },
    },
  };

  if (!isMounted) return <div>Loading...</div>;

  return (
    <Chart
      options={options}
      series={options.series as any} // Ensure TypeScript doesn't complain about series type
      type="line"
      height={350}
    />
  );
};

export default MixedChartsBasic;

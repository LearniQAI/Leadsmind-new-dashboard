
"use client"
import React, { useState, useLayoutEffect } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

// Dynamically import the chart to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const MixedChartsStackedTwo = () => {
  // State to check if the component is mounted
  const [isMounted, setIsMounted] = useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  // Define the options for the Apex chart
  const options:ApexOptions = {
    series: [{
        name: 'TEAM A',
        type: 'area',
        data: [44, 55, 31, 47, 31, 43, 26, 41, 31, 47, 33]
    }, {
        name: 'TEAM B',
        type: 'line',
        data: [55, 69, 45, 61, 43, 54, 37, 52, 44, 61, 43]
    }],
    chart: {
        height: 350,
        type: 'line',
        foreColor: '#7A7A7A',
        toolbar: {
            show: true
        }
    },
    colors: ['#6C5FFC', '#1ABC9C'],
    stroke: {
        curve: 'smooth'
    },
    fill: {
        type: 'solid',
        opacity: [1, 1],
    },
    labels: ['Dec 01', 'Dec 02', 'Dec 03', 'Dec 04', 'Dec 05', 'Dec 06', 'Dec 07', 'Dec 08', 'Dec 09 ', 'Dec 10', 'Dec 11'],
    markers: {
        size: 0
    },
    
    yaxis: [
        {
        },
        {
            opposite: true,

        },
    ],
    tooltip: {
        shared: true,
        intersect: false,
        y: {
            formatter: function (y) {
                if (typeof y !== "undefined") {
                    return y.toFixed(0) + " points";
                }
                return y;
            }
        }
    },
    legend: {
        show: true,
        labels: {
            colors: '#7A7A7A',
        },
    }
};

  // Return loading state if not mounted
  if (!isMounted) return <div>Loading...</div>;

  return <Chart options={options} series={options.series} type="line" height={350} />;
};

export default MixedChartsStackedTwo;


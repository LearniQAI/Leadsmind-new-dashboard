

"use client"
import React, { useState, useLayoutEffect } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

// Dynamically import the chart to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const MixedChartsStacked = () => {
  // State to check if the component is mounted
  const [isMounted, setIsMounted] = useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  // Define the options for the Apex chart
  const options: ApexOptions = {
    series: [
      {
        name: 'Income',
        type: 'column',
        data: [1.4, 2, 2.5, 1.5, 2.5, 2.8, 3.8, 4.6]
      },
      {
        name: 'Cashflow',
        type: 'column',
        data: [1.1, 3, 3.1, 4, 4.1, 4.9, 6.5, 8.5]
      },
      {
        name: 'Revenue',
        type: 'line',
        data: [20, 29, 37, 36, 44, 45, 50, 58]
      }
    ],
    chart: {
      height: 350,
      type: 'line',
      stacked: false,
      foreColor: '#7A7A7A',
      toolbar: {
        show: true
      }
    },
    colors: ['#6C5FFC', '#1ABC9C'],
    fill: {
      opacity: [1, 1]
  },
    dataLabels: {
      enabled: false
    },
    stroke: {
      width: [1, 1, 4]
    },
    xaxis: {
      categories: [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016]
    },
    yaxis: [
      {
        axisTicks: {
          show: true
        },
        axisBorder: {
          show: true,
          color: '#6C5FFC'
        },
        labels: {
          style: {
            colors: '#6C5FFC'
          }
        },
        title: {
          text: 'Income (thousand crores)',
          style: {
            color: '#6C5FFC'
          }
        },
        tooltip: {
          enabled: true
        }
      },
      {
        seriesName: 'Cashflow',
        opposite: true,
        axisTicks: {
          show: true
        },
        axisBorder: {
          show: true,
          color: '#1ABC9C'
        },
        labels: {
          style: {
            colors: '#1ABC9C'
          }
        },
        title: {
          text: 'Operating Cashflow (thousand crores)',
          style: {
            color: '#1ABC9C'
          }
        }
      },
      {
        seriesName: 'Revenue',
        opposite: true,
        axisTicks: {
          show: true
        },
        axisBorder: {
          show: true,
          color: '#6C5FFC'
        },
        labels: {
          style: {
            colors: '#6C5FFC'
          }
        },
        title: {
          text: 'Revenue (thousand crores)',
          style: {
            color: '#6C5FFC'
          }
        }
      }
    ],
    tooltip: {
      fixed: {
        enabled: true,
        position: 'topLeft',
        offsetY: 30,
        offsetX: 60
      }
    },
    legend: {
      show: false,
      horizontalAlign: 'left',
      offsetX: 40
    }
  };

  // Return loading state if not mounted
  if (!isMounted) return <div>Loading...</div>;

  return <Chart options={options} series={options.series} type="line" height={350} />;
};

export default MixedChartsStacked;


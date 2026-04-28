"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const BarWithNegativeValues = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [{
            name: 'Males',
            data: [0.4, 0.65, 0.76, 0.88, 1.5, 2.1, 2.9, 3.8, 3.9, 4.2, 4, 4.3, 4.1, 4.2, 4.5,
                3.9, 3.5, 3
            ]
        },
        {
            name: 'Females',
            data: [-0.8, -1.05, -1.06, -1.18, -1.4, -2.2, -2.85, -3.7, -3.96, -4.22, -4.3, -4.4,
            -4.1, -4, -4.1, -3.4, -3.1, -2.8
            ]
        }
        ],
        chart: {
            type: 'bar',
            height: 440,
            stacked: true,
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        colors: ['#6C5FFC', '#FF3A29'],
        fill: {
            opacity: [1, 1]
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '80%',
              },
        },
        dataLabels: {
            enabled: false
          },
        stroke: {
            width: 1,
            colors: ["#fff"]
          },

        grid: {
            xaxis: {
              lines: {
                show: false
              }
            }
          },
        yaxis: {
            stepSize: 1
          },
        tooltip: {
            shared: false,
            x: {
                formatter: function (val:any) {
                    return val
                }
            },
            y: {
                formatter: function (val) {
                    return Math.abs(val) + "%"
                }
            }
        },
        xaxis: {
            categories: ['85+', '80-84', '75-79', '70-74', '65-69', '60-64', '55-59', '50-54',
                '45-49', '40-44', '35-39', '30-34', '25-29', '20-24', '15-19', '10-14', '5-9',
                '0-4'
            ],
            title: {
                text: 'Percent'
            },
            labels: {
                formatter: function (val:any) {
                  return Math.abs(Math.round(val)) + "%"
                }
              }
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A'
            },
        }
    };

    if (!isMounted) return <div>Loading...</div>;
    return <Chart options={options} series={options.series} type="bar" height={440} />;
};

export default BarWithNegativeValues;

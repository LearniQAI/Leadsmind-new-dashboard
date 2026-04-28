"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const DashedChart = () => {
    const [isMounted, setIsMounted] = useState(false);
    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                name: "Session Duration",
                data: [45, 52, 38, 24, 33, 26, 21, 20, 6, 8, 15, 10]
            },
            {
                name: "Page Views",
                data: [35, 41, 62, 42, 13, 18, 29, 37, 36, 51, 32, 35]
            },
            {
                name: 'Total Visits',
                data: [87, 50, 60, 80, 65, 38, 62, 47, 42, 66, 45, 47]
            }
        ],
        chart: {
            height: 350,
            type: 'line',
            foreColor: '#7A7A7A',
            zoom: {
                enabled: false
            },
            toolbar: {
                show: false,
            },
        },
        colors: ['#6C5FFC', '#1ABC9C', '#34B53A'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: [5, 7, 5],
            curve: 'straight',
            dashArray: [0, 8, 5]
        },
        legend: {
            tooltipHoverFormatter: function (val: string, opts: { seriesIndex: number; dataPointIndex: number; w: any }) {
                return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + '';
            },
            labels: {
                colors: '#7A7A7A',
            },
        },
        markers: {
            size: 0,
            hover: {
                sizeOffset: 6
            }
        },
        xaxis: {
            categories: ['01 Jan', '02 Jan', '03 Jan', '04 Jan', '05 Jan', '06 Jan', '07 Jan', '08 Jan', '09 Jan',
                '10 Jan', '11 Jan', '12 Jan'
            ],
            labels: {
                style: {
                    colors: '#7A7A7A',
                    fontSize: '12px',
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 400,
                    cssClass: 'apexcharts-xaxis-label',
                },
            },
        },
        yaxis: {
            show: true,
            labels: {
                style: {
                    colors: '#7A7A7A',
                    fontSize: '12px',
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 400,
                    cssClass: 'apexcharts-xaxis-label',
                },
            },
        },
        tooltip: {
            y: [
                {
                    title: {
                        formatter: function (val: string) {
                            return val + " (mins)";
                        }
                    }
                },
                {
                    title: {
                        formatter: function (val: string) {
                            return val + " per session";
                        }
                    }
                },
                {
                    title: {
                        formatter: function (val: string) {
                            return val;
                        }
                    }
                }
            ]
        },
        grid: {
            show: true,
            borderColor: '#E6E6E6',
        },
    };
    if (!isMounted) return <div>Loading...</div>;
    {/* Render the Apex chart here */ }
    return  <Chart options={options} series={options.series} type="line" height={350} />
};

export default DashedChart;

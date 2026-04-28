"use client";
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const WorkingHourYearChart = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    const options: ApexOptions = {
        series: [
            {
                name: 'Work',
                data: [7.7, 8, 6, 7.85, 7, 8, 7.7, 8, 6, 7.85, 7, 8]
            },
            {
                name: 'Bark',
                data: [-0.3, -0, -3, -0.15, -1, -0.2, -0.3, -0, -3, -0.15, -1, -0.2]
            }
        ],
        chart: {
            type: 'bar',
            height: 320,
            stacked: true,
            foreColor: '#7A7A7A',
            fontFamily: "'Roboto', sans-serif",
            toolbar: {
                show: true
            }
        },
        colors: ['#6C5FFC', '#FF3A29'],
        fill:{opacity:[1, 1]},
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: 1,
        },
        grid: {
            xaxis: {
                lines: {
                    show: false
                }
            }
        },
        yaxis: {
            min: -5,
            max: 8,
        },
        tooltip: {
            shared: false,
            x: {
                formatter: function (val) {
                    return val.toString();
                }
            },
            y: {
                formatter: function (val) {
                    return Math.abs(val) + " Hour";
                }
            }
        },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'left',
            offsetX: -5,
            labels: {
                colors: '#7A7A7A',
            }
        }
    };


    return isMounted ? (
        <Chart options={options} series={options.series} type="bar" height={320} />
    ) : (
        <div>Loading...</div>
    );
};

export default WorkingHourYearChart;

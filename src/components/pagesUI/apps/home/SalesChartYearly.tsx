
"use client";
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const SalesChartYearly = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [{
            name: 'Sale',
            data: [76, 85, 101, 98, 87, 105, 91]
        }, {
            name: 'Profit',
            data: [44, 55, 57, 56, 61, 58, 63]
        }],
        chart: {
            
            offsetX: 0,
            toolbar: {
                show: true,
                offsetX: 0,
                offsetY: 0,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%'
            },
        },
        dataLabels: {
            enabled: false
        },
        colors: ['#6C5FFC', '#1ABC9C'],
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A',
            },
        },
        xaxis: {
            categories: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
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
        fill: {
            opacity: 1
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return "$ " + val + " thousands"
                }
            }
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="bar" height={315} />
    ) : (
        <div>Loading...</div>
    );
};

export default SalesChartYearly;

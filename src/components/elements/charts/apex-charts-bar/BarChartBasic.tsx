
"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const BarChartBasic = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [{
            data: [100, 150, 200, 250, 300, 350, 400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380]
        }],
        chart: {
            type: 'bar',
            height: 430,
            foreColor: '#7A7A7A',
            toolbar: {
                show: false,
            }
        },
        colors: ['#6C5FFC'],
        fill: {
            opacity: [1]
        },
        plotOptions: {
            bar: {
                borderRadius: 0,
                horizontal: true,
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['South Korea', 'Saudi Arabia', 'Switzerland', 'Turkey', 'Portugal', 'Sweden', 'United Arab Emirates', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan', 'Germany', 'China', 'United States'],
            min: 0,
            max: 1500,
            tickAmount: 5, 
            labels: {
                formatter: (value:any) => {
                    // Format the ticks to show only 0, 300, 600, 900, 1200, 1500
                    if (value === 0) return '0';
                    if (value === 300) return '300';
                    if (value === 600) return '600';
                    if (value === 900) return '900';
                    if (value === 1200) return '1200';
                    if (value === 1500) return '1500';
                    return '';
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
    return <Chart options={options} series={options.series} type="bar" height={430} />;
};

export default BarChartBasic;

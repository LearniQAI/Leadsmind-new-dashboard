
"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PolarAreaChartBasic = () => {
    const [isMounted, setIsMounted] = useState(false);
    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [14, 23, 21, 17, 15, 10, 12, 17, 21],
        chart: {
            type: 'polarArea',
            foreColor: '#7A7A7A',
        },
        stroke: {
            colors: ['#fff']
        },
        fill: {
            opacity: 0.8
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }],
        legend: {
            show: false,
            position: 'bottom',
            labels: {
                colors: '#7A7A7A',
            },
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="polarArea" />
    ) : (
        <div>Loading...</div>
    );
};

export default PolarAreaChartBasic;

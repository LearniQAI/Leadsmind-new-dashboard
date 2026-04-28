"use client"
import React, {useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const Stepline = () => {
    const [isMounted, setIsMounted] = useState(false);
    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [{
            data: [34, 44, 54, 21, 12, 43, 33, 23, 66, 66, 58]
        }],
        chart: {
            type: 'line',
            height: 350,
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        stroke: {
            curve: 'stepline',
        },
        dataLabels: {
            enabled: false
        },
        colors: ['#7A7A7A'],
        markers: {
            hover: {
                sizeOffset: 4
            }
        },
        grid: {
            show: true,
            borderColor: '#E6E6E6',
        },
    };
    if (!isMounted) return <div>Loading...</div>;
    {/* Render the Apex chart here */ }
    return <Chart options={options} series={options.series} type="line" height={350} />
    
};

export default Stepline;

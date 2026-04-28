
"use client"
import React, {  useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const MixedChartsWithDataLabels = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [{
            name: 'Website Blog',
            type: 'column',
            data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160]
        }, {
            name: 'Social Media',
            type: 'line',
            data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16]
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
        fill: {
            opacity: [1, 1, 1],
        },

        stroke: {
            width: [0, 4]
        },
        dataLabels: {
            enabled: true,
            enabledOnSeries: [1]
        },
        labels: ['01 Jan 2001', '02 Jan 2001', '03 Jan 2001', '04 Jan 2001', '05 Jan 2001', '06 Jan 2001', '07 Jan 2001', '08 Jan 2001', '09 Jan 2001', '10 Jan 2001', '11 Jan 2001', '12 Jan 2001'],
        xaxis: {
            type: 'datetime'
        },
        yaxis: [{

        }, {
            opposite: true,
        }],
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A'
            },
        }
    };
    if (!isMounted) return <div>Loading...</div>;
    return <Chart options={options} series={options.series} type="line" height={350} />
};

export default MixedChartsWithDataLabels;

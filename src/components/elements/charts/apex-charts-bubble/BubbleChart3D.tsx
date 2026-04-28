"use client";
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Define generateData function to create random bubble chart data
const generateData = (baseTime: number, count: number, range: { min: number; max: number }) => {
    const series = [];
    for (let i = 0; i < count; i++) {
        const x = baseTime + i * 86400000;
        const y = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        const z = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        series.push([x, y, z]);
    }
    return series;
};

const BubbleChart3D = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [{
            name: 'Product1',
            data: generateData(new Date('11 Feb 2017 GMT').getTime(), 20, {
                min: 10,
                max: 60
            })
        },
        {
            name: 'Product2',
            data: generateData(new Date('11 Feb 2017 GMT').getTime(), 20, {
                min: 10,
                max: 60
            })
        },
        {
            name: 'Product3',
            data: generateData(new Date('11 Feb 2017 GMT').getTime(), 20, {
                min: 10,
                max: 60
            })
        },
        {
            name: 'Product4',
            data: generateData(new Date('11 Feb 2017 GMT').getTime(), 20, {
                min: 10,
                max: 60
            })
        }],
        chart: {
            height: 350,
            type: 'bubble',
            foreColor: 'var(--clr-chart-1)',
            toolbar: {
                show: true
            }
        },
        colors: [
            '#3B93A5',
            '#F7B844',
            '#ADD8C7',
            '#EC3C65',
        ],
        dataLabels: {
            enabled: false
        },
        fill: {
            type: 'gradient',
        },
        xaxis: {
            tickAmount: 12,
            type: 'datetime',
            labels: {
                rotate: 0,
            }
        },
        yaxis: {
            max: 70
        },
        theme: {
            palette: 'palette2'
        },
        legend: {
            show: true,
            labels: {
                colors: 'var(--clr-chart-1)'
            },
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="bubble" height={350} />
    ) : (
        <div>Loading...</div>
    );
};

export default BubbleChart3D;

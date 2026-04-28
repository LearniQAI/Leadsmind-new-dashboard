"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

// Dynamically import the ApexCharts component
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const ChartsRangeColumnChart = () => {
    const [isMounted, setIsMounted] = useState(false);

    // State to hold the series data
    const [series, setSeries] = useState([
        {
            data: [
                { x: 'Team A', y: [1, 5] },
                { x: 'Team B', y: [4, 6] },
                { x: 'Team C', y: [5, 8] },
                { x: 'Team D', y: [3, 11] }
            ]
        },
        {
            data: [
                { x: 'Team A', y: [2, 6] },
                { x: 'Team B', y: [1, 3] },
                { x: 'Team C', y: [7, 8] },
                { x: 'Team D', y: [5, 9] }
            ]
        }
    ]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        chart: {
            type: 'rangeBar',
            height: 350,
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        colors: ['#6C5FFC', '#1ABC9C'],
        plotOptions: {
            bar: {
                horizontal: false
            }
        },
        fill: {
            opacity: [1, 1]
        },
        dataLabels: {
            enabled: true
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A'
            }
        }
    };

    // Render loading until component mounts
    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={series} type="rangeBar" height={350} />;
};

export default ChartsRangeColumnChart;

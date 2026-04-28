"use client"
import React, {useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const LineChartsBasic = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    const options: ApexOptions = {
        chart: {
            height: 350,
            type: 'line',
            foreColor: '#7A7A7A',
            toolbar: {
                show: false,
            },
            zoom: {
                enabled: false,
            },
        },
        colors: ['#7A7A7A'],
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: 'straight',
        },
        grid: {
            row: {
                opacity: 1,
            },
        },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
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
        legend: {
            show: false,
        },
    };

    const series = [
        {
            name: "Desktops",
            data: [10, 41, 35, 51, 49, 62, 69, 91, 148],
        },
    ];
    if (!isMounted) return <div>Loading...</div>;
    {/* Render the Apex chart here */ }
    return  <Chart options={options} series={series} type="line" height={350} />
};

export default LineChartsBasic;

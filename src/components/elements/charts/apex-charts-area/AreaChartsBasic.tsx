"use client"
import React, {  useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const AreaChartsBasic = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [{
            name: 'Net Profit',
            data: [30, 60, 35, 110, 45, 70, 60, 100].map(val => val || 0),
        }],
        chart: {
            height: 305,
            type: 'area',
            foreColor: '#7A7A7A',
            toolbar: {
                show: false,
            },
            zoom: {
                enabled: false
            },
        },
        colors: ['#7A7A7A'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'straight'
        },
        grid: {
            show: true,
            borderColor: '#E6E6E6',
        },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', ''].filter(
                cat => cat !== ''
            ), 
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
                offsetX: -10,
                formatter: function (value) {
                    return value + "k";
                },
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
        fill: {
            type: "gradient",
            opacity:[1],
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.5,
                stops: [100, 90, 100]
            }
        },
    };
    if (!isMounted) return <div>Loading...</div>;
    return <Chart options={options} series={options.series} type="area" height={305} />
};

export default AreaChartsBasic;

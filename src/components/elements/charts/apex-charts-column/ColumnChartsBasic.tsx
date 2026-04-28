"use client"
import React, { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const ColumnChartsBasic = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                name: 'Order Today',
                data: [40, 50, 60, 70, 50, 90, 110],
            },
            {
                name: 'Earning Today',
                data: [50, 60, 70, 80, 60, 40, 90],
            },
            {
                name: 'Revenue Today',
                data: [60, 80, 60, 55, 95, 80, 105],
            },
        ],
        chart: {
            type: 'bar',
            height: 350,
            width: '100%',
            foreColor: '#7A7A7A',
            toolbar: {
                show: true,
                tools: {
                    download: false,
                },
            },
        },
        colors: ['#6C5FFC', '#1ABC9C', '#34B53A'],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent'],
        },
        xaxis: {
            categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'],
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
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: function (val: number) {
                    return "$ " + val + " thousands";
                },
            },
        },
        legend: {
            show: false,
        },
        yaxis: {
            tooltip: {
                enabled: true,
            },
            labels: {
                style: {
                    colors: ['#7A7A7A'],
                    fontWeight: 400,
                    fontSize: '12px',
                    fontFamily: "'Manrope', sans-serif",
                },
                offsetX: 0,
                offsetY: 0,
            },
        },
    };

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={options.series} type="bar" height={350} />;
};

export default ColumnChartsBasic;

"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const ColumnChartsGroupedStacked = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [
            {
                name: 'Q1 Budget',
                group: 'budget',
                data: [44000, 55000, 41000, 67000, 22000, 43000]
            },
            {
                name: 'Q1 Actual',
                group: 'actual',
                data: [48000, 50000, 40000, 65000, 25000, 40000]
            },
            {
                name: 'Q2 Budget',
                group: 'budget',
                data: [13000, 36000, 20000, 8000, 13000, 27000]
            },
            {
                name: 'Q2 Actual',
                group: 'actual',
                data: [20000, 40000, 25000, 10000, 12000, 28000]
            }
        ],
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        stroke: {
            width: 1,
            colors: ['#fff']
        },
        dataLabels: {
            formatter: (val: number) => {
                return val / 1000 + 'K'
            }
        },
        plotOptions: {
            bar: {
                horizontal: false
            }
        },
        xaxis: {
            categories: [
                'Online advertising',
                'Sales Training',
                'Print advertising',
                'Catalogs',
                'Meetings',
                'Public relations'
            ]
        },
        fill: {
            opacity: 1
        },
        colors: ['#6C5FFC', '#1ABC9C', '#34B53A', '#FF3A29'],
        yaxis: {
            labels: {
                formatter: (val: number) => {
                    return val / 1000 + 'K'
                }
            }
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A',
            },
        }
    };

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={options.series} type="bar" height={350} />;
};

export default ColumnChartsGroupedStacked;

"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const HorizontalBoxPlot = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [
            {
                data: [
                    {
                        x: 'Category A',
                        y: [54, 66, 69, 75, 88]
                    },
                    {
                        x: 'Category B',
                        y: [43, 65, 69, 76, 81]
                    },
                    {
                        x: 'Category C',
                        y: [31, 39, 45, 51, 59]
                    },
                    {
                        x: 'Category D',
                        y: [39, 46, 55, 65, 71]
                    },
                    {
                        x: 'Category E',
                        y: [29, 31, 35, 39, 44]
                    },
                    {
                        x: 'Category F',
                        y: [41, 49, 58, 61, 67]
                    },
                    {
                        x: 'Category G',
                        y: [54, 59, 66, 71, 88]
                    }
                ]
            }
        ],
        chart: {
            type: 'boxPlot',
            height: 350,
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '50%'
            },
            boxPlot: {
                colors: {
                    upper: '#6C5FFC',
                    lower: '#1ABC9C'
                }
            }
        },
        fill:{opacity:[1, 1]},
        stroke: {
            colors: ['#6c757d']
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A',
            },
        }
    };

    if (!isMounted) return <div>Loading...</div>;
    return <Chart options={options} series={options.series} type="boxPlot" height={350} />;
};

export default HorizontalBoxPlot;
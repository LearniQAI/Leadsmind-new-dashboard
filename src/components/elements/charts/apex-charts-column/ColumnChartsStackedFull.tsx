
"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const ColumnChartsStackedFull = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    var options:ApexOptions = {
        series: [{
            name: 'PRODUCT A',
            data: [44, 55, 41, 67, 22, 43, 21, 49]
        }, {
            name: 'PRODUCT B',
            data: [13, 23, 20, 8, 13, 27, 33, 12]
        }, {
            name: 'PRODUCT C',
            data: [11, 17, 15, 15, 21, 14, 15, 13]
        }],
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            stackType: '100%',
            foreColor: '#7A7A7A',
            toolbar: {
                show: false,
            },
        },
        colors: ['#6C5FFC', '#1ABC9C', '#34B53A'],
        responsive: [{
            breakpoint: 480,
            options: {
                legend: {
                    position: 'bottom',
                    offsetX: -10,
                    offsetY: 0,
                    labels: {
                        colors: '#7A7A7A',
                        fontSize: '12px',
                        fontFamily: "'Roboto', sans-serif",
                    },
                }
            }
        }],
        xaxis: {
            categories: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2',
                '2012 Q3', '2012 Q4'
            ],
        },
        yaxis: {
            tickAmount: 10, 
            min: 0,
            max: 100,
        },
        fill: {
            opacity: 1
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A',
            },
        },
    };
    

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={options.series} type="bar" height={350} />;
};

export default ColumnChartsStackedFull;

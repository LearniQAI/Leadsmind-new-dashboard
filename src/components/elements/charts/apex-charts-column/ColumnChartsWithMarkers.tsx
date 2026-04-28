"use client"
import React, { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const ColumnChartsWithMarkers = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                name: 'Actual',
                data: [
                    {
                        x: '2011',
                        y: 1292,
                        goals: [
                            {
                                name: 'Expected',
                                value: 1400,
                                strokeHeight: 5,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2012',
                        y: 4432,
                        goals: [
                            {
                                name: 'Expected',
                                value: 5400,
                                strokeHeight: 5,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2013',
                        y: 5423,
                        goals: [
                            {
                                name: 'Expected',
                                value: 5200,
                                strokeHeight: 5,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2014',
                        y: 6653,
                        goals: [
                            {
                                name: 'Expected',
                                value: 6500,
                                strokeHeight: 5,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2015',
                        y: 8133,
                        goals: [
                            {
                                name: 'Expected',
                                value: 6600,
                                strokeHeight: 13,
                                strokeWidth: 0,
                                strokeLineCap: 'round',
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2016',
                        y: 7132,
                        goals: [
                            {
                                name: 'Expected',
                                value: 7500,
                                strokeHeight: 5,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2017',
                        y: 7332,
                        goals: [
                            {
                                name: 'Expected',
                                value: 8700,
                                strokeHeight: 5,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    },
                    {
                        x: '2018',
                        y: 6553,
                        goals: [
                            {
                                name: 'Expected',
                                value: 7300,
                                strokeHeight: 2,
                                strokeDashArray: 2,
                                strokeColor: 'var(--clr-theme-secondary)'
                            }
                        ]
                    }
                ]
            }
        ],
        chart: {
            height: 350,
            type: 'bar',
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        plotOptions: {
            bar: {
                columnWidth: '60%'
            }
        },
        colors: ['#6C5FFC'],
        dataLabels: {
            enabled: false
        },
        fill: {
            opacity: [1]
        },
        legend: {
            show: false,
            showForSingleSeries: true,
            customLegendItems: ['Actual', 'Expected'],
            markers: {
                fillColors: ['#6C5FFC', '#1ABC9C']
            }
        }
    };

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={options.series} type="bar" height={350} />;
};

export default ColumnChartsWithMarkers;

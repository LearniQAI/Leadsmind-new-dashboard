import React, { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const DumbbellChart = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const series = [
        {
            data: [
                { x: '2008', y: [2800, 4500] },
                { x: '2009', y: [3200, 4100] },
                { x: '2010', y: [2950, 7800] },
                { x: '2011', y: [3000, 4600] },
                { x: '2012', y: [3500, 4100] },
                { x: '2013', y: [4500, 6500] },
                { x: '2014', y: [4100, 5600] }
            ]
        }
    ];

    const options: ApexOptions = {
        chart: {
            height: 350,
            type: 'rangeBar',
            zoom: {
                enabled: false
            },
            toolbar: {
                show: true
            }
        },
        colors: ['#6C5FFC', '#1ABC9C'],
        plotOptions: {
            bar: {
                isDumbbell: true,
                dumbbellColors: [['#6C5FFC', '#1ABC9C']],
                rangeBarGroupRows: true, 
                columnWidth: 3,
                rangeBarOverlap: false,
            }
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'left',
            customLegendItems: ['Start Value', 'End Value'],
            markers: {
                fillColors: ['#6C5FFC', '#1ABC9C']
            },
            labels: {
                colors: '#7A7A7A',
            }
        },
        grid: {
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: { 
                lines: {
                    show: false
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                type: 'vertical',
                gradientToColors: ['#6C5FFC'],
                inverseColors: true,
                stops: [0, 100]
            }
        },
        xaxis: {
            tickPlacement: 'on',
            categories: ['2008', '2009', '2010', '2011', '2012', '2013', '2014'],
            labels: {
                style: {
                    colors: '#7A7A7A', 
                    fontSize: '12px',
                }
            }
        },
        yaxis: {
            min: 2000,
            max: 9000,
            labels: {
                style: {
                    colors: '#7A7A7A', 
                    
                }
            }
        }
    };

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={series} type="rangeBar" height={350} />;
};

export default DumbbellChart;

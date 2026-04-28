
"use client";
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
// Define the type for the yrange parameter
interface YRange {
    min: number;
    max: number;
}


const ScatterChartDateTime = () => {
    const [isMounted, setIsMounted] = useState(false);
    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the function with typed parameters
    function generateDayWiseTimeSeries(baseval: number, count: number, yrange: YRange): [number, number][] {
        let i = 0;
        const series: [number, number][] = [];

        while (i < count) {
            const x = baseval;
            const y = Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min;

            series.push([x, y]);
            baseval += 86400000; 
            i++;
        }

        return series;
    }
    // Define options for the Apex chart
    const options: ApexOptions = {

        series: [
            {
                name: 'TEAM 1',
                data: generateDayWiseTimeSeries(new Date('11 Feb 2017 GMT').getTime(), 20, {
                    min: 10,
                    max: 60
                })
            },
            {
                name: 'TEAM 2',
                data: generateDayWiseTimeSeries(new Date('11 Feb 2017 GMT').getTime(), 20, {
                    min: 10,
                    max: 60
                })
            },
            {
                name: 'TEAM 3',
                data: generateDayWiseTimeSeries(new Date('11 Feb 2017 GMT').getTime(), 30, {
                    min: 10,
                    max: 60
                })
            },
            {
                name: 'TEAM 4',
                data: generateDayWiseTimeSeries(new Date('11 Feb 2017 GMT').getTime(), 10, {
                    min: 10,
                    max: 60
                })
            },
            {
                name: 'TEAM 5',
                data: generateDayWiseTimeSeries(new Date('11 Feb 2017 GMT').getTime(), 30, {
                    min: 10,
                    max: 60
                })
            }
        ],
        chart: {
            height: 350,
            type: 'scatter',
            foreColor: '#7A7A7A',
            zoom: {
                type: 'xy'
            }
        },
        dataLabels: {
            enabled: false
        },
        grid: {
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            },
        },
        xaxis: {
            type: 'datetime',
        },
        yaxis: {
            max: 70
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="scatter" height={350} />
    ) : (
        <div>Loading...</div>
    );
};

export default ScatterChartDateTime;

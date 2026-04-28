"use client";
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TimelineChartMultipleSeries = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                name: 'George Washington',
                data: [
                    { x: 'President', y: [new Date(1789, 3, 30).getTime(), new Date(1797, 2, 4).getTime()] }
                ]
            },
            {
                name: 'John Adams',
                data: [
                    { x: 'President', y: [new Date(1797, 2, 4).getTime(), new Date(1801, 2, 4).getTime()] },
                    { x: 'Vice President', y: [new Date(1789, 3, 21).getTime(), new Date(1797, 2, 4).getTime()] }
                ]
            },
            {
                name: 'Thomas Jefferson',
                data: [
                    { x: 'President', y: [new Date(1801, 2, 4).getTime(), new Date(1809, 2, 4).getTime()] },
                    { x: 'Vice President', y: [new Date(1797, 2, 4).getTime(), new Date(1801, 2, 4).getTime()] },
                    { x: 'Secretary of State', y: [new Date(1790, 2, 22).getTime(), new Date(1793, 11, 31).getTime()] }
                ]
            },
            {
                name: 'Aaron Burr',
                data: [
                    { x: 'Vice President', y: [new Date(1801, 2, 4).getTime(), new Date(1805, 2, 4).getTime()] }
                ]
            },
            {
                name: 'George Clinton',
                data: [
                    { x: 'Vice President', y: [new Date(1805, 2, 4).getTime(), new Date(1812, 3, 20).getTime()] }
                ]
            },
            {
                name: 'John Jay',
                data: [
                    { x: 'Secretary of State', y: [new Date(1789, 8, 25).getTime(), new Date(1790, 2, 22).getTime()] }
                ]
            },
            {
                name: 'Edmund Randolph',
                data: [
                    { x: 'Secretary of State', y: [new Date(1794, 0, 2).getTime(), new Date(1795, 7, 20).getTime()] }
                ]
            },
            {
                name: 'Timothy Pickering',
                data: [
                    { x: 'Secretary of State', y: [new Date(1795, 7, 20).getTime(), new Date(1800, 4, 12).getTime()] }
                ]
            },
            {
                name: 'Charles Lee',
                data: [
                    { x: 'Secretary of State', y: [new Date(1800, 4, 13).getTime(), new Date(1800, 5, 5).getTime()] }
                ]
            },
            {
                name: 'John Marshall',
                data: [
                    { x: 'Secretary of State', y: [new Date(1800, 5, 13).getTime(), new Date(1801, 2, 4).getTime()] }
                ]
            },
            {
                name: 'Levi Lincoln',
                data: [
                    { x: 'Secretary of State', y: [new Date(1801, 2, 5).getTime(), new Date(1801, 4, 1).getTime()] }
                ]
            },
            {
                name: 'James Madison',
                data: [
                    { x: 'Secretary of State', y: [new Date(1801, 4, 2).getTime(), new Date(1809, 2, 3).getTime()] }
                ]
            }
        ],
        chart: {
            height: 450,
            type: 'rangeBar',
            foreColor: '#7A7A7A',
            toolbar: { show: true }
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '50%',
                rangeBarGroupRows: true
            }
        },
        colors: [
            "#6C5FFC", "#1ABC9C", "#34B53A", "#0dcaf0", "#34B53A",
            "#9747FF", "#FF3A29", "#d1e7dd", "#8D5B4C", "#F86624",
            "#fff3cd", "#7A7A7A", "#34B53A", "#495057", "#EC8D1D"
          ],
          fill: {
            // type: 'solid'
            opacity:[1, 1, 1, 1, 1, 1, 1, 1, 1,0.3, 0.5, 1, 1, 1, 1]
          },
        xaxis: { type: 'datetime' },
        legend: {
            position: 'right',
            labels: { colors: '#7A7A7A'},
        },
        tooltip: {
            custom: ({ seriesIndex, dataPointIndex, w }) => {
                const fromYear = new Date(w.globals.seriesRangeStart[seriesIndex][dataPointIndex]).getFullYear();
                const toYear = new Date(w.globals.seriesRangeEnd[seriesIndex][dataPointIndex]).getFullYear();
                return `From ${fromYear} to ${toYear}`;
            }
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="rangeBar" height={450} />
    ) : (
        <div>Loading...</div>
    );
};

export default TimelineChartMultipleSeries;

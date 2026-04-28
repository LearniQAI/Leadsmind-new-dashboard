"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const AreaChartsNegative = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);
    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                name: 'north',
                data: [
                    { x: 1996, y: 322 },
                    { x: 1997, y: 324 },
                    { x: 1998, y: 329 },
                    { x: 1999, y: 342 },
                    { x: 2000, y: 348 },
                    { x: 2001, y: 334 },
                    { x: 2002, y: 325 },
                    { x: 2003, y: 316 },
                    { x: 2004, y: 318 },
                    { x: 2005, y: 330 },
                    { x: 2006, y: 355 },
                    { x: 2007, y: 366 },
                    { x: 2008, y: 337 },
                    { x: 2009, y: 352 },
                    { x: 2010, y: 377 },
                    { x: 2011, y: 383 },
                    { x: 2012, y: 344 },
                    { x: 2013, y: 366 },
                    { x: 2014, y: 389 },
                    { x: 2015, y: 334 }
                ]
            },
            {
                name: 'south',
                data: [
                    { x: 1996, y: 162 },
                    { x: 1997, y: 90 },
                    { x: 1998, y: 50 },
                    { x: 1999, y: 77 },
                    { x: 2000, y: 35 },
                    { x: 2001, y: -45 },
                    { x: 2002, y: -88 },
                    { x: 2003, y: -120 },
                    { x: 2004, y: -156 },
                    { x: 2005, y: -123 },
                    { x: 2006, y: -88 },
                    { x: 2007, y: -66 },
                    { x: 2008, y: -45 },
                    { x: 2009, y: -29 },
                    { x: 2010, y: -45 },
                    { x: 2011, y: -88 },
                    { x: 2012, y: -132 },
                    { x: 2013, y: -146 },
                    { x: 2014, y: -169 },
                    { x: 2015, y: -184 }
                ]
            }
        ],
        chart: {
            type: 'area',
            height: 350,
            foreColor: '#7A7A7A',
            toolbar: { show: false },
        },
        colors: ['#7A7A7A', '#05C3FB'],
        dataLabels: { enabled: false },
        stroke: { curve: 'straight' },
        xaxis: {
            type: 'category',
            axisBorder: { show: false },
            axisTicks: { show: false },
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
            tickAmount: 4,
            floating: false,
            labels: {
                style: {
                    colors: '#7A7A7A',
                    fontSize: '12px',
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 400,
                    cssClass: 'apexcharts-yaxis-label',
                },
                offsetY: -7,
                offsetX: 0,
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        fill: { opacity: 0.5 },
        tooltip: {
            x: { format: "yyyy" },
            fixed: { enabled: false, position: 'topRight' }
        },
        grid: {
            borderColor: '#E6E6E6',
            yaxis: { lines: { offsetX: -30 } },
            padding: { left: 20 }
        },
        legend: {
            show: true,
            labels: { colors: '#7A7A7A' },
        }
    };
    if (!isMounted) return <div>Loading...</div>;
    {/* Render the Apex chart here */ }
    return <Chart options={options} series={options.series} type="area" height={350} />;
};

export default AreaChartsNegative;

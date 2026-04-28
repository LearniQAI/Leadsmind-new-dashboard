"use client";

import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const RangeSliderBasic = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                name: 'New York Temperature',
                data: [
                    { x: 'Jan', y: [-2, 4] },
                    { x: 'Feb', y: [-1, 6] },
                    { x: 'Mar', y: [3, 10] },
                    { x: 'Apr', y: [8, 16] },
                    { x: 'May', y: [13, 22] },
                    { x: 'Jun', y: [18, 26] },
                    { x: 'Jul', y: [21, 29] },
                    { x: 'Aug', y: [21, 28] },
                    { x: 'Sep', y: [17, 24] },
                    { x: 'Oct', y: [11, 18] },
                    { x: 'Nov', y: [6, 12] },
                    { x: 'Dec', y: [1, 7] }
                ]
            }
        ],
        chart: {
            height: 350,
            type: 'rangeArea',
            foreColor: '#7A7A7A',
            toolbar: { show: true }
        },
        colors: ['#6C5FFC'],
        fill:{
            opacity:[1]
        },
        stroke: { curve: 'straight' },
        markers: { hover: { sizeOffset: 5 } },
        dataLabels: { enabled: false },
        yaxis: {
            labels: {
                formatter: (val) => `${val}°C`
            }
        },
        legend: {
            show: true,
            labels: { colors: '#7A7A7A' }
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="rangeArea" height={350} />
    ) : (
        <div>Loading...</div>
    );
};

export default RangeSliderBasic;

"use client"
import React, { useLayoutEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PolarMonochrome = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        chart: {
            type: 'polarArea',
            foreColor: '#7A7A7A',
        },
        series: [42, 47, 52, 58, 65],
        labels: ['Rose A', 'Rose B', 'Rose C', 'Rose D', 'Rose E'],
        fill: {
            opacity: 1,
        },
        stroke: {
            width: 1,
            colors: undefined,
        },
        
        yaxis: {
            show: false,
        },
        legend: {
            show: false,
            position: 'bottom',
        },
        plotOptions: {
            polarArea: {
                rings: {
                    strokeWidth: 0,
                },
                spokes: {
                    strokeWidth: 0,
                },
            },
        },
        theme: {
            monochrome: {
                enabled: true,
                shadeTo: 'light',
                shadeIntensity: 0.6,
            },
        },

    };

    return isMounted ? (
        
        <Chart options={options} series={options.series} type="polarArea" />
    ) : (
        <div>Loading...</div>
    );
};

export default PolarMonochrome;

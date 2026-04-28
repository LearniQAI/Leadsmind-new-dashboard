import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const HeatmapChartsBasic = () => {
    const [isMounted, setIsMounted] = useState(false);
    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    function generateData(count: number, range: { min: number; max: number }) {
        const data = [];
        for (let i = 0; i < count; i++) {
            const randomValue = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            data.push(randomValue);
        }
        return data;
    }

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [{
            name: 'Metric1',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric2',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric3',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric4',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric5',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric6',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric7',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric8',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        },
        {
            name: 'Metric9',
            data: generateData(18, {
                min: 0,
                max: 90
            })
        }
        ],
        
        chart: {
            height: 350,
            type: 'heatmap',
            foreColor: '#7A7A7A',
            toolbar: {
                show: true
            }
        },
        colors: ["#7A7A7A"],
        dataLabels: {
            enabled: false
        },
       
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="heatmap" height={350} />
    ) : (
        <div>Loading...</div>
    );
};

export default HeatmapChartsBasic;
